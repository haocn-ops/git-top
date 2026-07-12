import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { generateAlternativesForAll } from "../src/alternatives.ts";
import { rowToKnowledge } from "../src/db-mapping.ts";

const execFileAsync = promisify(execFile);
const databasePath = process.argv[2];
const outputPath = process.argv[3];
if (!databasePath || !outputPath) {
  throw new Error("Usage: node scripts/generate-alternatives-sql-from-sqlite.mjs <database.sqlite> <output.sql>");
}

const query = `SELECT
  p.*,
  ac.project_id AS ac_project_id,
  ac.project_kind,
  ac.collection_json,
  ac.category,
  ac.difficulty,
  ac.deployment_json,
  ac.cloudflare_ready,
  ac.use_cases_json,
  ac.not_good_for_json,
  ac.alternatives_json,
  ac.summary_for_agent,
  ac.classification_json,
  ac.schema_version,
  ac.generated_at,
  pm.project_id AS pm_project_id,
  pm.stars_30d_delta,
  pm.commits_30d,
  pm.releases_180d,
  pm.contributors_90d,
  pm.issue_first_response_median_hours,
  pm.recent_push_days,
  pm.git_score,
  pm.maintenance_score,
  pm.signal_confidence_json,
  pm.calculated_at,
  co.category AS override_category,
  co.difficulty AS override_difficulty,
  co.deployment_json AS override_deployment_json,
  co.cloudflare_ready AS override_cloudflare_ready,
  co.classification_json AS override_classification_json
FROM projects p
JOIN agent_cards ac ON ac.project_id = p.id
JOIN project_metrics pm ON pm.project_id = p.id
LEFT JOIN classification_overrides co ON co.project_id = p.id
ORDER BY pm.git_score DESC, p.stars DESC`;

const { stdout } = await execFileAsync("sqlite3", ["-json", databasePath, query], { maxBuffer: 32 * 1024 * 1024 });
const rows = JSON.parse(stdout || "[]");
const projects = rows.map(rowToKnowledge);
const result = generateAlternativesForAll(projects);
const now = new Date().toISOString();
const summary = {
  updated: result.updated,
  candidate_count: result.updates.length,
  project_count: projects.length,
  source: "d1",
  source_reason: "offline_d1_refresh"
};
const statements = [
  ...result.updates.map(
    (update) =>
      `UPDATE agent_cards SET alternatives_json = ${sqlString(JSON.stringify(update.alternatives))} WHERE project_id = ${sqlString(update.projectId)};`
  ),
  `INSERT INTO governance_runs (id, task, status, trigger, started_at, finished_at, duration_ms, summary_json, report_url, error, created_at) VALUES (${sqlString(randomUUID())}, 'derived:alternatives', 'success', 'manual', ${sqlString(now)}, ${sqlString(now)}, 0, ${sqlString(JSON.stringify(summary))}, NULL, NULL, ${sqlString(now)});`
];

await writeFile(outputPath, `${statements.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ databasePath, outputPath, projects: projects.length, updates: result.updates.length }, null, 2));

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
