import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const qualityReport = {
  score: 100,
  risk_level: "medium",
  risk_summary: {
    level: "medium",
    reasons: ["Mock quality risk reason."]
  },
  project_count: 1,
  issue_count: 0,
  error_count: 0,
  warning_count: 0,
  issues: [],
  metadata: {
    source: "d1",
    reason: "d1_query"
  }
};

const target = `data:application/json,${encodeURIComponent(JSON.stringify(qualityReport))}`;
const { stdout } = await execFileAsync("node", ["scripts/check-quality.mjs", "--target", target], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    MIN_QUALITY_SCORE: "90"
  }
});
const summary = JSON.parse(stdout);

assert.equal(summary.score, 100);
assert.equal(summary.source, "d1");
assert.equal(summary.risk_level, "medium");
assert.equal(summary.risk_reason_count, 1);
assert.equal(summary.reason, "d1_query");

console.log("Validated quality check CLI summary fields.");
