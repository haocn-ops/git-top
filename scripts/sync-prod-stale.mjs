const baseUrls = ["https://git.top", "https://git-top.izhenghaocn.workers.dev"];
const syncSecret = process.env.SYNC_SECRET;
const batchSize = positiveInteger(process.env.GIT_TOP_STALE_BATCH_SIZE ?? 5, "batch size");
const delayMs = positiveInteger(process.env.GIT_TOP_SYNC_DELAY_MS ?? 3_000, "delay");
const maxRetries = positiveInteger(process.env.GIT_TOP_SYNC_MAX_RETRIES ?? 8, "max retries");
const timeoutMs = positiveInteger(process.env.GIT_TOP_SYNC_TIMEOUT_MS ?? 120_000, "timeout");

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required.");
}

const quality = await requestJsonWithRetry("/api/quality", { method: "GET" });
const repositories = Array.from(
  new Set(
    (quality.issues ?? [])
      .filter((issue) => issue.code === "stale_sync" && typeof issue.project_id === "string")
      .map((issue) => issue.project_id)
  )
);
const runs = [];
const failures = [];

for (let index = 0; index < repositories.length; index += batchSize) {
  const batch = repositories.slice(index, index + batchSize);
  const result = await requestJsonWithRetry("/api/admin/sync", {
    method: "POST",
    headers: {
      authorization: `Bearer ${syncSecret}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ repositories: batch, limit: batch.length, signal_depth: "lite", refresh_derived: false })
  });
  runs.push({ index, repositories: batch, synced: result.synced, failed: result.failed });
  failures.push(...(result.failed ?? []));
  console.error(`Refreshed stale batch ${Math.floor(index / batchSize) + 1}/${Math.ceil(repositories.length / batchSize)}: synced ${result.synced?.length ?? 0}, failed ${result.failed?.length ?? 0}.`);
  if (index + batchSize < repositories.length) {
    await delay(delayMs);
  }
}

const finalQuality = await requestJsonWithRetry("/api/quality", { method: "GET" });
const refreshedRepositorySet = new Set(repositories.map((repository) => repository.toLowerCase()));
const remainingStale = (finalQuality.issues ?? [])
  .filter(
    (issue) =>
      issue.code === "stale_sync" &&
      typeof issue.project_id === "string" &&
      refreshedRepositorySet.has(issue.project_id.toLowerCase())
  )
  .map((issue) => issue.project_id);

console.log(JSON.stringify({ repositoryCount: repositories.length, batchSize, runs, failures, remainingStale }, null, 2));
if (failures.length > 0 || remainingStale.length > 0) {
  process.exitCode = 1;
}

async function requestJsonWithRetry(path, init) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await requestJson(path, init, baseUrls[(attempt - 1) % baseUrls.length]);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await delay(attempt * 2_000);
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

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
