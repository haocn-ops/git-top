const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.GIT_TOP_SYNC_BASE_URL ?? "https://git.top");
const syncSecret = options.syncSecret ?? process.env.SYNC_SECRET;
const limit = positiveInteger(options.limit ?? process.env.GIT_TOP_SYNC_LIMIT ?? 40, "limit");
const rounds = positiveInteger(options.rounds ?? process.env.GIT_TOP_SYNC_ROUNDS ?? 1, "rounds");
const timeoutMs = positiveInteger(options.timeoutMs ?? process.env.GIT_TOP_SYNC_TIMEOUT_MS ?? 30_000, "timeout-ms");
const signalDepth = options.signalDepth ?? process.env.GIT_TOP_SYNC_SIGNAL_DEPTH ?? "lite";
const refreshCycle = options.refreshCycle ?? process.env.GIT_TOP_SYNC_REFRESH_CYCLE === "true";
const delayMs = positiveInteger(options.delayMs ?? process.env.GIT_TOP_SYNC_DELAY_MS ?? 1_000, "delay-ms");
const maxRetries = positiveInteger(options.maxRetries ?? process.env.GIT_TOP_SYNC_MAX_RETRIES ?? 3, "max-retries");

if (!syncSecret) {
  throw new Error("SYNC_SECRET is required. Set it in the environment or pass --sync-secret.");
}

if (!["full", "lite"].includes(signalDepth)) {
  throw new Error(`signal-depth must be full or lite; got ${signalDepth}`);
}

const runs = [];
let status = await getStatus();

for (let round = 1; round <= rounds; round += 1) {
  if (status.remaining_count === 0 && !refreshCycle) {
    break;
  }

  const result = await postSync({ limit, signal_depth: signalDepth, refresh_derived: false });
  const nextOffset = result.nextOffset ?? result.next_offset;
  runs.push({
    round,
    offset: result.offset,
    nextOffset,
    synced: result.synced,
    failed: result.failed,
    alternativesUpdated: result.alternativesUpdated ?? result.alternatives_updated ?? 0
  });
  console.error(`Completed sync round ${round}/${rounds}: offset ${result.offset} -> ${nextOffset}, synced ${result.synced.length}, failed ${result.failed.length}.`);

  if (Array.isArray(result.failed) && result.failed.length > 0) {
    status = await getStatus();
    break;
  }

  if (!refreshCycle) {
    status = await getStatus();
  }
  if (round < rounds) {
    await delay(delayMs);
  }
}

if (refreshCycle) {
  status = await getStatus();
}

console.log(
  JSON.stringify(
    {
      baseUrl,
      limit,
      roundsRequested: rounds,
      signalDepth,
      refreshCycle,
      delayMs,
      maxRetries,
      runs,
      status
    },
    null,
    2
  )
);

if (runs.some((run) => run.failed.length > 0)) {
  process.exitCode = 1;
}

async function getStatus() {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const { status, body } = await requestJson("/api/sync/status", { method: "GET" });
      if (status === 200) {
        return body;
      }
      lastError = new Error(`sync status failed with HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`);
      if (status < 500 && status !== 429) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxRetries) {
      await delay(delayMs * attempt * 2);
    }
  }
  throw lastError ?? new Error("sync status failed without a response");
}

async function postSync(body) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const { status, body: responseBody } = await requestJson("/api/admin/sync", {
        method: "POST",
        headers: {
          authorization: `Bearer ${syncSecret}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (status === 200) {
        return responseBody;
      }
      lastError = new Error(`admin sync failed with HTTP ${status}: ${JSON.stringify(responseBody).slice(0, 300)}`);
      if (status < 500 && status !== 429) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < maxRetries) {
      await delay(delayMs * attempt * 2);
    }
  }
  throw lastError ?? new Error("admin sync failed without a response");
}

async function requestJson(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return {
        status: response.status,
        body: { raw: text.slice(0, 300), content_type: response.headers.get("content-type") }
      };
    }
    return {
      status: response.status,
      body
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--limit") {
      parsed.limit = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      parsed.limit = arg.slice("--limit=".length);
    } else if (arg === "--rounds") {
      parsed.rounds = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--rounds=")) {
      parsed.rounds = arg.slice("--rounds=".length);
    } else if (arg === "--signal-depth") {
      parsed.signalDepth = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--signal-depth=")) {
      parsed.signalDepth = arg.slice("--signal-depth=".length);
    } else if (arg === "--sync-secret") {
      parsed.syncSecret = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--sync-secret=")) {
      parsed.syncSecret = arg.slice("--sync-secret=".length);
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
    } else if (arg === "--refresh-cycle") {
      parsed.refreshCycle = true;
    } else if (arg === "--delay-ms") {
      parsed.delayMs = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--delay-ms=")) {
      parsed.delayMs = arg.slice("--delay-ms=".length);
    } else if (arg === "--max-retries") {
      parsed.maxRetries = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--max-retries=")) {
      parsed.maxRetries = arg.slice("--max-retries=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
