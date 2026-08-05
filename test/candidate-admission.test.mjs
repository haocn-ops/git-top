import assert from "node:assert/strict";
import test from "node:test";

import { candidateDiscoveryPlan, evaluateCandidateAdmission } from "../src/candidate-discovery.ts";

const now = new Date("2026-07-12T00:00:00Z");

test("candidate admission accepts relevant active repositories with sufficient authority", () => {
  const decision = evaluateCandidateAdmission(
    {
      repository: "example/agent-runtime",
      category: "agent_framework",
      source: "github_search",
      sourceQuery: "ai agent framework",
      stars: 500,
      pushedAt: "2026-07-01T00:00:00Z",
      description: "An AI agent framework with tool calling and multi-agent workflows."
    },
    now
  );

  assert.equal(decision.admitted, true);
  assert.deepEqual(decision.signals, { active: true, relevant: true, described: true, authority: true });
});

test("candidate admission quarantines stale or irrelevant repositories", () => {
  const decision = evaluateCandidateAdmission(
    {
      repository: "example/old-tool",
      category: "vector_database",
      source: "github_search",
      sourceQuery: "vector database embeddings",
      stars: 500,
      pushedAt: "2024-01-01T00:00:00Z",
      description: "A general command line utility with no indexed data features."
    },
    now
  );

  assert.equal(decision.admitted, false);
  assert.equal(decision.signals.active, false);
  assert.equal(decision.signals.relevant, false);
});

test("candidate discovery rotates all categories once per 13-hour cycle", () => {
  const plans = Array.from({ length: 13 }, (_, searchIndex) => candidateDiscoveryPlan(searchIndex));

  assert.equal(new Set(plans.map((plan) => plan.category)).size, 13);
  assert.equal(plans[0].category, "agent_framework");
  assert.equal(plans[12].category, "ai_observability");
  assert.ok(plans.every((plan) => plan.sort === "updated" && plan.page === 1));
});

test("candidate discovery rotates query variants, sorting, and result pages across category cycles", () => {
  assert.deepEqual(candidateDiscoveryPlan(0), {
    category: "agent_framework",
    query: "ai agent framework",
    sort: "updated",
    page: 1
  });
  assert.equal(candidateDiscoveryPlan(13).query, "multi agent framework llm");
  assert.equal(candidateDiscoveryPlan(26).query, "tool calling agent framework");
  assert.deepEqual(
    { sort: candidateDiscoveryPlan(39).sort, page: candidateDiscoveryPlan(39).page },
    { sort: "stars", page: 1 }
  );
  assert.deepEqual(
    { sort: candidateDiscoveryPlan(78).sort, page: candidateDiscoveryPlan(78).page },
    { sort: "updated", page: 2 }
  );
  assert.deepEqual(
    { sort: candidateDiscoveryPlan(156).sort, page: candidateDiscoveryPlan(156).page },
    { sort: "updated", page: 3 }
  );
});
