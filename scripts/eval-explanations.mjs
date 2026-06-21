import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { handleApi } from "../src/api.ts";
import { mockD1Env, mockD1ProjectId } from "./mock-d1.mjs";

const reportPath = new URL("../docs/EVAL_EXPLANATIONS.md", import.meta.url);

const checks = [];

await check("project lookup exposes source metadata", async () => {
  const response = await request(`/api/project/${encodeURIComponent(mockD1ProjectId)}`, mockD1Env());
  assert.equal(response.status, 200);
  assert.equal(response.body.metadata.source, "d1");
  assert.equal(response.body.metadata.reason, "d1_query");
  assert.equal(response.body.metadata.project_count, 1);
});

await check("project lookup exposes classification evidence", async () => {
  const response = await request(`/api/project/${encodeURIComponent(mockD1ProjectId)}`, mockD1Env());
  assert.equal(response.status, 200);
  assert.equal(response.body.classification.category.confidence, "high");
  assert.ok(response.body.classification.category.evidence.length > 0);
  assert.equal(response.body.classification.deployment.confidence, "high");
  assert.ok(response.body.classification.deployment.evidence.length > 0);
});

await check("project lookup exposes quality signal confidence", async () => {
  const response = await request(`/api/project/${encodeURIComponent(mockD1ProjectId)}`, mockD1Env());
  assert.equal(response.status, 200);
  assert.equal(response.body.quality_signal_confidence.stars_30d_delta, "snapshot");
  assert.equal(response.body.quality_signal_confidence.stars30d_window_days, 30);
  assert.equal(response.body.quality_signal_confidence.commits_30d, "complete");
});

await check("recommendations include reason and tradeoff fields", async () => {
  const response = await request("/api/recommend?use_case=cloudflare%20agent%20framework&deployment=cloudflare&cloudflare_ready=true&limit=1");
  assert.equal(response.status, 200);
  assert.equal(response.body.metadata.source, "seed");
  assert.ok(response.body.recommendations.length > 0);
  const recommendation = response.body.recommendations[0];
  assert.equal(typeof recommendation.reason, "string");
  assert.ok(recommendation.reason.length > 0);
  assert.ok(Array.isArray(recommendation.tradeoffs));
  assert.ok(recommendation.agent_card.summary_for_agent.length > 0);
  assert.ok(Array.isArray(recommendation.agent_card.not_good_for));
});

await check("quality report exposes score and risk explanation", async () => {
  const response = await request("/api/quality", mockD1Env());
  assert.equal(response.status, 200);
  assert.equal(response.body.metadata.source, "d1");
  assert.ok(["low", "medium", "high"].includes(response.body.risk_level));
  assert.equal(response.body.risk_summary.level, response.body.risk_level);
  assert.ok(Array.isArray(response.body.risk_summary.reasons));
  assert.ok(typeof response.body.coverage.low_confidence_classification_count === "number");
});

await check("health explains raw versus knowledge-ready counts", async () => {
  const response = await request("/api/health", mockD1Env({ rawProjectCount: 2 }));
  assert.equal(response.status, 200);
  assert.equal(response.body.metadata.source, "d1");
  assert.equal(response.body.project_count, 1);
  assert.equal(response.body.raw_project_count, 2);
  assert.equal(response.body.knowledge_ready_project_count, 1);
  assert.ok(response.body.metadata.warnings[0].includes("missing complete Agent Card or metric knowledge"));
});

await check("GRP exposes graph reasoning and data-source metadata", async () => {
  const response = await request(
    "/api/grp/query",
    mockD1Env(),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        goal: "find a Cloudflare-ready agent framework",
        mode: "find",
        constraints: {
          deploy: ["cloudflare"],
          agent_ready: true
        }
      })
    }
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.metadata.version, "grp.v1");
  assert.equal(response.body.metadata.data_source.source, "d1");
  const projectNode = response.body.nodes.find((node) => node.kind === "project");
  assert.ok(projectNode, "expected at least one project node");
  assert.ok(projectNode.reasons.length > 0);
  assert.ok(projectNode.score.final_score >= 0);
});

await writeFile(reportPath, `${toMarkdown(checks)}\n`);

const failed = checks.filter((item) => !item.ok);
console.log(
  JSON.stringify(
    {
      output: "docs/EVAL_EXPLANATIONS.md",
      checks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length
    },
    null,
    2
  )
);

if (failed.length > 0) {
  throw new Error(`Explanation eval failed: ${failed.map((item) => item.name).join(", ")}`);
}

async function check(name, run) {
  try {
    await run();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function request(path, env = {}, init = {}) {
  const response = await handleApi(new Request(`https://git.top${path}`, init), env);
  return {
    status: response.status,
    body: await response.json()
  };
}

function toMarkdown(items) {
  return [
    "# Git.Top Explanation Eval",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "This report validates that agent-facing API responses include explanation material, not only project IDs and scores.",
    "",
    "## Summary",
    "",
    `- Checks: ${items.length}`,
    `- Passed: ${items.filter((item) => item.ok).length}`,
    `- Failed: ${items.filter((item) => !item.ok).length}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Notes |",
    "| --- | --- | --- |",
    ...items.map((item) => `| ${escapeCell(item.name)} | ${item.ok ? "pass" : "fail"} | ${escapeCell(item.message ?? "")} |`)
  ].join("\n");
}

function escapeCell(value) {
  return value.replaceAll("|", "\\|");
}
