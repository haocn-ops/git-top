import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import type { Env, ProjectKnowledge } from "./types";

const siteOrigin = "https://git.top";

export function canonicalHostRedirect(request: Request, url: URL): Response | null {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? url.hostname;
  if (host !== "www.git.top") {
    return null;
  }
  const target = new URL(request.url);
  target.hostname = "git.top";
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
      "- MCP discovery: https://git.top/mcp",
      "- OpenAPI: https://git.top/openapi.json",
      "- Project schema: https://git.top/api/schema/project.v2",
      "- Health: https://git.top/api/health",
      "- Quality: https://git.top/api/quality",
      "- Quality governance: https://git.top/quality",
      "- Low-confidence review: https://git.top/quality/review",
      "- Search: https://git.top/api/search?q=cloudflare%20agent&limit=5",
      "",
      "## Agent Guidance",
      "",
      "- Check metadata.source before making high-confidence recommendations.",
      "- Prefer metadata.source=d1 for production answers.",
      "- Inspect classification evidence and quality_signal_confidence before citing a score.",
      "- Use /mcp for JSON-RPC tools/list and tools/call.",
      "",
      "## Useful Pages",
      "",
      "- Best MCP Servers: https://git.top/topics/best-mcp-servers",
      "- Best AI Agent Frameworks: https://git.top/topics/best-ai-agent-frameworks",
      "- Cloudflare-ready AI Projects: https://git.top/topics/cloudflare-ready-ai-projects",
      "- LangChain Alternatives: https://git.top/topics/langchain-alternatives",
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
      "2. Search with /api/search or MCP search_projects.",
      "3. Fetch candidate details with /api/project/:owner/:repo or MCP get_project.",
      "4. Fetch alternatives with /api/alternatives/:owner/:repo or MCP get_alternatives.",
      "5. Compare final candidates with /api/compare or MCP compare_projects.",
      "6. Cite metadata, classification evidence, quality_signal_confidence, and freshness fields.",
      "",
      "## REST Endpoints",
      "",
      "- GET /api/health",
      "- GET /api/search?q=cloudflare%20agent&limit=5",
      "- GET /api/search?category=agent_framework&ranking=browse&limit=12",
      "- GET /api/search?deployment=cloudflare&cloudflare_ready=true&ranking=browse&limit=12",
      "- GET /api/project/cloudflare/agents",
      "- GET /api/trending?limit=10",
      "- GET /api/recommend?use_case=build%20a%20browser%20automation%20agent&deployment=docker&limit=5",
      "- GET /api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare",
      "- GET /api/alternatives/langchain-ai/langchain",
      "- GET /api/graph?repo=cloudflare/agents&limit=24",
      "- GET /api/quality",
      "- GET /api/quality/review",
      "- GET /api/sync/status",
      "- GET /api/schema/project.v2",
      "- GET /api/openapi.json",
      "- POST /api/grp/query",
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
      "## Scoring",
      "",
      "quality_score weights repository activity: 40% 30-day star movement, 20% commits, 15% releases, 15% contributors, 10% issue response.",
      "",
      "agent_score weights agent usefulness: 22% documentation, 24% maintenance, 20% deployment, 18% popularity, 16% community.",
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
      "- /quality",
      "- /quality/review",
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
      "- /topics/langchain-alternatives",
      "- /topics/open-source-rag-frameworks",
      "- /topics/github-project-alternatives-api",
      "- /topics/open-source-quality-score-api",
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
    { path: "/quality", changefreq: "daily", priority: "0.8", lastmod: now },
    { path: "/quality/review", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/projects", changefreq: "daily", priority: "0.9", lastmod: now },
    { path: "/graph", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/agent_framework", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/mcp_server", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/rag_framework", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/categories/coding_agent", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/cloudflare", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/docker", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/deployments/local", changefreq: "weekly", priority: "0.8", lastmod: now },
    { path: "/compare/cloudflare-agents...langchain-ai-langchain", changefreq: "weekly", priority: "0.7", lastmod: now },
    { path: "/topics/best-mcp-servers", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/best-ai-agent-frameworks", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/cloudflare-ready-ai-projects", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/langchain-alternatives", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/open-source-rag-frameworks", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/github-project-alternatives-api", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/topics/open-source-quality-score-api", changefreq: "weekly", priority: "0.9", lastmod: now },
    { path: "/og.svg", changefreq: "monthly", priority: "0.6", lastmod: now },
    { path: "/api/health", changefreq: "daily", priority: "0.6", lastmod: now },
    { path: "/api/search", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/trending", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/quality", changefreq: "daily", priority: "0.7", lastmod: now },
    { path: "/api/schema/project.v2", changefreq: "weekly", priority: "0.7", lastmod: now },
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
        <div class="nav-links"><a href="/">Home</a><a href="/projects">Projects</a><a href="/graph">Graph</a><a href="/mcp">MCP</a><a href="/api/schema/project.v2">Schema</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Developer Documentation</p>
        <h1>API, MCP, scoring, and data trust for agent project selection.</h1>
        <p class="lead">Git.Top is an agent-native knowledge layer for GitHub repositories. It turns project metadata, repository signals, deployment hints, alternatives, and quality evidence into structured responses that agents can cite and compare.</p>
        <div class="actions">
          <a class="button primary" href="/api/search?q=cloudflare%20agent&limit=5">Try REST search</a>
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
            <a class="pill" href="/api/quality">/api/quality</a>
            <a class="pill" href="/quality">/quality</a>
            <a class="pill" href="/api/schema/project.v2">/api/schema/project.v2</a>
            <a class="pill" href="/llms.txt">/llms.txt</a>
            <a class="pill" href="/llms-full.txt">/llms-full.txt</a>
            <a class="pill" href="/sitemap.xml">/sitemap.xml</a>
          </div>
        </aside>
      </section>

      <section class="cards">
        <article class="panel" id="mcp">
          <p class="eyebrow">MCP</p>
          <h2>Tools agents can call</h2>
          <ul>
            <li><code>search_projects</code> for retrieval by query, category, deployment, language, and Cloudflare readiness.</li>
            <li><code>get_project</code> for structured project knowledge and evidence.</li>
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
        <article class="panel" id="security">
          <p class="eyebrow">Site Trust</p>
          <h2>Production surfaces</h2>
          <ul>
            <li>Canonical host: <code>https://git.top</code></li>
            <li>Security contact: <code>security@git.top</code></li>
            <li>Machine discovery: <code>/robots.txt</code>, <code>/sitemap.xml</code>, <code>/quality</code>, <code>/llms.txt</code>, <code>/llms-full.txt</code>, <code>/.well-known/security.txt</code>, <code>/mcp</code></li>
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
