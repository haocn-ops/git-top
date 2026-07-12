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
const maxRetries = positiveInteger(process.env.GIT_TOP_SYNC_MAX_RETRIES ?? 6, "max retries");
const batchDelayMs = positiveInteger(process.env.GIT_TOP_ALTERNATIVES_DELAY_MS ?? 3_000, "batch delay");
const startOffset = nonNegativeInteger(process.env.GIT_TOP_ALTERNATIVES_START_OFFSET ?? 0, "start offset");

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required.");
}

const health = await requestJson("/api/health", { method: "GET" }, baseUrls[0]);
const projectCount = Number(health.project_count ?? health.metadata?.project_count ?? 0);
if (!Number.isInteger(projectCount) || projectCount <= 0) {
  throw new Error(`Could not determine production project count: ${JSON.stringify(health).slice(0, 300)}`);
}

const batches = [];
for (let offset = startOffset; offset < projectCount; offset += batchSize) {
  const recordRun = offset + batchSize >= projectCount;
  const result = await requestJsonWithRetry(
    `/api/admin/alternatives?offset=${offset}&limit=${batchSize}&record_run=${recordRun}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${syncSecret}` }
    }
  );
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

console.log(JSON.stringify({ baseUrls, projectCount, startOffset, batchSize, batchDelayMs, batches }, null, 2));

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
