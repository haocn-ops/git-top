import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCandidateAdmission } from "../src/candidate-discovery.ts";

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
