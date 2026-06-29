import assert from "node:assert/strict";
import { handleMcp } from "../src/mcp.ts";
import { mockD1Env, mockD1ProjectId } from "./mock-d1.mjs";

const env = {};

await testDiscovery();
await testToolCalls();
await testGrpToolValidation();
await testRpcErrors();
await testMockD1ToolSource();
await testRequireD1ToolMode();
await testD1FallbackToolReasons();

console.log("Validated MCP tool behavior with seed and mocked D1 data sources.");

async function testDiscovery() {
  const getDiscovery = await request("GET", "/mcp");
  assert.equal(getDiscovery.status, 200);
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "search_projects"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "git_top_grp_query"));
  assert.equal(getDiscovery.body.openapi_url, "https://git.top/openapi.json");
  assert.equal(getDiscovery.body.api_openapi_url, "https://git.top/api/openapi.json");
  assert.equal(getDiscovery.body.schema_url, "https://git.top/api/schema/project.v2");
  assert.equal(getDiscovery.body.agent_map_url, "https://git.top/api/agent-map");
  assert.equal(getDiscovery.body.agent_map.positioning, "The Knowledge Graph of Open Source");
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.concept === "Project graph"));
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.mcp_tools.includes("compare_projects")));
  assert.ok(Array.isArray(getDiscovery.body.agent_api.structured_post_endpoints));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/project"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/recommend"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/compare"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/alternatives"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/related"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/score"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/graph"));
  assert.ok(getDiscovery.body.quickstart.some((item) => item.includes("structured POST")));
  assert.equal(getDiscovery.body.examples.structured_recommend.url, "https://git.top/api/recommend");

  const rpcDiscovery = await rpc("tools/list", {});
  assert.equal(rpcDiscovery.status, 200);
  assert.equal(rpcDiscovery.body.result.tools.length, getDiscovery.body.tools.length);

  const initialize = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "git-top-validator", version: "0.0.0" }
  });
  assert.equal(initialize.status, 200);
  assert.equal(initialize.body.result.serverInfo.name, "git-top");
  assert.equal(initialize.body.result.capabilities.tools.listChanged, false);

  const initialized = await rpc("notifications/initialized", {});
  assert.equal(initialized.status, 202);

  const searchTool = getDiscovery.body.tools.find((tool) => tool.name === "search_projects");
  assert.match(searchTool.description, /project_kind/);
  assert.match(searchTool.description, /collection_metadata/);
  assert.deepEqual(searchTool.input_schema.properties.ranking.enum, ["browse"]);
  assert.match(searchTool.input_schema.properties.ranking.description, /browse ranking/);
  assert.equal(searchTool.input_schema.properties.require_d1.type, "boolean");

  const cardTool = getDiscovery.body.tools.find((tool) => tool.name === "get_project_card");
  assert.match(cardTool.description, /project_kind/);
  assert.match(cardTool.description, /collection_metadata/);
  assert.equal(cardTool.input_schema.properties.require_d1.type, "boolean");
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
  assert.equal(project.result.project_id, "cloudflare/agents");
  assert.equal(project.result.project.repo, "cloudflare/agents");
  assert.ok(Array.isArray(project.result.project.related));
  assert.ok(project.result.project.related.length > 0);
  assert.equal(project.result.project.classification.category.confidence, "low");
  assertMetadata(project.result.metadata, "db_missing");

  const splitProject = await callTool("get_project", { owner: "cloudflare", repo: "agents" });
  assert.equal(splitProject.status, 200);
  assert.equal(splitProject.result.project_id, "cloudflare/agents");
  assert.equal(splitProject.result.project.repo, "cloudflare/agents");
  assertMetadata(splitProject.result.metadata, "db_missing");

  const repoProject = await callTool("get_project", { repo: "cloudflare/agents" });
  assert.equal(repoProject.status, 200);
  assert.equal(repoProject.result.project_id, "cloudflare/agents");
  assert.equal(repoProject.result.project.repo, "cloudflare/agents");

  const aliasProject = await callTool("get_project", { project_id: "claude-code" });
  assert.equal(aliasProject.status, 200);
  assert.equal(aliasProject.result.project_id, "claude-code");
  assert.equal(aliasProject.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasProject.result.resolved_from.resolution, "alias");
  assert.equal(aliasProject.result.project.repo, aliasProject.result.resolved_from.resolved_id);
  assert.ok(Array.isArray(aliasProject.result.project.related));
  assertMetadata(aliasProject.result.metadata, "db_missing");

  const card = await callTool("get_project_card", { project_id: "cloudflare/agents" });
  assert.equal(card.status, 200);
  assert.equal(card.result.project_id, "cloudflare/agents");
  assert.equal(card.result.agent_card.classification.category.confidence, "low");
  assertMetadata(card.result.metadata, "db_missing");

  const aliasCard = await callTool("get_project_card", { project_id: "claude-code" });
  assert.equal(aliasCard.status, 200);
  assert.equal(aliasCard.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasCard.result.resolved_from.resolution, "alias");
  assert.ok(aliasCard.result.agent_card);
  assertMetadata(aliasCard.result.metadata, "db_missing");

  const deployment = await callTool("get_deployment", { project_id: "cloudflare/agents" });
  assert.equal(deployment.status, 200);
  assert.ok(deployment.result.deployments.includes("cloudflare"));
  assert.equal(deployment.result.cloudflare_ready, true);
  assertMetadata(deployment.result.metadata, "db_missing");

  const aliasDeployment = await callTool("get_deployment", { project_id: "claude-code" });
  assert.equal(aliasDeployment.status, 200);
  assert.equal(aliasDeployment.result.resolved_from.requested_id, "claude-code");
  assert.ok(Array.isArray(aliasDeployment.result.deployments));
  assertMetadata(aliasDeployment.result.metadata, "db_missing");

  const quality = await callTool("get_quality_score", { project_id: "cloudflare/agents" });
  assert.equal(quality.status, 200);
  assert.ok(typeof quality.result.git_top_score === "number");
  assert.ok(typeof quality.result.quality_score === "number");
  assert.ok(typeof quality.result.agent_score === "number");
  assert.ok(quality.result.git_top_score_breakdown && typeof quality.result.git_top_score_breakdown === "object");
  assert.ok(quality.result.score_explanation);
  assert.equal(quality.result.score_explanation.project.repo, "cloudflare/agents");
  assert.ok(Array.isArray(quality.result.score_explanation.dimensions));
  assert.equal(quality.result.score_explanation.dimensions.length, 6);
  assert.ok(typeof quality.result.score_explanation.summary === "string");
  assert.ok(typeof quality.result.score_explanation.adoption_guidance === "string");
  assert.ok(Array.isArray(quality.result.score_explanation.risk_flags));
  assert.ok(quality.result.score_explanation.next_actions.some((action) => action.kind === "compare"));
  assertMetadata(quality.result.metadata, "db_missing");

  const aliasQuality = await callTool("get_quality_score", { project_id: "claude-code" });
  assert.equal(aliasQuality.status, 200);
  assert.equal(aliasQuality.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasQuality.result.resolved_from.resolution, "alias");
  assert.equal(aliasQuality.result.score_explanation.project.repo, aliasQuality.result.resolved_from.resolved_id);
  assertMetadata(aliasQuality.result.metadata, "db_missing");

  const alternatives = await callTool("get_alternatives", { project_id: "cloudflare/agents", limit: 3 });
  assert.equal(alternatives.status, 200);
  assert.equal(alternatives.result.project.repo, "cloudflare/agents");
  assert.ok(typeof alternatives.result.summary === "string");
  assert.ok(typeof alternatives.result.stats.candidate_count === "number");
  assert.ok(Array.isArray(alternatives.result.next_actions));
  assert.ok(alternatives.result.next_actions.some((action) => action.kind === "graph"));
  assert.ok(alternatives.result.comparison_links.compare.includes("/api/compare"));
  assert.ok(Array.isArray(alternatives.result.alternatives));
  assert.ok(Array.isArray(alternatives.result.alternative_matches));
  assert.ok(alternatives.result.alternative_matches.length > 0);
  assert.ok(alternatives.result.alternative_matches.length <= 3);
  assert.ok(typeof alternatives.result.alternative_matches[0].similarity_score === "number");
  assert.ok(typeof alternatives.result.alternative_matches[0].alternative_reason === "string");
  assertMetadata(alternatives.result.metadata, "db_missing");

  const aliasAlternatives = await callTool("get_alternatives", { project_id: "claude-code", limit: 3 });
  assert.equal(aliasAlternatives.status, 200);
  assert.equal(aliasAlternatives.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasAlternatives.result.resolved_from.resolution, "alias");
  assert.equal(aliasAlternatives.result.project.repo, aliasAlternatives.result.resolved_from.resolved_id);
  assert.ok(aliasAlternatives.result.alternative_matches.length <= 3);
  assertMetadata(aliasAlternatives.result.metadata, "db_missing");

  const related = await callTool("get_related_projects", { project_id: "cloudflare/agents", limit: 3 });
  assert.equal(related.status, 200);
  assert.ok(Array.isArray(related.result.related));
  assert.ok(related.result.related.length > 0);
  assert.ok(related.result.related.length <= 3);
  assertMetadata(related.result.metadata, "db_missing");

  const aliasRelated = await callTool("get_related_projects", { project_id: "claude-code", limit: 3 });
  assert.equal(aliasRelated.status, 200);
  assert.equal(aliasRelated.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasRelated.result.resolved_from.resolution, "alias");
  assert.equal(aliasRelated.result.project.repo, aliasRelated.result.resolved_from.resolved_id);
  assert.ok(aliasRelated.result.related.length <= 3);
  assertMetadata(aliasRelated.result.metadata, "db_missing");

  const graph = await callTool("get_project_graph", { project_id: "cloudflare/agents", limit: 8 });
  assert.equal(graph.status, 200);
  assert.equal(graph.result.graph.focus, "cloudflare/agents");
  assert.ok(graph.result.graph.nodes.length > 0);
  assert.equal(graph.result.graph.project.repo, "cloudflare/agents");
  assert.ok(typeof graph.result.graph.summary === "string");
  assert.ok(typeof graph.result.graph.graph_stats.node_count === "number");
  assert.ok(graph.result.graph.next_actions.some((action) => action.kind === "project"));
  assert.ok(Array.isArray(graph.result.graph.relationship_groups.alternatives));
  assert.ok(Array.isArray(graph.result.graph.relationship_groups.deployment_targets));
  assertMetadata(graph.result.metadata, "db_missing");

  const aliasGraph = await callTool("get_project_graph", { project_id: "claude-code", limit: 8 });
  assert.equal(aliasGraph.status, 200);
  assert.equal(aliasGraph.result.resolved_from.requested_id, "claude-code");
  assert.equal(aliasGraph.result.resolved_from.resolution, "alias");
  assert.equal(aliasGraph.result.graph.focus, aliasGraph.result.resolved_from.resolved_id);
  assert.equal(aliasGraph.result.graph.project.repo, aliasGraph.result.resolved_from.resolved_id);
  assertMetadata(aliasGraph.result.metadata, "db_missing");

  const compare = await callTool("compare_projects", {
    project_ids: ["cloudflare/agents", "run-llama/llama_index"],
    deployment: "cloudflare"
  });
  assert.equal(compare.status, 200);
  assert.ok(compare.result.projects.length >= 1);
  assert.equal(compare.result.projects[0].repo, "cloudflare/agents");
  assert.deepEqual(compare.result.requested_project_ids, ["cloudflare/agents", "run-llama/llama_index"]);
  assert.equal(compare.result.order, "input");
  assert.equal(compare.result.context.deployment, "cloudflare");
  assert.ok(typeof compare.result.summary === "string");
  assert.ok(typeof compare.result.stats.candidate_count === "number");
  assert.ok(Array.isArray(compare.result.decision_matrix));
  assert.ok(compare.result.next_actions.some((action) => action.kind === "alternatives"));
  assertMetadata(compare.result.metadata, "db_missing");

  const recommend = await callTool("recommend_project", {
    use_case: "build agent workflows",
    constraints: {
      category: "agent_framework",
      license: "MIT",
      deployment: "cloudflare"
    },
    limit: 3
  });
  assert.equal(recommend.status, 200);
  assert.ok(Array.isArray(recommend.result.recommendations));
  assert.ok(recommend.result.recommendations.length > 0);
  assert.ok(Array.isArray(recommend.result.recommendations[0].reasons));
  assert.ok(typeof recommend.result.recommendations[0].decision_summary === "string");
  assert.ok(Array.isArray(recommend.result.recommendations[0].next_actions));
  assert.ok(recommend.result.recommendations[0].next_actions.some((action) => action.kind === "alternatives"));
  assert.equal(recommend.result.recommendations[0].matched_constraints.category, "agent_framework");
  assert.ok(typeof recommend.result.recommendations[0].ranking_signals.use_case_match === "number");
  assert.ok(["high", "medium", "low"].includes(recommend.result.recommendations[0].confidence));
  assertMetadata(recommend.result.metadata, "db_missing");
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

async function testRequireD1ToolMode() {
  const strictFallback = await callTool("search_projects", { query: "cloudflare", require_d1: true });
  assert.equal(strictFallback.status, 400);
  assert.equal(strictFallback.body.error.code, -32003);
  assert.match(strictFallback.body.error.message, /D1-backed knowledge is required/);

  const strictD1 = await callTool("search_projects", { query: "mock", require_d1: true }, mockD1Env());
  assert.equal(strictD1.status, 200);
  assert.equal(strictD1.result.projects.length, 1);
  assertMetadata(strictD1.result.metadata, "d1_query", "d1");

  const strictEmpty = await callTool("search_projects", { query: "cloudflare", require_d1: true }, mockD1Env("empty"));
  assert.equal(strictEmpty.status, 400);
  assert.equal(strictEmpty.body.error.code, -32003);

  const strictError = await callTool("search_projects", { query: "cloudflare", require_d1: true }, mockD1Env("error"));
  assert.equal(strictError.status, 400);
  assert.equal(strictError.body.error.code, -32003);
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
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
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
