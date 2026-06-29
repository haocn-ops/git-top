import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { alternativeAliasPaths, compareAliasPaths, graphAliasPaths, scoreAliasPaths } from "./project-aliases";
import type { Env, ProjectKnowledge } from "./types";

const siteOrigin = "https://git.top";

export function canonicalHostRedirect(request: Request, url: URL): Response | null {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? url.hostname;
  if ([host, url.hostname].some((value) => ["localhost", "127.0.0.1", "::1"].includes(value))) {
    return null;
  }

  const isCanonicalHost = host === "git.top";
  const isWwwHost = host === "www.git.top";
  const shouldUpgradeProtocol = url.protocol === "http:" && (isCanonicalHost || isWwwHost);
  if (!isWwwHost && !shouldUpgradeProtocol) {
    return null;
  }
  const target = new URL(request.url);
  target.protocol = "https:";
  if (isWwwHost) {
    target.hostname = "git.top";
  }
  return Response.redirect(target.toString(), 301);
}

export function withSiteHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "content-security-policy",
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function renderRobotsTxt(): Response {
  return text(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/admin/",
      "Disallow: /api/grp/query",
      "Sitemap: https://git.top/sitemap.xml",
      "",
      "User-agent: GPTBot",
      "Allow: /",
      "",
      "User-agent: Google-Extended",
      "Allow: /",
      ""
    ].join("\n"),
    "text/plain; charset=utf-8"
  );
}

export function renderSecurityTxt(): Response {
  return text(
    [
      "Contact: mailto:security@git.top",
      "Policy: https://git.top/docs#security",
      "Preferred-Languages: en",
      "Canonical: https://git.top/.well-known/security.txt",
      "Expires: 2027-06-21T00:00:00Z",
      ""
    ].join("\n"),
    "text/plain; charset=utf-8"
  );
}

export function renderLlmsTxt(): Response {
  return text(
    [
      "# Git.Top",
      "",
      "Git.Top is an agent-native GitHub project knowledge layer for open-source project discovery, comparison, deployment fit, alternatives, quality signals, and MCP access.",
      "",
      "## Core URLs",
      "",
      "- Docs: https://git.top/docs",
      "- Agent quickstart: https://git.top/quickstart",
      "- Agent recipes: https://git.top/recipes",
      "- Atlas journeys: https://git.top/journeys",
      "- Integrations: https://git.top/integrations",
      "- MCP discovery: https://git.top/mcp",
      "- Agent surface map: https://git.top/api/agent-map",
      "- Agent quickstart JSON: https://git.top/api/quickstart",
      "- Agent recipes JSON: https://git.top/api/recipes",
      "- Atlas journeys JSON: https://git.top/api/journeys",
      "- Roadmap: https://git.top/roadmap",
      "- Agent workflow: https://git.top/workflow",
      "- OpenAPI: https://git.top/openapi.json",
      "- Project schema: https://git.top/api/schema/project.v2",
      "- Health: https://git.top/api/health",
      "- Public status: https://git.top/status",
      "- Quality: https://git.top/api/quality",
      "- Quality governance: https://git.top/quality",
      "- Corpus coverage: https://git.top/coverage",
      "- Low-confidence review: https://git.top/quality/review",
      "- Search: https://git.top/api/search?q=cloudflare%20agent&limit=5",
      "",
      "## Agent Guidance",
      "",
      "- Check metadata.source before making high-confidence recommendations.",
      "- Prefer metadata.source=d1 for production answers.",
      "- Check /status for D1 availability, sync health, and freshness before production use.",
      "- Check /coverage when the question depends on corpus breadth or category representation.",
      "- Inspect classification evidence and quality_signal_confidence before citing a score.",
      "- Use /mcp for JSON-RPC tools/list and tools/call.",
      "- Use /quickstart or /api/quickstart for the shortest integration path.",
      "- Use /recipes or /api/recipes for task-specific integration workflows.",
      "- Use /journeys or /api/journeys when starting from an ecosystem and moving toward a recommendation, graph, alternatives, compare, score, or Agent Map decision path.",
      "- Use /integrations for REST, MCP, and GRP production integration paths.",
      "",
      "## Useful Pages",
      "",
      "- Best MCP Servers: https://git.top/topics/best-mcp-servers",
      "- Best AI Agent Frameworks: https://git.top/topics/best-ai-agent-frameworks",
      "- Cloudflare-ready AI Projects: https://git.top/topics/cloudflare-ready-ai-projects",
      "- LangChain Alternatives: https://git.top/topics/langchain-alternatives",
      "- Atlas Guide: https://git.top/topics/atlas-guide",
      "- Graph Guide: https://git.top/topics/graph-guide",
      "- Project Graph Guide: https://git.top/topics/project-graph-guide",
      "- Recommendation Guide: https://git.top/topics/recommendation-guide",
      "- Project Comparison Guide: https://git.top/topics/project-comparison-guide",
      "- Git.Top Score Guide: https://git.top/topics/git-top-score-guide",
      "- Agent Workflow Guide: https://git.top/topics/agent-workflow-guide",
      "- Alternatives Engine Guide: https://git.top/topics/alternatives-engine-guide",
      "- Data Trust Guide: https://git.top/topics/data-trust-guide",
      "- Open Source Quality Score API: https://git.top/topics/open-source-quality-score-api",
      "",
      "Full agent documentation: https://git.top/llms-full.txt",
      ""
    ].join("\n"),
    "text/plain; charset=utf-8"
  );
}

export function renderLlmsFullTxt(): Response {
  return text(
    [
      "# Git.Top Full Agent Guide",
      "",
      "Git.Top turns GitHub repository metadata, generated Agent Cards, quality metrics, deployment signals, alternatives, and graph relationships into structured knowledge for AI agents.",
      "",
      "## Positioning",
      "",
      "Git.Top is not a GitHub leaderboard. It is a project intelligence layer for agents choosing open-source projects based on fit, deployability, alternatives, maintenance, evidence, and data confidence.",
      "",
      "## Base URLs",
      "",
      "- Production: https://git.top",
      "- Local Worker: http://localhost:8787",
      "",
      "## Recommended Agent Flow",
      "",
      "1. GET /api/health and verify db=available and metadata.source=d1 for high-confidence production recommendations.",
      "2. Use /api/workflow or /workflow when an agent needs a guided path across trends, recommendations, graph, alternatives, score, compare, and trust policy.",
      "3. Search with /api/search or MCP search_projects.",
      "4. Fetch candidate details with /api/project/:owner/:repo or MCP get_project.",
      "5. Fetch alternatives with /api/alternatives/:owner/:repo or MCP get_alternatives.",
      "6. Compare final candidates with /api/compare or MCP compare_projects.",
      "7. Use /api/agent-map when an agent needs the human page, REST endpoint, MCP tool, output fields, and trust fields for a Git.Top concept.",
      "8. Cite metadata, classification evidence, quality_signal_confidence, and freshness fields.",
      "9. Operators can use the protected classification override API for reviewed one-off corrections from /quality/review.",
      "",
      "## REST Endpoints",
      "",
      "- GET /api/health",
      "- GET /api/search?q=cloudflare%20agent&limit=5",
      "- GET /api/search?category=agent_framework&ranking=browse&limit=12",
      "- GET /api/search?deployment=cloudflare&cloudflare_ready=true&ranking=browse&limit=12",
      "- GET /api/project/cloudflare/agents",
      "- POST /api/project",
      "- GET /api/trending?limit=10",
      "- GET /api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5",
      "- POST /api/workflow",
      "- GET /api/recommend?use_case=build%20a%20browser%20automation%20agent&deployment=docker&limit=5",
      "- POST /api/recommend",
      "- GET /api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare",
      "- POST /api/compare",
      "- GET /api/alternatives/langchain-ai/langchain",
      "- POST /api/alternatives",
      "- GET /api/related/cloudflare/agents",
      "- POST /api/related",
      "- GET /api/score/cloudflare/agents",
      "- POST /api/score",
      "- GET /api/graph?repo=cloudflare/agents&limit=24",
      "- POST /api/graph",
      "- GET /api/atlas?limit=6",
      "- GET /api/atlas/cloudflare?limit=8",
      "- GET /api/journeys?limit=8",
      "- GET /api/agent-map",
      "- GET /api/quickstart",
      "- GET /api/recipes",
      "- GET /api/roadmap",
      "- GET /api/quality",
      "- GET /api/quality/review",
      "- GET /api/sync/status",
      "- GET /api/schema/project.v2",
      "- GET /api/openapi.json",
      "- POST /api/grp/query",
      "- GET/POST /api/admin/classification-overrides (requires SYNC_SECRET)",
      "",
      "## MCP",
      "",
      "Endpoint: https://git.top/mcp",
      "",
      "GET /mcp returns docs, schema, health, quality, quickstart hints, example JSON-RPC payloads, and tool schemas.",
      "",
      "Tools include:",
      "",
      "- search_projects",
      "- get_project",
      "- get_alternatives",
      "- get_deployment",
      "- get_quality_score",
      "- get_quality_report",
      "- recommend_project",
      "- find_alternatives",
      "- get_project_card",
      "- get_project_graph",
      "- compare_projects",
      "- git_top_grp_query",
      "",
      "Example tools/list:",
      "",
      'curl -X POST https://git.top/mcp -H "content-type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\'',
      "",
      "Example search:",
      "",
      'curl -X POST https://git.top/mcp -H "content-type: application/json" -d \'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_projects","arguments":{"query":"cloudflare agent framework","limit":5}}}\'',
      "",
      "Example project lookup:",
      "",
      'curl -X POST https://git.top/mcp -H "content-type: application/json" -d \'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_project","arguments":{"owner":"cloudflare","repo":"agents","require_d1":true}}}\'',
      "",
      "## Scoring",
      "",
      "git_top_score weights community, maintenance, documentation, stability, adoption, and agent readability.",
      "",
      "Score explanations expose dimensions, strongest_dimension, weakest_dimension, adoption_guidance, risk_flags, score_confidence, next_actions, related_scores, evidence, and links.",
      "",
      "quality_score weights repository activity: 40% 30-day star movement, 20% commits, 15% releases, 15% contributors, 10% issue response.",
      "",
      "agent_score weights agent usefulness: 22% documentation, 24% maintenance, 20% deployment, 18% popularity, 16% community.",
      "",
      "## Recommendation Engine",
      "",
      "Recommendation results include reason, reasons, decision_summary, fit_profile, adoption_plan, risk_flags, tradeoffs, matched_constraints, unmatched_constraints, ranking_signals, confidence, and next_actions links into project, graph, alternatives, score, and compare flows.",
      "",
      "## Compare",
      "",
      "Compare responses expose summary, stats, decision_matrix, next_actions, ordered projects, winner, reasoning, and context so agents can justify project shortlist decisions.",
      "",
      "## Graph",
      "",
      "Focused graph responses expose summary, graph_stats, next_actions, relationship_groups, nodes, and edges across alternatives, related projects, dependencies, deployment targets, and use cases.",
      "",
      "## Alternatives Engine",
      "",
      "Alternatives responses expose summary, stats, next_actions, comparison_links, alternatives, and alternative_matches with fit_summary, adoption_notes, and replacement_risk so agents can move from replacement discovery into comparison, graph, score, and recommendation flows.",
      "",
      "## Atlas",
      "",
      "Atlas responses expose ecosystem stats, exploration_paths, comparison_paths, map.nodes, and map.edges so agents can move from ecosystem discovery into search, graph, alternatives, score, and compare flows.",
      "",
      "Atlas journeys expose reusable routes across ecosystems. GET /api/journeys returns journeys, journeys[].steps, comparison_paths, stats, ecosystem_id, and metadata so agents can turn a map into an ordered exploration plan.",
      "",
      "## Trends",
      "",
      "Trends responses expose summary, stats, trend_signals, category/deployment/language buckets, rising_projects, and agent_briefing so agents can understand current corpus-level direction before recommending projects.",
      "",
      "## Agent Surface Map",
      "",
      "GET /api/agent-map maps Git.Top concepts to human pages, REST endpoints, MCP tools, output fields, trust fields, and recommended use. Agents should call it when choosing between project lookup, recommendations, alternatives, graph, compare, score, Atlas, GRP, and quality surfaces.",
      "",
      "## Trust Fields",
      "",
      "- metadata.source: d1 or seed",
      "- metadata.generated_at",
      "- project.synced_at",
      "- metrics.calculated_at",
      "- classification.category/deployment/difficulty/cloudflare_ready confidence and evidence",
      "- quality_signal_confidence for stars, commits, releases, contributors",
      "",
      "## Public Discovery",
      "",
      "- /robots.txt",
      "- /sitemap.xml",
      "- /.well-known/security.txt",
      "- /integrations",
      "- /quickstart",
      "- /recipes",
      "- /journeys",
      "- /status",
      "- /quality",
      "- /coverage",
      "- /quality/review",
      "- /atlas",
      "- /api/journeys",
      "- /api/agent-map",
      "- /roadmap",
      "- /api/quickstart",
      "- /api/recipes",
      "- /api/roadmap",
      "- /llms.txt",
      "- /llms-full.txt",
      "- /openapi.json",
      "- /og.svg",
      "- /badge/:owner/:repo.svg",
      "",
      "## Topic Pages",
      "",
      "- /topics/best-mcp-servers",
      "- /topics/best-ai-agent-frameworks",
      "- /topics/cloudflare-ready-ai-projects",
      "- /topics/atlas-guide",
      "- /topics/graph-guide",
      "- /topics/project-graph-guide",
      "- /topics/recommendation-guide",
      "- /topics/git-top-score-guide",
      "- /topics/agent-workflow-guide",
      "- /topics/alternatives-engine-guide",
      "- /topics/data-trust-guide",
      "- /topics/langchain-alternatives",
      "- /topics/open-source-rag-frameworks",
      "- /topics/browser-ai-automation",
      "- /topics/ai-ide-coding-agents",
      "- /topics/project-comparison-guide",
      "- /topics/github-project-alternatives-api",
      "- /topics/open-source-quality-score-api",
      "- /atlas",
      ""
    ].join("\n"),
    "text/plain; charset=utf-8"
  );
}

interface SitemapUrl {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export async function renderSitemapXml(env: Env): Promise<Response> {
  const now = new Date().toISOString();
  const urls = mergeSitemapUrls([...staticSitemapUrls(now), ...(await projectSitemapUrls(env))]);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      ({ path, changefreq, priority, lastmod }) =>
        `  <url><loc>${escapeXml(`${siteOrigin}${path}`)}</loc><lastmod>${escapeXml(lastmod ?? now)}</lastmod><changefreq>${escapeXml(changefreq)}</changefreq><priority>${escapeXml(priority)}</priority></url>`
    )
    .join("\n")}\n</urlset>\n`;
  return text(body, "application/xml; charset=utf-8");
}

function staticSitemapUrls(now: string): SitemapUrl[] {
  return [
    { path: "/", changefreq: "daily", priority: "1.0", lastmod: now },
    { path: "/docs", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/quickstart", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/recipes", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/journeys", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/integrations", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/roadmap", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/status", changefreq: "daily", priority: "0.8", lastmod: now },
    { path: "/operations", changefreq: "daily", priority: "0.8", lastmod: now },
    { path: "/quality", changefreq: "daily", priority: "0.8", lastmod: now },
    { path: "/coverage", changefreq: "daily", priority: "0.8", lastmod: now },
    { path: "/quality/review", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/projects", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/discover", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/trends", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/workflow", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/recommend", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/graph", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/compare", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/atlas", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/atlas/cloudflare", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/atlas/agents", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/atlas/mcp", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/atlas/rag", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/atlas/browser-ai", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/agent_framework", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/mcp_server", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/rag_framework", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/coding_agent", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/cloudflare", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/docker", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/local", changefreq: "weekly", priority: "0.8", lastmod: now },
    ...compareAliasPaths().map((slug) => ({ path: `/compare/${slug}`, changefreq: "weekly", priority: "0.8", lastmod: now })),
    { path: "/compare/cloudflare-agents...langchain-ai-langchain", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/alternatives", changefreq: "weekly", priority: "0.9", lastmod: now },
    ...alternativeAliasPaths().map((slug) => ({ path: `/alternatives/${slug}`, changefreq: "weekly", priority: "0.9", lastmod: now })),
    { path: "/alternatives/langchain-ai/langchain", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/alternatives/cloudflare/agents", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/alternatives/langgenius/dify", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/alternatives/browser-use/browser-use", changefreq: "weekly", priority: "0.8", lastmod: now },
    ...graphAliasPaths().map((slug) => ({ path: `/graph/${slug}`, changefreq: "weekly", priority: "0.8", lastmod: now })),
    { path: "/graph/langchain-ai/langchain", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/graph/cloudflare/agents", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/graph/browser-use/browser-use", changefreq: "weekly", priority: "0.8", lastmod: now },
    ...scoreAliasPaths().map((slug) => ({ path: `/score/${slug}`, changefreq: "weekly", priority: "0.8", lastmod: now })),
    { path: "/score/langchain-ai/langchain", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/score/cloudflare/agents", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/score/browser-use/browser-use", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/topics/best-mcp-servers", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/best-ai-agent-frameworks", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/cloudflare-ready-ai-projects", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/atlas-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/graph-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/project-graph-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/recommendation-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/git-top-score-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/agent-workflow-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/alternatives-engine-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/data-trust-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/langchain-alternatives", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/open-source-rag-frameworks", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/browser-ai-automation", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/ai-ide-coding-agents", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/project-comparison-guide", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/github-project-alternatives-api", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/open-source-quality-score-api", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/og.svg", changefreq: "monthly", priority: "0.6", lastmod: now },
    { path: "/api/health", changefreq: "daily", priority: "0.6", lastmod: now },
    { path: "/api/search", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/trending", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/trends", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/workflow", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/quality", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/governance/summary", changefreq: "daily", priority: "0.6", lastmod: now },
    { path: "/api/governance/runs", changefreq: "daily", priority: "0.6", lastmod: now },
    { path: "/api/schema/project.v2", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/agent-map", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/quickstart", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/recipes", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/journeys", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/roadmap", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/api/openapi.json", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/openapi.json", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/mcp", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/llms.txt", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/llms-full.txt", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/robots.txt", changefreq: "monthly", priority: "0.4", lastmod: now },
    { path: "/.well-known/security.txt", changefreq: "monthly", priority: "0.4", lastmod: now }
  ];
}

async function projectSitemapUrls(env: Env): Promise<SitemapUrl[]> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  return knowledge.projects.map((item) => ({
    path: projectPath(item),
    changefreq: "weekly",
    priority: projectPriority(item),
    lastmod: projectLastModified(item)
  }));
}

function mergeSitemapUrls(urls: SitemapUrl[]): SitemapUrl[] {
  return Array.from(new Map(urls.map((url) => [url.path, url])).values());
}

function projectPath(item: ProjectKnowledge): string {
  return `/projects/${encodeURIComponent(item.project.owner)}/${encodeURIComponent(item.project.name)}`;
}

function projectPriority(item: ProjectKnowledge): string {
  if (item.agentCard.projectKind === "collection") {
    return "0.7";
  }
  if (item.metrics.gitScore >= 80 || item.metrics.maintenanceScore >= 80) {
    return "0.85";
  }
  return "0.8";
}

function projectLastModified(item: ProjectKnowledge): string {
  const candidate = item.project.pushedAt ?? item.project.updatedAt ?? item.project.syncedAt;
  return validIsoDate(candidate) ?? new Date().toISOString();
}

function validIsoDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderDocsPage(): Response {
  return html(String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Docs | API, MCP, Scoring, and Data Trust</title>
    <meta name="description" content="Git.Top documentation for REST APIs, MCP tools, scoring methodology, data freshness, and production trust signals." />
    <link rel="canonical" href="https://git.top/docs" />
    <meta property="og:title" content="Git.Top Docs" />
    <meta property="og:description" content="API, MCP, scoring methodology, data freshness, and trust documentation for the Git.Top knowledge layer." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/docs" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Docs&subtitle=API%2C%20MCP%2C%20scoring%2C%20and%20data%20trust" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Docs&subtitle=API%2C%20MCP%2C%20scoring%2C%20and%20data%20trust" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --green:#147d4f; --amber:#a15c07; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code, pre { border:1px solid var(--line); border-radius:8px; background:#f7faf9; color:#2e4c58; }
      code { padding:3px 6px; }
      pre { overflow-x:auto; padding:13px; line-height:1.5; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav,.hero,.two,.cards,.section-heading { display:grid; gap:14px; }
      .nav { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links { display:flex; gap:10px; flex-wrap:wrap; color:#40505a; font-weight:800; }
      .hero,.panel { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:860px; font-size:clamp(36px,6vw,66px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:840px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:38px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 11px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .actions,.pills { display:flex; gap:9px; flex-wrap:wrap; }
      .two { grid-template-columns:minmax(0,1fr) minmax(320px,.7fr); margin-top:14px; }
      .cards { grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; }
      .panel ul { margin:0; padding-left:20px; }
      .score { display:grid; gap:8px; border-top:1px solid var(--line); padding-top:10px; }
      .score:first-of-type { border-top:0; padding-top:0; }
      .score strong { font-size:18px; }
      @media (max-width:900px) { .two,.cards { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/">Home</a><a href="/projects">Projects</a><a href="/graph">Graph</a><a href="/mcp">MCP</a><a href="/api/agent-map">Agent Map</a><a href="/api/schema/project.v2">Schema</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Developer Documentation</p>
        <h1>API, MCP, scoring, and data trust for agent project selection.</h1>
        <p class="lead">Git.Top is an agent-native knowledge layer for GitHub repositories. It turns project metadata, repository signals, deployment hints, alternatives, and quality evidence into structured responses that agents can cite and compare.</p>
        <div class="actions">
          <a class="button primary" href="/api/search?q=cloudflare%20agent&limit=5">Try REST search</a>
          <a class="button" href="/workflow">Open workflow</a>
          <a class="button" href="/quickstart">Agent quickstart</a>
          <a class="button" href="/recipes">Agent recipes</a>
          <a class="button" href="/integrations">Integration paths</a>
          <a class="button" href="/mcp">Inspect MCP tools</a>
          <a class="button" href="/quality">Check quality governance</a>
        </div>
      </header>

      <section class="two">
        <article class="panel" id="quickstart">
          <p class="eyebrow">Agent Quickstart</p>
          <h2>Shortest path to a useful answer</h2>
          <pre>curl "https://git.top/api/search?q=cloudflare%20agent&limit=5"
curl "https://git.top/api/project/cloudflare/agents"
curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare"</pre>
          <p class="muted">Production agents should inspect <code>metadata.source</code>, <code>classification</code>, and <code>quality_signal_confidence</code> before presenting a recommendation as high-confidence.</p>
        </article>

        <aside class="panel">
          <p class="eyebrow">Public Endpoints</p>
          <div class="pills">
            <a class="pill" href="/api/health">/api/health</a>
            <a class="pill" href="/api/search">/api/search</a>
            <a class="pill" href="/api/trending">/api/trending</a>
          <a class="pill" href="/api/trends">/api/trends</a>
            <a class="pill" href="/workflow">/workflow</a>
            <a class="pill" href="/status">/status</a>
            <a class="pill" href="/quickstart">/quickstart</a>
            <a class="pill" href="/api/quickstart">/api/quickstart</a>
            <a class="pill" href="/recipes">/recipes</a>
            <a class="pill" href="/api/recipes">/api/recipes</a>
            <a class="pill" href="/integrations">/integrations</a>
            <a class="pill" href="/api/quality">/api/quality</a>
            <a class="pill" href="/api/quality/review">/api/quality/review</a>
            <a class="pill" href="/quality">/quality</a>
            <a class="pill" href="/coverage">/coverage</a>
            <a class="pill" href="/api/agent-map">/api/agent-map</a>
            <a class="pill" href="/openapi.json">/openapi.json</a>
            <a class="pill" href="/api/schema/project.v2">/api/schema/project.v2</a>
            <a class="pill" href="/llms.txt">/llms.txt</a>
            <a class="pill" href="/llms-full.txt">/llms-full.txt</a>
            <a class="pill" href="/sitemap.xml">/sitemap.xml</a>
          </div>
        </aside>
      </section>

      <section class="cards">
        <article class="panel" id="agent-map">
          <p class="eyebrow">Agent Surface Map</p>
          <h2>Human pages, REST, and MCP stay aligned</h2>
          <ul>
            <li><code>/api/agent-map</code> maps each Git.Top concept to its page, REST endpoints, MCP tools, output fields, and trust fields.</li>
            <li>Use it when deciding whether to call project lookup, recommendations, alternatives, graph, compare, score, Atlas, GRP, or quality endpoints.</li>
            <li>The same map is exposed through <code>GET /mcp</code> discovery for agent runtimes.</li>
          </ul>
        </article>

        <article class="panel" id="workflow">
          <p class="eyebrow">Agent Workflow</p>
          <h2>Turn intent into a selection path</h2>
          <ul>
            <li><code>/workflow</code> and <code>/api/workflow</code> expose a guided path from trends to shortlist, graph, alternatives, score, compare, and trust policy.</li>
            <li><code>get_agent_workflow</code>, <code>get_atlas</code>, and <code>get_quality_report</code> make workflow, Atlas, and corpus quality available through MCP.</li>
            <li>Start here when the task is broad, ambiguous, or likely to benefit from trend context before a direct recommendation.</li>
          </ul>
        </article>

        <article class="panel" id="mcp">
          <p class="eyebrow">MCP</p>
          <h2>Tools agents can call</h2>
          <ul>
            <li><code>search_projects</code> for retrieval by query, category, deployment, language, and Cloudflare readiness.</li>
            <li><code>get_project</code> for structured project knowledge and evidence.</li>
            <li><code>get_agent_workflow</code>, <code>get_atlas</code>, and <code>get_quality_report</code> for guided selection, ecosystem maps, and corpus trust.</li>
            <li><code>compare_projects</code> and <code>git_top_grp_query</code> for graph-grounded selection.</li>
          </ul>
        </article>

        <article class="panel" id="scoring">
          <p class="eyebrow">Scoring Methodology</p>
          <h2>Quality and agent score are separate</h2>
          <div class="score"><strong>Quality score</strong><p class="muted">40% 30-day stars, 20% commits, 15% releases, 15% contributors, 10% issue response.</p></div>
          <div class="score"><strong>Agent score</strong><p class="muted">22% documentation, 24% maintenance, 20% deployment, 18% popularity, 16% community.</p></div>
        </article>

        <article class="panel" id="freshness">
          <p class="eyebrow">Data Freshness</p>
          <h2>Trust the metadata, then the result</h2>
          <ul>
            <li><code>metadata.source: d1</code> means live indexed data; <code>seed</code> means fallback.</li>
            <li>Project records include <code>project.synced_at</code> and metric records include <code>metrics.calculated_at</code>.</li>
            <li><code>/status</code> renders D1 availability, sync freshness, cursor progress, and recent sync runs for operators and agents.</li>
            <li><code>/api/sync/status</code> reports freshness, sync health, cursor progress, and recent failures.</li>
          </ul>
        </article>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Evidence Model</p>
          <h2>Recommendations should be explainable</h2>
          <p class="muted">Classification evidence separates category, deployment, difficulty, and Cloudflare readiness. Quality signal confidence marks estimates, partial counts, unknown counts, and snapshot-backed star movement.</p>
        </article>
        <article class="panel" id="governance">
          <p class="eyebrow">Quality Governance</p>
          <h2>Review queues become auditable corrections</h2>
          <ul>
            <li><code>/quality/review</code> shows low-confidence classifications, collection semantics, and signal gaps.</li>
            <li><code>/coverage</code> shows corpus boundaries, category distribution, and collection representation before agents rely on broad recommendations.</li>
            <li><code>/api/quality/review</code> exposes the same backlog for agent and operator workflows.</li>
            <li><code>/api/admin/classification-overrides</code> is protected by <code>SYNC_SECRET</code> and records reviewed one-off corrections separately from generated Agent Cards.</li>
          </ul>
        </article>
      </section>

      <section class="two">
        <article class="panel" id="security">
          <p class="eyebrow">Site Trust</p>
          <h2>Production surfaces</h2>
          <ul>
            <li>Canonical host: <code>https://git.top</code></li>
            <li>Security contact: <code>security@git.top</code></li>
            <li>Machine discovery: <code>/robots.txt</code>, <code>/sitemap.xml</code>, <code>/status</code>, <code>/quality</code>, <code>/coverage</code>, <code>/llms.txt</code>, <code>/llms-full.txt</code>, <code>/.well-known/security.txt</code>, <code>/mcp</code></li>
            <li>Integration contact path: <code>/integrations</code> summarizes REST, MCP, GRP, production checks, boundaries, and security contact.</li>
          </ul>
        </article>
      </section>
    </div>
  </body>
</html>`);
}

function html(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

function text(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300"
    }
  });
}
