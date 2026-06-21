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
