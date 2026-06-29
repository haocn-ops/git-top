import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runSmoke(process.argv.slice(2), process.env), null, 2));
}

export async function runSmoke(args = [], env = process.env) {
  const options = parseArgs(args);
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? env.GIT_TOP_SMOKE_BASE_URL ?? "https://git.top");
  const timeoutMs = Number(options.timeoutMs ?? env.GIT_TOP_SMOKE_TIMEOUT_MS ?? 10_000);
  const allowSeed = options.allowSeed === true || env.GIT_TOP_SMOKE_ALLOW_SEED === "1";
  const context = {
    allowSeed,
    baseUrl,
    results: [],
    timeoutMs
  };

  await check(context, "health", async () => {
    const { status, body } = await getJson(context, "/api/health");
    assert.equal(status, 200);
    return validateHealthResponse(body, { allowSeed });
  });

  await check(context, "search", async () => {
    const { status, body } = await getJson(context, "/api/search?q=cloudflare%20agent&limit=3");
    assert.equal(status, 200);
    assertMetadata(body.metadata, { allowSeed });
    assert.ok(Array.isArray(body.projects), "search projects should be an array");
    assert.ok(body.projects.length > 0, "search should return at least one project");
    assert.ok(body.projects.length <= 3, "search should honor limit");
    assert.ok(body.projects.some((project) => typeof project.repo === "string"), "search results should include repo ids");
    return {
      source: body.metadata.source,
      reason: body.metadata.reason,
      candidates: body.projects.map((project) => project.repo)
    };
  });

  await check(context, "grp_query", async () => {
    const { status, body } = await postJson(context, "/api/grp/query", {
      goal: "build a Cloudflare-ready coding agent stack",
      mode: "plan",
      constraints: {
        deploy: ["cloudflare"],
        agent_ready: true
      }
    });
    assert.equal(status, 200);
    assert.equal(body.metadata.version, "grp.v1");
    assertMetadata(body.metadata.data_source, { allowSeed });
    assert.ok(Array.isArray(body.nodes), "GRP nodes should be an array");
    assert.ok(body.nodes.length > 0, "GRP should return at least one node");
    return {
      mode: body.mode,
      resultType: body.result_type,
      candidates: body.nodes.slice(0, 5).map((node) => node.repo ?? node.id)
    };
  });

  await check(context, "mcp_discovery", async () => {
    const { status, body } = await getJson(context, "/mcp");
    assert.equal(status, 200);
    assert.equal(body.name, "git-top");
    assert.equal(body.openapi_url, "https://git.top/openapi.json");
    assert.equal(body.api_openapi_url, "https://git.top/api/openapi.json");
    assert.equal(body.schema_url, "https://git.top/api/schema/project.v2");
    assert.ok(Array.isArray(body.tools), "MCP discovery should include tools");
    assert.ok(body.tools.some((tool) => tool.name === "search_projects"), "MCP discovery should include search_projects");
    assert.ok(body.tools.some((tool) => tool.name === "get_trends"), "MCP discovery should include get_trends");
    assert.ok(body.tools.some((tool) => tool.name === "get_agent_workflow"), "MCP discovery should include get_agent_workflow");
    assert.ok(body.tools.some((tool) => tool.name === "get_atlas"), "MCP discovery should include get_atlas");
    assert.ok(body.tools.some((tool) => tool.name === "get_quality_report"), "MCP discovery should include get_quality_report");
    assert.ok(body.tools.some((tool) => tool.name === "git_top_grp_query"), "MCP discovery should include git_top_grp_query");
    return {
      tools: body.tools.length,
      openapiUrl: body.openapi_url,
      schemaUrl: body.schema_url
    };
  });

  await check(context, "mcp_tools_list", async () => {
    const { status, body } = await postJson(context, "/mcp", {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    });
    assert.equal(status, 200);
    assert.equal(body.jsonrpc, "2.0");
    assert.ok(Array.isArray(body.result.tools), "MCP tools/list should include tools");
    assert.ok(body.result.tools.some((tool) => tool.name === "search_projects"), "MCP tools/list should include search_projects");
    return {
      tools: body.result.tools.length
    };
  });

  await check(context, "mcp_initialize_and_get_project", async () => {
    const initialized = await postJson(context, "/mcp", {
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "git-top-smoke", version: "0.0.0" }
      }
    });
    assert.equal(initialized.status, 200);
    assert.equal(initialized.body.result.serverInfo.name, "git-top");

    const project = await postJson(context, "/mcp", {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_project",
        arguments: { owner: "cloudflare", repo: "agents", require_d1: !context.allowSeed }
      }
    });
    assert.equal(project.status, 200);
    const result = JSON.parse(project.body.result.content[0].text);
    assert.equal(result.project_id, "cloudflare/agents");
    assert.equal(result.project.repo, "cloudflare/agents");
    assertMetadata(result.metadata, { allowSeed });

    return {
      server: initialized.body.result.serverInfo.name,
      repo: result.project.repo
    };
  });

  await check(context, "agent_workflow", async () => {
    const { status, body } = await getJson(
      context,
      `/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=3${context.allowSeed ? "" : "&require_d1=true"}`
    );
    assert.equal(status, 200);
    assert.equal(body.positioning, "The Knowledge Graph of Open Source");
    assert.ok(Array.isArray(body.recommended_sequence), "workflow should include recommended_sequence");
    assert.ok(body.recommended_sequence.some((step) => step.mcp_tool === "get_trends"), "workflow should point agents to trends");
    assert.ok(body.recommended_sequence.some((step) => step.mcp_tool === "recommend_project"), "workflow should point agents to recommendations");
    assert.ok(body.recommended_sequence.some((step) => step.mcp_tool === "compare_projects"), "workflow should point agents to compare");
    assert.ok(Array.isArray(body.shortlist), "workflow should include shortlist");
    assert.ok(body.shortlist.length > 0, "workflow shortlist should not be empty");
    assertMetadata(body.metadata, { allowSeed });
    return {
      source: body.metadata.source,
      steps: body.recommended_sequence.length,
      shortlist: body.shortlist.map((item) => item.project_id)
    };
  });

  await check(context, "machine_discovery", async () => {
    const sitemap = await getText(context, "/sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/llms\.txt<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/llms-full\.txt<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/quickstart<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/recipes<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/journeys<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/integrations<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/status<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/operations<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/roadmap<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/quality<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/coverage<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/quality\/review<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/trends<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/recommend<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/compare\/claude-code\.\.\.opencode<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/compare\/dify\.\.\.langflow<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/alternatives\/claude-code<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/alternatives\/cursor<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/alternatives\/openai<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/graph\/claude-code<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/score\/cursor<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/topics\/browser-ai-automation<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/topics\/ai-ide-coding-agents<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/api\/quickstart<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/api\/recipes<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/api\/journeys<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/api\/roadmap<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/projects\/cloudflare\/agents<\/loc>/);

    const llms = await getText(context, "/llms.txt");
    assert.equal(llms.status, 200);
    assert.match(llms.text, /Git\.Top is an agent-native GitHub project knowledge layer/);
    assert.match(llms.text, /Atlas journeys: https:\/\/git\.top\/journeys/);

    const { status: openapiStatus, body: openapi } = await getJson(context, "/openapi.json");
    assert.equal(openapiStatus, 200);
    assert.ok(openapi.paths["/api/quality/review"], "OpenAPI should include quality review");
    assert.ok(openapi.paths["/api/trends"], "OpenAPI should include trends");
    assert.ok(openapi.paths["/api/governance/summary"], "OpenAPI should include governance summary");
    assert.ok(openapi.paths["/api/admin/governance/runs"], "OpenAPI should include governance run recording");
    assert.ok(openapi.paths["/api/admin/classification-overrides"], "OpenAPI should include classification overrides");
    assert.equal(openapi.components.securitySchemes.syncSecret.scheme, "bearer");

    return {
      sitemapProjectUrls: Array.from(sitemap.text.matchAll(/<loc>https:\/\/git\.top\/projects\//g)).length,
      openapiAdminOverride: true
    };
  });

  await check(context, "project_page_seo", async () => {
    const { status, text } = await getText(context, "/projects/cloudflare/agents");
    assert.equal(status, 200);
    assert.match(text, /<link rel="canonical" href="https:\/\/git\.top\/projects\/cloudflare\/agents"/);
    assert.match(text, /<script type="application\/ld\+json">/);
    assert.match(text, /Project \/ implementation|Collection \/ resource hub/);
    assert.match(text, /Cloudflare Readiness/);
    assert.match(text, /Project JSON/);
    assert.match(text, /GitHub/);

    const jsonLdMatch = text.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(jsonLdMatch, "project page should include JSON-LD");
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    assert.equal(jsonLd["@type"], "SoftwareSourceCode");
    assert.equal(jsonLd.name, "cloudflare/agents");
    assert.equal(jsonLd.codeRepository, "https://github.com/cloudflare/agents");

    return {
      type: jsonLd["@type"],
      repo: jsonLd.name,
      properties: jsonLd.additionalProperty.length
    };
  });

  await check(context, "canonical_redirects", async () => {
    const legacyProject = await getHead(context, "/project/cloudflare/agents");
    assert.equal(legacyProject.status, 301);
    assert.equal(legacyProject.location, `${context.baseUrl}/projects/cloudflare/agents`);

    const legacyStatus = await getHead(context, "/api/status?require_d1=true");
    assert.equal(legacyStatus.status, 301);
    assert.equal(legacyStatus.location, `${context.baseUrl}/api/health?require_d1=true`);

    return {
      project: legacyProject.location,
      status: legacyStatus.location
    };
  });

  await check(context, "docs_canonical", async () => {
    const { status, text } = await getText(context, "/docs");
    assert.equal(status, 200);
    assert.match(text, /<link rel="canonical" href="https:\/\/git\.top\/docs"/);
    return { canonical: true };
  });

  await check(context, "quality_page", async () => {
    const { status, text } = await getText(context, "/quality");
    assert.equal(status, 200);
    assert.match(text, /Quality Governance/);
    assert.match(text, /Risk Summary/);
    assert.match(text, /Improvement Plan/);
    assert.match(text, /How to lower data trust risk/);
    assert.match(text, /Category coverage/);
    assert.match(text, /Low-confidence classifications/);
    assert.match(text, /Open quality JSON/);
    assert.match(text, /Review queue/);
    assert.match(text, /Corpus coverage/);

    return {
      hasQualityJsonLink: text.includes("/api/quality")
    };
  });

  await check(context, "mcp_quality_report", async () => {
    const { status, body } = await postJson(context, "/mcp", {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "get_quality_report",
        arguments: { require_d1: !context.allowSeed }
      }
    });
    assert.equal(status, 200);
    const result = JSON.parse(body.result.content[0].text);
    assert.ok(typeof result.release_score === "number", "quality report should include release_score");
    assert.ok(typeof result.data_trust_score === "number", "quality report should include data_trust_score");
    assert.ok(typeof result.risk_level === "string", "quality report should include risk_level");
    assert.ok(Array.isArray(result.improvement_plan), "quality report should include improvement_plan");
    assert.ok(result.improvement_plan.length > 0, "quality report improvement_plan should not be empty");
    assert.ok(result.coverage, "quality report should include coverage");
    assert.ok(Array.isArray(result.issues), "quality report should include issues");
    return {
      releaseScore: result.release_score,
      riskLevel: result.risk_level,
      improvementItems: result.improvement_plan.length
    };
  });

  await check(context, "guide_head_requests", async () => {
    const atlasGuide = await getHead(context, "/topics/atlas-guide");
    const graphGuide = await getHead(context, "/topics/graph-guide");
    const compareGuide = await getHead(context, "/topics/project-comparison-guide");
    const recommendationGuide = await getHead(context, "/topics/recommendation-guide");
    const projectGraphGuide = await getHead(context, "/topics/project-graph-guide");
    const scoreGuide = await getHead(context, "/topics/git-top-score-guide");
    const workflowGuide = await getHead(context, "/topics/agent-workflow-guide");
    const alternativesGuide = await getHead(context, "/topics/alternatives-engine-guide");
    const trustGuide = await getHead(context, "/topics/data-trust-guide");

    assert.equal(atlasGuide.status, 200);
    assert.equal(graphGuide.status, 200);
    assert.equal(compareGuide.status, 200);
    assert.equal(recommendationGuide.status, 200);
    assert.equal(projectGraphGuide.status, 200);
    assert.equal(scoreGuide.status, 200);
    assert.equal(workflowGuide.status, 200);
    assert.equal(alternativesGuide.status, 200);
    assert.equal(trustGuide.status, 200);

    return {
      atlas: atlasGuide.status,
      graph: graphGuide.status,
      compare: compareGuide.status,
      recommendation: recommendationGuide.status,
      projectGraph: projectGraphGuide.status,
      score: scoreGuide.status,
      workflow: workflowGuide.status,
      alternatives: alternativesGuide.status,
      trust: trustGuide.status
    };
  });

  await check(context, "status_page", async () => {
    const { status, text } = await getText(context, "/status");
    assert.equal(status, 200);
    assert.match(text, /Data source, sync freshness, and runtime health/);
    assert.match(text, /Sync Progress/);
    assert.match(text, /Freshness/);
    assert.match(text, /Recent Runs/);
    assert.match(text, /Integration Guidance/);

    return {
      hasHealthJsonLink: text.includes("/api/health"),
      hasSyncJsonLink: text.includes("/api/sync/status")
    };
  });

  await check(context, "operations_page", async () => {
    const { status, text } = await getText(context, "/operations");
    assert.equal(status, 200);
    assert.match(text, /Automation runs and data governance/);
    assert.match(text, /Latest Automation/);
    assert.match(text, /Quality Issues/);
    assert.match(text, /Operating Rhythm/);

    const summary = await getJson(context, "/api/governance/summary");
    assert.equal(summary.status, 200);
    assert.ok(summary.body.status_counts, "governance summary should include status counts");

    const runs = await getJson(context, "/api/governance/runs?limit=5");
    assert.equal(runs.status, 200);
    assert.ok(Array.isArray(runs.body.runs), "governance runs should be an array");

    return {
      hasSummaryLink: text.includes("/api/governance/summary"),
      runCount: runs.body.runs.length
    };
  });

  await check(context, "integrations_page", async () => {
    const { status, text } = await getText(context, "/integrations");
    assert.equal(status, 200);
    assert.match(text, /Use Git\.Top as project intelligence/);
    assert.match(text, /Production Checklist/);
    assert.match(text, /REST/);
    assert.match(text, /MCP/);
    assert.match(text, /GRP/);
    assert.match(text, /security@git\.top/);

    return {
      hasMcpLink: text.includes("/mcp"),
      hasOpenApiLink: text.includes("/openapi.json")
    };
  });

  await check(context, "quickstart_page", async () => {
    const { status, text } = await getText(context, "/quickstart");
    assert.equal(status, 200);
    assert.match(text, /Git\.Top Agent Quickstart/);
    assert.match(text, /Open Quickstart JSON/);
    assert.match(text, /Use GRP For Goal-Level Planning/);

    const quickstart = await getJson(context, "/api/quickstart");
    assert.equal(quickstart.status, 200);
    assert.equal(quickstart.body.positioning, "The Knowledge Graph of Open Source");
    assert.ok(quickstart.body.steps.some((step) => step.id === "check-data-source"));
    assert.ok(quickstart.body.steps.some((step) => step.rest === "POST /api/grp/query"));

    return {
      steps: quickstart.body.steps.length,
      hasTrustPolicy: Array.isArray(quickstart.body.trust_policy)
    };
  });

  await check(context, "recipes_page", async () => {
    const { status, text } = await getText(context, "/recipes");
    assert.equal(status, 200);
    assert.match(text, /Git\.Top Agent Recipes/);
    assert.match(text, /Choose A Cloudflare-ready Agent Framework/);
    assert.match(text, /Plan With Graph Reasoning/);

    const recipes = await getJson(context, "/api/recipes");
    assert.equal(recipes.status, 200);
    assert.equal(recipes.body.positioning, "The Knowledge Graph of Open Source");
    assert.ok(recipes.body.recipes.some((recipe) => recipe.id === "check-recommendation-trust"));
    assert.ok(recipes.body.recipes.every((recipe) => Array.isArray(recipe.trust_checks)));

    return {
      recipes: recipes.body.recipes.length,
      hasGrp: recipes.body.recipes.some((recipe) => recipe.id === "plan-with-grp")
    };
  });

  await check(context, "journeys_page", async () => {
    const { status, text } = await getText(context, "/journeys");
    assert.equal(status, 200);
    assert.match(text, /Git\.Top Atlas Journeys/);
    assert.match(text, /Explore open-source ecosystems as routes/);
    assert.match(text, /Open Journeys JSON/);
    assert.match(text, /Cloudflare Ecosystem/);

    const journeys = await getJson(context, `/api/journeys?limit=3${context.allowSeed ? "" : "&require_d1=true"}`);
    assert.equal(journeys.status, 200);
    assert.equal(journeys.body.positioning, "The Knowledge Graph of Open Source");
    assert.ok(Array.isArray(journeys.body.journeys), "journeys API should include journeys");
    assert.ok(journeys.body.journeys.length > 0, "journeys API should not be empty");
    assert.ok(journeys.body.journeys.some((journey) => journey.ecosystem_id === "cloudflare"), "journeys should include Cloudflare ecosystem");
    assert.ok(journeys.body.journeys.some((journey) => journey.steps.some((step) => step.href === "/api/agent-map")), "journeys should link to Agent Map");
    assert.ok(Array.isArray(journeys.body.comparison_paths), "journeys API should include comparison_paths");
    assert.ok(journeys.body.comparison_paths.some((path) => path.api_href.includes("/api/compare")), "journeys comparison paths should link to Compare JSON");
    assertMetadata(journeys.body.metadata, { allowSeed });

    return {
      journeys: journeys.body.journeys.length,
      comparisonPaths: journeys.body.comparison_paths.length,
      ecosystems: journeys.body.stats.ecosystem_count,
      source: journeys.body.metadata.source
    };
  });

  await check(context, "roadmap_page", async () => {
    const { status, text } = await getText(context, "/roadmap");
    assert.equal(status, 200);
    assert.match(text, /Git\.Top 2\.0 Roadmap/);
    assert.match(text, /The Knowledge Graph of Open Source/);
    assert.match(text, /Open Roadmap JSON/);

    const roadmap = await getJson(context, "/api/roadmap");
    assert.equal(roadmap.status, 200);
    assert.equal(roadmap.body.positioning, "The Knowledge Graph of Open Source");
    assert.equal(roadmap.body.phases.length, 6);
    assert.ok(roadmap.body.phases.some((phase) => phase.id === "agent-api"));

    return {
      completion: roadmap.body.completion,
      phases: roadmap.body.phases.length
    };
  });

  await check(context, "coverage_page", async () => {
    const { status, text } = await getText(context, "/coverage");
    assert.equal(status, 200);
    assert.match(text, /Project corpus, taxonomy, and trust boundaries/);
    assert.match(text, /Category Distribution/);
    assert.match(text, /Use Boundaries/);
    assert.match(text, /Cloudflare-ready/);
    assert.match(text, /Collection Semantics/);

    return {
      hasCoverageJsonLink: text.includes("/api/quality")
    };
  });

  await check(context, "quality_review_page", async () => {
    const { status, text } = await getText(context, "/quality/review");
    assert.equal(status, 200);
    assert.match(text, /Review Queue/);
    assert.match(text, /Low-confidence classification/);
    assert.match(text, /Open review JSON/);
    assert.match(text, /Override workflow/);
    assert.match(text, /Review items/);
    assert.match(text, /Impact/);

    const { status: apiStatus, body } = await getJson(context, "/api/quality/review");
    assert.equal(apiStatus, 200);
    assert.ok(Number.isFinite(body.review_count), "review_count should be numeric");
    assert.ok(Array.isArray(body.items), "review API should include items");
    if (body.items.length > 0) {
      assert.ok(Number.isFinite(body.items[0].impact_score), "review items should include impact_score");
      assert.ok(Array.isArray(body.items[0].impact_factors), "review items should include impact_factors");
    }

    return {
      reviewCount: body.review_count,
      lowSignalCount: body.low_signal_count
    };
  });

  await check(context, "index_page_seo", async () => {
    const projects = await getText(context, "/projects");
    assert.equal(projects.status, 200);
    assert.match(projects.text, /<link rel="canonical" href="https:\/\/git\.top\/projects"/);
    assert.match(projects.text, /Git\.Top Projects \| Agent-Native GitHub Project Index/);

    const graph = await getText(context, "/graph");
    assert.equal(graph.status, 200);
    assert.match(graph.text, /<link rel="canonical" href="https:\/\/git\.top\/graph"/);
    assert.match(graph.text, /Project%20relationships%20for%20AI%20agents/);

    const workflow = await getText(context, "/workflow");
    assert.equal(workflow.status, 200);
    assert.match(workflow.text, /<link rel="canonical" href="https:\/\/git\.top\/workflow"/);
    assert.match(workflow.text, /Agent Selection Workflow/);
    assert.match(workflow.text, /Open Workflow JSON/);

    return {
      projectsCanonical: true,
      graphCanonical: true,
      workflowCanonical: true
    };
  });

  await check(context, "search_empty_and_compare_order", async () => {
    const empty = await getJson(
      context,
      `/api/search?query=agent&category=framework&deployment=cloudflare&language=typescript&cloudflare_ready=true&limit=5${context.allowSeed ? "" : "&require_d1=true"}`
    );
    assert.equal(empty.status, 200);
    assert.equal(empty.body.search.applied_filters.q, "agent");
    assert.equal(empty.body.search.applied_filters.category, "framework");
    assert.equal(empty.body.search.applied_filters.cloudflare_ready, true);
    if (empty.body.projects.length === 0) {
      assert.match(empty.body.search.empty_reason, /No projects matched/);
      assert.ok(Array.isArray(empty.body.search.suggestions), "empty search should include suggestions");
    }
    assertMetadata(empty.body.metadata, { allowSeed });

    const compare = await getJson(context, "/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare");
    assert.equal(compare.status, 200);
    assert.equal(compare.body.projects[0].repo, "cloudflare/agents");
    assert.deepEqual(compare.body.requested_repos, ["cloudflare/agents", "langchain-ai/langchain"]);
    assert.ok(typeof compare.body.winner === "string", "compare should keep winner separate from order");
    assertMetadata(compare.body.metadata, { allowSeed });

    return {
      emptySearchProjects: empty.body.projects.length,
      compareOrder: compare.body.projects.map((project) => project.repo)
    };
  });

  return {
    baseUrl,
    ok: true,
    checked: context.results
  };
}

export function validateHealthResponse(body, { allowSeed = false } = {}) {
  if (allowSeed) {
    assert.ok(["available", "missing", "error"].includes(body.db), "health.db should describe D1 state");
  } else {
    assert.equal(body.ok, true, "production smoke requires a healthy D1-backed health response");
    assert.equal(body.db, "available", "production smoke requires an available D1 binding");
  }
  assert.ok(Number.isFinite(body.raw_project_count), "health.raw_project_count should be numeric");
  assert.ok(Number.isFinite(body.knowledge_ready_project_count), "health.knowledge_ready_project_count should be numeric");
  assert.equal(body.project_count, body.knowledge_ready_project_count, "health.project_count should match knowledge-ready project count");
  if (body.db === "available") {
    assert.ok(body.raw_project_count >= body.knowledge_ready_project_count, "raw project count should not be lower than knowledge-ready count");
  }
  assertMetadata(body.metadata, { allowSeed });
  return {
    db: body.db,
    source: body.metadata.source,
    reason: body.metadata.reason,
    projectCount: body.project_count,
    rawProjectCount: body.raw_project_count,
    knowledgeReadyProjectCount: body.knowledge_ready_project_count,
    syncHealth: body.sync_health,
    syncFreshness: body.sync_freshness,
    lastSuccessfulSyncAt: body.last_successful_sync_at
  };
}

async function check(context, name, fn) {
  try {
    const details = await fn();
    context.results.push({ name, ok: true, ...details });
  } catch (error) {
    error.message = `${name} smoke check failed: ${error.message}`;
    throw error;
  }
}

async function getJson(context, path) {
  return requestJson(context, path, { method: "GET" });
}

async function getText(context, path) {
  return requestText(context, path, { method: "GET" });
}

async function getHead(context, path) {
  const response = await fetch(`${context.baseUrl}${path}`, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(context.timeoutMs)
  });
  return {
    status: response.status,
    location: response.headers.get("location")
  };
}

async function postJson(context, path, body) {
  return requestJson(context, path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestText(context, path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
  try {
    const response = await fetch(`${context.baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    return {
      status: response.status,
      text: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson(context, path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
  try {
    const response = await fetch(`${context.baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 200)}`);
    }
    return {
      status: response.status,
      body
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function assertMetadata(metadata, { allowSeed = false } = {}) {
  assert.ok(metadata && typeof metadata === "object", "metadata should be present");
  if (allowSeed) {
    assert.ok(["d1", "seed"].includes(metadata.source), "metadata.source should be d1 or seed");
  } else {
    assert.equal(metadata.source, "d1", "production smoke requires D1-backed metadata; pass --allow-seed for seed fallback checks");
  }
  assert.ok(typeof metadata.reason === "string" && metadata.reason.length > 0, "metadata.reason should be present");
  assert.ok(Number.isFinite(metadata.project_count), "metadata.project_count should be numeric");
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
    } else if (arg === "--allow-seed") {
      parsed.allowSeed = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/g, "");
}
