import { prioritizeRepositories } from "./preventive-maintenance-policy.mjs";

const baseUrls = Array.from(
  new Set(
    envValue("GIT_TOP_MAINTENANCE_BASE_URLS", "https://git.top,https://git-top.izhenghaocn.workers.dev")
      .split(",")
      .map((value) => value.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  )
);
const syncSecret = process.env.SYNC_SECRET;
const refreshLimit = boundedInteger(envValue("GIT_TOP_PREVENTIVE_REFRESH_LIMIT", 20), "refresh limit", 1, 40);
const syncBatchSize = boundedInteger(envValue("GIT_TOP_STALE_BATCH_SIZE", 5), "sync batch size", 1, 10);
const alternativesBatches = boundedInteger(envValue("GIT_TOP_PREVENTIVE_ALTERNATIVES_BATCHES", 4), "alternatives batches", 1, 8);
const alternativesBatchSize = boundedInteger(envValue("GIT_TOP_ALTERNATIVES_BATCH_SIZE", 10), "alternatives batch size", 1, 25);
const maxRetries = boundedInteger(envValue("GIT_TOP_SYNC_MAX_RETRIES", 6), "max retries", 1, 10);
const timeoutMs = boundedInteger(envValue("GIT_TOP_SYNC_TIMEOUT_MS", 120_000), "timeout", 1_000, 300_000);
const delayMs = boundedInteger(envValue("GIT_TOP_SYNC_DELAY_MS", 3_000), "delay", 250, 60_000);

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required.");
}

const [initialStatus, initialQuality] = await Promise.all([
  requestJsonWithRetry(cacheBustedPath("/api/sync/status?require_d1=true"), { method: "GET" }),
  requestJsonWithRetry(cacheBustedPath("/api/quality?require_d1=true"), { method: "GET" })
]);
const staleRepositories = (initialQuality.issues ?? [])
  .filter((issue) => issue.code === "stale_sync" && typeof issue.project_id === "string")
  .map((issue) => issue.project_id);
const dueRepositories = (initialStatus.priority?.refresh_due_preview ?? [])
  .map((item) => item.project_id)
  .filter((projectId) => typeof projectId === "string");
const repositories = prioritizeRepositories(staleRepositories, dueRepositories, refreshLimit);
const syncRuns = [];
const failures = [];

for (let index = 0; index < repositories.length; index += syncBatchSize) {
  const batch = repositories.slice(index, index + syncBatchSize);
  const result = await requestJsonWithRetry("/api/admin/sync", {
    method: "POST",
    headers: adminHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ repositories: batch, limit: batch.length, signal_depth: "lite", refresh_derived: false })
  });
  syncRuns.push({
    repositories: batch,
    synced: result.synced ?? [],
    renamed: result.renamed ?? [],
    unavailable: result.unavailable ?? [],
    failed: result.failed ?? []
  });
  failures.push(...(result.failed ?? []));
  if (index + syncBatchSize < repositories.length) {
    await delay(delayMs);
  }
}

const alternativesRuns = [];
for (let index = 0; index < alternativesBatches; index += 1) {
  const result = await requestJsonWithRetry(`/api/admin/alternatives/progress?limit=${alternativesBatchSize}`, {
    method: "POST",
    headers: adminHeaders()
  });
  alternativesRuns.push({
    cursor: result.cursor,
    next_cursor: result.next_cursor,
    updated: result.updated,
    complete: result.batch?.complete === true
  });
  if (index + 1 < alternativesBatches) {
    await delay(delayMs);
  }
}

const [finalStatus, quality] = await Promise.all([
  requestJsonWithRetry(cacheBustedPath("/api/sync/status?require_d1=true"), { method: "GET" }),
  requestJsonWithRetry(cacheBustedPath("/api/quality?require_d1=true"), { method: "GET" })
]);
const staleProjectCount = Number(quality.coverage?.stale_project_count ?? 0);
const summary = {
  baseUrls,
  selectedRepositoryCount: repositories.length,
  repositories,
  syncRuns,
  failures,
  alternativesRuns,
  final: {
    syncHealth: finalStatus.health,
    syncFreshness: finalStatus.freshness,
    overdueCounts: finalStatus.priority?.stale_counts,
    refreshDueCounts: finalStatus.priority?.refresh_due_counts,
    alternativesFreshness: finalStatus.derived?.alternatives?.freshness,
    releaseScore: quality.release_score,
    dataTrustScore: quality.data_trust_score,
    staleProjectCount
  }
};
console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0 || staleProjectCount > 0 || finalStatus.health !== "healthy" || finalStatus.freshness !== "fresh") {
  process.exitCode = 1;
}

function adminHeaders(extra = {}) {
  return { authorization: `Bearer ${syncSecret}`, ...extra };
}

async function requestJsonWithRetry(path, init) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await requestJson(path, init, baseUrls[(attempt - 1) % baseUrls.length]);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await delay(delayMs * attempt);
      }
    }
  }
  throw lastError ?? new Error(`Request failed for ${path}`);
}

async function requestJson(path, init, baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Expected JSON from ${path}, got HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    if (!response.ok) {
      throw new Error(`Request failed for ${path} with HTTP ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function boundedInteger(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return number;
}

function envValue(name, fallback) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function cacheBustedPath(path) {
  return `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
