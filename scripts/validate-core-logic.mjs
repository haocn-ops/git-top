import assert from "node:assert/strict";
import { generateAlternatives, generateAlternativesForAll } from "../src/alternatives.ts";
import { searchProjectList } from "../src/project-search.ts";
import { normalizeGrpRequest, runGrpQuery } from "../src/grp.ts";
import worker from "../src/index.ts";
import { buildQualityReport } from "../src/quality.ts";
import { calculateMetrics } from "../src/scoring.ts";
import { seedProjects } from "../src/seed.ts";
import { buildSyncPrioritySummary, classifySyncPriority, selectPriorityRepositoryIds } from "../src/sync-priority.ts";
import { defaultSyncLimit, maxSyncLimit, nextSyncOffset, scheduledSyncLimit, selectRepositoryBatch, selectScheduledRepositoryBatch } from "../src/sync.ts";

await testScoring();
await testQualityInfoIssuesDoNotLowerScore();
await testQualityCollectionCoverage();
await testLegacyConsoleRedirects();
await testCoverageRoute();
await testStatusRoute();
await testIntegrationsRoute();
await testQuickstartRoute();
await testRecipesRoute();
await testExamplesRoute();
await testJourneysRoute();
await testRoadmapRoute();
await testDiscoverRoute();
await testTrendsRoute();
await testAlternativesRoute();
await testAtlasRoute();
await testRecommendRoute();
await testWorkflowRoute();
await testCompareRoute();
await testSyncBatchSelection();
await testSyncPrioritySummary();
await testWorkerProjectSlugLookup();
await testBrowseRanking();
await testBrowseRankingBroadVocabulary();
await testSpecificIntentRanking();
await testFlagshipCloudflareQuery();
await testAlternatives();
await testGrpNormalization();
await testGrpQueries();

console.log("Validated core scoring, Worker routing, alternatives, and GRP logic.");

async function testLegacyConsoleRedirects() {
  const register = await worker.fetch(new Request("https://git.top/register"), {});
  assert.equal(register.status, 302);
  assert.equal(register.headers.get("location"), "https://git.top/projects");

  const projects = await worker.fetch(new Request("https://git.top/projects"), {});
  assert.equal(projects.status, 200);
  const projectsText = await projects.text();
  assert.match(projectsText, /<link rel="canonical" href="https:\/\/git\.top\/projects"/);
  assert.match(projectsText, /Git\.Top Projects \| Agent-Native GitHub Project Index/);
  assert.match(projectsText, /id="language-filter"/);

  const docs = await worker.fetch(new Request("https://git.top/docs"), {});
  assert.equal(docs.status, 200);
  const docsText = await docs.text();
  assert.match(docsText, /<link rel="canonical" href="https:\/\/git\.top\/docs"/);

  const llms = await worker.fetch(new Request("https://git.top/llms.txt"), {});
  assert.equal(llms.status, 200);
  const llmsText = await llms.text();
  assert.match(llmsText, /Full agent documentation: https:\/\/git\.top\/llms-full\.txt/);
  assert.match(llmsText, /Agent surface map: https:\/\/git\.top\/api\/agent-map/);
  assert.match(llmsText, /Agent quickstart: https:\/\/git\.top\/quickstart/);
  assert.match(llmsText, /Agent recipes: https:\/\/git\.top\/recipes/);
  assert.match(llmsText, /API examples: https:\/\/git\.top\/examples/);
  assert.match(llmsText, /Atlas journeys: https:\/\/git\.top\/journeys/);
  assert.match(llmsText, /Atlas Journey Guide: https:\/\/git\.top\/topics\/atlas-journey-guide/);
  assert.match(llmsText, /Open Source Knowledge Graph API: https:\/\/git\.top\/topics\/open-source-knowledge-graph-api/);
  assert.match(llmsText, /MCP Integration Guide: https:\/\/git\.top\/topics\/mcp-integration-guide/);
  assert.match(llmsText, /Roadmap: https:\/\/git\.top\/roadmap/);

  const llmsFull = await worker.fetch(new Request("https://git.top/llms-full.txt"), {});
  assert.equal(llmsFull.status, 200);
  const llmsFullText = await llmsFull.text();
  assert.match(llmsFullText, /Trust first: GET \/api\/health and GET \/api\/trust/);
  assert.match(llmsFullText, /GET \/api\/agent-map/);
  assert.match(llmsFullText, /GET \/api\/quickstart/);
  assert.match(llmsFullText, /GET \/api\/recipes/);
  assert.match(llmsFullText, /GET \/api\/examples/);
  assert.match(llmsFullText, /GET \/api\/journeys\?limit=8/);
  assert.match(llmsFullText, /GET \/api\/roadmap/);
  assert.match(llmsFullText, /GET \/api\/trust/);
  assert.match(llmsFullText, /Agent Surface Map/);
  assert.match(llmsFullText, /POST \/api\/project/);
  assert.match(llmsFullText, /GET \/api\/workflow/);
  assert.match(llmsFullText, /POST \/api\/workflow/);
  assert.match(llmsFullText, /POST \/api\/recommend/);
  assert.match(llmsFullText, /POST \/api\/compare/);
  assert.match(llmsFullText, /POST \/api\/alternatives/);
  assert.match(llmsFullText, /POST \/api\/related/);
  assert.match(llmsFullText, /POST \/api\/score/);
  assert.match(llmsFullText, /POST \/api\/graph/);
  assert.match(llmsFullText, /GET \/api\/atlas\?limit=6/);
  assert.match(llmsFullText, /\/topics\/atlas-journey-guide/);
  assert.match(llmsFullText, /\/topics\/open-source-knowledge-graph-api/);
  assert.match(llmsFullText, /\/topics\/mcp-integration-guide/);
  assert.match(llmsFullText, /journeys\[\]\.steps/);
  assert.match(llmsFullText, /comparison_paths/);
  assert.match(llmsFullText, /get_trends/);
  assert.match(llmsFullText, /get_agent_workflow/);
  assert.match(llmsFullText, /get_atlas/);
  assert.match(llmsFullText, /get_trust_gate/);
  assert.match(llmsFullText, /exploration_paths/);
  assert.match(llmsFullText, /decision_summary/);
  assert.match(llmsFullText, /fit_profile/);
  assert.match(llmsFullText, /adoption_plan/);
  assert.match(llmsFullText, /risk_flags/);
  assert.match(llmsFullText, /next_actions/);
  assert.match(llmsFullText, /graph_stats/);
  assert.match(llmsFullText, /relationship_groups/);
  assert.match(llmsFullText, /comparison_links/);
  assert.match(llmsFullText, /alternative_matches/);
  assert.match(llmsFullText, /replacement_risk/);
  assert.match(llmsFullText, /adoption_guidance/);
  assert.match(llmsFullText, /risk_flags/);
  assert.match(llmsFullText, /score_confidence/);
  assert.match(llmsFullText, /decision_matrix/);

  const reports = await worker.fetch(new Request("https://git.top/reports"), {});
  assert.equal(reports.status, 302);
  assert.equal(reports.headers.get("location"), "https://git.top/graph");

  const graph = await worker.fetch(new Request("https://git.top/graph"), {});
  assert.equal(graph.status, 200);
  const graphText = await graph.text();
  assert.match(graphText, /<link rel="canonical" href="https:\/\/git\.top\/graph"/);

  const legacyProject = await worker.fetch(new Request("https://git.top/project/cloudflare/agents"), {});
  assert.equal(legacyProject.status, 301);
  assert.equal(legacyProject.headers.get("location"), "https://git.top/projects/cloudflare/agents");

  const legacyStatus = await worker.fetch(new Request("https://git.top/api/status?require_d1=true"), {});
  assert.equal(legacyStatus.status, 301);
  assert.equal(legacyStatus.headers.get("location"), "https://git.top/api/health?require_d1=true");

  const httpRoot = await worker.fetch(new Request("http://git.top/"), {});
  assert.equal(httpRoot.status, 301);
  assert.equal(httpRoot.headers.get("location"), "https://git.top/");

  const wwwRoot = await worker.fetch(new Request("https://www.git.top/projects"), {});
  assert.equal(wwwRoot.status, 301);
  assert.equal(wwwRoot.headers.get("location"), "https://git.top/projects");
}

async function testCoverageRoute() {
  const response = await worker.fetch(new Request("https://git.top/coverage"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Project corpus, taxonomy, and trust boundaries/);
  assert.match(text, /Category Distribution/);
  assert.match(text, /Use Boundaries/);
}

async function testStatusRoute() {
  const response = await worker.fetch(new Request("https://git.top/status"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Data source, sync freshness, and runtime health/);
  assert.match(text, /Sync Progress/);
  assert.match(text, /Integration Guidance/);

  const trust = await worker.fetch(new Request("https://git.top/trust"), {});
  const trustText = await trust.text();
  assert.equal(trust.status, 200);
  assert.match(trustText, /Git\.Top Trust Gate/);
  assert.match(trustText, /Production-readiness gate/);
  assert.match(trustText, /Trust JSON/);

  const trustApi = await worker.fetch(new Request("https://git.top/api/trust"), {});
  const trustBody = await trustApi.json();
  assert.equal(trustApi.status, 200);
  assert.equal(trustBody.name, "Git.Top Trust Gate");
  assert.ok(["allow", "caution", "block"].includes(trustBody.decision));
  assert.ok(trustBody.checks.some((check) => check.id === "d1-source"));
}

async function testIntegrationsRoute() {
  const response = await worker.fetch(new Request("https://git.top/integrations"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Use Git.Top as project intelligence/);
  assert.match(text, /Production Checklist/);
  assert.match(text, /REST, MCP, and GRP/);
  assert.match(text, /href="\/quickstart"/);
}

async function testQuickstartRoute() {
  const response = await worker.fetch(new Request("https://git.top/quickstart"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Git\.Top Agent Quickstart/);
  assert.match(text, /Open Quickstart JSON/);
  assert.match(text, /Explore Atlas Journeys/);
  assert.match(text, /Use GRP For Goal-Level Planning/);

  const api = await worker.fetch(new Request("https://git.top/api/quickstart"), {});
  const body = await api.json();
  assert.equal(api.status, 200);
  assert.equal(body.positioning, "The Knowledge Graph of Open Source");
  assert.equal(body.steps[0].id, "check-trust-gate");
  assert.ok(body.steps.some((step) => step.id === "compare"));
  assert.ok(body.steps.some((step) => step.id === "explore-atlas-journeys"));
  const trustFreeSteps = new Set(["check-trust-gate", "check-data-source"]);
  for (const id of ["check-trust-gate", "check-data-source", "choose-workflow", "search-projects", "explore-atlas-journeys", "inspect-project", "recommend", "compare", "quality", "grp"]) {
    const step = body.steps.find((item) => item.id === id);
    assert.ok(step, `quickstart should include ${id}`);
    if (trustFreeSteps.has(id)) {
      assert.doesNotMatch(step.command, /require_d1=true/, `${id} should not require D1 because the trust gate is its own preflight`);
    } else {
      assert.match(step.command, /require_d1=true/, `${id} should use strict D1 mode in the production command`);
    }
  }

  const agentMap = await worker.fetch(new Request("https://git.top/api/agent-map"), {});
  const agentMapBody = await agentMap.json();
  assert.equal(agentMap.status, 200);
  assert.ok(Array.isArray(agentMapBody.core_surfaces));
  assert.equal(agentMapBody.core_surfaces[0].concept, "Trust preflight");
  assert.ok(Array.isArray(agentMapBody.short_path));
  assert.equal(agentMapBody.short_path[0].concept, "Trust preflight");
  assert.ok(Array.isArray(agentMapBody.reference_path));
  assert.equal(agentMapBody.reference_path[0].concept, "Trust and freshness");
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "Agent quickstart"));
}

async function testRecipesRoute() {
  const response = await worker.fetch(new Request("https://git.top/recipes"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Git\.Top Agent Recipes/);
  assert.match(text, /Choose A Cloudflare-ready Agent Framework/);
  assert.match(text, /Map An Ecosystem To Comparison Paths/);
  assert.match(text, /Plan With Graph Reasoning/);

  const api = await worker.fetch(new Request("https://git.top/api/recipes"), {});
  const body = await api.json();
  assert.equal(api.status, 200);
  assert.equal(body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(body.recipes.some((recipe) => recipe.id === "find-project-alternatives"));
  assert.ok(body.recipes.some((recipe) => recipe.id === "map-ecosystem-to-comparison"));
  const grpRecipe = body.recipes.find((recipe) => recipe.id === "plan-with-grp");
  assert.ok(grpRecipe.steps.some((step) => step.endpoint === "/api/grp/query" && step.command.includes("?require_d1=true")));

  const agentMap = await worker.fetch(new Request("https://git.top/api/agent-map"), {});
  const agentMapBody = await agentMap.json();
  assert.equal(agentMap.status, 200);
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "Agent recipes"));
}

async function testExamplesRoute() {
  const response = await worker.fetch(new Request("https://git.top/examples"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Git\.Top API Examples/);
  assert.match(text, /Copyable REST, MCP, and GRP calls/);
  assert.match(text, /Run a constrained selection workflow/);

  const api = await worker.fetch(new Request("https://git.top/api/examples"), {});
  const body = await api.json();
  assert.equal(api.status, 200);
  assert.equal(body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(body.examples.some((example) => example.id === "structured-recommend" && example.method === "POST"));
  assert.ok(body.examples.some((example) => example.surface === "MCP" && example.endpoint === "/mcp"));
  assert.ok(body.examples.some((example) => example.surface === "GRP" && example.endpoint === "/api/grp/query"));
  const structuredRecommend = body.examples.find((example) => example.id === "structured-recommend");
  assert.match(structuredRecommend.command, /\/api\/recommend\?require_d1=true/);
  assert.doesNotMatch(structuredRecommend.command, /"require_d1":true/);
  const grpExample = body.examples.find((example) => example.id === "grp-plan-stack");
  assert.match(grpExample.command, /\/api\/grp\/query\?require_d1=true/);
  assert.ok(Array.isArray(body.trust_policy));

  const agentMap = await worker.fetch(new Request("https://git.top/api/agent-map"), {});
  const agentMapBody = await agentMap.json();
  assert.equal(agentMap.status, 200);
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "API examples" && surface.rest.includes("GET /api/examples")));
}

async function testJourneysRoute() {
  const response = await worker.fetch(new Request("https://git.top/journeys"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Git\.Top Atlas Journeys/);
  assert.match(text, /Explore open-source ecosystems as routes/);
  assert.match(text, /Open Journeys JSON/);
  assert.match(text, /Cloudflare Ecosystem/);
  assert.match(text, /Choose a production candidate/);
  assert.match(text, /Agent Map/);

  const api = await worker.fetch(new Request("https://git.top/api/journeys?limit=3"), {});
  const body = await api.json();
  assert.equal(api.status, 200);
  assert.equal(body.positioning, "The Knowledge Graph of Open Source");
  assert.ok(Array.isArray(body.journeys));
  assert.ok(body.journeys.some((journey) => journey.ecosystem_id === "cloudflare"));
  assert.ok(body.journeys.some((journey) => journey.steps.some((step) => step.href === "/api/agent-map")));
  assert.ok(Array.isArray(body.comparison_paths));
  assert.ok(body.comparison_paths.some((path) => path.ecosystem_id === "cloudflare" && path.api_href.includes("/api/compare")));
  assert.ok(body.stats.ecosystem_count >= 9);

  const agentMap = await worker.fetch(new Request("https://git.top/api/agent-map"), {});
  const agentMapBody = await agentMap.json();
  assert.equal(agentMap.status, 200);
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "Atlas journeys" && surface.rest.includes("GET /api/journeys")));
}

async function testRoadmapRoute() {
  const response = await worker.fetch(new Request("https://git.top/roadmap"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Git\.Top 2\.0 Roadmap/);
  assert.match(text, /The Knowledge Graph of Open Source/);
  assert.match(text, /Open Roadmap JSON/);
  assert.match(text, /Agent API/);

  const api = await worker.fetch(new Request("https://git.top/api/roadmap"), {});
  const body = await api.json();
  assert.equal(api.status, 200);
  assert.equal(body.positioning, "The Knowledge Graph of Open Source");
  assert.equal(body.phases.length, 6);
  assert.ok(body.phases.some((phase) => phase.id === "atlas" && phase.human_pages.includes("/journeys")));
  assert.ok(body.phases.some((phase) => phase.id === "atlas" && phase.api_endpoints.includes("/api/journeys")));
  assert.ok(body.phases.some((phase) => phase.id === "agent-api" && phase.human_pages.includes("/topics/mcp-integration-guide")));
  assert.ok(body.phases.some((phase) => phase.id === "agent-api" && phase.human_pages.includes("/trust")));
  assert.ok(body.phases.some((phase) => phase.id === "agent-api" && phase.api_endpoints.includes("/api/trust")));
  assert.ok(body.completion >= 88);

  const agentMap = await worker.fetch(new Request("https://git.top/api/agent-map"), {});
  const agentMapBody = await agentMap.json();
  assert.equal(agentMap.status, 200);
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "Product roadmap"));
  assert.ok(agentMapBody.surfaces.some((surface) => surface.concept === "API and MCP discovery"));
  assert.ok(agentMapBody.surfaces.some((surface) => surface.human_page === "/trust" && surface.rest.includes("GET /api/trust")));
}

async function testDiscoverRoute() {
  const home = await worker.fetch(new Request("https://git.top/"), {});
  const homeText = await home.text();
  assert.equal(home.status, 200);
  assert.match(homeText, /href="\/discover"/);
  assert.match(homeText, /href="\/workflow"/);
  assert.match(homeText, /href="\/trust"/);
  assert.match(homeText, /href="\/topics\/browser-ai-automation"/);
  assert.match(homeText, /href="\/topics\/ai-ide-coding-agents"/);
  assert.match(homeText, /href="\/topics\/open-source-llm-gateways"/);
  assert.match(homeText, /href="\/topics\/ai-observability-tools"/);
  assert.match(homeText, /href="\/topics\/ai-workflow-automation"/);
  assert.match(homeText, /href="\/topics\/atlas-journey-guide"/);
  assert.match(homeText, /href="\/topics\/open-source-knowledge-graph-api"/);
  assert.match(homeText, /href="\/topics\/mcp-integration-guide"/);

  const response = await worker.fetch(new Request("https://git.top/discover"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Discover Open Source Projects/);
  assert.match(text, /AI Agents/);
  assert.match(text, /MCP Servers/);
  assert.match(text, /Browser Automation/);
  assert.match(text, /AI IDE/);
  assert.match(text, /LLM Gateways/);
  assert.match(text, /AI Observability/);
  assert.match(text, /Workflow Automation/);
  assert.match(text, /\/api\/trends\?limit=8/);
  assert.match(text, /\/api\/search\?q=agent%20framework/);

  const browserTopic = await worker.fetch(new Request("https://git.top/topics/browser-ai-automation"), {});
  const browserTopicText = await browserTopic.text();
  assert.equal(browserTopic.status, 200);
  assert.match(browserTopicText, /Browser AI Automation Projects/);
  assert.match(browserTopicText, /What To Inspect/);

  const ideTopic = await worker.fetch(new Request("https://git.top/topics/ai-ide-coding-agents"), {});
  const ideTopicText = await ideTopic.text();
  assert.equal(ideTopic.status, 200);
  assert.match(ideTopicText, /AI IDE and Coding Agent Projects/);
  assert.match(ideTopicText, /What To Compare/);

  const gatewayTopic = await worker.fetch(new Request("https://git.top/topics/open-source-llm-gateways"), {});
  const gatewayTopicText = await gatewayTopic.text();
  assert.equal(gatewayTopic.status, 200);
  assert.match(gatewayTopicText, /Open Source LLM Gateways/);
  assert.match(gatewayTopicText, /What To Inspect/);

  const observabilityTopic = await worker.fetch(new Request("https://git.top/topics/ai-observability-tools"), {});
  const observabilityTopicText = await observabilityTopic.text();
  assert.equal(observabilityTopic.status, 200);
  assert.match(observabilityTopicText, /AI Observability Tools/);
  assert.match(observabilityTopicText, /What To Inspect/);

  const workflowTopic = await worker.fetch(new Request("https://git.top/topics/ai-workflow-automation"), {});
  const workflowTopicText = await workflowTopic.text();
  assert.equal(workflowTopic.status, 200);
  assert.match(workflowTopicText, /AI Workflow Automation Projects/);
  assert.match(workflowTopicText, /What To Inspect/);

  const atlasJourneyTopic = await worker.fetch(new Request("https://git.top/topics/atlas-journey-guide"), {});
  const atlasJourneyTopicText = await atlasJourneyTopic.text();
  assert.equal(atlasJourneyTopic.status, 200);
  assert.match(atlasJourneyTopicText, /Atlas Journey Guide/);
  assert.match(atlasJourneyTopicText, /Comparison Paths/);
  assert.match(atlasJourneyTopicText, /\/api\/journeys\?limit=8/);

  const apiTopic = await worker.fetch(new Request("https://git.top/topics/open-source-knowledge-graph-api"), {});
  const apiTopicText = await apiTopic.text();
  assert.equal(apiTopic.status, 200);
  assert.match(apiTopicText, /Open Source Knowledge Graph API/);
  assert.match(apiTopicText, /Agent Workflow/);
  assert.match(apiTopicText, /\/api\/agent-map/);

  const mcpTopic = await worker.fetch(new Request("https://git.top/topics/mcp-integration-guide"), {});
  const mcpTopicText = await mcpTopic.text();
  assert.equal(mcpTopic.status, 200);
  assert.match(mcpTopicText, /MCP Integration Guide/);
  assert.match(mcpTopicText, /Tool Call Shape/);
  assert.match(mcpTopicText, /\/mcp/);

  const trustGateTopic = await worker.fetch(new Request("https://git.top/topics/trust-gate-guide"), {});
  const trustGateTopicText = await trustGateTopic.text();
  assert.equal(trustGateTopic.status, 200);
  assert.match(trustGateTopicText, /Trust Gate Guide/);
  assert.match(trustGateTopicText, /Decision Flow/);
  assert.match(trustGateTopicText, /\/trust/);
}

async function testTrendsRoute() {
  const response = await worker.fetch(new Request("https://git.top/trends"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Open Source Trends/);
  assert.match(text, /Open Trends JSON/);
  assert.match(text, /Category Trends/);
  assert.match(text, /Rising Projects/);
  assert.match(text, /Agent Briefing/);
}

async function testAlternativesRoute() {
  const home = await worker.fetch(new Request("https://git.top/"), {});
  const homeText = await home.text();
  assert.equal(home.status, 200);
  assert.match(homeText, /href="\/alternatives"/);

  const response = await worker.fetch(new Request("https://git.top/alternatives"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Open Source Alternatives/);
  assert.match(text, /Find open-source alternatives/);
  assert.match(text, /LangChain Alternatives/);
  assert.match(text, /Dify Alternatives/);
  assert.match(text, /\/api\/alternatives\/cloudflare\/agents\?limit=12/);

  const detail = await worker.fetch(new Request("https://git.top/alternatives/cloudflare/agents"), {});
  const detailText = await detail.text();
  assert.equal(detail.status, 200);
  assert.match(detailText, /Alternatives Engine/);
  assert.match(detailText, /Decision Summary/);
  assert.match(detailText, /Avg similarity/);
  assert.match(detailText, /Compare shortlist/);
  assert.match(detailText, /Replacement risk/);
  assert.match(detailText, /Fit:/);

  const alias = await worker.fetch(new Request("https://git.top/alternatives/claude-code"), {});
  const aliasText = await alias.text();
  assert.equal(alias.status, 200);
  assert.match(aliasText, /Alternatives Engine/);
  assert.match(aliasText, /Decision Summary/);
  assert.match(aliasText, /<link rel="canonical" href="https:\/\/git\.top\/alternatives\/claude-code"/);
}

async function testAtlasRoute() {
  const response = await worker.fetch(new Request("https://git.top/atlas"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Atlas Beta/);
  assert.match(text, /Open-source ecosystems as a map/);
  assert.match(text, /Cloudflare/);
  assert.match(text, /Projects/);
  assert.match(text, /Alternatives/);
  assert.match(text, /Score/);
  assert.match(text, /Avg Git\.Top Score/);
  assert.match(text, /Discover Projects/);
  assert.match(text, /Get Recommendations/);
  assert.match(text, /Compare Options/);
  assert.match(text, /Compare Path/);
  assert.match(text, /Open Compare/);
  assert.match(text, /Choose a production candidate/);
  assert.match(text, /Map dependencies and neighbors/);
  assert.match(text, /Compare replacement paths/);
  assert.match(text, /href="\/atlas\/cloudflare"/);

  const cloudflare = await worker.fetch(new Request("https://git.top/atlas/cloudflare"), {});
  const cloudflareText = await cloudflare.text();
  assert.equal(cloudflare.status, 200);
  assert.match(cloudflareText, /Cloudflare Ecosystem/);
  assert.match(cloudflareText, /All Ecosystems/);
  assert.match(cloudflareText, /Atlas JSON/);
  assert.match(cloudflareText, /Recommend/);
  assert.match(cloudflareText, /Journey/);
  assert.match(cloudflareText, /Compare Path/);
  assert.match(cloudflareText, /href="\/api\/search\?q=cloudflare%20workers%20agents&amp;ranking=browse&amp;limit=12"/);

  const missing = await worker.fetch(new Request("https://git.top/atlas/not-real"), {});
  assert.equal(missing.status, 404);
}

async function testRecommendRoute() {
  const response = await worker.fetch(new Request("https://git.top/recommend"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Recommendation Engine/);
  assert.match(text, /Find projects by fit/);
  assert.match(text, /Open JSON/);
  assert.match(text, /Fit Profile/);
  assert.match(text, /Adoption Plan/);
  assert.match(text, /Risk Flags/);
  assert.match(text, /Matched|Review/);

  const filtered = await worker.fetch(new Request("https://git.top/recommend?use_case=build%20RAG%20applications&deployment=local&category=rag_framework&limit=3"), {});
  const filteredText = await filtered.text();
  assert.equal(filtered.status, 200);
  assert.match(filteredText, /RAG Framework/);
  assert.match(filteredText, /\/api\/recommend\?/);
}

async function testWorkflowRoute() {
  const response = await worker.fetch(new Request("https://git.top/workflow"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Agent Selection Workflow/);
  assert.match(text, /Move from open-source intent/);
  assert.match(text, /Open Workflow JSON/);
  assert.match(text, /Recommended Sequence/);
  assert.match(text, /Trust Policy/);
  assert.match(text, /\/api\/workflow\?/);

  const focused = await worker.fetch(new Request("https://git.top/workflow?intent=evaluate%20Claude%20Code%20alternatives&project_id=claude-code&deployment=local&limit=3"), {});
  const focusedText = await focused.text();
  assert.equal(focused.status, 200);
  assert.match(focusedText, /claude-code/);
  assert.match(focusedText, /\/api\/graph\/claude-code/);
  assert.match(focusedText, /\/api\/alternatives\/claude-code/);
}

async function testCompareRoute() {
  const response = await worker.fetch(new Request("https://git.top/compare"), {});
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Open Source Project Comparisons/);
  assert.match(text, /Compare open-source projects by fit/);
  assert.match(text, /Cloudflare Agents vs LangChain/);
  assert.match(text, /\/api\/compare\?repos=/);

  const detail = await worker.fetch(new Request("https://git.top/compare/cloudflare-agents...langchain-ai-langchain"), {});
  const detailText = await detail.text();
  assert.equal(detail.status, 200);
  assert.match(detailText, /Project Comparison/);
  assert.match(detailText, /Compare JSON|Open JSON/);
  assert.match(detailText, /Decision Matrix/);
  assert.match(detailText, /Top Agent/);
  assert.match(detailText, /Inspect graph/);

  const alias = await worker.fetch(new Request("https://git.top/compare/claude-code...opencode"), {});
  const aliasText = await alias.text();
  assert.equal(alias.status, 200);
  assert.match(aliasText, /Project Comparison/);
  assert.match(aliasText, /Decision Matrix/);
}

async function testScoring() {
  const now = new Date().toISOString();
  const repo = {
    id: 1,
    name: "scored-agent",
    full_name: "mock/scored-agent",
    owner: { login: "mock" },
    html_url: "https://github.com/mock/scored-agent",
    homepage: null,
    description: "Mock scored agent",
    language: "TypeScript",
    topics: ["agents"],
    license: { spdx_id: "MIT" },
    stargazers_count: 1000,
    forks_count: 100,
    open_issues_count: 10,
    default_branch: "main",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: now,
    pushed_at: now
  };
  const signals = {
    readmeText: "",
    files: [],
    commits30d: 200,
    releases180d: 12,
    contributors90d: 80,
    issueFirstResponseMedianHours: 4,
    signalConfidence: {
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }
  };

  const metrics = calculateMetrics(repo, signals, now, {
    stars30dDelta: 1500,
    signalConfidence: {
      stars30dDelta: "snapshot",
      stars30dWindowDays: 31,
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }
  });

  assert.equal(metrics.projectId, "mock/scored-agent");
  assert.equal(metrics.stars30dDelta, 1500);
  assert.equal(metrics.gitScore, 100);
  assert.equal(metrics.maintenanceScore, 100);
  assert.equal(metrics.signalConfidence?.stars30dDelta, "snapshot");
  assert.equal(metrics.signalConfidence?.stars30dWindowDays, 31);
}

async function testQualityInfoIssuesDoNotLowerScore() {
  const infoOnlyProject = makeSearchFixture("mock/info-only-quality", {
    description: "A well described agent framework with several practical production use cases.",
    topics: ["agent", "framework", "tool-calling"],
    stars: 500,
    gitScore: 50,
    maintenanceScore: 90,
    useCases: ["build agent workflows", "orchestrate tools"]
  });

  const report = buildQualityReport([infoOnlyProject]);
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 0);
  assert.ok(report.issues.some((issue) => issue.severity === "info" && issue.code === "score_skew"));
  assert.equal(report.score, 100, "info-only quality observations should not lower the release score");
  assert.equal(report.releaseScore, 100);
  assert.equal(report.scoreSummary.releaseScoreMeaning.includes("Release gate score"), true);
  assert.equal(typeof report.dataTrustScore, "number");
  assert.ok(Array.isArray(report.improvementPlan));
  assert.ok(report.improvementPlan.length > 0);
}

async function testQualityCollectionCoverage() {
  const activeCollection = makeSearchFixture("mock/awesome-agents", {
    projectKind: "collection",
    collectionMetadata: {
      scope: "awesome_list",
      curated: true,
      estimatedItems: 100,
      freshness: "active"
    },
    description: "A curated awesome list of production agent framework resources.",
    topics: ["awesome", "agents", "framework"],
    stars: 2000,
    gitScore: 85,
    maintenanceScore: 75,
    useCases: ["find agent resources", "compare framework examples"]
  });
  const staleCollection = makeSearchFixture("mock/rag-cookbook", {
    projectKind: "collection",
    collectionMetadata: {
      scope: "cookbook",
      curated: true,
      estimatedItems: null,
      freshness: "stale"
    },
    description: "A cookbook collection for retrieval augmented generation examples.",
    topics: ["cookbook", "rag", "retrieval"],
    stars: 1200,
    gitScore: 70,
    maintenanceScore: 60,
    useCases: ["find RAG examples", "review cookbook patterns"]
  });
  const project = makeSearchFixture("mock/runtime-project", {
    description: "A production agent framework runtime.",
    topics: ["agent", "runtime"],
    stars: 800,
    gitScore: 80,
    maintenanceScore: 80,
    useCases: ["run agent workflows", "deploy runtime components"]
  });

  const report = buildQualityReport([activeCollection, staleCollection, project]);
  assert.equal(report.coverage.collectionCount, 2);
  assert.equal(report.coverage.collectionRate, 0.667);
  assert.equal(report.coverage.collectionScopeCounts.awesome_list, 1);
  assert.equal(report.coverage.collectionScopeCounts.cookbook, 1);
  assert.equal(report.coverage.collectionFreshnessCounts.active, 1);
  assert.equal(report.coverage.collectionFreshnessCounts.stale, 1);
  assert.equal(report.coverage.staleCollectionCount, 1);
  assert.equal(report.coverage.collectionReviewCount, 1);
  assert.ok(report.improvementPlan.some((item) => item.title.includes("collection")));
}

async function testSyncBatchSelection() {
  assert.equal(defaultSyncLimit, 1, "manual sync without a limit should stay conservative by default");
  assert.equal(maxSyncLimit, 50, "admin and catch-up syncs should allow bounded larger batches");
  assert.equal(scheduledSyncLimit, 5, "scheduled sync should stay comfortably under Worker subrequest limits with lightweight signals");

  const repositories = ["a/a", "b/b", "c/c", "d/d", "e/e"];
  assert.deepEqual(selectRepositoryBatch(repositories, 1, 3), ["b/b", "c/c", "d/d"]);
  assert.deepEqual(selectRepositoryBatch(repositories, 3, 4), ["d/d", "e/e", "a/a", "b/b"]);
  assert.deepEqual(selectRepositoryBatch(repositories, 0, 10), repositories);
  assert.deepEqual(selectRepositoryBatch([], 0, 5), []);
  assert.equal(nextSyncOffset(repositories.length, 3, 2), 0);
  assert.equal(nextSyncOffset(repositories.length, 3, 0), 3);
  assert.equal(nextSyncOffset(0, 3, 2), 0);

  assert.deepEqual(selectScheduledRepositoryBatch(repositories, 0, 4, ["d/d", "b/b"], 1).repositories, ["d/d", "b/b", "a/a", "c/c"]);
  assert.deepEqual(selectScheduledRepositoryBatch(repositories, 3, 4, ["b/b", "missing/repo", "e/e"], 1).repositories, ["b/b", "e/e", "d/d", "a/a"]);
  assert.deepEqual(selectScheduledRepositoryBatch(repositories, 0, 1, ["d/d"], 1).repositories, ["a/a"]);
  assert.deepEqual(selectScheduledRepositoryBatch(repositories, 0, 2, []).repositories, ["a/a", "b/b"]);
}

async function testSyncPrioritySummary() {
  const now = "2026-06-29T00:00:00Z";
  const hot = makeSearchFixture("mock/hot-agent", {
    stars: 6000,
    gitScore: 88,
    category: "agent_framework",
    cloudflareReady: true,
    stars30dDelta: 120
  });
  hot.project.syncedAt = "2026-06-25T00:00:00Z";
  hot.metrics.calculatedAt = hot.project.syncedAt;

  const warm = makeSearchFixture("mock/warm-runtime", {
    stars: 8000,
    gitScore: 74,
    category: "local_llm_runtime",
    cloudflareReady: false,
    stars30dDelta: 30
  });
  warm.project.syncedAt = "2026-06-15T00:00:00Z";
  warm.metrics.calculatedAt = warm.project.syncedAt;

  const cold = makeSearchFixture("mock/cold-tool", {
    stars: 400,
    gitScore: 45,
    category: "other",
    cloudflareReady: false,
    stars30dDelta: 0
  });
  cold.project.syncedAt = "2026-05-01T00:00:00Z";
  cold.metrics.calculatedAt = cold.project.syncedAt;

  assert.equal(classifySyncPriority(hot, now).tier, "hot");
  assert.equal(classifySyncPriority(warm, now).tier, "warm");
  assert.equal(classifySyncPriority(cold, now).tier, "cold");

  const summary = buildSyncPrioritySummary([warm, cold, hot], now, 3);
  assert.equal(summary.counts.hot, 1);
  assert.equal(summary.counts.warm, 1);
  assert.equal(summary.counts.cold, 1);
  assert.equal(summary.staleCounts.hot, 1);
  assert.equal(summary.staleCounts.warm, 1);
  assert.equal(summary.staleCounts.cold, 1);
  assert.equal(summary.oldestStaleDays, 59);
  assert.equal(summary.priorityPreview[0].projectId, "mock/hot-agent");
  assert.deepEqual(selectPriorityRepositoryIds([warm, cold, hot], ["mock/hot-agent", "mock/warm-runtime", "mock/cold-tool"], 2, now), [
    "mock/hot-agent",
    "mock/warm-runtime"
  ]);
}

async function testWorkerProjectSlugLookup() {
  const graph = await worker.fetch(new Request("https://git.top/graph/cloudflare-agents"), {});
  assert.equal(graph.status, 200, "graph slug should resolve to the matching seed project");
  const graphText = await graph.text();
  assert.match(graphText, /cloudflare\/agents/);
  assert.match(graphText, /Project Context/);
  assert.match(graphText, /Maintainer/);
  assert.match(graphText, /License/);
  assert.match(graphText, /Deployment Targets/);
  assert.match(graphText, /Dependencies/);
  assert.match(graphText, /Graph Summary/);
  assert.match(graphText, /Open project knowledge/);
  assert.match(graphText, /Relationship Legend/);
  assert.match(graphText, /Recommended Next Hops/);
  assert.match(graphText, /Relationship filters/);
  assert.match(graphText, /Recommend a matching stack/);
  assert.match(graphText, /href="\/recommend\?/);
  assert.match(graphText, /href="\/atlas\/cloudflare"/);
  assert.match(graphText, /Related Network/);
  assert.match(graphText, /Alternatives Network/);
  assert.match(graphText, /href="\/alternatives\/cloudflare\/agents"/);
  assert.match(graphText, /href="\/api\/compare\?repos=/);

  const aliasGraph = await worker.fetch(new Request("https://git.top/graph/claude-code"), {});
  assert.equal(aliasGraph.status, 200, "graph alias should resolve to a product-name landing page");
  const aliasGraphText = await aliasGraph.text();
  assert.match(aliasGraphText, /Project Graph/);
  assert.match(aliasGraphText, /Project Context/);
  assert.match(aliasGraphText, /Graph Summary/);

  const project = await worker.fetch(new Request("https://git.top/projects/cloudflare/agents"), {});
  assert.equal(project.status, 200, "owner/repo project route should resolve through the Worker surface");
  assert.match(await project.text(), /Project Knowledge/);

  const score = await worker.fetch(new Request("https://git.top/score/cloudflare-agents"), {});
  assert.equal(score.status, 200, "score slug should resolve to the matching seed project");
  const scoreText = await score.text();
  assert.match(scoreText, /Project Score/);
  assert.match(scoreText, /Adoption Guidance/);
  assert.match(scoreText, /Risk Flags/);
  assert.match(scoreText, /Score Confidence/);
  assert.match(scoreText, /Score JSON/);

  const aliasScore = await worker.fetch(new Request("https://git.top/score/cursor"), {});
  assert.equal(aliasScore.status, 200, "score alias should resolve to a product-name landing page");
  const aliasScoreText = await aliasScore.text();
  assert.match(aliasScoreText, /Project Score/);
  assert.match(aliasScoreText, /Score JSON/);

  const missing = await worker.fetch(new Request("https://git.top/not-a-real-project"), {});
  assert.equal(missing.status, 404, "missing project detail should not silently fall back to the first project");
}

async function testBrowseRanking() {
  const lowQualityExact = makeSearchFixture("mock/exact-agent-framework", {
    description: "A small agent framework starter",
    topics: ["agent-framework", "cloudflare"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });
  const highQualityBroad = makeSearchFixture("mock/broad-agent-runtime", {
    description: "Production agent orchestration framework runtime",
    stars: 250000,
    gitScore: 100,
    maintenanceScore: 100
  });
  const projects = [lowQualityExact, highQualityBroad];
  const filters = {
    q: "agent framework",
    category: "agent_framework",
    deployment: "cloudflare",
    limit: 8
  };

  const defaultResults = searchProjectList(projects, filters);
  assert.equal(defaultResults[0].project.id, lowQualityExact.project.id, "default search should preserve exact query intent");

  const browseResults = searchProjectList(projects, { ...filters, ranking: "browse" });
  assert.equal(browseResults[0].project.id, highQualityBroad.project.id, "browse ranking should boost stronger broad-scope candidates");
}

async function testBrowseRankingBroadVocabulary() {
  const canonicalRag = makeSearchFixture("mock/canonical-rag", {
    category: "rag_framework",
    deployment: ["local", "library_only"],
    description: "Data framework for LLM applications with retrieval and indexing support.",
    topics: ["rag", "retrieval"],
    stars: 100000,
    gitScore: 95,
    maintenanceScore: 90
  });
  const exactButLowerQualityRag = makeSearchFixture("mock/exact-rag", {
    category: "rag_framework",
    deployment: ["local"],
    description: "RAG retrieval indexing framework.",
    topics: ["rag", "retrieval", "indexing"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });
  const localPlatform = makeSearchFixture("mock/local-platform", {
    category: "agent_framework",
    deployment: ["local", "docker"],
    description: "Production framework that can be installed locally.",
    topics: ["agent", "framework"],
    stars: 100000,
    gitScore: 95,
    maintenanceScore: 90
  });
  const lowQualityLocalTopic = makeSearchFixture("mock/local-topic", {
    category: "local_llm_runtime",
    deployment: ["local"],
    description: "Small local open source project.",
    topics: ["local", "project"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });

  const ragResults = searchProjectList([exactButLowerQualityRag, canonicalRag], {
    q: "rag retrieval indexing framework",
    category: "rag_framework",
    ranking: "browse",
    limit: 8
  });
  assert.equal(ragResults[0].project.id, canonicalRag.project.id, "browse category probes should treat indexing as broad vocabulary");

  const localResults = searchProjectList([lowQualityLocalTopic, localPlatform], {
    q: "local install open source project",
    deployment: "local",
    ranking: "browse",
    limit: 8
  });
  assert.equal(localResults[0].project.id, localPlatform.project.id, "browse deployment probes should treat open-source project wording as broad vocabulary");
}

async function testSpecificIntentRanking() {
  const githubMcp = makeSearchFixture("github/github-mcp-server", {
    description: "MCP server for GitHub repository issues and pull request automation.",
    topics: ["github", "mcp", "automation"],
    stars: 500,
    gitScore: 20,
    maintenanceScore: 20
  });
  const broadAutomation = makeSearchFixture("mock/mcp-automation-suite", {
    description: "High quality MCP automation server for repository issues and pull requests.",
    topics: ["mcp", "automation"],
    stars: 250000,
    gitScore: 100,
    maintenanceScore: 100
  });
  const projects = [githubMcp, broadAutomation];
  const filters = {
    q: "github automation mcp server repository issues pull requests",
    limit: 8,
    ranking: "browse"
  };

  const results = searchProjectList(projects, filters);
  assert.equal(results[0].project.id, githubMcp.project.id, "specific owner/topic intent should outrank generic high-quality browse candidates");
}

async function testFlagshipCloudflareQuery() {
  const results = searchProjectList(seedProjects, {
    q: "cloudflare agent framework",
    deployment: "cloudflare",
    cloudflareReady: true,
    limit: 3
  });

  assert.equal(results[0]?.project.id, "cloudflare/agents", "flagship Cloudflare agent query should rank cloudflare/agents first");
  assert.ok(results.some((item) => item.project.id === "cloudflare/agents"), "flagship Cloudflare agent query should include cloudflare/agents");
  const cloudflareAgents = results.find((item) => item.project.id === "cloudflare/agents");
  assert.equal(cloudflareAgents?.agentCard.category, "agent_framework");
  assert.equal(cloudflareAgents?.agentCard.cloudflareReady, true);
}

async function testAlternatives() {
  const cloudflare = seedProjects.find((item) => item.project.id === "cloudflare/agents");
  assert.ok(cloudflare, "seed should include cloudflare/agents");

  const alternatives = generateAlternatives(cloudflare, seedProjects, 3);
  assert.ok(alternatives.length > 0, "cloudflare/agents should have generated alternatives");
  assert.ok(alternatives.every((item) => item.project_id !== cloudflare.project.id));
  assert.ok(alternatives.every((item) => typeof item.reason === "string" && item.reason.length > 0));

  const all = generateAlternativesForAll(seedProjects, 2);
  assert.ok(all.updated > 0);
  assert.equal(all.updated, all.updates.length);
  assert.ok(all.updates.every((update) => update.alternatives.length <= 2));
}

async function testGrpNormalization() {
  const invalid = normalizeGrpRequest({ goal: "   " });
  assert.equal(invalid.ok, false);

  const normalized = normalizeGrpRequest({
    goal: "  Find Cloudflare agent frameworks  ",
    mode: "find",
    constraints: {
      deploy: ["Cloudflare", "Workers"],
      language: "TypeScript",
      agent_ready: true
    },
    context: {
      current_stack: ["MCP"]
    }
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.request.goal, "Find Cloudflare agent frameworks");
  assert.equal(normalized.request.mode, "find");
  assert.deepEqual(normalized.request.constraints?.deploy, ["cloudflare", "workers"]);
  assert.equal(normalized.request.constraints?.language, "typescript");
  assert.deepEqual(normalized.request.context?.current_stack, ["MCP"]);
}

async function testGrpQueries() {
  const findRequest = normalizeGrpRequest({
    goal: "Find Cloudflare-ready agent frameworks",
    mode: "find",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    }
  });
  assert.equal(findRequest.ok, true);
  const findResult = runGrpQuery(seedProjects, findRequest.request);
  assert.equal(findResult.metadata.version, "grp.v1");
  assert.equal(findResult.mode, "find");
  assert.equal(findResult.resultType, "project_set");
  assert.ok(findResult.nodes.some((node) => node.repo === "cloudflare/agents"));
  assert.ok(findResult.metadata.candidateCount > 0);

  const compareRequest = normalizeGrpRequest({
    goal: "Compare cloudflare/agents and run-llama/llama_index for Cloudflare deployment",
    mode: "compare",
    constraints: {
      deploy: ["cloudflare"]
    }
  });
  assert.equal(compareRequest.ok, true);
  const compareResult = runGrpQuery(seedProjects, compareRequest.request);
  assert.equal(compareResult.mode, "compare");
  assert.equal(compareResult.resultType, "comparison");
  assert.ok(compareResult.comparison);
  assert.ok(compareResult.comparison.projects.length >= 2);
  assert.ok(compareResult.comparison.projects.some((project) => project.id === "cloudflare/agents"));
}

function makeSearchFixture(id, overrides) {
  const [owner, name] = id.split("/");
  const now = new Date().toISOString();
  return {
    project: {
      id,
      owner,
      name,
      fullName: id,
      githubUrl: `https://github.com/${id}`,
      homepageUrl: null,
      description: overrides.description,
      language: "TypeScript",
      topics: overrides.topics ?? ["agent", "runtime", "cloudflare"],
      license: "MIT",
      stars: overrides.stars,
      forks: 10,
      openIssues: 1,
      defaultBranch: "main",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: id,
      projectKind: overrides.projectKind ?? "project",
      ...(overrides.collectionMetadata ? { collectionMetadata: overrides.collectionMetadata } : {}),
      category: overrides.category ?? "agent_framework",
      difficulty: "intermediate",
      deployment: overrides.deployment ?? ["cloudflare"],
      cloudflareReady: overrides.cloudflareReady ?? true,
      useCases: overrides.useCases ?? ["build agent runtimes"],
      notGoodFor: [],
      alternatives: [],
      summaryForAgent: overrides.description,
      classification: {
        category: { confidence: "high", evidence: ["fixture"] },
        deployment: { confidence: "high", evidence: ["fixture"] },
        difficulty: { confidence: "high", evidence: ["fixture"] },
        cloudflareReady: { confidence: "high", evidence: ["fixture"] }
      },
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: id,
      stars30dDelta: overrides.stars30dDelta ?? 0,
      commits30d: 0,
      releases180d: 0,
      contributors90d: 0,
      issueFirstResponseMedianHours: null,
      recentPushDays: 1,
      gitScore: overrides.gitScore,
      maintenanceScore: overrides.maintenanceScore,
      signalConfidence: {},
      calculatedAt: now
    }
  };
}
