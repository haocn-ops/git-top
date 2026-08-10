import { cacheBustedPath, requestJsonWithRetry } from "./prod-http-client.mjs";

const baseUrls = ["https://git.top", "https://git-top.izhenghaocn.workers.dev"];
const syncSecret = process.env.SYNC_SECRET;
const batchSize = positiveInteger(process.env.GIT_TOP_STALE_BATCH_SIZE ?? 5, "batch size");
const delayMs = positiveInteger(process.env.GIT_TOP_SYNC_DELAY_MS ?? 3_000, "delay");
const maxRetries = positiveInteger(process.env.GIT_TOP_SYNC_MAX_RETRIES ?? 8, "max retries");
const timeoutMs = positiveInteger(process.env.GIT_TOP_SYNC_TIMEOUT_MS ?? 120_000, "timeout");

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required.");
}

const quality = await requestProductionJson(cacheBustedPath("/api/quality?require_d1=true"), { method: "GET" });
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
  const result = await requestProductionJson("/api/admin/sync", {
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

const finalQuality = await requestProductionJson(cacheBustedPath("/api/quality?require_d1=true"), { method: "GET" });
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

function requestProductionJson(path, init) {
  return requestJsonWithRetry({
    path,
    init,
    baseUrls,
    maxRetries,
    timeoutMs,
    onRetry: ({ nextAttempt, maxRetries: retryLimit, baseUrl, delayMs, error }) => {
      console.error(
        `Retrying ${path} after ${errorMessage(error)} from ${baseUrl}; ` +
          `attempt ${nextAttempt}/${retryLimit} in ${delayMs}ms.`
      );
    }
  });
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
