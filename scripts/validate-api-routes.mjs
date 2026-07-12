import assert from "node:assert/strict";
import { handleApi } from "../src/api.ts";
import worker from "../src/index.ts";
import { openApiDocument } from "../src/openapi.ts";
import { governanceRunRow, mockD1Env, mockD1ProjectId, syncRunRow } from "./mock-d1.mjs";

const env = {};

await testSeedMetadata();
await testSearchAndProjectRoutes();
await testRecommendationAndCompareRoutes();
await testWorkflowRoute();
await testGraphAndQualityRoutes();
await testBenchmarkRoute();
await testQuickstartRoute();
await testRecipesRoute();
await testExamplesRoute();
await testJourneysRoute();
await testRoadmapRoute();
await testSchemaRoutes();
await testOpenApiDocument();
await testMethodAndBodyValidation();
await testCorsHeaders();
await testMockD1Source();
await testRequireD1Mode();
await testD1FallbackReasons();
await testSyncStatusWithMockD1();
await testClassificationOverridesWithMockD1();
await testGovernanceRunsWithMockD1();

console.log("Validated API route behavior with seed and mocked D1 data sources.");

async function testSeedMetadata() {
  const health = await getJson("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.db, "missing");
  assert.equal(health.body.raw_project_count, 0);
  assert.equal(health.body.knowledge_ready_project_count, health.body.project_count);
  assert.equal(health.body.sync_health, "unknown");
  assert.equal(health.body.sync_freshness, "unknown");
  assert.equal(health.body.last_successful_sync_at, null);
  assert.equal(health.body.hours_since_successful_sync, null);
  assertMetadata(health.body.metadata, "db_missing");

  const trending = await getJson("/api/trending?limit=2");
  assert.equal(trending.status, 200);
  assert.equal(trending.body.projects.length, 2);
  assertMetadata(trending.body.metadata, "db_missing");

  const trends = await getJson("/api/trends?limit=4");
  assert.equal(trends.status, 200);
  assert.ok(typeof trends.body.summary === "string");
  assert.ok(typeof trends.body.stats.project_count === "number");
  assert.ok(Array.isArray(trends.body.trend_signals));
  assert.ok(Array.isArray(trends.body.categories));
  assert.ok(Array.isArray(trends.body.deployments));
  assert.ok(Array.isArray(trends.body.languages));
  assert.ok(Array.isArray(trends.body.rising_projects));
  assert.ok(Array.isArray(trends.body.agent_briefing));
  assertMetadata(trends.body.metadata, "db_missing");
}

async function testSearchAndProjectRoutes() {
  const search = await getJson("/api/search?q=cloudflare&limit=3");
  assert.equal(search.status, 200);
  assert.equal(search.body.query.q, "cloudflare");
  assert.ok(search.body.projects.length > 0, "search should return at least one seed project");
  assert.equal(search.body.search.applied_filters.q, "cloudflare");
  assert.ok(search.body.search.known_filter_values.category.includes("agent_framework"));
  assertMetadata(search.body.metadata, "db_missing");

  const browseSearch = await getJson("/api/search?q=agent%20framework&category=agent_framework&deployment=cloudflare&project_kind=project&min_confidence=low&ranking=browse&limit=8");
  assert.equal(browseSearch.status, 200);
  assert.equal(browseSearch.body.query.ranking, "browse");
  assert.equal(browseSearch.body.search.applied_filters.project_kind, "project");
  assert.equal(browseSearch.body.search.applied_filters.min_confidence, "low");
  assert.deepEqual(browseSearch.body.search.known_filter_values.project_kind, ["project", "collection"]);
  assert.deepEqual(browseSearch.body.search.known_filter_values.min_confidence, ["low", "medium", "high"]);
  assert.ok(browseSearch.body.projects.length > 0, "browse search should return seed projects");
  assert.ok(browseSearch.body.projects.length <= 8, "browse search should honor the limit");
  assertMetadata(browseSearch.body.metadata, "db_missing");

  const emptySearch = await getJson("/api/search?query=agent&category=framework&deployment=cloudflare&language=typescript&cloudflare_ready=true&limit=5");
  assert.equal(emptySearch.status, 200);
  assert.equal(emptySearch.body.query.query, "agent");
  assert.equal(emptySearch.body.search.applied_filters.q, "agent");
  assert.equal(emptySearch.body.search.applied_filters.category, "framework");
  assert.equal(emptySearch.body.search.applied_filters.cloudflare_ready, true);
  assert.equal(emptySearch.body.projects.length, 0);
  assert.match(emptySearch.body.search.empty_reason, /No projects matched/);
  assert.ok(emptySearch.body.search.suggestions.some((item) => item.includes("category='agent_framework'")));

  const invalidSearchLimit = await getJson("/api/search?q=cloudflare&limit=-1");
  assert.equal(invalidSearchLimit.status, 400);
  assert.equal(invalidSearchLimit.body.error.code, "invalid_search_request");

  const invalidSearchBoolean = await getJson("/api/search?q=cloudflare&cloudflare_ready=definitely");
  assert.equal(invalidSearchBoolean.status, 400);
  assert.equal(invalidSearchBoolean.body.error.code, "invalid_search_request");

  const project = await getJson("/api/project/cloudflare/agents");
  assert.equal(project.status, 200);
  assert.equal(project.body.project_id, "cloudflare/agents");
  assert.equal(project.body.repo, "cloudflare/agents");
  assert.equal(project.body.knowledge.project.full_name, "cloudflare/agents");
  assert.ok(project.body.summary && typeof project.body.summary.purpose === "string");
  assert.ok(Array.isArray(project.body.summary.good_for));
  assert.ok(Array.isArray(project.body.summary.not_good_for));
  assert.ok(Array.isArray(project.body.summary.deployment));
  assert.ok(Array.isArray(project.body.summary.alternatives));
  assert.equal(project.body.score, project.body.git_top_score);
  assert.ok(typeof project.body.git_top_score === "number");
  assert.ok(project.body.git_top_score_breakdown && typeof project.body.git_top_score_breakdown === "object");
  assert.ok(Array.isArray(project.body.related), "project response should include related projects");
  assert.ok(project.body.related.length > 0, "seed project should include related project candidates");
  assert.ok(typeof project.body.related[0].repo === "string");
  assert.ok(typeof project.body.related[0].reason === "string");
  assert.equal(project.body.classification.category.confidence, "low");
  assert.equal(project.body.quality_signal_confidence.stars_30d_delta, "estimated");
  assert.ok(project.body.evidence.classification.category);
  assert.ok(Array.isArray(project.body.evidence.source_fields));
  assert.ok(project.body.evidence.source_fields.includes("agent_card.classification"));
  assert.ok(Array.isArray(project.body.caveats));
  assert.equal(typeof project.body.confidence_reason, "string");
  assert.ok(Array.isArray(project.body.source_fields));
  assert.ok(project.body.last_verified_at);
  assertMetadata(project.body.metadata, "db_missing");

  const encodedProject = await getJson(`/api/project/${encodeURIComponent("cloudflare/agents")}`);
  assert.equal(encodedProject.status, 200);
  assert.equal(encodedProject.body.repo, "cloudflare/agents");
  assert.ok(Array.isArray(encodedProject.body.related));

  const aliasProject = await getJson("/api/project/claude-code?related_limit=3");
  assert.equal(aliasProject.status, 200);
  assert.equal(aliasProject.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasProject.body.resolved_from.resolution, "alias");
  assert.equal(aliasProject.body.project_id, aliasProject.body.repo);
  assert.equal(aliasProject.body.repo, aliasProject.body.resolved_from.resolved_id);
  assert.ok(Array.isArray(aliasProject.body.related));
  assert.ok(aliasProject.body.related.length <= 3);
  assertMetadata(aliasProject.body.metadata, "db_missing");

  const postProject = await request("/api/project", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents",
      related_limit: 3
    })
  });
  assert.equal(postProject.status, 200);
  assert.equal(postProject.body.project_id, "cloudflare/agents");
  assert.equal(postProject.body.repo, "cloudflare/agents");
  assert.ok(Array.isArray(postProject.body.related));
  assert.ok(postProject.body.related.length <= 3);
  assertMetadata(postProject.body.metadata, "db_missing");

  const aliasPostProject = await request("/api/project", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cursor",
      related_limit: 2
    })
  });
  assert.equal(aliasPostProject.status, 200);
  assert.equal(aliasPostProject.body.resolved_from.requested_id, "cursor");
  assert.equal(aliasPostProject.body.resolved_from.resolution, "alias");
  assert.equal(aliasPostProject.body.repo, aliasPostProject.body.resolved_from.resolved_id);
  assert.ok(aliasPostProject.body.related.length <= 2);
  assertMetadata(aliasPostProject.body.metadata, "db_missing");

  const aliasRelated = await getJson("/api/related/claude-code?limit=3");
  assert.equal(aliasRelated.status, 200);
  assert.equal(aliasRelated.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasRelated.body.resolved_from.resolution, "alias");
  assert.equal(aliasRelated.body.project.repo, aliasRelated.body.resolved_from.resolved_id);
  assert.ok(Array.isArray(aliasRelated.body.related));
  assert.ok(aliasRelated.body.related.length <= 3);
  assertMetadata(aliasRelated.body.metadata, "db_missing");

  const missing = await getJson("/api/project/not-a-real/project");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, "project_not_found");
}

async function testRecommendationAndCompareRoutes() {
  const recommend = await getJson("/api/recommend?deployment=cloudflare&cloudflare_ready=true&limit=3");
  assert.equal(recommend.status, 200);
  assert.ok(Array.isArray(recommend.body.recommendations));
  assert.ok(recommend.body.recommendations.length > 0, "recommend should return seed recommendations");
  assert.equal(typeof recommend.body.recommendations[0].project_id, "string");
  assert.equal(typeof recommend.body.recommendations[0].repo, "string");
  assert.equal(typeof recommend.body.recommendations[0].name, "string");
  assert.equal(recommend.body.recommendations[0].project_id, recommend.body.recommendations[0].repo);
  assert.ok(Array.isArray(recommend.body.recommendations[0].reasons));
  assert.ok(typeof recommend.body.recommendations[0].decision_summary === "string");
  assert.ok(recommend.body.recommendations[0].fit_profile && typeof recommend.body.recommendations[0].fit_profile.primary_fit === "string");
  assert.ok(Array.isArray(recommend.body.recommendations[0].adoption_plan));
  assert.ok(Array.isArray(recommend.body.recommendations[0].risk_flags));
  assert.ok(Array.isArray(recommend.body.recommendations[0].next_actions));
  assert.ok(recommend.body.recommendations[0].next_actions.some((action) => action.kind === "graph"));
  assert.ok(typeof recommend.body.recommendations[0].matched_constraints === "object");
  assert.ok(typeof recommend.body.recommendations[0].ranking_signals.use_case_match === "number");
  assert.ok(["high", "medium", "low"].includes(recommend.body.recommendations[0].confidence));
  assert.equal(typeof recommend.body.recommendations[0].confidence_reason, "string");
  assert.ok(recommend.body.recommendations[0].evidence.classification.category);
  assert.ok(recommend.body.recommendations[0].evidence.source_fields.includes("recommendation.ranking_signals"));
  assert.ok(Array.isArray(recommend.body.recommendations[0].caveats));
  assert.ok(recommend.body.recommendations[0].last_verified_at);
  assertMetadata(recommend.body.metadata, "db_missing");

  const invalidRecommendLimit = await getJson("/api/recommend?limit=abc");
  assert.equal(invalidRecommendLimit.status, 400);
  assert.equal(invalidRecommendLimit.body.error.code, "invalid_recommendation_request");

  const filteredRecommend = await getJson("/api/recommend?category=agent_framework&license=MIT&limit=3");
  assert.equal(filteredRecommend.status, 200);
  assert.ok(Array.isArray(filteredRecommend.body.recommendations));
  assert.ok(filteredRecommend.body.recommendations.length > 0);
  assert.equal(filteredRecommend.body.recommendations[0].matched_constraints.category, "agent_framework");
  assert.ok(filteredRecommend.body.recommendations[0].ranking_signals.license_fit >= 0);
  assertMetadata(filteredRecommend.body.metadata, "db_missing");

  const postRecommend = await request("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      use_case: "build Cloudflare-ready agent workflows",
      constraints: {
        deployment: "cloudflare",
        category: "agent_framework",
        license: "MIT",
        cloudflare_ready: true
      },
      limit: 2
    })
  });
  assert.equal(postRecommend.status, 200);
  assert.equal(postRecommend.body.query.deployment, "cloudflare");
  assert.equal(postRecommend.body.query.category, "agent_framework");
  assert.equal(postRecommend.body.query.cloudflare_ready, true);
  assert.ok(postRecommend.body.recommendations.length > 0);
  assert.ok(postRecommend.body.recommendations.length <= 2);
  assert.equal(typeof postRecommend.body.recommendations[0].repo, "string");
  assert.equal(typeof postRecommend.body.recommendations[0].name, "string");
  assert.ok(typeof postRecommend.body.recommendations[0].decision_summary === "string");
  assert.ok(Array.isArray(postRecommend.body.recommendations[0].adoption_plan));
  assert.ok(postRecommend.body.recommendations[0].next_actions.some((action) => action.kind === "score"));
  assertMetadata(postRecommend.body.metadata, "db_missing");

  const invalidPostRecommend = await request("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: -1 })
  });
  assert.equal(invalidPostRecommend.status, 400);
  assert.equal(invalidPostRecommend.body.error.code, "invalid_recommendation_request");

  const compare = await getJson("/api/compare?repos=cloudflare/agents,run-llama/llama_index&deployment=cloudflare");
  assert.equal(compare.status, 200);
  assert.ok(compare.body.projects.length >= 1);
  assert.ok(Array.isArray(compare.body.project_ids));
  assert.equal(compare.body.projects[0].repo, "cloudflare/agents");
  assert.deepEqual(compare.body.requested_repos, ["cloudflare/agents", "run-llama/llama_index"]);
  assert.deepEqual(
    compare.body.resolved_repos.map((item) => item.resolved_id),
    ["cloudflare/agents", "run-llama/llama_index"]
  );
  assert.equal(compare.body.order, "input");
  assert.equal(compare.body.context.deployment, "cloudflare");
  assert.ok(typeof compare.body.summary === "string");
  assert.ok(typeof compare.body.stats.candidate_count === "number");
  assert.ok(Array.isArray(compare.body.decision_matrix));
  assert.ok(compare.body.decision_matrix.some((item) => item.repo === "cloudflare/agents"));
  assert.ok(compare.body.next_actions.some((action) => action.kind === "graph"));
  assertMetadata(compare.body.metadata, "db_missing");

  const aliasCompare = await getJson("/api/compare?repos=claude-code,opencode&deployment=local");
  assert.equal(aliasCompare.status, 200);
  assert.deepEqual(aliasCompare.body.requested_repos, ["claude-code", "opencode"]);
  assert.equal(aliasCompare.body.resolved_repos[0].resolution, "alias");
  assert.ok(aliasCompare.body.resolved_repos.length >= 2);
  assert.ok(aliasCompare.body.projects.length >= 2);
  assertMetadata(aliasCompare.body.metadata, "db_missing");

  const postCompare = await request("/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_ids: ["cloudflare/agents", "run-llama/llama_index"],
      deployment: "cloudflare"
    })
  });
  assert.equal(postCompare.status, 200);
  assert.deepEqual(postCompare.body.requested_repos, ["cloudflare/agents", "run-llama/llama_index"]);
  assert.equal(postCompare.body.order, "input");
  assert.equal(postCompare.body.context.deployment, "cloudflare");
  assert.ok(postCompare.body.projects.length >= 1);
  assert.ok(typeof postCompare.body.summary === "string");
  assert.ok(typeof postCompare.body.stats.highest_agent_score === "number");
  assert.ok(postCompare.body.next_actions.some((action) => action.kind === "score"));
  assertMetadata(postCompare.body.metadata, "db_missing");
}

async function testWorkflowRoute() {
  const workflow = await getJson("/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=3");
  assert.equal(workflow.status, 200);
  assert.equal(workflow.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(typeof workflow.body.summary === "string");
  assert.equal(workflow.body.input.intent, "choose a Cloudflare-ready agent framework");
  assert.equal(workflow.body.input.constraints.deployment, "cloudflare");
  assert.equal(workflow.body.input.constraints.category, "agent_framework");
  assert.equal(workflow.body.input.constraints.cloudflare_ready, true);
  assert.ok(Array.isArray(workflow.body.recommended_sequence));
  assert.ok(workflow.body.recommended_sequence.some((step) => step.url.startsWith("/api/trends")));
  assert.ok(workflow.body.recommended_sequence.some((step) => step.mcp_tool === "recommend_project"));
  assert.ok(workflow.body.recommended_sequence.some((step) => step.mcp_tool === "compare_projects"));
  assert.ok(Array.isArray(workflow.body.shortlist));
  assert.ok(workflow.body.shortlist.length > 0);
  assert.ok(workflow.body.shortlist.length <= 3);
  assert.ok(typeof workflow.body.shortlist[0].decision_summary === "string");
  assert.ok(Array.isArray(workflow.body.trend_context.top_categories));
  assert.ok(Array.isArray(workflow.body.agent_map.short_path));
  assert.equal(workflow.body.agent_map.short_path[0].concept, "Trust preflight");
  assert.ok(Array.isArray(workflow.body.agent_map.reference_path));
  assert.equal(workflow.body.agent_map.reference_path[0].concept, "Trust and freshness");
  assert.ok(Array.isArray(workflow.body.agent_map.surfaces));
  assert.ok(workflow.body.agent_map.surfaces.some((surface) => surface.concept === "Project graph"));
  assert.ok(workflow.body.trust_policy.production_check.includes("require_d1=true"));
  assertMetadata(workflow.body.metadata, "db_missing");

  const focusedWorkflow = await request("/api/workflow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      intent: "evaluate Claude Code alternatives",
      project_id: "claude-code",
      constraints: {
        deployment: "local"
      },
      limit: 2
    })
  });
  assert.equal(focusedWorkflow.status, 200);
  assert.equal(focusedWorkflow.body.input.project_id, "claude-code");
  assert.ok(focusedWorkflow.body.recommended_sequence.some((step) => step.url.includes("/api/graph/claude-code")));
  assert.ok(focusedWorkflow.body.recommended_sequence.some((step) => step.url.includes("/api/alternatives/claude-code")));
  assert.ok(focusedWorkflow.body.recommended_sequence.some((step) => step.url.includes("/api/score/claude-code")));
  assertMetadata(focusedWorkflow.body.metadata, "db_missing");

  const grp = await request("/api/grp/query", {
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
  });
  assert.equal(grp.status, 200);
  assert.equal(grp.body.metadata.version, "grp.v1");
  assert.ok(Array.isArray(grp.body.nodes));
  assert.ok(Array.isArray(grp.body.edges));
  assert.ok(Array.isArray(grp.body.evidence.source_fields));
  assert.ok(grp.body.evidence.source_fields.includes("grp.nodes"));
  assert.ok(grp.body.evidence.source_fields.includes("grp.edges"));
  assert.ok(Array.isArray(grp.body.evidence.caveats));
  assert.equal(typeof grp.body.confidence_reason, "string");
  assert.ok(Array.isArray(grp.body.caveats));
  assert.ok(Array.isArray(grp.body.source_fields));
  assert.ok(grp.body.last_verified_at);
  assertMetadata(grp.body.metadata.data_source, "db_missing");
}

async function testRoadmapRoute() {
  const roadmap = await getJson("/api/roadmap");
  assert.equal(roadmap.status, 200);
  assert.equal(roadmap.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(typeof roadmap.body.completion === "number");
  assert.ok(Array.isArray(roadmap.body.current_focus));
  assert.ok(Array.isArray(roadmap.body.phases));
  assert.equal(roadmap.body.phases.length, 6);
  assert.ok(roadmap.body.phases.some((phase) => phase.id === "agent-api" && phase.api_endpoints.includes("/api/agent-map")));
  assert.ok(roadmap.body.phases.some((phase) => phase.id === "agent-api" && phase.human_pages.includes("/topics/open-source-knowledge-graph-api")));
  assert.ok(roadmap.body.phases.some((phase) => phase.id === "agent-api" && phase.human_pages.includes("/topics/mcp-integration-guide")));
  assert.ok(roadmap.body.completion >= 88);
  assert.ok(roadmap.body.phases.some((phase) => phase.id === "atlas" && phase.human_pages.includes("/atlas")));
  assert.ok(Array.isArray(roadmap.body.agent_use));

  const postRoadmap = await request("/api/roadmap", { method: "POST" });
  assert.equal(postRoadmap.status, 405);
  assert.equal(postRoadmap.body.error.code, "method_not_allowed");
}

async function testQuickstartRoute() {
  const quickstart = await getJson("/api/quickstart");
  assert.equal(quickstart.status, 200);
  assert.equal(quickstart.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(quickstart.body.steps));
  assert.ok(quickstart.body.steps.length >= 8);
  assert.ok(quickstart.body.steps.some((step) => step.id === "check-data-source" && step.rest === "GET /api/health"));
  assert.ok(quickstart.body.steps.some((step) => step.mcp_tool === "get_agent_workflow"));
  assert.ok(quickstart.body.steps.some((step) => step.id === "explore-atlas-journeys" && step.rest === "GET /api/journeys"));
  assert.ok(quickstart.body.steps.some((step) => step.rest === "POST /api/grp/query"));
  assert.ok(Array.isArray(quickstart.body.output_pattern));
  assert.ok(Array.isArray(quickstart.body.trust_policy));

  const postQuickstart = await request("/api/quickstart", { method: "POST" });
  assert.equal(postQuickstart.status, 405);
  assert.equal(postQuickstart.body.error.code, "method_not_allowed");
}

async function testRecipesRoute() {
  const recipes = await getJson("/api/recipes");
  assert.equal(recipes.status, 200);
  assert.equal(recipes.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(recipes.body.recipes));
  assert.ok(recipes.body.recipes.length >= 6);
  assert.ok(recipes.body.recipes.some((recipe) => recipe.id === "choose-cloudflare-agent-framework"));
  assert.ok(recipes.body.recipes.some((recipe) => recipe.id === "map-ecosystem-to-comparison" && recipe.steps.some((step) => step.endpoint === "/api/journeys")));
  assert.ok(recipes.body.recipes.some((recipe) => recipe.id === "plan-with-grp" && recipe.steps.some((step) => step.method === "POST")));
  assert.ok(recipes.body.recipes.every((recipe) => Array.isArray(recipe.trust_checks) && recipe.trust_checks.length > 0));

  const postRecipes = await request("/api/recipes", { method: "POST" });
  assert.equal(postRecipes.status, 405);
  assert.equal(postRecipes.body.error.code, "method_not_allowed");
}

async function testExamplesRoute() {
  const examples = await getJson("/api/examples");
  assert.equal(examples.status, 200);
  assert.equal(examples.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(examples.body.examples));
  assert.ok(examples.body.examples.length >= 8);
  assert.ok(examples.body.examples.some((example) => example.id === "health-gate" && example.endpoint === "/api/health"));
  assert.ok(examples.body.examples.some((example) => example.id === "mcp-tools-list" && example.surface === "MCP"));
  assert.ok(examples.body.examples.some((example) => example.id === "grp-plan-stack" && example.endpoint === "/api/grp/query"));
  assert.ok(examples.body.examples.every((example) => Array.isArray(example.trust_checks) && example.trust_checks.length > 0));

  const postExamples = await request("/api/examples", { method: "POST" });
  assert.equal(postExamples.status, 405);
  assert.equal(postExamples.body.error.code, "method_not_allowed");
}

async function testJourneysRoute() {
  const journeys = await getJson("/api/journeys?limit=3");
  assert.equal(journeys.status, 200);
  assert.equal(journeys.body.positioning, "The Knowledge Graph of Open Source");
  assert.equal(journeys.body.name, "Git.Top Atlas Journeys");
  assert.ok(Array.isArray(journeys.body.journeys));
  assert.ok(journeys.body.journeys.length > 0, "journeys should expose ecosystem exploration routes");
  assert.ok(journeys.body.stats.ecosystem_count >= 5);
  assert.equal(journeys.body.stats.journey_count, journeys.body.journeys.length);
  assert.equal(journeys.body.stats.comparison_path_count, journeys.body.comparison_paths.length);
  assert.ok(journeys.body.stats.step_count >= journeys.body.journeys.length);
  assert.ok(journeys.body.journeys.some((journey) => journey.ecosystem_id === "cloudflare"));
  assert.ok(journeys.body.journeys.some((journey) => journey.steps.some((step) => step.href === "/api/agent-map")));
  assert.ok(journeys.body.journeys.every((journey) => journey.page_href.startsWith("/atlas/")));
  assert.ok(journeys.body.journeys.every((journey) => journey.api_href.includes("/api/atlas/")));
  assert.ok(Array.isArray(journeys.body.comparison_paths));
  assert.ok(journeys.body.comparison_paths.some((path) => path.ecosystem_id === "cloudflare" && path.api_href.includes("/api/compare")));
  assert.ok(journeys.body.comparison_paths.every((path) => path.repos.length >= 2));
  assertMetadata(journeys.body.metadata, "db_missing");

  const postJourneys = await request("/api/journeys", { method: "POST" });
  assert.equal(postJourneys.status, 405);
  assert.equal(postJourneys.body.error.code, "method_not_allowed");
}

async function testGraphAndQualityRoutes() {
  const alternatives = await getJson("/api/alternatives/cloudflare/agents?limit=4");
  assert.equal(alternatives.status, 200);
  assert.equal(alternatives.body.project.repo, "cloudflare/agents");
  assert.ok(typeof alternatives.body.summary === "string");
  assert.ok(typeof alternatives.body.stats.candidate_count === "number");
  assert.ok(typeof alternatives.body.stats.average_similarity === "number" || alternatives.body.stats.average_similarity === null);
  assert.ok(Array.isArray(alternatives.body.next_actions));
  assert.ok(alternatives.body.next_actions.some((action) => action.kind === "compare"));
  assert.ok(alternatives.body.comparison_links.compare.includes("/api/compare"));
  assert.ok(Array.isArray(alternatives.body.alternatives));
  assert.ok(Array.isArray(alternatives.body.alternative_matches));
  assert.ok(alternatives.body.alternative_matches.length > 0, "alternatives endpoint should return enriched matches");
  assert.ok(alternatives.body.alternative_matches.length <= 4, "alternatives endpoint should honor limit");
  assert.ok(typeof alternatives.body.alternative_matches[0].similarity_score === "number");
  assert.ok(typeof alternatives.body.alternative_matches[0].alternative_reason === "string");
  assert.ok(["same_use_case", "same_category", "same_deployment", "ecosystem_adjacent"].includes(alternatives.body.alternative_matches[0].replacement_type));
  assert.ok(typeof alternatives.body.alternative_matches[0].fit_summary === "string");
  assert.ok(Array.isArray(alternatives.body.alternative_matches[0].adoption_notes));
  assert.ok(["low", "medium", "high"].includes(alternatives.body.alternative_matches[0].replacement_risk));
  assert.ok(alternatives.body.alternative_matches[0].match_signals && typeof alternatives.body.alternative_matches[0].match_signals === "object");
  assert.ok(Array.isArray(alternatives.body.evidence.source_fields));
  assert.ok(alternatives.body.evidence.source_fields.includes("alternative.match_signals"));
  assert.ok(Array.isArray(alternatives.body.evidence.caveats));
  assert.equal(typeof alternatives.body.confidence_reason, "string");
  assert.ok(Array.isArray(alternatives.body.caveats));
  assert.ok(Array.isArray(alternatives.body.source_fields));
  assert.ok(alternatives.body.last_verified_at);
  assert.ok(Array.isArray(alternatives.body.alternative_matches[0].evidence.source_fields));
  assert.ok(alternatives.body.alternative_matches[0].evidence.source_fields.includes("alternative.similarity_score"));
  assert.equal(typeof alternatives.body.alternative_matches[0].confidence_reason, "string");
  assert.ok(Array.isArray(alternatives.body.alternative_matches[0].caveats));
  assertMetadata(alternatives.body.metadata, "db_missing");

  const aliasAlternatives = await getJson("/api/alternatives/claude-code?limit=4");
  assert.equal(aliasAlternatives.status, 200);
  assert.equal(aliasAlternatives.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasAlternatives.body.resolved_from.resolution, "alias");
  assert.equal(aliasAlternatives.body.project.repo, aliasAlternatives.body.resolved_from.resolved_id);
  assert.ok(Array.isArray(aliasAlternatives.body.alternative_matches));
  assert.ok(aliasAlternatives.body.alternative_matches.length > 0);
  assertMetadata(aliasAlternatives.body.metadata, "db_missing");

  const postAlternatives = await request("/api/alternatives", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents",
      limit: 3
    })
  });
  assert.equal(postAlternatives.status, 200);
  assert.equal(postAlternatives.body.project.repo, "cloudflare/agents");
  assert.ok(Array.isArray(postAlternatives.body.alternative_matches));
  assert.ok(postAlternatives.body.alternative_matches.length > 0);
  assert.ok(postAlternatives.body.alternative_matches.length <= 3);
  assert.ok(typeof postAlternatives.body.summary === "string");
  assert.ok(postAlternatives.body.next_actions.some((action) => action.kind === "score"));
  assertMetadata(postAlternatives.body.metadata, "db_missing");

  const graph = await getJson("/api/graph?repo=cloudflare/agents&limit=8");
  assert.equal(graph.status, 200);
  assert.equal(graph.body.focus, "cloudflare/agents");
  assert.ok(graph.body.nodes.length > 0);
  assert.ok(graph.body.edges.some((edge) => edge.kind === "related"), "graph should include related project edges");
  assert.equal(graph.body.project.repo, "cloudflare/agents");
  assert.ok(graph.body.project.maintainer);
  assert.ok(typeof graph.body.summary === "string");
  assert.ok(typeof graph.body.graph_stats.node_count === "number");
  assert.ok(typeof graph.body.graph_stats.relationship_counts.dependency === "number");
  assert.ok(Array.isArray(graph.body.next_actions));
  assert.ok(graph.body.next_actions.some((action) => action.kind === "alternatives"));
  assert.ok(Array.isArray(graph.body.relationship_groups.alternatives));
  assert.ok(Array.isArray(graph.body.relationship_groups.related));
  assert.ok(Array.isArray(graph.body.relationship_groups.dependencies));
  assert.ok(Array.isArray(graph.body.relationship_groups.deployment_targets));
  assert.ok(graph.body.relationship_groups.deployment_targets.includes("cloudflare"));
  assert.ok(Array.isArray(graph.body.evidence.source_fields));
  assert.ok(graph.body.evidence.source_fields.includes("graph.nodes"));
  assert.ok(graph.body.evidence.source_fields.includes("graph.edges"));
  assert.ok(Array.isArray(graph.body.evidence.caveats));
  assert.equal(typeof graph.body.confidence_reason, "string");
  assert.ok(Array.isArray(graph.body.caveats));
  assert.ok(Array.isArray(graph.body.source_fields));
  assert.ok(graph.body.last_verified_at);
  assertMetadata(graph.body.metadata, "db_missing");

  const aliasGraph = await getJson("/api/graph?repo=claude-code&limit=8");
  assert.equal(aliasGraph.status, 200);
  assert.equal(aliasGraph.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasGraph.body.resolved_from.resolution, "alias");
  assert.equal(aliasGraph.body.focus, aliasGraph.body.resolved_from.resolved_id);
  assert.equal(aliasGraph.body.project.repo, aliasGraph.body.resolved_from.resolved_id);
  assert.ok(aliasGraph.body.nodes.length > 0);
  assertMetadata(aliasGraph.body.metadata, "db_missing");

  const postGraph = await request("/api/graph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents",
      limit: 8
    })
  });
  assert.equal(postGraph.status, 200);
  assert.equal(postGraph.body.focus, "cloudflare/agents");
  assert.equal(postGraph.body.project.repo, "cloudflare/agents");
  assert.ok(postGraph.body.nodes.length > 0);
  assert.ok(typeof postGraph.body.summary === "string");
  assert.ok(typeof postGraph.body.graph_stats.edge_count === "number");
  assert.ok(postGraph.body.next_actions.some((action) => action.kind === "score"));
  assert.ok(Array.isArray(postGraph.body.relationship_groups.alternatives));
  assertMetadata(postGraph.body.metadata, "db_missing");

  const aliasPostGraph = await request("/api/graph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "claude-code",
      limit: 8
    })
  });
  assert.equal(aliasPostGraph.status, 200);
  assert.equal(aliasPostGraph.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasPostGraph.body.resolved_from.resolution, "alias");
  assert.equal(aliasPostGraph.body.focus, aliasPostGraph.body.resolved_from.resolved_id);
  assertMetadata(aliasPostGraph.body.metadata, "db_missing");

  const atlas = await getJson("/api/atlas?limit=3");
  assert.equal(atlas.status, 200);
  assert.ok(Array.isArray(atlas.body.ecosystems));
  assert.ok(atlas.body.ecosystems.length >= 9, "atlas should return expanded ecosystem maps");
  assert.ok(atlas.body.ecosystems.some((ecosystem) => ecosystem.id === "ai-ide"));
  assert.ok(atlas.body.ecosystems.some((ecosystem) => ecosystem.id === "llm-gateway"));
  assert.ok(atlas.body.ecosystems.some((ecosystem) => ecosystem.id === "ai-observability"));
  assert.ok(atlas.body.ecosystems.some((ecosystem) => ecosystem.id === "workflow-automation"));
  assert.ok(atlas.body.ecosystems[0].projects.length <= 3, "atlas should honor per-ecosystem limit");
  assert.ok(Array.isArray(atlas.body.ecosystems[0].map.nodes));
  assert.ok(Array.isArray(atlas.body.ecosystems[0].map.edges));
  assert.ok(typeof atlas.body.ecosystems[0].stats.project_count === "number");
  assert.ok(typeof atlas.body.ecosystems[0].stats.edge_count === "number");
  assert.ok(Array.isArray(atlas.body.ecosystems[0].exploration_paths));
  assert.ok(Array.isArray(atlas.body.ecosystems[0].exploration_journeys));
  assert.ok(Array.isArray(atlas.body.ecosystems[0].comparison_paths));
  assert.ok(atlas.body.ecosystems[0].comparison_paths.some((path) => path.href.startsWith("/compare/")));
  assert.ok(atlas.body.ecosystems[0].exploration_paths.some((path) => path.kind === "graph"));
  assert.ok(atlas.body.ecosystems[0].exploration_paths.some((path) => path.kind === "recommend"));
  assert.ok(atlas.body.ecosystems[0].exploration_journeys.some((journey) => journey.steps.some((step) => step.href === "/api/agent-map")));
  assert.ok(typeof atlas.body.ecosystems[0].links.page === "string");
  assert.ok(atlas.body.ecosystems[0].links.recommend_api.includes("/api/recommend"));
  assertMetadata(atlas.body.metadata, "db_missing");

  const atlasCloudflare = await getJson("/api/atlas/cloudflare?limit=4");
  assert.equal(atlasCloudflare.status, 200);
  assert.equal(atlasCloudflare.body.ecosystem.id, "cloudflare");
  assert.ok(atlasCloudflare.body.ecosystem.projects.length > 0, "cloudflare atlas should include projects");
  assert.ok(atlasCloudflare.body.ecosystem.projects.length <= 4);
  assert.ok(atlasCloudflare.body.ecosystem.map.nodes.some((node) => node.kind === "ecosystem"));
  assert.ok(atlasCloudflare.body.ecosystem.map.nodes.some((node) => node.kind === "project"));
  assert.ok(atlasCloudflare.body.ecosystem.map.edges.some((edge) => edge.kind === "contains_project"));
  assert.ok(atlasCloudflare.body.ecosystem.stats.concept_count > 0);
  assert.ok(atlasCloudflare.body.ecosystem.exploration_paths.some((path) => path.kind === "alternatives"));
  assert.ok(atlasCloudflare.body.ecosystem.exploration_paths.some((path) => path.kind === "recommend"));
  assert.ok(atlasCloudflare.body.ecosystem.exploration_journeys.some((journey) => journey.label === "Choose a production candidate"));
  assert.ok(atlasCloudflare.body.ecosystem.comparison_paths.some((path) => path.decision_focus === "deployment_fit"));
  assert.ok(atlasCloudflare.body.ecosystem.comparison_paths.every((path) => path.context.ecosystem_id === "cloudflare"));
  assert.ok(atlasCloudflare.body.ecosystem.links.graph.includes("/api/graph/"));
  assert.ok(atlasCloudflare.body.ecosystem.links.recommend_api.includes("deployment=cloudflare"));
  assertMetadata(atlasCloudflare.body.metadata, "db_missing");

  const missingAtlas = await getJson("/api/atlas/not-real");
  assert.equal(missingAtlas.status, 404);
  assert.equal(missingAtlas.body.error.code, "atlas_ecosystem_not_found");

  const pathGraph = await getJson("/api/graph/cloudflare/agents?limit=8");
  assert.equal(pathGraph.status, 200);
  assert.equal(pathGraph.body.focus, "cloudflare/agents");
  assert.ok(pathGraph.body.nodes.length > 0);
  assert.equal(pathGraph.body.project.repo, "cloudflare/agents");
  assert.ok(Array.isArray(pathGraph.body.relationship_groups.use_cases));
  assertMetadata(pathGraph.body.metadata, "db_missing");

  const shortPathGraph = await getJson("/api/graph/claude-code?limit=8");
  assert.equal(shortPathGraph.status, 200);
  assert.equal(shortPathGraph.body.resolved_from.requested_id, "claude-code");
  assert.equal(shortPathGraph.body.resolved_from.resolution, "alias");
  assert.equal(shortPathGraph.body.project.repo, shortPathGraph.body.resolved_from.resolved_id);
  assertMetadata(shortPathGraph.body.metadata, "db_missing");

  const related = await getJson("/api/related/cloudflare/agents?limit=4");
  assert.equal(related.status, 200);
  assert.ok(Array.isArray(related.body.related));
  assert.ok(related.body.related.length > 0, "related endpoint should return seed related projects");
  assert.ok(related.body.related.length <= 4, "related endpoint should honor limit");
  assertMetadata(related.body.metadata, "db_missing");

  const postRelated = await request("/api/related", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents",
      limit: 3
    })
  });
  assert.equal(postRelated.status, 200);
  assert.equal(postRelated.body.project.repo, "cloudflare/agents");
  assert.ok(Array.isArray(postRelated.body.related));
  assert.ok(postRelated.body.related.length > 0, "structured related endpoint should return seed related projects");
  assert.ok(postRelated.body.related.length <= 3, "structured related endpoint should honor limit");
  assertMetadata(postRelated.body.metadata, "db_missing");

  const score = await getJson("/api/score/cloudflare/agents");
  assert.equal(score.status, 200);
  assert.equal(score.body.project_id, "cloudflare/agents");
  assert.equal(score.body.project.repo, "cloudflare/agents");
  assert.equal(score.body.score, score.body.git_top_score);
  assert.ok(typeof score.body.quality_score === "number");
  assert.ok(typeof score.body.agent_score === "number");
  assert.ok(Array.isArray(score.body.dimensions));
  assert.equal(score.body.dimensions.length, 6);
  assert.ok(typeof score.body.dimensions[0].contribution === "number");
  assert.ok(typeof score.body.summary === "string");
  assert.ok(score.body.strongest_dimension.key);
  assert.ok(score.body.weakest_dimension.key);
  assert.ok(typeof score.body.adoption_guidance === "string");
  assert.ok(Array.isArray(score.body.risk_flags));
  assert.ok(["high", "medium", "low"].includes(score.body.score_confidence.level));
  assert.ok(Array.isArray(score.body.score_confidence.evidence_checklist));
  assert.ok(score.body.score_confidence.evidence_checklist.some((item) => item.signal === "Classification evidence"));
  assert.ok(Array.isArray(score.body.evidence.source_fields));
  assert.ok(score.body.evidence.source_fields.includes("metrics"));
  assert.ok(Array.isArray(score.body.evidence.caveats));
  assert.equal(typeof score.body.evidence.confidence_reason, "string");
  assert.ok(score.body.evidence.last_verified_at);
  assert.ok(Array.isArray(score.body.caveats));
  assert.equal(typeof score.body.confidence_reason, "string");
  assert.ok(Array.isArray(score.body.next_actions));
  assert.ok(score.body.next_actions.some((action) => action.kind === "alternatives"));
  assert.ok(score.body.links.compare_api.includes("/api/compare"));
  assert.ok(score.body.related_scores && typeof score.body.related_scores.agent_score === "number");
  assertMetadata(score.body.metadata, "db_missing");

  const aliasScore = await getJson("/api/score/claude-code");
  assert.equal(aliasScore.status, 200);
  assert.equal(aliasScore.body.resolved_from.requested_id, "claude-code");
  assert.equal(aliasScore.body.resolved_from.resolution, "alias");
  assert.equal(aliasScore.body.project_id, aliasScore.body.project.repo);
  assert.equal(aliasScore.body.project.repo, aliasScore.body.resolved_from.resolved_id);
  assert.equal(aliasScore.body.score, aliasScore.body.git_top_score);
  assertMetadata(aliasScore.body.metadata, "db_missing");

  const postScore = await request("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cloudflare/agents"
    })
  });
  assert.equal(postScore.status, 200);
  assert.equal(postScore.body.project_id, "cloudflare/agents");
  assert.equal(postScore.body.project.repo, "cloudflare/agents");
  assert.equal(postScore.body.score, postScore.body.git_top_score);
  assert.ok(Array.isArray(postScore.body.dimensions));
  assert.equal(postScore.body.dimensions.length, 6);
  assert.ok(typeof postScore.body.adoption_guidance === "string");
  assert.ok(postScore.body.next_actions.some((action) => action.kind === "graph"));
  assertMetadata(postScore.body.metadata, "db_missing");

  const aliasPostScore = await request("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "cursor"
    })
  });
  assert.equal(aliasPostScore.status, 200);
  assert.equal(aliasPostScore.body.resolved_from.requested_id, "cursor");
  assert.equal(aliasPostScore.body.resolved_from.resolution, "alias");
  assert.equal(aliasPostScore.body.project.repo, aliasPostScore.body.resolved_from.resolved_id);
  assertMetadata(aliasPostScore.body.metadata, "db_missing");

  const missingScore = await getJson("/api/score/not-real/project");
  assert.equal(missingScore.status, 404);
  assert.equal(missingScore.body.error.code, "project_not_found");

  const quality = await getJson("/api/quality");
  assert.equal(quality.status, 200);
  assert.ok(typeof quality.body.score === "number");
  assert.equal(quality.body.score, quality.body.release_score);
  assert.ok(typeof quality.body.git_top_score === "number" || quality.body.git_top_score === undefined);
  assert.ok(typeof quality.body.release_score === "number");
  assert.ok(typeof quality.body.data_trust_score === "number");
  assert.ok(quality.body.score_summary.release_score_meaning.includes("Release gate score"));
  assert.ok(quality.body.score_summary.data_trust_score_meaning.includes("Corpus trust score"));
  assert.ok(["low", "medium", "high"].includes(quality.body.risk_level));
  assert.equal(quality.body.risk_summary.level, quality.body.risk_level);
  assert.ok(Array.isArray(quality.body.risk_summary.reasons));
  assert.ok(Array.isArray(quality.body.improvement_plan));
  assert.ok(quality.body.improvement_plan.length > 0);
  assert.ok(quality.body.improvement_plan[0].priority);
  assert.ok(Array.isArray(quality.body.improvement_plan[0].urls));
  assert.ok(typeof quality.body.risk_summary.low_confidence_classification_rate === "number");
  assert.ok(typeof quality.body.coverage.covered_categories === "number");
  assert.ok(Array.isArray(quality.body.coverage.missing_categories));
  assert.ok(typeof quality.body.coverage.collection_count === "number");
  assert.ok(typeof quality.body.coverage.collection_rate === "number");
  assert.ok(typeof quality.body.coverage.collection_scope_counts.awesome_list === "number");
  assert.ok(typeof quality.body.coverage.collection_freshness_counts.active === "number");
  assert.ok(typeof quality.body.coverage.stale_collection_count === "number");
  assert.ok(typeof quality.body.coverage.collection_review_count === "number");
  assertMetadata(quality.body.metadata, "db_missing");

  const trust = await getJson("/api/trust");
  assert.equal(trust.status, 200);
  assert.equal(trust.body.name, "Git.Top Trust Gate");
  assert.equal(trust.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(["allow", "caution", "block"].includes(trust.body.decision));
  assert.equal(typeof trust.body.production_ready, "boolean");
  assert.ok(Array.isArray(trust.body.checks));
  assert.ok(trust.body.checks.some((check) => check.id === "d1-source"));
  assert.ok(trust.body.checks.some((check) => check.id === "derived-alternatives"));
  assert.ok(trust.body.checks.some((check) => check.id === "data-trust-score"));
  assert.ok(Array.isArray(trust.body.required_for_high_confidence));
  assert.ok(trust.body.required_for_high_confidence.includes("metadata.source=d1"));
  assert.ok(trust.body.agent_policy.cite.includes("metadata.source"));
  assert.ok(trust.body.quality.release_score === quality.body.release_score);
  assertMetadata(trust.body.metadata, "db_missing");

  const postTrust = await request("/api/trust", { method: "POST" });
  assert.equal(postTrust.status, 405);
  assert.equal(postTrust.body.error.code, "method_not_allowed");

  const review = await getJson("/api/quality/review");
  assert.equal(review.status, 200);
  assert.ok(typeof review.body.project_count === "number");
  assert.ok(typeof review.body.review_count === "number");
  assert.ok(typeof review.body.low_signal_count === "number");
  assert.ok(typeof review.body.medium_signal_count === "number");
  assert.ok(Array.isArray(review.body.items));
  if (review.body.items.length > 0) {
    assert.ok(typeof review.body.items[0].impact_score === "number");
    assert.ok(Array.isArray(review.body.items[0].impact_factors));
  }
  assert.ok(review.body.category_counts && typeof review.body.category_counts === "object");
  assertMetadata(review.body.metadata, "db_missing");
}

async function testBenchmarkRoute() {
  const benchmark = await getJson("/api/benchmark");
  assert.equal(benchmark.status, 200);
  assert.equal(benchmark.body.name, "Git.Top Public Trust Benchmark");
  assert.equal(typeof benchmark.body.summary, "string");
  assert.equal(benchmark.body.evaluation.evaluated_cases, 28);
  assert.equal(benchmark.body.evaluation.top3_hit_rate, 1);
  assert.ok(benchmark.body.evaluation.top1_hit_rate > 0.9);
  assert.equal(benchmark.body.evaluation.unacceptable_hit_count, 0);
  assert.ok(Array.isArray(benchmark.body.evaluation.review_focus));
  assert.equal(benchmark.body.explanations.checks, 12);
  assert.equal(benchmark.body.explanations.passed, 12);
  assert.equal(benchmark.body.explanations.failed, 0);
  assert.equal(benchmark.body.explanations.coverage, 1);
  assert.ok(typeof benchmark.body.data_coverage.release_score === "number");
  assert.ok(typeof benchmark.body.data_coverage.data_trust_score === "number");
  assert.ok(["low", "medium", "high"].includes(benchmark.body.data_coverage.risk_level));
  assert.ok(typeof benchmark.body.review_queue.review_count === "number");
  assert.ok(Array.isArray(benchmark.body.known_limitations));
  assert.ok(benchmark.body.known_limitations.length > 0);
  assert.equal(benchmark.body.links.html, "/benchmark");
  assertMetadata(benchmark.body.metadata, "db_missing");

  const postBenchmark = await request("/api/benchmark", { method: "POST" });
  assert.equal(postBenchmark.status, 405);
  assert.equal(postBenchmark.body.error.code, "method_not_allowed");
}

async function testSchemaRoutes() {
  const agentCardSchema = await getJson("/api/schema/agent-card.v1");
  assert.equal(agentCardSchema.status, 200);
  assert.equal(agentCardSchema.body.$id, "https://git.top/schemas/agent-card.v1.json");
  assert.deepEqual(agentCardSchema.body.properties.project_kind.enum, ["project", "collection"]);
  assert.equal(agentCardSchema.body.properties.collection_metadata.$ref, "#/$defs/collection_metadata");
  assert.equal(agentCardSchema.body.properties.classification.type, "object");

  const projectKnowledgeSchema = await getJson("/api/schema/project-knowledge.v1");
  assert.equal(projectKnowledgeSchema.status, 200);
  assert.equal(projectKnowledgeSchema.body.$id, "https://git.top/schemas/project-knowledge.v1.json");
  assert.ok(projectKnowledgeSchema.body.required.includes("agent_card"));
  assert.equal(projectKnowledgeSchema.body.properties.agent_card.$id, "https://git.top/schemas/agent-card.v1.json");

  const projectSchema = await getJson("/api/schema/project.v2");
  assert.equal(projectSchema.status, 200);
  assert.equal(projectSchema.body.$id, "https://git.top/schemas/project.v2.json");
  assert.deepEqual(projectSchema.body.properties.project_kind.enum, ["project", "collection"]);
  assert.equal(projectSchema.body.properties.collection_metadata.$ref, "#/$defs/collection_metadata");
  assert.equal(projectSchema.body.properties.quality_signal_confidence.type, "object");

  const agentMap = await getJson("/api/agent-map");
  assert.equal(agentMap.status, 200);
  assert.equal(agentMap.body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(agentMap.body.surfaces));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Project graph" && surface.human_page === "/graph/:project"));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Recommendations" && surface.mcp_tools.includes("recommend_project")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Agent workflow" && surface.mcp_tools.includes("get_agent_workflow")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "API examples" && surface.rest.includes("GET /api/examples")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "API and MCP discovery" && surface.rest.includes("GET /mcp")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Recommendations" && surface.output_fields.includes("recommendations[].adoption_plan")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Open source trends" && surface.rest.includes("GET /api/trends")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Quality and coverage" && surface.rest.includes("GET /api/benchmark")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Alternatives" && surface.output_fields.includes("alternative_matches[].replacement_risk")));
  assert.ok(agentMap.body.surfaces.some((surface) => surface.concept === "Score explanation" && surface.output_fields.includes("score_confidence")));
  assert.ok(Array.isArray(agentMap.body.short_path));
  assert.equal(agentMap.body.short_path[0].concept, "Trust preflight");
  assert.ok(Array.isArray(agentMap.body.reference_path));
  assert.equal(agentMap.body.reference_path[0].concept, "Trust and freshness");
  assert.equal(agentMap.body.trust_policy.high_confidence_source, "metadata.source=d1");
}

async function testOpenApiDocument() {
  const openapi = await getJson("/api/openapi.json");
  assert.equal(openapi.status, 200);
  assert.equal(openapi.body.openapi, "3.1.0");
  assert.ok(openapi.body.paths["/api/agent-map"], "OpenAPI should document agent surface map endpoint");
  assert.ok(openapi.body.paths["/api/quickstart"], "OpenAPI should document quickstart endpoint");
  assert.ok(openapi.body.paths["/api/recipes"], "OpenAPI should document recipes endpoint");
  assert.ok(openapi.body.paths["/api/examples"], "OpenAPI should document examples endpoint");
  assert.ok(openapi.body.paths["/api/journeys"], "OpenAPI should document Atlas journeys endpoint");
  assert.ok(openapi.body.paths["/api/roadmap"], "OpenAPI should document roadmap endpoint");
  assert.ok(openapi.body.paths["/api/trust"], "OpenAPI should document trust gate endpoint");
  assert.ok(openapi.body.paths["/api/benchmark"], "OpenAPI should document benchmark endpoint");
  assert.ok(openapi.body.paths["/api/quality"], "OpenAPI should document quality report endpoint");
  assert.ok(openapi.body.paths["/api/quality/review"], "OpenAPI should document quality review endpoint");
  assert.ok(openapi.body.paths["/api/related/{owner}/{repo}"], "OpenAPI should document related projects endpoint");
  assert.ok(openapi.body.paths["/api/project/{project}"], "OpenAPI should document alias project endpoint");
  assert.ok(openapi.body.paths["/api/alternatives/{project}"], "OpenAPI should document alias alternatives endpoint");
  assert.ok(openapi.body.paths["/api/related/{project}"], "OpenAPI should document alias related endpoint");
  assert.ok(openapi.body.paths["/api/related"].post, "OpenAPI should document structured related projects POST endpoint");
  assert.ok(openapi.body.paths["/api/score/{owner}/{repo}"], "OpenAPI should document score explanation endpoint");
  assert.ok(openapi.body.paths["/api/score/{project}"], "OpenAPI should document alias score endpoint");
  assert.ok(openapi.body.paths["/api/score"].post, "OpenAPI should document structured score POST endpoint");
  assert.ok(openapi.body.paths["/api/graph/{owner}/{repo}"], "OpenAPI should document path graph endpoint");
  assert.ok(openapi.body.paths["/api/graph/{project}"], "OpenAPI should document alias graph endpoint");
  assert.ok(openapi.body.paths["/api/atlas"], "OpenAPI should document Atlas endpoint");
  assert.ok(openapi.body.paths["/api/atlas/{ecosystem}"], "OpenAPI should document Atlas ecosystem endpoint");
  assert.ok(openapi.body.paths["/api/project"].post, "OpenAPI should document structured project POST endpoint");
  assert.ok(openapi.body.paths["/api/recommend"].post, "OpenAPI should document structured recommend POST endpoint");
  assert.ok(openapi.body.paths["/api/workflow"].post, "OpenAPI should document structured workflow POST endpoint");
  assert.ok(openapi.body.paths["/api/trends"], "OpenAPI should document trends endpoint");
  assert.ok(openapi.body.paths["/api/compare"].post, "OpenAPI should document structured compare POST endpoint");
  assert.ok(openapi.body.paths["/api/alternatives"].post, "OpenAPI should document structured alternatives POST endpoint");
  assert.ok(openapi.body.paths["/api/admin/alternatives"].post, "OpenAPI should document the protected alternatives refresh endpoint");
  assert.deepEqual(
    openapi.body.paths["/api/admin/alternatives"].post.parameters.map((item) => item.name),
    ["offset", "limit", "record_run"]
  );
  assert.ok(openapi.body.paths["/api/related"].post, "OpenAPI should document structured related POST endpoint");
  assert.ok(openapi.body.paths["/api/score"].post, "OpenAPI should document structured score POST endpoint");
  assert.ok(openapi.body.paths["/api/graph"].post, "OpenAPI should document structured graph POST endpoint");
  assert.ok(openapi.body.components.schemas.ProjectLookupRequest, "OpenAPI should include ProjectLookupRequest schema");
  assert.ok(openapi.body.components.schemas.RecommendationRequest, "OpenAPI should include RecommendationRequest schema");
  assert.ok(openapi.body.components.schemas.WorkflowRequest, "OpenAPI should include WorkflowRequest schema");
  assert.ok(openapi.body.components.schemas.CompareRequest, "OpenAPI should include CompareRequest schema");
  assert.ok(openapi.body.components.schemas.AlternativesRequest, "OpenAPI should include AlternativesRequest schema");
  assert.ok(openapi.body.components.schemas.RelatedRequest, "OpenAPI should include RelatedRequest schema");
  assert.ok(openapi.body.components.schemas.ScoreRequest, "OpenAPI should include ScoreRequest schema");
  assert.ok(openapi.body.components.schemas.GraphRequest, "OpenAPI should include GraphRequest schema");
  assert.ok(openapi.body.components.schemas.GrpRequest, "OpenAPI should include GrpRequest schema");
  assert.ok(openapi.body.components.schemas.McpJsonRpcRequest, "OpenAPI should include McpJsonRpcRequest schema");
  assert.ok(openapi.body.components.schemas.McpJsonRpcSuccessResponse, "OpenAPI should include McpJsonRpcSuccessResponse schema");
  assert.ok(openapi.body.components.schemas.McpJsonRpcErrorResponse, "OpenAPI should include McpJsonRpcErrorResponse schema");
  assertPublicGetResponseSchemas(openapi.body);
  assertPublicPostContracts(openapi.body);
  assertOpenApiResponseSchema(openapi.body, "/api/health", "get", "HealthResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/trust", "get", "TrustGateResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/benchmark", "get", "BenchmarkResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/search", "get", "SearchResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/project/{owner}/{repo}", "get", "ProjectResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/project/{project}", "get", "ProjectResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/project", "post", "ProjectResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/recommend", "get", "RecommendationResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/recommend", "post", "RecommendationResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/compare", "get", "CompareResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/compare", "post", "CompareResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/quality", "get", "QualityReportResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/quality/review", "get", "QualityReviewResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/agent-map", "get", "AgentMapResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/roadmap", "get", "RoadmapResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/quickstart", "get", "QuickstartResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/recipes", "get", "RecipesResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/examples", "get", "ExamplesResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/trending", "get", "TrendingResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/trends", "get", "TrendsResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/workflow", "get", "WorkflowResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/workflow", "post", "WorkflowResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/alternatives/{owner}/{repo}", "get", "AlternativesResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/alternatives/{project}", "get", "AlternativesResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/alternatives", "post", "AlternativesResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/related/{owner}/{repo}", "get", "RelatedResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/related/{project}", "get", "RelatedResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/related", "post", "RelatedResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/score/{owner}/{repo}", "get", "ScoreResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/score/{project}", "get", "ScoreResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/score", "post", "ScoreResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/graph", "get", "GraphResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/graph", "post", "GraphResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/graph/{owner}/{repo}", "get", "GraphResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/graph/{project}", "get", "GraphResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/atlas", "get", "AtlasResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/atlas/{ecosystem}", "get", "AtlasResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/journeys", "get", "AtlasJourneysResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/grp/query", "post", "GrpResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/sync/status", "get", "SyncStatusResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/governance/summary", "get", "GovernanceSummaryResponse");
  assertOpenApiResponseSchema(openapi.body, "/api/governance/runs", "get", "GovernanceRunsResponse");
  assertOpenApiResponseSchema(openapi.body, "/mcp", "get", "McpDiscoveryResponse");
  assertOpenApiResponseSchema(openapi.body, "/mcp", "post", "McpJsonRpcSuccessResponse");
  assertOpenApiResponseSchema(openapi.body, "/mcp", "post", "McpJsonRpcErrorResponse", "400");
  assertOpenApiResponseExample(openapi.body, "/api/health", "get", ["metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/trust", "get", ["decision", "required_for_high_confidence"]);
  assertOpenApiResponseExample(openapi.body, "/api/benchmark", "get", ["evaluation", "explanations", "known_limitations", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/search", "get", ["projects", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/trending", "get", ["projects", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/trends", "get", ["summary", "trend_signals", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/roadmap", "get", ["phases", "agent_use"]);
  assertOpenApiResponseExample(openapi.body, "/api/quickstart", "get", ["steps", "trust_policy"]);
  assertOpenApiResponseExample(openapi.body, "/api/recipes", "get", ["recipes", "trust_policy"]);
  assertOpenApiResponseExample(openapi.body, "/api/examples", "get", ["examples", "trust_policy"]);
  assertOpenApiResponseExample(openapi.body, "/api/project/{owner}/{repo}", "get", ["summary", "quality_signal_confidence", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/recommend", "post", ["recommendations", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/compare", "get", ["decision_matrix", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/workflow", "get", ["recommended_sequence", "trust_policy", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/alternatives/{owner}/{repo}", "get", ["alternative_matches", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/graph", "get", ["nodes", "edges", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/score/{owner}/{repo}", "get", ["score_confidence", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/grp/query", "post", ["nodes", "edges", "evidence", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/api/quality/review", "get", ["review_count", "items", "metadata"]);
  assertOpenApiResponseExample(openapi.body, "/mcp", "get", ["endpoint", "tools"]);
  assert.equal(openapi.body.components.schemas.Metadata.properties.source.enum[0], "d1");
  assert.ok(openapi.body.components.schemas.Metadata.properties.warnings, "OpenAPI Metadata should document warnings");
  assert.ok(openapi.body.components.schemas.ErrorResponse.properties.code, "OpenAPI should include a machine-readable error code field");
  assert.ok(openapi.body.components.schemas.ProjectCard.properties.quality_signal_confidence, "ProjectCard should document quality_signal_confidence");
  assert.ok(openapi.body.components.schemas.RecommendationResponse.properties.recommendations, "RecommendationResponse should document recommendations");
  assert.ok(openapi.body.components.schemas.TrustGateResponse.properties.required_for_high_confidence, "TrustGateResponse should document high-confidence requirements");
  assert.ok(openapi.body.components.schemas.QualityReportResponse.properties.data_trust_score, "QualityReportResponse should separate data_trust_score from release_score");
  assert.ok(openapi.body.components.schemas.QualityReviewResponse.properties.review_count, "QualityReviewResponse should document review_count");
  assert.ok(openapi.body.components.schemas.BenchmarkResponse.properties.known_limitations, "BenchmarkResponse should document known limitations");
  assert.ok(openapi.body.components.schemas.TrendsResponse.properties.trend_signals, "TrendsResponse should document trend_signals");
  assert.ok(openapi.body.components.schemas.RoadmapResponse.properties.phases, "RoadmapResponse should document phases");
  assert.ok(openapi.body.components.schemas.WorkflowResponse.properties.recommended_sequence, "WorkflowResponse should document recommended_sequence");
  assert.ok(openapi.body.components.schemas.AlternativesResponse.properties.alternative_matches, "AlternativesResponse should document enriched alternative matches");
  assert.ok(openapi.body.components.schemas.AlternativesResponse.properties.evidence, "AlternativesResponse should document normalized evidence");
  assert.ok(openapi.body.components.schemas.AlternativeMatch.allOf[1].properties.evidence, "AlternativeMatch should document normalized evidence");
  assert.ok(openapi.body.components.schemas.GraphResponse.properties.relationship_groups, "GraphResponse should document relationship groups");
  assert.ok(openapi.body.components.schemas.GraphResponse.properties.evidence, "GraphResponse should document normalized evidence");
  assert.ok(openapi.body.components.schemas.ScoreResponse.properties.score_confidence, "ScoreResponse should document score confidence");
  assert.ok(openapi.body.components.schemas.AtlasResponse.properties.ecosystems, "AtlasResponse should document ecosystem lists");
  assert.ok(openapi.body.components.schemas.AgentMapResponse.properties.trust_policy, "AgentMapResponse should document trust_policy");
  assert.ok(openapi.body.components.schemas.GrpResponse.properties.metadata, "GrpResponse should document reasoning metadata");
  assert.ok(openapi.body.components.schemas.GrpResponse.properties.evidence, "GrpResponse should document normalized evidence");
  assert.equal(openapi.body.components.schemas.GrpResponse.properties.explanation.type, "array", "GrpResponse explanation should match runtime string[] shape");
  assert.ok(openapi.body.components.schemas.McpDiscoveryResponse.properties.tools, "McpDiscoveryResponse should document tools");
  assert.equal(openapi.body.paths["/mcp"].post.requestBody.content["application/json"].schema.$ref, "#/components/schemas/McpJsonRpcRequest");
  assert.ok(openapi.body.paths["/mcp"].post.responses["202"], "POST /mcp should document notifications/initialized 202 response");
  assert.equal(openapi.body.paths["/api/grp/query"].post.requestBody.content["application/json"].schema.$ref, "#/components/schemas/GrpRequest");
  assert.deepEqual(openapi.body.components.schemas.GrpRequest.properties.mode.enum, ["plan", "compare", "find", "compose"]);
  assert.deepEqual(openapi.body.components.schemas.McpJsonRpcRequest.properties.method.enum, ["initialize", "notifications/initialized", "tools/list", "tools/call"]);
  assert.ok(openapi.body.components.schemas.McpJsonRpcSuccessResponse.properties.result.anyOf, "MCP success result should allow multiple JSON-RPC result shapes");
  assert.match(
    openapi.body.components.schemas.McpJsonRpcSuccessResponse.description,
    /result\.content\[0\]\.text/,
    "McpJsonRpcSuccessResponse should document JSON text content parsing"
  );
  assert.match(
    openapi.body.components.schemas.McpJsonRpcErrorResponse.properties.error.properties.code.description,
    /-32003/,
    "McpJsonRpcErrorResponse should document strict D1 error code"
  );
  assert.ok(openapi.body.paths["/api/admin/discovery"], "OpenAPI should document candidate discovery endpoint");
  assert.ok(openapi.body.paths["/api/admin/classification-overrides"], "OpenAPI should document classification override endpoint");
  const searchParameterNames = openapi.body.paths["/api/search"].get.parameters.map((item) => item.name);
  assert.ok(searchParameterNames.includes("project_kind"));
  assert.ok(searchParameterNames.includes("min_confidence"));
  const recommendParameterNames = openapi.body.paths["/api/recommend"].get.parameters.map((item) => item.name);
  assert.ok(recommendParameterNames.includes("category"));
  assert.ok(recommendParameterNames.includes("license"));
  assert.ok(recommendParameterNames.includes("require_d1"));
  assert.ok(openapi.body.paths["/api/alternatives/{project}"].get.parameters.map((item) => item.name).includes("require_d1"));
  assert.ok(openapi.body.paths["/api/score/{project}"].get.parameters.map((item) => item.name).includes("require_d1"));
  assert.ok(openapi.body.paths["/api/graph/{project}"].get.parameters.map((item) => item.name).includes("require_d1"));
  assert.ok(openapi.body.paths["/api/atlas/{ecosystem}"].get.parameters.map((item) => item.name).includes("require_d1"));
  for (const path of ["/api/project", "/api/recommend", "/api/workflow", "/api/compare", "/api/alternatives", "/api/related", "/api/score", "/api/graph", "/api/grp/query"]) {
    assert.ok(
      openapi.body.paths[path].post.parameters.map((item) => item.name).includes("require_d1"),
      `${path} POST should document require_d1 query parameter`
    );
  }
  assert.deepEqual(openapi.body.paths["/api/admin/classification-overrides"], openApiDocument.paths["/api/admin/classification-overrides"]);
  assert.deepEqual(openapi.body.paths["/api/admin/discovery"], openApiDocument.paths["/api/admin/discovery"]);
  assert.equal(openapi.body.components.securitySchemes.syncSecret.scheme, "bearer");
  assert.deepEqual(openapi.body.paths["/api/quality/review"], openApiDocument.paths["/api/quality/review"]);
}

function assertOpenApiResponseSchema(document, path, method, schemaName, status = "200") {
  const schema = document.paths[path][method].responses[status].content["application/json"].schema;
  assert.equal(schema.$ref, `#/components/schemas/${schemaName}`, `${method.toUpperCase()} ${path} should document ${schemaName}`);
  assert.ok(document.components.schemas[schemaName], `OpenAPI should include ${schemaName} schema`);
}

function assertPublicGetResponseSchemas(document) {
  for (const [path, methods] of Object.entries(document.paths)) {
    if (!methods.get || path.startsWith("/api/admin/") || path.startsWith("/api/schema/")) {
      continue;
    }
    const schema = methods.get.responses?.["200"]?.content?.["application/json"]?.schema;
    assert.ok(schema?.$ref, `GET ${path} should document a shared response schema`);
    const schemaName = schema.$ref.replace("#/components/schemas/", "");
    assert.ok(document.components.schemas[schemaName], `GET ${path} references missing schema ${schemaName}`);
  }
}

function assertPublicPostContracts(document) {
  for (const [path, methods] of Object.entries(document.paths)) {
    if (!methods.post || path.startsWith("/api/admin/")) {
      continue;
    }
    const requestSchema = methods.post.requestBody?.content?.["application/json"]?.schema;
    assert.ok(requestSchema?.$ref, `POST ${path} should document a shared JSON request schema`);
    const requestSchemaName = requestSchema.$ref.replace("#/components/schemas/", "");
    assert.ok(document.components.schemas[requestSchemaName], `POST ${path} references missing request schema ${requestSchemaName}`);
    const responseSchema = methods.post.responses?.["200"]?.content?.["application/json"]?.schema;
    assert.ok(responseSchema?.$ref, `POST ${path} should document a shared 200 response schema`);
    const responseSchemaName = responseSchema.$ref.replace("#/components/schemas/", "");
    assert.ok(document.components.schemas[responseSchemaName], `POST ${path} references missing response schema ${responseSchemaName}`);
  }
}

function assertOpenApiResponseExample(document, path, method, keys) {
  const example = document.paths[path][method].responses["200"].content["application/json"].example;
  assert.ok(example, `${method.toUpperCase()} ${path} should include a canonical response example`);
  for (const key of keys) {
    assert.ok(Object.hasOwn(example, key), `${method.toUpperCase()} ${path} response example should include ${key}`);
  }
}

async function testMethodAndBodyValidation() {
  const searchPost = await request("/api/search", { method: "POST" });
  assert.equal(searchPost.status, 405);
  assert.equal(searchPost.body.error.code, "method_not_allowed");

  const grpGet = await getJson("/api/grp/query");
  assert.equal(grpGet.status, 405);
  assert.equal(grpGet.body.error.code, "method_not_allowed");

  const grpInvalidJson = await request("/api/grp/query", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(grpInvalidJson.status, 400);
  assert.equal(grpInvalidJson.body.error.code, "invalid_json");

  const recommendInvalidJson = await request("/api/recommend", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(recommendInvalidJson.status, 400);
  assert.equal(recommendInvalidJson.body.error.code, "invalid_json");

  const recommendInvalidBody = await request("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cloudflare_ready: "yes" })
  });
  assert.equal(recommendInvalidBody.status, 400);
  assert.equal(recommendInvalidBody.body.error.code, "invalid_recommendation_request");

  const workflowInvalidBody = await request("/api/workflow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cloudflare_ready: "yes" })
  });
  assert.equal(workflowInvalidBody.status, 400);
  assert.equal(workflowInvalidBody.body.error.code, "invalid_workflow_request");

  const compareInvalidJson = await request("/api/compare", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(compareInvalidJson.status, 400);
  assert.equal(compareInvalidJson.body.error.code, "invalid_json");

  const compareInvalidBody = await request("/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project_ids: [1, 2] })
  });
  assert.equal(compareInvalidBody.status, 400);
  assert.equal(compareInvalidBody.body.error.code, "invalid_compare_request");

  const alternativesInvalidJson = await request("/api/alternatives", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(alternativesInvalidJson.status, 400);
  assert.equal(alternativesInvalidJson.body.error.code, "invalid_json");

  const alternativesInvalidBody = await request("/api/alternatives", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: "3" })
  });
  assert.equal(alternativesInvalidBody.status, 400);
  assert.equal(alternativesInvalidBody.body.error.code, "invalid_alternatives_request");

  const projectInvalidJson = await request("/api/project", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(projectInvalidJson.status, 400);
  assert.equal(projectInvalidJson.body.error.code, "invalid_json");

  const projectInvalidBody = await request("/api/project", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ related_limit: "3" })
  });
  assert.equal(projectInvalidBody.status, 400);
  assert.equal(projectInvalidBody.body.error.code, "invalid_project_request");

  const relatedInvalidBody = await request("/api/related", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: "3" })
  });
  assert.equal(relatedInvalidBody.status, 400);
  assert.equal(relatedInvalidBody.body.error.code, "invalid_project_request");

  const scoreInvalidBody = await request("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(scoreInvalidBody.status, 400);
  assert.equal(scoreInvalidBody.body.error.code, "invalid_project_request");

  const graphInvalidJson = await request("/api/graph", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(graphInvalidJson.status, 400);
  assert.equal(graphInvalidJson.body.error.code, "invalid_json");

  const graphInvalidBody = await request("/api/graph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ limit: "8" })
  });
  assert.equal(graphInvalidBody.status, 400);
  assert.equal(graphInvalidBody.body.error.code, "invalid_graph_request");

  const adminSync = await request("/api/admin/sync", { method: "POST" });
  assert.equal(adminSync.status, 401);
  assert.equal(adminSync.body.error.code, "unauthorized");

  const authorizedAdminSync = await request(
    "/api/admin/sync",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        repositories: [],
        limit: 5,
        signal_depth: "lite"
      })
    },
    { ...mockD1Env(), SYNC_SECRET: "test-secret" }
  );
  assert.equal(authorizedAdminSync.status, 200);
  assert.deepEqual(authorizedAdminSync.body.synced, []);
  assert.deepEqual(authorizedAdminSync.body.failed, []);
  assert.equal(authorizedAdminSync.body.derived_refresh.alternatives, "updated");

  const adminSyncWithoutDerived = await request(
    "/api/admin/sync",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        repositories: [],
        limit: 5,
        signal_depth: "lite",
        refresh_derived: false
      })
    },
    { ...mockD1Env(), SYNC_SECRET: "test-secret" }
  );
  assert.equal(adminSyncWithoutDerived.status, 200);
  assert.equal(adminSyncWithoutDerived.body.derived_refresh.alternatives, "skipped");
  assert.equal(adminSyncWithoutDerived.body.alternatives_updated, 0);

  const alternativesEnv = { ...mockD1Env(), SYNC_SECRET: "test-secret" };
  const authorizedAlternatives = await request(
    "/api/admin/alternatives",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      }
    },
    alternativesEnv
  );
  assert.equal(authorizedAlternatives.status, 200);
  assert.equal(authorizedAlternatives.body.run.task, "derived:alternatives");
  assert.equal(authorizedAlternatives.body.run.status, "success");
  assert.equal(authorizedAlternatives.body.run.summary.source, "d1");
  assert.equal(authorizedAlternatives.body.updated, authorizedAlternatives.body.updates.length);

  const batchedAlternatives = await request(
    "/api/admin/alternatives?offset=1&limit=2&record_run=false",
    { method: "POST", headers: { authorization: "Bearer test-secret" } },
    alternativesEnv
  );
  assert.equal(batchedAlternatives.status, 200);
  assert.equal(batchedAlternatives.body.batch.offset, 1);
  assert.equal(batchedAlternatives.body.batch.limit, 2);
  assert.equal(batchedAlternatives.body.run, null);

  const invalidAlternativesBatch = await request(
    "/api/admin/alternatives?offset=-1&limit=26&record_run=maybe",
    { method: "POST", headers: { authorization: "Bearer test-secret" } },
    alternativesEnv
  );
  assert.equal(invalidAlternativesBatch.status, 400);
  assert.equal(invalidAlternativesBatch.body.error.code, "invalid_alternatives_refresh_request");

  const alternativesRuns = await request("/api/governance/runs?task=derived:alternatives", {}, alternativesEnv);
  assert.equal(alternativesRuns.status, 200);
  assert.equal(alternativesRuns.body.runs.length, 1);
  assert.equal(alternativesRuns.body.runs[0].task, "derived:alternatives");

  const discoveryGet = await request("/api/admin/discovery");
  assert.equal(discoveryGet.status, 405);
  assert.equal(discoveryGet.body.error.code, "method_not_allowed");

  const discoveryUnauthorized = await request("/api/admin/discovery", { method: "POST" });
  assert.equal(discoveryUnauthorized.status, 401);
  assert.equal(discoveryUnauthorized.body.error.code, "unauthorized");

  const originalFetch = globalThis.fetch;
  let githubSearchAuthorization = null;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
    if (url.startsWith("https://api.github.com/search/repositories")) {
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
      githubSearchAuthorization = headers.get("authorization");
      return Response.json({
        items: [
          {
            full_name: "cloudflare/agents",
            description: "Build and deploy AI agents on Cloudflare.",
            stargazers_count: 1000,
            pushed_at: "2026-06-30T00:00:00Z",
            archived: false,
            disabled: false,
            private: false,
            fork: false
          }
        ]
      });
    }
    return originalFetch(input);
  };
  try {
    const discoveryEnv = { ...mockD1Env(), SYNC_SECRET: "test-secret", GITHUB_TOKEN: "github-token" };
    const authorizedDiscovery = await request(
      "/api/admin/discovery",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json"
        },
        body: JSON.stringify({ max_candidates: 1, search_index: 0 })
      },
      discoveryEnv
    );
    assert.equal(authorizedDiscovery.status, 200);
    assert.equal(authorizedDiscovery.body.query.category, "agent_framework");
    assert.equal(authorizedDiscovery.body.discovered_count, 1);
    assert.deepEqual(authorizedDiscovery.body.selected, []);
    assert.deepEqual(authorizedDiscovery.body.synced, []);
    assert.equal(authorizedDiscovery.body.run.task, "candidate-discovery");
    assert.equal(authorizedDiscovery.body.run.status, "skipped");
    assert.equal(githubSearchAuthorization, "Bearer github-token");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const adminOverrides = await request("/api/admin/classification-overrides");
  assert.equal(adminOverrides.status, 401);
  assert.equal(adminOverrides.body.error.code, "unauthorized");

  const adminGovernance = await request("/api/admin/governance/runs", { method: "POST" });
  assert.equal(adminGovernance.status, 401);
  assert.equal(adminGovernance.body.error.code, "unauthorized");
}

async function testCorsHeaders() {
  const publicPreflight = await worker.fetch(
    new Request("https://git.top/api/search", {
      method: "OPTIONS",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "GET"
      }
    }),
    env
  );
  assert.equal(publicPreflight.status, 204);
  assert.equal(publicPreflight.headers.get("access-control-allow-origin"), "*");
  assert.match(publicPreflight.headers.get("access-control-allow-methods") ?? "", /GET/);

  const publicGet = await worker.fetch(
    new Request("https://git.top/api/search?q=cloudflare&limit=1", {
      headers: {
        origin: "https://example.com"
      }
    }),
    env
  );
  assert.equal(publicGet.status, 200);
  assert.equal(publicGet.headers.get("access-control-allow-origin"), "*");

  const adminPreflight = await worker.fetch(
    new Request("https://git.top/api/admin/discovery", {
      method: "OPTIONS",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "POST"
      }
    }),
    env
  );
  assert.notEqual(adminPreflight.status, 204);
  assert.equal(adminPreflight.headers.get("access-control-allow-origin"), null);
}

async function testMockD1Source() {
  const d1Env = mockD1Env();

  const health = await request("/api/health", {}, d1Env);
  assert.equal(health.status, 200);
  assert.equal(health.body.db, "available");
  assert.equal(health.body.raw_project_count, 1);
  assert.equal(health.body.knowledge_ready_project_count, 1);
  assert.equal(health.body.project_count, 1);
  assert.equal(health.body.sync_health, "unknown");
  assert.equal(health.body.sync_freshness, "unknown");
  assertMetadata(health.body.metadata, "d1_query", "d1");

  const search = await request("/api/search?q=mock&limit=5", {}, d1Env);
  assert.equal(search.status, 200);
  assert.equal(search.body.projects.length, 1);
  assert.equal(search.body.knowledge.length, 1);
  assert.equal(search.body.projects[0].repo, mockD1ProjectId);
  assert.equal(search.body.projects[0].project_kind, "project");
  assert.equal(search.body.knowledge[0].agent_card.project_kind, "project");
  assert.equal(search.body.knowledge[0].agent_card.collection_metadata, undefined);
  assert.equal(search.body.knowledge[0].metrics.calculated_at, "2026-06-20T00:00:00Z");
  assert.equal(search.body.projects[0].classification.category.confidence, "high");
  assertMetadata(search.body.metadata, "d1_query", "d1");

  const project = await request(`/api/project/${encodeURIComponent(mockD1ProjectId)}`, {}, d1Env);
  assert.equal(project.status, 200);
  assert.equal(project.body.repo, mockD1ProjectId);
  assert.equal(project.body.project_kind, "project");
  assert.ok(typeof project.body.git_top_score === "number");
  assert.ok(Array.isArray(project.body.related));
  assert.equal(project.body.knowledge.project.full_name, mockD1ProjectId);
  assert.equal(project.body.knowledge.agent_card.project_kind, "project");
  assert.ok(typeof project.body.summary.tl_dr === "string");
  assert.ok(Array.isArray(project.body.summary.inputs));
  assert.ok(Array.isArray(project.body.summary.outputs));
  assert.equal(project.body.quality_signal_confidence.stars_30d_delta, "snapshot");
  assertMetadata(project.body.metadata, "d1_query", "d1");
}

async function testRequireD1Mode() {
  const strictFallback = await getJson("/api/search?q=cloudflare&require_d1=true");
  assert.equal(strictFallback.status, 503);
  assert.equal(strictFallback.body.error.code, "d1_required");
  assert.equal(strictFallback.body.error.metadata.source, "seed");
  assert.equal(strictFallback.body.error.metadata.reason, "db_missing");

  const strictProjectFallback = await getJson("/api/project/cloudflare/agents?require_d1=true");
  assert.equal(strictProjectFallback.status, 503);
  assert.equal(strictProjectFallback.body.error.code, "d1_required");

  for (const path of [
    "/api/recommend?use_case=cloudflare%20agent&require_d1=true",
    "/api/quality?require_d1=true",
    "/api/benchmark?require_d1=true",
    "/api/graph/cloudflare/agents?require_d1=true"
  ]) {
    const strictResponse = await getJson(path);
    assert.equal(strictResponse.status, 503, `${path} should fail closed without D1`);
    assert.equal(strictResponse.body.error.code, "d1_required");
  }

  const strictD1 = await request("/api/search?q=mock&require_d1=true", {}, mockD1Env());
  assert.equal(strictD1.status, 200);
  assert.equal(strictD1.body.projects.length, 1);
  assertMetadata(strictD1.body.metadata, "d1_query", "d1");

  const strictBenchmarkD1 = await request("/api/benchmark?require_d1=true", {}, mockD1Env());
  assert.equal(strictBenchmarkD1.status, 200);
  assert.equal(strictBenchmarkD1.body.name, "Git.Top Public Trust Benchmark");
  assertMetadata(strictBenchmarkD1.body.metadata, "d1_query", "d1");

  const strictEmpty = await request("/api/search?q=cloudflare&require_d1=true", {}, mockD1Env("empty"));
  assert.equal(strictEmpty.status, 503);
  assert.equal(strictEmpty.body.error.metadata.reason, "db_empty");

  const strictError = await request("/api/search?q=cloudflare&require_d1=true", {}, mockD1Env("error"));
  assert.equal(strictError.status, 503);
  assert.equal(strictError.body.error.metadata.reason, "db_error");
}

async function testD1FallbackReasons() {
  const empty = await request("/api/search?q=cloudflare&limit=2", {}, mockD1Env("empty"));
  assert.equal(empty.status, 200);
  assert.ok(empty.body.projects.length > 0);
  assertMetadata(empty.body.metadata, "db_empty");

  const failed = await request("/api/search?q=cloudflare&limit=2", {}, mockD1Env("error"));
  assert.equal(failed.status, 200);
  assert.ok(failed.body.projects.length > 0);
  assertMetadata(failed.body.metadata, "db_error");
  assert.ok(typeof failed.body.metadata.error === "string");
}

async function testSyncStatusWithMockD1() {
  const now = new Date().toISOString();
  const healthy = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      cursor: 7,
      syncRuns: [
        syncRunRow({
          id: "healthy_sync",
          synced_count: 2,
          failed_count: 0,
          finished_at: now
        })
      ],
      governanceRuns: [
        governanceRunRow({
          id: "derived_alternatives",
          task: "derived:alternatives",
          status: "success",
          trigger: "admin",
          finished_at: now
        })
      ]
    })
  );
  assert.equal(healthy.status, 200);
  assert.equal(healthy.body.health, "healthy");
  assert.equal(healthy.body.freshness, "fresh");
  assert.equal(healthy.body.indexed_count, 1);
  assert.equal(healthy.body.synced_count, 0);
  assert.equal(healthy.body.cursor, 7);
  assert.equal(healthy.body.cycle_complete, false);
  assert.equal(healthy.body.next_batch_wraps, false);
  assert.equal(healthy.body.last_successful_sync_at, now);
  assert.equal(typeof healthy.body.hours_since_successful_sync, "number");
  assert.equal(healthy.body.last_failed_sync_at, null);
  assert.equal(healthy.body.next_batch.length, 5);
  assert.equal(typeof healthy.body.priority.generated_at, "string");
  assert.equal(healthy.body.priority.policy.hot_target_days, 1);
  assert.equal(typeof healthy.body.priority.counts.hot, "number");
  assert.ok(Array.isArray(healthy.body.priority.priority_preview));
  assert.equal(healthy.body.derived.alternatives.freshness, "fresh");
  assert.equal(healthy.body.derived.alternatives.last_run_status, "success");

  const degraded = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      syncRuns: [
        syncRunRow({
          id: "failed_sync",
          synced_count: 0,
          failed_count: 1,
          finished_at: "2026-06-20T02:00:00Z",
          failed_json: JSON.stringify([{ repository: mockD1ProjectId, error: "rate limited" }])
        })
      ]
    })
  );
  assert.equal(degraded.status, 200);
  assert.equal(degraded.body.health, "degraded");
  assert.equal(degraded.body.freshness, "unknown");
  assert.equal(degraded.body.last_successful_sync_at, null);
  assert.equal(degraded.body.hours_since_successful_sync, null);
  assert.equal(degraded.body.last_failed_sync_at, "2026-06-20T02:00:00Z");
  assert.equal(degraded.body.last_error.repository, mockD1ProjectId);
  assert.equal(degraded.body.last_error.error, "rate limited");

  const wrapping = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      cursor: 498,
      syncRuns: [
        syncRunRow({
          id: "wrapping_sync",
          synced_count: 1,
          failed_count: 0,
          limit_value: 5,
          finished_at: now
        })
      ]
    })
  );
  assert.equal(wrapping.status, 200);
  assert.equal(wrapping.body.cursor, 498);
  assert.equal(wrapping.body.next_batch_wraps, true);
  assert.equal(wrapping.body.next_batch.length, 5);
}

async function testClassificationOverridesWithMockD1() {
  const d1Env = {
    ...mockD1Env({ classificationOverrides: [] }),
    SYNC_SECRET: "test-secret"
  };
  const headers = {
    authorization: "Bearer test-secret",
    "content-type": "application/json"
  };

  const create = await request(
    "/api/admin/classification-overrides",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        project_id: mockD1ProjectId,
        category: "agent_framework",
        difficulty: "beginner",
        deployment: ["cloudflare", "serverless"],
        cloudflare_ready: true,
        classification: {
          category: {
            confidence: "high",
            evidence: ["Manual review confirmed agent framework category."]
          }
        },
        notes: "Reviewed from low-confidence report.",
        reviewed_by: "api-test",
        reviewed_at: "2026-06-21T00:00:00Z"
      })
    },
    d1Env
  );
  assert.equal(create.status, 200);
  assert.equal(create.body.override.project_id, mockD1ProjectId);
  assert.equal(create.body.override.category, "agent_framework");
  assert.deepEqual(create.body.override.deployment, ["cloudflare", "serverless"]);
  assert.equal(create.body.override.cloudflare_ready, true);

  const list = await request(
    "/api/admin/classification-overrides?limit=10",
    {
      headers: {
        authorization: "Bearer test-secret"
      }
    },
    d1Env
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.overrides[0].project_id, mockD1ProjectId);

  const invalid = await request(
    "/api/admin/classification-overrides",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        project_id: "bad",
        category: "agent_framework"
      })
    },
    d1Env
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "invalid_classification_override");
}

async function testGovernanceRunsWithMockD1() {
  const config = {
    governanceRuns: [
      governanceRunRow(),
      governanceRunRow({
        id: "governance_2",
        task: "weekly-data-governance",
        status: "failed",
        summary_json: JSON.stringify({ eval_quality: false }),
        error: "eval quality failed",
        started_at: "2026-06-23T00:00:00Z",
        finished_at: "2026-06-23T00:00:20Z"
      })
    ]
  };
  const env = mockD1Env(config);

  const runs = await request("/api/governance/runs?limit=5", {}, env);
  assert.equal(runs.status, 200);
  assert.equal(runs.body.runs.length, 2);
  assert.equal(runs.body.runs[0].task, "daily-production-health");
  assert.equal(runs.body.runs[0].summary.quality_score, 100);

  const filtered = await request("/api/governance/runs?task=weekly-data-governance", {}, env);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.runs.length, 1);
  assert.equal(filtered.body.runs[0].status, "failed");

  const summary = await request("/api/governance/summary", {}, env);
  assert.equal(summary.status, 200);
  assert.equal(summary.body.run_count, 2);
  assert.equal(summary.body.status_counts.success, 1);
  assert.equal(summary.body.status_counts.failed, 1);
  assert.equal(summary.body.failed_tasks.length, 1);
  assert.ok(Array.isArray(summary.body.missing_tasks));
  assert.ok(summary.body.missing_tasks.some((task) => task.task === "derived:alternatives"));

  const invalid = await request(
    "/api/admin/governance/runs",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({ task: "bad task", status: "ok" })
    },
    { ...env, SYNC_SECRET: "test-secret" }
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "invalid_governance_run");

  const created = await request(
    "/api/admin/governance/runs",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        id: "governance_3",
        task: "daily-production-health",
        status: "success",
        trigger: "github_actions",
        started_at: "2026-06-24T01:00:00Z",
        finished_at: "2026-06-24T01:00:03Z",
        summary: { quality_score: 100, smoke_ok: true },
        report_url: "https://github.com/example/actions/runs/3"
      })
    },
    { ...env, SYNC_SECRET: "test-secret" }
  );
  assert.equal(created.status, 200);
  assert.equal(created.body.run.id, "governance_3");
  assert.equal(created.body.run.duration_ms, 3000);
  assert.equal(config.governanceRuns.length, 3);
}

async function getJson(path) {
  return request(path);
}

async function request(path, init = {}, requestEnv = env) {
  const response = await handleApi(new Request(`https://git.top${path}`, init), requestEnv);
  const body = await response.json();
  return {
    status: response.status,
    body,
    headers: response.headers
  };
}

function assertMetadata(metadata, reason, source = "seed") {
  assert.equal(metadata.source, source);
  assert.equal(metadata.reason, reason);
  assert.ok(metadata.project_count > 0, "metadata.project_count should be positive");
  assert.ok(typeof metadata.generated_at === "string", "metadata.generated_at should be present");
  if (source === "seed") {
    assert.ok(Array.isArray(metadata.warnings), "metadata.warnings should be an array");
  }
}
