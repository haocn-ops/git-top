import assert from "node:assert/strict";
import test from "node:test";
import { interpretSearchQuery, searchProjectList } from "../src/project-search.ts";
import { seedProjects } from "../src/seed.ts";

test("multilingual agent queries are explicitly normalized", () => {
  const interpretation = interpretSearchQuery("Cloudflare 智能体框架");
  assert.equal(interpretation.normalized, "cloudflare agent framework");
  assert.ok(interpretation.transformations.includes("智能体框架 -> agent framework"));

  const results = searchProjectList(seedProjects, { q: "智能体框架", limit: 5 });
  assert.ok(results.length > 0);
  assert.ok(results.some((item) => item.agentCard.category === "agent_framework"));
});

test("known high-signal typos are corrected without fuzzy global matching", () => {
  const interpretation = interpretSearchQuery("langchian");
  assert.equal(interpretation.normalized, "langchain");
  assert.deepEqual(interpretation.transformations, ["langchian -> langchain"]);
  assert.equal(searchProjectList(seedProjects, { q: "langchian", limit: 1 })[0]?.project.fullName, "langchain-ai/langchain");
});

test("existing product aliases keep renamed project intent exact", () => {
  assert.equal(searchProjectList(seedProjects, { q: "llamaindex", limit: 1 })[0]?.project.fullName, "run-llama/llama_index");
});
