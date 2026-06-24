const options = parseArgs(process.argv.slice(2));
const token = process.env.GOVERNANCE_RECORD_SECRET ?? process.env.SYNC_SECRET;
const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.GIT_TOP_GOVERNANCE_BASE_URL ?? "https://git.top");

if (!token) {
  console.log("Skipping governance run recording because GOVERNANCE_RECORD_SECRET or SYNC_SECRET is not set.");
  process.exit(0);
}

if (!options.task || !options.status) {
  console.error("Usage: node scripts/record-governance-run.mjs --task <name> --status <success|failed|running|skipped> [--summary-file file]");
  process.exit(1);
}

const summary = options.summaryFile ? await readJsonFile(options.summaryFile, {}) : {};
const error = options.errorFile ? await readTextFile(options.errorFile) : options.error;
const defaultReportUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;

const body = {
  id: options.id ?? defaultRunId(options.task),
  task: options.task,
  status: options.status,
  trigger: options.trigger ?? "github_actions",
  started_at: options.startedAt,
  finished_at: options.finishedAt ?? new Date().toISOString(),
  duration_ms: options.durationMs === undefined ? undefined : Number(options.durationMs),
  summary,
  report_url: options.reportUrl ?? defaultReportUrl,
  error: error || null
};

const response = await fetch(`${baseUrl}/api/admin/governance/runs`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json"
  },
  body: JSON.stringify(body)
});

const responseBody = await response.text();
if (!response.ok) {
  console.error(`Governance run recording failed with HTTP ${response.status}: ${responseBody}`);
  process.exit(1);
}

console.log(responseBody);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }
    parsed[key] = value;
  }
  return parsed;
}

async function readJsonFile(path, fallback) {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function readTextFile(path) {
  try {
    const { readFile } = await import("node:fs/promises");
    return (await readFile(path, "utf8")).slice(0, 4000);
  } catch {
    return "";
  }
}

function defaultRunId(task) {
  const runId = process.env.GITHUB_RUN_ID ?? crypto.randomUUID();
  const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
  return `${task}-${runId}-${attempt}`;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/g, "");
}
