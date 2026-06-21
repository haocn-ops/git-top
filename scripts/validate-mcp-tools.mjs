import assert from "node:assert/strict";
import { handleMcp } from "../src/mcp.ts";
import { mockD1Env, mockD1ProjectId } from "./mock-d1.mjs";

const env = {};

await testDiscovery();
await testToolCalls();
await testGrpToolValidation();
await testRpcErrors();
await testMockD1ToolSource();
await testD1FallbackToolReasons();

console.log("Validated MCP tool behavior with seed and mocked D1 data sources.");

async function testDiscovery() {
  const getDiscovery = await request("GET", "/mcp");
  assert.equal(getDiscovery.status, 200);
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "search_projects"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "git_top_grp_query"));

  const rpcDiscovery = await rpc("tools/list", {});
  assert.equal(rpcDiscovery.status, 200);
  assert.equal(rpcDiscovery.body.result.tools.length, getDiscovery.body.tools.length);

  const searchTool = getDiscovery.body.tools.find((tool) => tool.name === "search_projects");
  assert.match(searchTool.description, /project_kind/);
  assert.match(searchTool.description, /collection_metadata/);
}

async function testToolCalls() {
  const search = await callTool("search_projects", { query: "cloudflare", limit: 2 });
  assert.equal(search.status, 200);
  assert.ok(search.result.projects.length > 0, "search_projects should return at least one matching project");
  assert.ok(search.result.projects.length <= 2, "search_projects should honor the limit");
  assertMetadata(search.result.metadata, "db_missing");

  const browseSearch = await callTool("search_projects", {
    query: "agent framework",
    category: "agent_framework",
    deployment: "cloudflare",
    ranking: "browse",
    limit: 8
  });
  assert.equal(browseSearch.status, 200);
  assert.ok(browseSearch.result.projects.length > 0, "search_projects should support browse ranking");
  assert.ok(browseSearch.result.projects.length <= 8, "browse-ranked search_projects should honor the limit");
  assertMetadata(browseSearch.result.metadata, "db_missing");

  const project = await callTool("get_project", { project_id: "cloudflare/agents" });
  assert.equal(project.status, 200);
  assert.equal(project.result.project.repo, "cloudflare/agents");
  assert.equal(project.result.project.classification.category.confidence, "low");
  assertMetadata(project.result.metadata, "db_missing");

  const card = await callTool("get_project_card", { project_id: "cloudflare/agents" });
  assert.equal(card.status, 200);
  assert.equal(card.result.project_id, "cloudflare/agents");
  assert.equal(card.result.agent_card.classification.category.confidence, "low");
  assertMetadata(card.result.metadata, "db_missing");

  const deployment = await callTool("get_deployment", { project_id: "cloudflare/agents" });
  assert.equal(deployment.status, 200);
  assert.ok(deployment.result.deployments.includes("cloudflare"));
  assert.equal(deployment.result.cloudflare_ready, true);
  assertMetadata(deployment.result.metadata, "db_missing");

  const quality = await callTool("get_quality_score", { project_id: "cloudflare/agents" });
  assert.equal(quality.status, 200);
  assert.ok(typeof quality.result.quality_score === "number");
  assert.ok(typeof quality.result.agent_score === "number");
  assertMetadata(quality.result.metadata, "db_missing");

  const alternatives = await callTool("get_alternatives", { project_id: "cloudflare/agents", limit: 3 });
  assert.equal(alternatives.status, 200);
  assert.ok(Array.isArray(alternatives.result.alternatives));
  assertMetadata(alternatives.result.metadata, "db_missing");

  const graph = await callTool("get_project_graph", { project_id: "cloudflare/agents", limit: 8 });
  assert.equal(graph.status, 200);
  assert.equal(graph.result.graph.focus, "cloudflare/agents");
  assert.ok(graph.result.graph.nodes.length > 0);
  assertMetadata(graph.result.metadata, "db_missing");

  const compare = await callTool("compare_projects", {
    project_ids: ["cloudflare/agents", "run-llama/llama_index"],
    deployment: "cloudflare"
  });
  assert.equal(compare.status, 200);
  assert.ok(compare.result.projects.length >= 1);
  assert.equal(compare.result.context.deployment, "cloudflare");
  assertMetadata(compare.result.metadata, "db_missing");
}

async function testGrpToolValidation() {
  const invalid = await rpc("tools/call", {
    name: "git_top_grp_query",
    arguments: {}
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, -32602);

  const result = await callTool("git_top_grp_query", {
    goal: "Find Cloudflare-ready agent frameworks",
    mode: "find",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    }
  });
  assert.equal(result.status, 200);
  assert.equal(result.result.metadata.data_source.source, "seed");
  assert.equal(result.result.metadata.data_source.reason, "db_missing");
}

async function testRpcErrors() {
  const invalidJson = await rawRequest("POST", "/mcp", "{", { "content-type": "application/json" });
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJson.body.error.code, -32700);

  const unknownMethod = await rpc("missing/method", {});
  assert.equal(unknownMethod.status, 400);
  assert.equal(unknownMethod.body.error.code, -32601);

  const unknownTool = await rpc("tools/call", {
    name: "missing_tool",
    arguments: {}
  });
  assert.equal(unknownTool.status, 400);
  assert.equal(unknownTool.body.error.code, -32601);

  const unsupportedMethod = await request("PUT", "/mcp");
  assert.equal(unsupportedMethod.status, 405);
  assert.equal(unsupportedMethod.body.error.code, "method_not_allowed");
}

async function testMockD1ToolSource() {
  const d1Env = mockD1Env();

  const search = await callTool("search_projects", { query: "mock", limit: 5 }, d1Env);
  assert.equal(search.status, 200);
  assert.equal(search.result.projects.length, 1);
  assert.equal(search.result.projects[0].repo, mockD1ProjectId);
  assertMetadata(search.result.metadata, "d1_query", "d1");

  const project = await callTool("get_project", { project_id: mockD1ProjectId }, d1Env);
  assert.equal(project.status, 200);
  assert.equal(project.result.project.repo, mockD1ProjectId);
  assert.equal(project.result.project.classification.category.confidence, "high");
  assertMetadata(project.result.metadata, "d1_query", "d1");

  const card = await callTool("get_project_card", { project_id: mockD1ProjectId }, d1Env);
  assert.equal(card.status, 200);
  assert.equal(card.result.agent_card.classification.category.confidence, "high");
  assertMetadata(card.result.metadata, "d1_query", "d1");

  const collectionId = "mock/awesome-agents";
  const collectionEnv = mockD1Env({ knowledge: [mockCollectionKnowledge(collectionId)] });
  const collection = await callTool("get_project", { project_id: collectionId }, collectionEnv);
  assert.equal(collection.status, 200);
  assert.equal(collection.result.project.project_kind, "collection");
  assert.equal(collection.result.project.collection_metadata.scope, "awesome_list");
  assert.equal(collection.result.project.collection_metadata.freshness, "active");

  const collectionCard = await callTool("get_project_card", { project_id: collectionId }, collectionEnv);
  assert.equal(collectionCard.status, 200);
  assert.equal(collectionCard.result.agent_card.project_kind, "collection");
  assert.equal(collectionCard.result.agent_card.collection_metadata.scope, "awesome_list");
  assertMetadata(collectionCard.result.metadata, "d1_query", "d1");
}

async function testD1FallbackToolReasons() {
  const empty = await callTool("search_projects", { query: "cloudflare", limit: 2 }, mockD1Env("empty"));
  assert.equal(empty.status, 200);
  assert.ok(empty.result.projects.length > 0);
  assertMetadata(empty.result.metadata, "db_empty");

  const failed = await callTool("search_projects", { query: "cloudflare", limit: 2 }, mockD1Env("error"));
  assert.equal(failed.status, 200);
  assert.ok(failed.result.projects.length > 0);
  assertMetadata(failed.result.metadata, "db_error");
  assert.ok(typeof failed.result.metadata.error === "string");
}

async function callTool(name, args, requestEnv = env) {
  const response = await rpc("tools/call", {
    name,
    arguments: args
  }, requestEnv);
  if (response.status !== 200) {
    return response;
  }
  const text = response.body.result.content[0].text;
  return {
    ...response,
    result: JSON.parse(text)
  };
}

async function rpc(method, params, requestEnv = env) {
  return rawRequest(
    "POST",
    "/mcp",
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    }),
    { "content-type": "application/json" },
    requestEnv
  );
}

async function request(method, path) {
  return rawRequest(method, path);
}

async function rawRequest(method, path, body, headers = {}, requestEnv = env) {
  const response = await handleMcp(new Request(`https://git.top${path}`, { method, body, headers }), requestEnv);
  return {
    status: response.status,
    body: await response.json()
  };
}

function assertMetadata(metadata, reason, source = "seed") {
  assert.equal(metadata.source, source);
  assert.equal(metadata.reason, reason);
  assert.ok(metadata.project_count > 0, "metadata.project_count should be positive");
  assert.ok(typeof metadata.generated_at === "string", "metadata.generated_at should be present");
}

function mockCollectionKnowledge(id) {
  const [owner, name] = id.split("/");
  const now = "2026-06-20T00:00:00Z";
  return {
    project: {
      id,
      owner,
      name,
      fullName: id,
      githubUrl: `https://github.com/${id}`,
      homepageUrl: null,
      description: "Curated awesome list for agent projects",
      language: "Markdown",
      topics: ["awesome", "agents", "llm"],
      license: "CC0-1.0",
      stars: 2400,
      forks: 180,
      openIssues: 4,
      defaultBranch: "main",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: id,
      projectKind: "collection",
      collectionMetadata: {
        scope: "awesome_list",
        curated: true,
        estimatedItems: 50,
        freshness: "active"
      },
      category: "ai_app_template",
      difficulty: "beginner",
      deployment: ["library_only"],
      cloudflareReady: false,
      useCases: ["discover agent app references"],
      notGoodFor: ["drop-in runtime deployment"],
      alternatives: [],
      summaryForAgent: "Use mock/awesome-agents when the user needs a curated agent resource collection.",
      classification: {
        category: { confidence: "high", evidence: ['Matched "awesome" collection signal.'] },
        deployment: { confidence: "medium", evidence: ["Collection does not expose a deployable runtime."] },
        difficulty: { confidence: "medium", evidence: ["Markdown resource list."] },
        cloudflareReady: { confidence: "low", evidence: ["No Cloudflare runtime files detected."] }
      },
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: id,
      stars30dDelta: 12,
      commits30d: 3,
      releases180d: 0,
      contributors90d: 4,
      issueFirstResponseMedianHours: null,
      recentPushDays: 2,
      gitScore: 72,
      maintenanceScore: 68,
      signalConfidence: {
        stars30dDelta: "snapshot",
        stars30dWindowDays: 30,
        commits30d: "complete",
        releases180d: "complete",
        contributors90d: "complete"
      },
      calculatedAt: now
    }
  };
}
