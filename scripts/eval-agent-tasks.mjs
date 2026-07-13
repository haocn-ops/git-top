import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { handleApi } from "../src/api.ts";
import { mockD1Env } from "./mock-d1.mjs";
import { seedProjects } from "../src/seed.ts";

const reportPath = new URL("../docs/AGENT_TASK_EVAL.md", import.meta.url);
const results = [];

await task("trust-first-d1-preflight", ["health", "trust", "search"], async () => {
  const env = mockD1Env({ knowledge: seedProjects });
  const health = await request("/api/health", env);
  assert.equal(health.status, 200);
  assert.equal(health.body.db, "available");
  assert.equal(health.body.metadata.source, "d1");
  const trust = await request("/api/trust", env);
  assert.equal(trust.status, 200);
  assert.ok(["allow", "caution", "block"].includes(trust.body.decision));
  assert.equal(trust.body.metadata.source, "d1");
  const search = await request("/api/search?q=cloudflare%20agent&limit=3&require_d1=true", env);
  assert.equal(search.status, 200);
  assert.equal(search.body.page.snapshot_id, search.body.metadata.snapshot_id);
});

await task("fallback-disclosure-and-fail-closed", ["search seed fallback", "strict D1 rejection"], async () => {
  const fallback = await request("/api/search?q=agent&limit=2", {});
  assert.equal(fallback.status, 200);
  assert.equal(fallback.body.metadata.source, "seed");
  assert.ok(Array.isArray(fallback.body.metadata.warnings));
  const strict = await request("/api/search?q=agent&limit=2&require_d1=true", {});
  assert.equal(strict.status, 503);
  assert.equal(strict.body.error.code, "d1_required");
});

await task("snapshot-pagination", ["search page 1", "search page 2"], async () => {
  const env = mockD1Env({ knowledge: seedProjects });
  const first = await request("/api/search?limit=2&require_d1=true", env);
  assert.equal(first.status, 200);
  assert.equal(first.body.page.has_more, true);
  const second = await request(`/api/search?limit=2&require_d1=true&cursor=${encodeURIComponent(first.body.page.next_cursor)}`, env);
  assert.equal(second.status, 200);
  assert.equal(second.body.page.offset, 2);
  assert.equal(second.body.page.snapshot_id, first.body.page.snapshot_id);
  assert.equal(second.body.projects.some((item) => first.body.projects.some((firstItem) => firstItem.repo === item.repo)), false);
});

await task("evidence-to-alternatives-to-compare", ["project evidence", "alternatives", "compare"], async () => {
  const env = mockD1Env({ knowledge: seedProjects });
  const project = await request("/api/project/cloudflare/agents?require_d1=true", env);
  assert.equal(project.status, 200);
  assert.ok(project.body.evidence);
  assert.ok(Array.isArray(project.body.evidence.source_fields));
  const alternatives = await request("/api/alternatives/cloudflare%2Fagents?limit=2&require_d1=true", env);
  assert.equal(alternatives.status, 200);
  assert.ok(Array.isArray(alternatives.body.alternative_matches));
  const compare = await request("/api/compare?require_d1=true", env, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project_ids: ["cloudflare/agents", "langchain-ai/langchain"], deployment: "cloudflare" })
  });
  assert.equal(compare.status, 200);
  assert.equal(compare.body.projects.length, 2);
  assert.ok(compare.body.winner);
});

await task("change-feed-tombstone", ["change feed", "deletion tombstone"], async () => {
  const env = mockD1Env({
    knowledge: seedProjects,
    syncState: { project_change_feed_started_at: "2026-07-01T00:00:00.000Z" },
    projectChanges: [{
      id: 1,
      project_id: "retired/project",
      change_type: "deleted",
      changed_fields_json: '["project"]',
      before_json: '{"full_name":"retired/project"}',
      after_json: null,
      occurred_at: "2026-07-12T00:00:00.000Z"
    }]
  });
  const changes = await request("/api/changes?limit=10", env);
  assert.equal(changes.status, 200);
  assert.equal(changes.body.changes[0].project_id, "retired/project");
  assert.equal(changes.body.changes[0].tombstone, true);
  assert.ok(changes.body.page.next_cursor);
});

await task("review-gated-feedback", ["feedback validation", "no anonymous persistence"], async () => {
  const response = await request("/api/feedback/proposals", mockD1Env(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents",
      feedback_type: "classification",
      proposed: { category: "agent_framework" },
      evidence: [{ url: "https://github.com/cloudflare/agents", field: "README" }],
      rationale: "The README explicitly describes an agent framework."
    })
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.persisted, false);
  assert.equal(response.body.review_required, true);
  assert.ok(response.body.proposal.fingerprint);
});

await task("multilingual-and-typo-intent", ["Chinese query", "typo correction"], async () => {
  const chinese = await request(`/api/search?q=${encodeURIComponent("智能体框架")}&limit=3`, {});
  assert.equal(chinese.status, 200);
  assert.equal(chinese.body.search.query_interpretation.normalized, "agent framework");
  assert.ok(chinese.body.projects.length > 0);
  const typo = await request("/api/search?q=langchian&limit=1", {});
  assert.equal(typo.status, 200);
  assert.equal(typo.body.search.query_interpretation.normalized, "langchain");
  assert.equal(typo.body.projects[0].repo, "langchain-ai/langchain");
});

await task("renamed-project-alias", ["alias resolution", "canonical project response"], async () => {
  const response = await request("/api/project/llamaindex", {});
  assert.equal(response.status, 200);
  assert.equal(response.body.resolved_from.resolution, "alias");
  assert.equal(response.body.repo, "run-llama/llama_index");
});

const passed = results.filter((result) => result.status === "passed").length;
const report = {
  generated_at: new Date().toISOString(),
  task_count: results.length,
  passed,
  failed: results.length - passed,
  success_rate: results.length === 0 ? 0 : passed / results.length,
  tasks: results
};

await writeFile(reportPath, `${markdown(report)}\n`);
console.log(JSON.stringify({ output: "docs/AGENT_TASK_EVAL.md", ...report }, null, 2));

if (report.failed > 0) {
  throw new Error(`${report.failed} agent task evaluation(s) failed.`);
}

async function task(id, steps, run) {
  try {
    await run();
    results.push({ id, status: "passed", steps, error: null });
  } catch (error) {
    results.push({ id, status: "failed", steps, error: error instanceof Error ? error.message : String(error) });
  }
}

async function request(path, env, init = {}) {
  const response = await handleApi(new Request(`https://git.top${path}`, init), env);
  return { status: response.status, body: await response.json() };
}

function markdown(report) {
  const rows = report.tasks.map((item) => `| ${item.id} | ${item.status} | ${item.steps.join(" -> ")} | ${item.error ?? "-"} |`).join("\n");
  return `# Git.Top Agent Task Evaluation

Generated: ${report.generated_at}

This CI gate validates complete agent workflows across trust, retrieval, evidence, pagination, comparison, change handling, feedback governance, fallback, multilingual input, typos, and renamed-project aliases.

## Summary

- Tasks: ${report.task_count}
- Passed: ${report.passed}
- Failed: ${report.failed}
- Success rate: ${(report.success_rate * 100).toFixed(1)}%

## Tasks

| Task | Status | Workflow | Error |
| --- | --- | --- | --- |
${rows}`;
}
