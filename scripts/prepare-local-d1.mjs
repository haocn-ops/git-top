import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const databaseName = process.env.GIT_TOP_D1_DATABASE ?? "git-top";
const wranglerArgs = ["exec", "wrangler", "d1", "execute", databaseName, "--local"];

await wranglerD1(["--file=./schema.sql"]);
await ensureColumn("project_metrics", "signal_confidence_json", "TEXT NOT NULL DEFAULT '{}'");
await ensureColumn("agent_cards", "project_kind", "TEXT NOT NULL DEFAULT 'project'");
await ensureColumn("agent_cards", "collection_json", "TEXT NOT NULL DEFAULT '{}'");
await ensureColumn("agent_cards", "classification_json", "TEXT NOT NULL DEFAULT '{}'");
await ensureTable(
  "star_snapshots",
  `CREATE TABLE IF NOT EXISTS star_snapshots (
    project_id TEXT NOT NULL,
    stars INTEGER NOT NULL,
    captured_at TEXT NOT NULL,
    PRIMARY KEY (project_id, captured_at),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );`
);
await ensureTable(
  "classification_overrides",
  `CREATE TABLE IF NOT EXISTS classification_overrides (
    project_id TEXT PRIMARY KEY,
    category TEXT,
    difficulty TEXT,
    deployment_json TEXT,
    cloudflare_ready INTEGER,
    classification_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );`
);
await ensureIndex(
  "idx_classification_overrides_reviewed_at",
  "CREATE INDEX IF NOT EXISTS idx_classification_overrides_reviewed_at ON classification_overrides(reviewed_at DESC);"
);
await ensureTable(
  "governance_runs",
  `CREATE TABLE IF NOT EXISTS governance_runs (
    id TEXT PRIMARY KEY,
    task TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL DEFAULT '{}',
    report_url TEXT,
    error TEXT,
    created_at TEXT NOT NULL
  );`
);
await ensureIndex(
  "idx_governance_runs_task_started_at",
  "CREATE INDEX IF NOT EXISTS idx_governance_runs_task_started_at ON governance_runs(task, started_at DESC);"
);
await ensureIndex(
  "idx_governance_runs_started_at",
  "CREATE INDEX IF NOT EXISTS idx_governance_runs_started_at ON governance_runs(started_at DESC);"
);

console.log(`Prepared local D1 database ${databaseName}.`);

async function ensureColumn(table, column, definition) {
  const info = await wranglerD1(["--json", "--command", `PRAGMA table_info(${table});`]);
  const rows = parseD1Results(info.stdout);
  if (rows.some((row) => row.name === column)) {
    return;
  }

  await wranglerD1(["--command", `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`]);
  console.log(`Added missing local D1 column ${table}.${column}.`);
}

async function ensureTable(table, statement) {
  const info = await wranglerD1(["--json", "--command", `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${table}';`]);
  const rows = parseD1Results(info.stdout);
  if (rows.some((row) => row.name === table)) {
    return;
  }

  await wranglerD1(["--command", statement]);
  console.log(`Added missing local D1 table ${table}.`);
}

async function ensureIndex(indexName, statement) {
  const info = await wranglerD1(["--json", "--command", `SELECT name FROM sqlite_master WHERE type = 'index' AND name = '${indexName}';`]);
  const rows = parseD1Results(info.stdout);
  if (rows.some((row) => row.name === indexName)) {
    return;
  }

  await wranglerD1(["--command", statement]);
  console.log(`Added missing local D1 index ${indexName}.`);
}

async function wranglerD1(args) {
  return execFileAsync("pnpm", [...wranglerArgs, ...args], {
    cwd: new URL("..", import.meta.url),
    maxBuffer: 1024 * 1024 * 8
  });
}

function parseD1Results(stdout) {
  const parsed = JSON.parse(stdout);
  return parsed.flatMap((item) => item.results ?? []);
}
