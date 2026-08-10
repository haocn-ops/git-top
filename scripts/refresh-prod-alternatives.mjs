import { requestJsonWithRetry } from "./prod-http-client.mjs";

const baseUrls = Array.from(
  new Set(
    (process.env.GIT_TOP_ALTERNATIVES_BASE_URLS ?? `${process.env.GIT_TOP_SYNC_BASE_URL ?? "https://git.top"},https://git-top.izhenghaocn.workers.dev`)
      .split(",")
      .map((value) => value.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  )
);
const syncSecret = process.env.SYNC_SECRET;
const batchSize = boundedPositiveInteger(process.env.GIT_TOP_ALTERNATIVES_BATCH_SIZE ?? 20, "batch size", 25);
const timeoutMs = positiveInteger(process.env.GIT_TOP_SYNC_TIMEOUT_MS ?? 120_000, "timeout");
const maxRetries = positiveInteger(process.env.GIT_TOP_SYNC_MAX_RETRIES ?? 10, "max retries");
const batchDelayMs = positiveInteger(process.env.GIT_TOP_ALTERNATIVES_DELAY_MS ?? 3_000, "batch delay");
const startOffset = nonNegativeInteger(process.env.GIT_TOP_ALTERNATIVES_START_OFFSET ?? 0, "start offset");
const maxBatches = nonNegativeInteger(process.env.GIT_TOP_ALTERNATIVES_MAX_BATCHES ?? 0, "max batches");

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required.");
}

const health = await requestJsonWithRetry({
  path: "/api/health",
  init: { method: "GET" },
  baseUrls,
  maxRetries,
  timeoutMs,
  onRetry: ({ nextAttempt, maxRetries: retryLimit, baseUrl, delayMs, error }) => {
    console.error(
      `Retrying production health request after ${errorMessage(error)} from ${baseUrl}; ` +
        `attempt ${nextAttempt}/${retryLimit} in ${delayMs}ms.`
    );
  }
});
const projectCount = Number(health.project_count ?? health.metadata?.project_count ?? 0);
if (!Number.isInteger(projectCount) || projectCount <= 0) {
  throw new Error(`Could not determine production project count: ${JSON.stringify(health).slice(0, 300)}`);
}

const batches = [];
const endOffset = maxBatches === 0 ? projectCount : Math.min(projectCount, startOffset + batchSize * maxBatches);
for (let offset = startOffset; offset < endOffset; offset += batchSize) {
  const recordRun = offset + batchSize >= projectCount;
  const path = `/api/admin/alternatives?offset=${offset}&limit=${batchSize}&record_run=${recordRun}`;
  let result;
  try {
    result = await requestJsonWithRetry({
      path,
      init: {
        method: "POST",
        headers: { authorization: `Bearer ${syncSecret}` }
      },
      baseUrls,
      maxRetries,
      timeoutMs,
      onRetry: ({ nextAttempt, maxRetries: retryLimit, baseUrl, delayMs, error }) => {
        console.error(
          `Retrying alternatives offset ${offset} after ${errorMessage(error)} from ${baseUrl}; ` +
            `attempt ${nextAttempt}/${retryLimit} in ${delayMs}ms.`
        );
      }
    });
  } catch (error) {
    const checkpoint = {
      baseUrls,
      projectCount,
      startOffset,
      endOffset,
      nextStartOffset: offset,
      complete: false,
      batchSize,
      maxBatches,
      batchDelayMs,
      batches,
      failedOffset: offset
    };
    console.error(`Alternatives refresh interrupted at offset ${offset}; resume with GIT_TOP_ALTERNATIVES_START_OFFSET=${offset}.`);
    console.error(JSON.stringify(checkpoint, null, 2));
    throw new Error(`Alternatives refresh failed at offset ${offset}. Resume from offset ${offset}.`, { cause: error });
  }
  batches.push({
    offset,
    updated: result.updated,
    nextOffset: result.batch?.next_offset,
    complete: result.batch?.complete
  });
  console.error(`Refreshed alternatives batch at offset ${offset}: ${result.updated} projects.`);
  if (offset + batchSize < projectCount) {
    await delay(batchDelayMs);
  }
}

const nextStartOffset = batches.at(-1)?.nextOffset ?? startOffset;
console.log(
  JSON.stringify(
    {
      baseUrls,
      projectCount,
      startOffset,
      endOffset,
      nextStartOffset,
      complete: nextStartOffset >= projectCount,
      batchSize,
      maxBatches,
      batchDelayMs,
      batches
    },
    null,
    2
  )
);

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
}

function boundedPositiveInteger(value, name, maximum) {
  const number = positiveInteger(value, name);
  if (number > maximum) {
    throw new Error(`${name} must be at most ${maximum}.`);
  }
  return number;
}

function nonNegativeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return number;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
