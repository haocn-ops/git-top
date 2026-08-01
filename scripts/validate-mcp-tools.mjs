import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { handleMcp } from "../src/mcp.ts";
import { mockD1Env, mockD1ProjectId } from "./mock-d1.mjs";

const env = {};
const mcpConformanceMatrix = [
  ["search_projects", "query/filters/limit/cursor", "projects, search, page, metadata", "-32602 invalid limit; -32003 strict D1; -32004 stale cursor"],
  ["get_trust_gate", "none", "decision, checks, agent_policy, metadata", "-32003 source policy where applicable"],
  ["get_quality_report", "require_d1", "quality scores, coverage, issues, metadata", "-32003 strict D1"],
  ["get_public_benchmark", "require_d1", "evaluation, explanations, data_coverage, review_queue, metadata", "-32003 strict D1"],
  ["get_project", "project_id or owner+repo", "project, summary, resolved_from, metadata", "-32005 project not found; -32003 strict D1"],
  ["get_projects_batch", "project_ids, profile", "projects, missing, metadata", "-32602 invalid ids/profile; -32003 strict D1"],
  ["get_project_changes", "cursor/since/limit", "changes, page, retention, metadata", "-32602 invalid input; -32003 D1 required"],
  ["propose_project_feedback", "structured evidence proposal", "proposal, persisted, review_required", "-32602 invalid proposal"],
  ["get_alternatives", "project_id, limit", "project, alternatives, alternative_matches, metadata", "-32005 project not found; -32003 strict D1"],
  ["get_related_projects", "project_id, limit", "project, related, metadata", "-32005 project not found; -32003 strict D1"],
  ["get_deployment", "project_id", "deployments, cloudflare_ready, metadata", "-32005 project not found; -32003 strict D1"],
  ["get_quality_score", "project_id", "scores, score_explanation, metadata", "-32005 project not found; -32003 strict D1"],
  ["recommend_project", "use_case/constraints/limit", "recommendations, metadata", "-32602 invalid limit; -32003 strict D1"],
  ["get_trends", "limit, require_d1", "trend signals, rising projects, metadata", "-32602 invalid limit; -32003 strict D1"],
  ["get_agent_workflow", "intent/constraints/limit", "recommended_sequence, shortlist, trust_policy, metadata", "-32602 invalid limit; -32003 strict D1"],
  ["get_atlas", "ecosystem/limit", "ecosystem(s), comparison paths, metadata", "-32602 invalid limit/ecosystem; -32003 strict D1"],
  ["find_alternatives", "project_id, reason, limit", "project, alternatives, alternative_matches, metadata", "-32005 project not found; -32602 invalid limit"],
  ["get_project_card", "project_id", "agent_card, metrics, metadata", "-32005 project not found; -32003 strict D1"],
  ["get_project_graph", "project_id, limit", "graph, resolved_from, metadata", "-32005 project not found; -32602 invalid limit; -32003 strict D1"],
  ["compare_projects", "project_ids, deployment", "projects, decision_matrix, metadata", "-32003 strict D1 where applicable"],
  ["git_top_grp_query", "goal/mode/constraints/context/profile", "profile, nodes, edges, solution_paths, evidence, metadata", "-32602 invalid request/profile; -32003 strict D1"]
];
const expectedMcpToolNames = mcpConformanceMatrix.map(([name]) => name);

await testDiscovery();
await testToolCalls();
await testLimitValidation();
await testGrpToolValidation();
await testRpcErrors();
await testMockD1ToolSource();
await testRequireD1ToolMode();
await testD1FallbackToolReasons();
await writeConformanceMatrix();

console.log(`Validated ${expectedMcpToolNames.length} MCP tools with seed and mocked D1 data sources.`);

async function testDiscovery() {
  const getDiscovery = await request("GET", "/mcp");
  assert.equal(getDiscovery.status, 200);
  const discoveredToolNames = getDiscovery.body.tools.map((tool) => tool.name).sort();
  assert.deepEqual(discoveredToolNames, [...expectedMcpToolNames].sort(), "MCP discovery must advertise the complete conformance matrix");
  for (const toolName of expectedMcpToolNames) {
    const tool = getDiscovery.body.tools.find((item) => item.name === toolName);
    assert.equal(tool.input_schema.type, "object", `${toolName} should publish an object input schema`);
    assert.equal(typeof tool.description, "string");
    assert.ok(tool.description.length > 0, `${toolName} should publish a description`);
  }
  const grpTool = getDiscovery.body.tools.find((item) => item.name === "git_top_grp_query");
  assert.deepEqual(grpTool.input_schema.properties.profile.enum, ["compact", "full"]);
  assert.equal(grpTool.input_schema.properties.profile.default, "compact");
  for (const toolName of ["search_projects", "get_project", "recommend_project", "compare_projects", "get_agent_workflow"]) {
    const tool = getDiscovery.body.tools.find((item) => item.name === toolName);
    assert.equal(tool.input_schema.anyOf, undefined, `${toolName} core schema must avoid a top-level anyOf for broad MCP client compatibility`);
    assert.equal(tool.input_schema.oneOf, undefined, `${toolName} core schema must avoid a top-level oneOf for broad MCP client compatibility`);
  }
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "search_projects"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "git_top_grp_query"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_trends"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_agent_workflow"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_atlas"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_quality_report"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_public_benchmark"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_trust_gate"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_projects_batch"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "get_project_changes"));
  assert.ok(getDiscovery.body.tools.some((tool) => tool.name === "propose_project_feedback"));
  assert.equal(getDiscovery.body.trust_url, "https://git.top/api/trust");
  assert.equal(getDiscovery.body.openapi_url, "https://git.top/openapi.json");
  assert.equal(getDiscovery.body.api_openapi_url, "https://git.top/api/openapi.json");
  assert.equal(getDiscovery.body.schema_url, "https://git.top/api/schema/project.v2");
  assert.equal(getDiscovery.body.agent_map_url, "https://git.top/api/agent-map");
  assert.equal(getDiscovery.body.agent_map.positioning, "The Knowledge Graph of Open Source");
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.concept === "Project graph"));
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.mcp_tools.includes("compare_projects")));
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.concept === "Atlas ecosystem map" && surface.mcp_tools.includes("get_atlas")));
  assert.ok(getDiscovery.body.agent_map.surfaces.some((surface) => surface.concept === "Open source trends" && surface.mcp_tools.includes("get_trends")));
  assert.ok(Array.isArray(getDiscovery.body.agent_map.short_path));
  assert.equal(getDiscovery.body.agent_map.short_path[0].concept, "Trust preflight");
  assert.ok(Array.isArray(getDiscovery.body.agent_map.reference_path));
  assert.equal(getDiscovery.body.agent_map.reference_path[0].concept, "Trust and freshness");
  assert.ok(Array.isArray(getDiscovery.body.agent_api.structured_post_endpoints));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/project"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/recommend"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/workflow"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/compare"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/alternatives"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/related"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/score"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/graph"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.some((endpoint) => endpoint.path === "/api/grp/query"));
  assert.ok(getDiscovery.body.agent_api.structured_post_endpoints.every((endpoint) => endpoint.method === "POST"));
  assert.ok(Array.isArray(getDiscovery.body.agent_api.read_endpoints));
  assert.ok(getDiscovery.body.agent_api.read_endpoints.some((endpoint) => endpoint.path === "/api/trust"));
  assert.ok(getDiscovery.body.agent_api.read_endpoints.some((endpoint) => endpoint.path === "/api/benchmark"));
  assert.ok(getDiscovery.body.agent_api.read_endpoints.some((endpoint) => endpoint.path === "/api/trends"));
  assert.ok(getDiscovery.body.agent_api.read_endpoints.every((endpoint) => endpoint.method === "GET"));
  assert.equal(getDiscovery.body.agent_api.response_contract.tool_content_block, "content[0].text");
  assert.equal(getDiscovery.body.agent_api.response_contract.tool_content_type, "application/json");
  assert.match(getDiscovery.body.agent_api.response_contract.parse_instruction, /Parse JSON-RPC tools\/call result\.content text blocks as JSON/);
  assert.equal(getDiscovery.body.agent_api.response_contract.strict_source_error.code, -32003);
  assert.equal(getDiscovery.body.agent_api.response_contract.project_not_found_error.code, -32005);
  assert.deepEqual(getDiscovery.body.agent_api.response_contract.project_not_found_error.singular_tools, [
    "get_project",
    "get_alternatives",
    "find_alternatives",
    "get_related_projects",
    "get_project_card",
    "get_deployment",
    "get_quality_score",
    "get_project_graph"
  ]);
  assert.ok(getDiscovery.body.quickstart.some((item) => item.includes("structured POST")));
  assert.ok(getDiscovery.body.quickstart.some((item) => item.includes("get_public_benchmark")));
  assert.ok(getDiscovery.body.quickstart.some((item) => item.includes("get_trust_gate")));
  assert.ok(getDiscovery.body.quickstart.some((item) => item.includes("short_path")));
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
  assert.match(searchTool.description, /metadata\.candidate_retrieval/);
  assert.match(searchTool.description, /metadata\.truncated/);
  assert.match(searchTool.description, /collection_metadata/);
  assert.match(searchTool.input_schema.properties.query.description, /Search terms/);
  assert.match(searchTool.input_schema.properties.query.description, /cursor empty/);
  assert.deepEqual(searchTool.input_schema.properties.ranking.enum, ["browse"]);
  assert.match(searchTool.input_schema.properties.ranking.description, /browse ranking/);
  assert.equal(searchTool.input_schema.properties.require_d1.type, "boolean");

  const limitMaximums = {
    search_projects: 100,
    get_project_changes: 100,
    get_alternatives: 20,
    get_related_projects: 100,
    recommend_project: 100,
    get_trends: 12,
    get_agent_workflow: 20,
    get_atlas: 20,
    find_alternatives: 20,
    get_project_graph: 80
  };
  for (const [toolName, maximum] of Object.entries(limitMaximums)) {
    const tool = getDiscovery.body.tools.find((item) => item.name === toolName);
    assert.ok(tool, `${toolName} should be discoverable`);
    assert.deepEqual(
      {
        type: tool.input_schema.properties.limit.type,
        minimum: tool.input_schema.properties.limit.minimum,
        maximum: tool.input_schema.properties.limit.maximum
      },
      { type: "integer", minimum: 1, maximum },
      `${toolName} should publish its runtime limit bounds`
    );
  }

  const cardTool = getDiscovery.body.tools.find((tool) => tool.name === "get_project_card");
  assert.match(cardTool.description, /project_kind/);
  assert.match(cardTool.description, /collection_metadata/);
  assert.equal(cardTool.input_schema.properties.require_d1.type, "boolean");

  const trendsTool = getDiscovery.body.tools.find((tool) => tool.name === "get_trends");
  assert.match(trendsTool.description, /corpus-level/);
  assert.equal(trendsTool.input_schema.properties.require_d1.type, "boolean");

  const workflowTool = getDiscovery.body.tools.find((tool) => tool.name === "get_agent_workflow");
  assert.match(workflowTool.description, /workflow/);
  assert.equal(workflowTool.input_schema.properties.require_d1.type, "boolean");

  const atlasTool = getDiscovery.body.tools.find((tool) => tool.name === "get_atlas");
  assert.match(atlasTool.description, /Atlas/);
  assert.match(atlasTool.description, /comparison paths/);
  assert.equal(atlasTool.input_schema.properties.require_d1.type, "boolean");

  const qualityReportTool = getDiscovery.body.tools.find((tool) => tool.name === "get_quality_report");
  assert.match(qualityReportTool.description, /quality and coverage report/);
  assert.equal(qualityReportTool.input_schema.properties.require_d1.type, "boolean");

  const benchmarkTool = getDiscovery.body.tools.find((tool) => tool.name === "get_public_benchmark");
  assert.match(benchmarkTool.description, /public trust benchmark/);
  assert.equal(benchmarkTool.input_schema.properties.require_d1.type, "boolean");

  const trustGateTool = getDiscovery.body.tools.find((tool) => tool.name === "get_trust_gate");
  assert.match(trustGateTool.description, /Trust Gate/);
  assert.deepEqual(trustGateTool.input_schema.properties, {});
}

async function testToolCalls() {
  const search = await callTool("search_projects", { query: "cloudflare", limit: 2 });
  assert.equal(search.status, 200);
  assert.ok(search.result.projects.length > 0, "search_projects should return at least one matching project");
  assert.ok(search.result.projects.length <= 2, "search_projects should honor the limit");
  assert.equal(search.result.page.limit, 2);
  assert.equal(search.result.page.snapshot_id, search.result.metadata.snapshot_id);
  assertMetadata(search.result.metadata, "db_missing");

  const typoSearch = await callTool("search_projects", { query: "langchian", limit: 1 });
  assert.equal(typoSearch.status, 200);
  assert.equal(typoSearch.result.search.query_interpretation.normalized, "langchain");
  assert.equal(typoSearch.result.projects[0].repo, "langchain-ai/langchain");

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
  assert.ok(project.result.summary && typeof project.result.summary.purpose === "string");
  assert.ok(Array.isArray(project.result.summary.good_for));
  assert.ok(Array.isArray(project.result.summary.not_good_for));
  assert.ok(Array.isArray(project.result.summary.deployment));
  assert.ok(Array.isArray(project.result.project.related));
  assert.ok(project.result.project.related.length > 0);
  assert.equal(project.result.project.classification.category.confidence, "low");
  assertMetadata(project.result.metadata, "db_missing");

  const batchProjects = await callTool("get_projects_batch", { project_ids: ["cloudflare/agents", "missing/project"], profile: "compact" });
  assert.equal(batchProjects.status, 200);
  assert.equal(batchProjects.result.projects[0].project_id, "cloudflare/agents");
  assert.deepEqual(batchProjects.result.missing, ["missing/project"]);
  assertMetadata(batchProjects.result.metadata, "db_missing");

  const feedback = await callTool("propose_project_feedback", {
    project_id: "cloudflare/agents",
    feedback_type: "classification",
    proposed: { category: "agent_framework" },
    evidence: [{ url: "https://github.com/cloudflare/agents", field: "README" }],
    rationale: "The README explicitly describes an agent framework."
  });
  assert.equal(feedback.status, 200);
  assert.equal(feedback.result.persisted, false);
  assert.equal(feedback.result.review_required, true);
  assert.match(feedback.result.submit.authorization, /FEEDBACK_SECRET/);

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
  assert.ok(typeof alternatives.result.alternative_matches[0].fit_summary === "string");
  assert.ok(Array.isArray(alternatives.result.alternative_matches[0].adoption_notes));
  assert.ok(["low", "medium", "high"].includes(alternatives.result.alternative_matches[0].replacement_risk));
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

  const aliasFindAlternatives = await callTool("find_alternatives", { project_id: "claude-code", limit: 3 });
  assert.equal(aliasFindAlternatives.status, 200);
  assert.equal(aliasFindAlternatives.result.resolved_from.resolution, "alias");
  assert.equal(aliasFindAlternatives.result.project.repo, aliasFindAlternatives.result.resolved_from.resolved_id);
  assertMetadata(aliasFindAlternatives.result.metadata, "db_missing");

  for (const [toolName, args] of [
    ["get_project", { project_id: "missing/project" }],
    ["get_alternatives", { project_id: "missing/project", limit: 3 }],
    ["find_alternatives", { project_id: "missing/project", limit: 3 }],
    ["get_related_projects", { project_id: "missing/project", limit: 3 }],
    ["get_project_card", { project_id: "missing/project" }],
    ["get_deployment", { project_id: "missing/project" }],
    ["get_quality_score", { project_id: "missing/project" }],
    ["get_project_graph", { project_id: "missing/project", limit: 8 }]
  ]) {
    const missing = await callTool(toolName, args);
    assert.equal(missing.status, 400, `${toolName} should return an MCP error for an unknown project`);
    assert.equal(missing.body.error.code, -32005);
    assert.equal(missing.body.error.message, "Project missing/project was not found.");
  }

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
  assert.ok(recommend.result.recommendations[0].fit_profile && typeof recommend.result.recommendations[0].fit_profile.primary_fit === "string");
  assert.ok(Array.isArray(recommend.result.recommendations[0].adoption_plan));
  assert.ok(Array.isArray(recommend.result.recommendations[0].risk_flags));
  assert.ok(Array.isArray(recommend.result.recommendations[0].next_actions));
  assert.ok(recommend.result.recommendations[0].next_actions.some((action) => action.kind === "alternatives"));
  assert.equal(recommend.result.recommendations[0].matched_constraints.category, "agent_framework");
  assert.ok(typeof recommend.result.recommendations[0].ranking_signals.use_case_match === "number");
  assert.ok(["high", "medium", "low"].includes(recommend.result.recommendations[0].confidence));
  assertMetadata(recommend.result.metadata, "db_missing");

  const trends = await callTool("get_trends", { limit: 3 });
  assert.equal(trends.status, 200);
  assert.ok(typeof trends.result.summary === "string");
  assert.ok(Array.isArray(trends.result.trend_signals));
  assert.ok(Array.isArray(trends.result.categories));
  assert.ok(Array.isArray(trends.result.rising_projects));
  assert.ok(Array.isArray(trends.result.agent_briefing));
  assert.ok(trends.result.categories.length <= 3);
  assertMetadata(trends.result.metadata, "db_missing");

  const trustGate = await callTool("get_trust_gate", {});
  assert.equal(trustGate.status, 200);
  assert.equal(trustGate.result.name, "Git.Top Trust Gate");
  assert.ok(["allow", "caution", "block"].includes(trustGate.result.decision));
  assert.equal(typeof trustGate.result.production_ready, "boolean");
  assert.ok(Array.isArray(trustGate.result.checks));
  assert.ok(trustGate.result.checks.some((check) => check.id === "d1-source"));
  assert.ok(trustGate.result.agent_policy.cite.includes("metadata.source"));
  assert.ok(typeof trustGate.result.quality.release_score === "number");
  assertMetadata(trustGate.result.metadata, "db_missing");

  const qualityReport = await callTool("get_quality_report", {});
  assert.equal(qualityReport.status, 200);
  assert.ok(typeof qualityReport.result.release_score === "number");
  assert.ok(typeof qualityReport.result.data_trust_score === "number");
  assert.ok(typeof qualityReport.result.risk_level === "string");
  assert.ok(qualityReport.result.score_summary);
  assert.ok(qualityReport.result.risk_summary);
  assert.ok(Array.isArray(qualityReport.result.improvement_plan));
  assert.ok(qualityReport.result.improvement_plan.length > 0);
  assert.ok(qualityReport.result.coverage);
  assert.ok(Array.isArray(qualityReport.result.issues));
  assert.ok(typeof qualityReport.result.issue_count === "number");
  assert.ok(typeof qualityReport.result.project_count === "number");
  assertMetadata(qualityReport.result.metadata, "db_missing");

  const benchmark = await callTool("get_public_benchmark", {});
  assert.equal(benchmark.status, 200);
  assert.equal(benchmark.result.name, "Git.Top Public Trust Benchmark");
  assert.ok(benchmark.result.evaluation);
  assert.ok(benchmark.result.known_limitations);
  assertMetadata(benchmark.result.metadata, "db_missing");

  const workflow = await callTool("get_agent_workflow", {
    intent: "choose a Cloudflare-ready agent framework",
    constraints: {
      deployment: "cloudflare",
      category: "agent_framework",
      cloudflare_ready: true
    },
    limit: 3
  });
  assert.equal(workflow.status, 200);
  assert.equal(workflow.result.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(workflow.result.recommended_sequence));
  assert.ok(workflow.result.recommended_sequence.some((step) => step.mcp_tool === "get_trends"));
  assert.ok(workflow.result.recommended_sequence.some((step) => step.mcp_tool === "recommend_project"));
  assert.ok(workflow.result.recommended_sequence.some((step) => step.mcp_tool === "compare_projects"));
  assert.ok(Array.isArray(workflow.result.shortlist));
  assert.ok(workflow.result.shortlist.length > 0);
  assert.ok(Array.isArray(workflow.result.trend_context.top_categories));
  assert.ok(workflow.result.trust_policy.production_check.includes("require_d1=true"));
  assertMetadata(workflow.result.metadata, "db_missing");

  const atlas = await callTool("get_atlas", { ecosystem: "cloudflare", limit: 3 });
  assert.equal(atlas.status, 200);
  assert.equal(atlas.result.ecosystem.id, "cloudflare");
  assert.ok(Array.isArray(atlas.result.ecosystem.projects));
  assert.ok(atlas.result.ecosystem.projects.length <= 3);
  assert.ok(Array.isArray(atlas.result.ecosystem.map.nodes));
  assert.ok(Array.isArray(atlas.result.ecosystem.map.edges));
  assert.ok(Array.isArray(atlas.result.ecosystem.exploration_paths));
  assert.ok(Array.isArray(atlas.result.ecosystem.exploration_journeys));
  assert.ok(Array.isArray(atlas.result.ecosystem.comparison_paths));
  assert.ok(atlas.result.ecosystem.comparison_paths.some((path) => path.api_href.includes("/api/compare")));
  assert.ok(atlas.result.available_ecosystems.includes("cloudflare"));
  assertMetadata(atlas.result.metadata, "db_missing");

  const strictQualityReport = await callTool("get_quality_report", { require_d1: true }, mockD1Env());
  assert.equal(strictQualityReport.status, 200);
  assertMetadata(strictQualityReport.result.metadata, "d1_query", "d1");
  assert.ok(typeof strictQualityReport.result.release_score === "number");

  const strictTrustGate = await callTool("get_trust_gate", {}, mockD1Env());
  assert.equal(strictTrustGate.status, 200);
  assertMetadata(strictTrustGate.result.metadata, "d1_query", "d1");
  assert.ok(["allow", "caution", "block"].includes(strictTrustGate.result.decision));

  const allAtlas = await callTool("get_atlas", { limit: 2 });
  assert.equal(allAtlas.status, 200);
  assert.ok(Array.isArray(allAtlas.result.ecosystems));
  assert.ok(allAtlas.result.ecosystems.length >= 9);
  assert.ok(allAtlas.result.ecosystems.some((ecosystem) => ecosystem.id === "ai-ide"));
  assert.ok(allAtlas.result.ecosystems.some((ecosystem) => ecosystem.id === "llm-gateway"));
  assert.ok(allAtlas.result.ecosystems[0].projects.length <= 2);
  assert.ok(Array.isArray(allAtlas.result.ecosystems[0].comparison_paths));
  assertMetadata(allAtlas.result.metadata, "db_missing");
}

async function testGrpToolValidation() {
  const invalid = await rpc("tools/call", {
    name: "git_top_grp_query",
    arguments: {}
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, -32602);

  const result = await callTool("git_top_grp_query", {
    goal: "Compose an autonomous coding stack for Cloudflare",
    mode: "compose",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    }
  });
  assert.equal(result.status, 200);
  assert.equal(result.result.profile, "compact");
  assert.equal(result.result.metadata.response_profile, "compact");
  assert.ok(result.result.nodes.length <= 24);
  assert.ok(result.result.edges.length <= 40);
  assert.ok(result.result.solution_paths.length <= 3);
  assert.ok(result.result.solution_paths.length > 0);
  assert.ok(result.result.solution_paths.every((path) => path.nodes === undefined && path.edges === undefined));
  assert.ok(result.result.evidence);
  assert.ok(Array.isArray(result.result.caveats));
  assert.equal(typeof result.result.confidence_reason, "string");
  assert.equal(result.result.metadata.data_source.source, "seed");
  assert.equal(result.result.metadata.data_source.reason, "db_missing");
  const compactSize = new TextEncoder().encode(JSON.stringify(result.result)).byteLength;
  assert.ok(compactSize < 32 * 1024, `compact GRP response should be below 32 KiB, received ${compactSize} bytes`);

  const full = await callTool("git_top_grp_query", {
    goal: "Compose an autonomous coding stack for Cloudflare",
    mode: "compose",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    },
    profile: "full"
  });
  assert.equal(full.status, 200);
  assert.equal(full.result.profile, "full");
  assert.equal(full.result.metadata.response_profile, "full");
  assert.ok(full.result.nodes.length >= result.result.nodes.length);
  assert.ok(full.result.edges.length >= result.result.edges.length);
  assert.ok(full.result.solution_paths.some((path) => Array.isArray(path.nodes) && Array.isArray(path.edges)));
  assert.equal(full.result.metadata.compact_limits, undefined);

  const invalidProfile = await callTool("git_top_grp_query", {
    goal: "Find Cloudflare-ready agent frameworks",
    profile: "verbose"
  });
  assert.equal(invalidProfile.status, 400);
  assert.equal(invalidProfile.body.error.code, -32602);
  assert.equal(invalidProfile.body.error.message, "profile must be compact or full.");
}

async function testLimitValidation() {
  const limitMaximums = {
    search_projects: 100,
    get_project_changes: 100,
    get_alternatives: 20,
    get_related_projects: 100,
    recommend_project: 100,
    get_trends: 12,
    get_agent_workflow: 20,
    get_atlas: 20,
    find_alternatives: 20,
    get_project_graph: 80
  };

  for (const [toolName, maximum] of Object.entries(limitMaximums)) {
    for (const invalidLimit of [0, -1, 1.5, maximum + 1, "5", null]) {
      const invalid = await callTool(toolName, { limit: invalidLimit });
      assert.equal(invalid.status, 400, `${toolName} should reject limit=${String(invalidLimit)}`);
      assert.equal(invalid.body.error.code, -32602);
      assert.equal(invalid.body.error.message, `limit must be an integer from 1 to ${maximum}.`);
    }
  }

  const minimum = await callTool("search_projects", { query: "cloudflare", limit: 1 });
  assert.equal(minimum.status, 200);
  assert.equal(minimum.result.page.limit, 1);
  assert.ok(minimum.result.projects.length <= 1);

  const maximum = await callTool("search_projects", { query: "cloudflare", limit: 100 });
  assert.equal(maximum.status, 200);
  assert.equal(maximum.result.page.limit, 100);
  assert.ok(maximum.result.projects.length <= 100);
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

  const changes = await callTool("get_project_changes", { limit: 5 }, d1Env);
  assert.equal(changes.status, 200);
  assert.ok(Array.isArray(changes.result.changes));
  assert.ok(changes.result.page);
  assertMetadata(changes.result.metadata, "d1_query", "d1");

  const search = await callTool("search_projects", { query: "mock", limit: 5 }, d1Env);
  assert.equal(search.status, 200);
  assert.equal(search.result.projects.length, 1);
  assert.equal(search.result.projects[0].repo, mockD1ProjectId);
  assertMetadata(search.result.metadata, "d1_query", "d1");

  const largeSearch = await callTool(
    "search_projects",
    { query: "mock", limit: 5, require_d1: true },
    mockD1Env({ knowledgeReadyProjectCount: 2001 })
  );
  assert.equal(largeSearch.status, 200);
  assert.equal(largeSearch.result.projects[0].repo, mockD1ProjectId);
  assert.equal(largeSearch.result.metadata.project_count, 2001);
  assert.equal(largeSearch.result.metadata.candidate_retrieval, "d1_first");
  assert.equal(largeSearch.result.metadata.candidate_count, 1);
  assert.equal(largeSearch.result.metadata.candidate_limit, 1000);
  assert.equal(largeSearch.result.metadata.loaded_project_limit, 1000);
  assert.equal(largeSearch.result.metadata.truncated, false);

  const overflowSearch = await callTool(
    "search_projects",
    { query: "mock", limit: 5, require_d1: true },
    mockD1Env({ knowledgeReadyProjectCount: 2001, searchCandidateOverflow: true })
  );
  assert.equal(overflowSearch.status, 200);
  assert.equal(overflowSearch.result.metadata.candidate_count, 1000);
  assert.equal(overflowSearch.result.metadata.truncated, true);
  assert.ok(overflowSearch.result.metadata.warnings.some((warning) => warning.includes("1000 candidate limit")));

  const project = await callTool("get_project", { project_id: mockD1ProjectId }, d1Env);
  assert.equal(project.status, 200);
  assert.equal(project.result.project.repo, mockD1ProjectId);
  assert.ok(typeof project.result.summary.tl_dr === "string");
  assert.ok(Array.isArray(project.result.summary.inputs));
  assert.ok(Array.isArray(project.result.summary.outputs));
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
  assert.equal(collection.result.summary.install, "Reference collection; there is no direct install step.");

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

  for (const [toolName, args] of [
    ["get_project", { project_id: "cloudflare/agents", require_d1: true }],
    ["recommend_project", { use_case: "cloudflare agent", require_d1: true }],
    ["get_quality_report", { require_d1: true }],
    ["get_public_benchmark", { require_d1: true }],
    ["git_top_grp_query", { goal: "find cloudflare agents", mode: "find", require_d1: true }]
  ]) {
    const strictTool = await callTool(toolName, args);
    assert.equal(strictTool.status, 400, `${toolName} should fail closed without D1`);
    assert.equal(strictTool.body.error.code, -32003, `${toolName} should return d1_required MCP error`);
  }

  const strictD1 = await callTool("search_projects", { query: "mock", require_d1: true }, mockD1Env());
  assert.equal(strictD1.status, 200);
  assert.equal(strictD1.result.projects.length, 1);
  assertMetadata(strictD1.result.metadata, "d1_query", "d1");

  const strictBenchmarkD1 = await callTool("get_public_benchmark", { require_d1: true }, mockD1Env());
  assert.equal(strictBenchmarkD1.status, 200);
  assert.equal(strictBenchmarkD1.result.name, "Git.Top Public Trust Benchmark");
  assert.equal(strictBenchmarkD1.result.evaluation.top3_hit_rate, 1);
  assertMetadata(strictBenchmarkD1.result.metadata, "d1_query", "d1");

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

async function writeConformanceMatrix() {
  const rows = mcpConformanceMatrix
    .map(([name, input, success, errors]) => `| \`${name}\` | ${input} | ${success} | ${errors} |`)
    .join("\n");
  const markdown = `# MCP Conformance Matrix

Generated by \`pnpm mcp:validate\` from the live \`GET /mcp\` discovery contract.

The validator checks that every listed tool is discoverable, publishes an object input schema and description, and is covered by the runtime validation suite. Error codes are JSON-RPC application semantics: \`-32602\` invalid input, \`-32003\` strict D1 failure, \`-32004\` stale cursor, and \`-32005\` unresolved singular project.

| Tool | Input focus | Success payload | Error contract |
| --- | --- | --- | --- |
${rows}
`;
  await writeFile(new URL("../docs/MCP_CONFORMANCE_MATRIX.md", import.meta.url), markdown);
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
  assert.ok(typeof metadata.snapshot_id === "string", "metadata.snapshot_id should be present");
  assert.equal(metadata.schema_version, "git-top.knowledge.v1");
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
