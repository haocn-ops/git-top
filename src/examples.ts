export interface AgentApiExample {
  id: string;
  title: string;
  intent: string;
  surface: "REST" | "MCP" | "GRP";
  method: "GET" | "POST";
  endpoint: string;
  command: string;
  inspect: string[];
  trustChecks: string[];
  next: string;
}

export interface AgentApiExamples {
  name: string;
  positioning: string;
  summary: string;
  examples: AgentApiExample[];
  trustPolicy: string[];
}

export function buildAgentApiExamples(): AgentApiExamples {
  return {
    name: "Git.Top Agent API Examples",
    positioning: "The Knowledge Graph of Open Source",
    summary: "Copyable REST, MCP, and GRP examples for agents that need project knowledge, recommendations, graph context, alternatives, comparisons, Atlas journeys, and production trust checks.",
    examples: [
      example(
        "health-gate",
        "Require D1-backed data",
        "Check whether production recommendations can be treated as high-confidence.",
        "REST",
        "GET",
        "/api/health",
        "curl https://git.top/api/health",
        ["db", "metadata.source", "sync_health", "sync_freshness"],
        ["metadata.source=d1", "db=available"],
        "Add require_d1=true to critical read APIs when fallback data should be rejected."
      ),
      example(
        "agent-surface-map",
        "Choose the right surface",
        "Map a user intent to the matching human page, REST endpoint, MCP tool, output fields, and trust fields.",
        "REST",
        "GET",
        "/api/agent-map",
        "curl https://git.top/api/agent-map",
        ["surfaces[].concept", "surfaces[].rest", "surfaces[].mcp_tools", "surfaces[].trust_fields"],
        ["trust_policy.high_confidence_source", "surfaces[].trust_fields"],
        "Use the selected surface before calling project lookup, recommendations, graph, alternatives, compare, score, Atlas, or quality."
      ),
      example(
        "cloudflare-agent-workflow",
        "Run a constrained selection workflow",
        "Choose a Cloudflare-ready agent framework with an explainable shortlist and trust policy.",
        "REST",
        "GET",
        "/api/workflow",
        'curl "https://git.top/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5&require_d1=true"',
        ["recommended_sequence", "shortlist", "trend_context", "trust_policy", "metadata.source"],
        ["metadata.source=d1", "shortlist[].confidence", "trust_policy.disclose_when"],
        "Inspect the top project, graph context, score explanation, and compare matrix before answering."
      ),
      example(
        "structured-recommend",
        "Recommend from structured JSON",
        "Use POST when an agent has nested constraints or wants a stable request body.",
        "REST",
        "POST",
        "/api/recommend",
        'curl -X POST "https://git.top/api/recommend?require_d1=true" -H "content-type: application/json" -d \'{"use_case":"build browser automation agents","constraints":{"deployment":"docker","category":"browser_agent"},"limit":5}\'',
        ["recommendations[].decision_summary", "recommendations[].fit_profile", "recommendations[].risk_flags", "recommendations[].ranking_signals"],
        ["metadata.source=d1", "recommendations[].confidence", "recommendations[].unmatched_constraints"],
        "Return the top fit, one credible alternative, caveats, and the data source."
      ),
      example(
        "compare-shortlist",
        "Compare candidates",
        "Turn a shortlist into a decision matrix instead of a star-only ranking.",
        "REST",
        "GET",
        "/api/compare",
        'curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain,run-llama/llama_index&deployment=cloudflare&require_d1=true"',
        ["summary", "decision_matrix", "winner", "reasoning", "next_actions"],
        ["metadata.source=d1", "context.deployment", "decision_matrix[].tradeoffs"],
        "Move into graph or score endpoints when the decision matrix needs evidence."
      ),
      example(
        "atlas-journeys",
        "Move from ecosystem map to comparison path",
        "Use Atlas journeys to turn an ecosystem into ordered exploration steps and concrete compare URLs.",
        "REST",
        "GET",
        "/api/journeys",
        "curl https://git.top/api/journeys?limit=8&require_d1=true",
        ["journeys[].steps", "comparison_paths", "comparison_paths[].api_href", "stats.comparison_path_count"],
        ["metadata.source=d1", "comparison_paths[].context", "journeys[].ecosystem_id"],
        "Run the selected comparison_paths[].api_href, then inspect score and graph evidence."
      ),
      example(
        "mcp-tools-list",
        "Discover MCP tools",
        "Inspect the available MCP tools before calling a tool by name.",
        "MCP",
        "POST",
        "/mcp",
        'curl -X POST https://git.top/mcp -H "content-type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\'',
        ["result.tools[].name", "result.tools[].inputSchema"],
        ["Use require_d1 in tool arguments for strict production reads"],
        "Pick the tool whose name matches the Agent Map concept."
      ),
      example(
        "mcp-get-project",
        "Fetch project knowledge through MCP",
        "Use MCP when an agent runtime prefers JSON-RPC tools over direct REST calls.",
        "MCP",
        "POST",
        "/mcp",
        'curl -X POST https://git.top/mcp -H "content-type: application/json" -d \'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_project","arguments":{"owner":"cloudflare","repo":"agents","require_d1":true}}}\'',
        ["result.project", "result.knowledge", "result.quality_signal_confidence", "result.metadata.source"],
        ["result.metadata.source=d1", "classification evidence", "quality_signal_confidence"],
        "Use compare_projects or get_project_graph after fetching a candidate."
      ),
      example(
        "grp-plan-stack",
        "Plan a project stack with GRP",
        "Use graph reasoning when the user asks for a plan, stack, or project set instead of one repository.",
        "GRP",
        "POST",
        "/api/grp/query",
        'curl -X POST "https://git.top/api/grp/query?require_d1=true" -H "content-type: application/json" -d \'{"goal":"compose an autonomous coding stack with MCP tools","mode":"compose","constraints":{"agent_ready":true}}\'',
        ["solution_paths", "recommended_stack", "nodes", "edges", "metadata.data_source"],
        ["metadata.data_source.source=d1", "nodes[].repo", "confidence"],
        "Validate each recommended project with /api/project, /api/score, and /api/compare."
      )
    ],
    trustPolicy: [
      "Prefer metadata.source=d1 for production recommendations.",
      "Use require_d1=true for REST or require_d1 in MCP tool arguments when fallback data should fail closed.",
      "Cite classification evidence, quality_signal_confidence, recommendation confidence, and sync freshness.",
      "Disclose degraded sync, seed fallback, low classification confidence, or partial quality signals."
    ]
  };
}

export function renderExamplesPage(): Response {
  const examples = buildAgentApiExamples();
  return new Response(renderHtml(examples), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function example(
  id: string,
  title: string,
  intent: string,
  surface: AgentApiExample["surface"],
  method: AgentApiExample["method"],
  endpoint: string,
  command: string,
  inspect: string[],
  trustChecks: string[],
  next: string
): AgentApiExample {
  return { id, title, intent, surface, method, endpoint, command, inspect, trustChecks, next };
}

function renderHtml(examples: AgentApiExamples): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top API Examples | REST, MCP, GRP</title>
    <meta name="description" content="Copyable Git.Top REST, MCP, and GRP examples for agent-native open-source project knowledge workflows." />
    <link rel="canonical" href="https://git.top/examples" />
    <meta property="og:title" content="Git.Top API Examples" />
    <meta property="og:description" content="REST, MCP, and GRP examples for using Git.Top as the Knowledge Graph of Open Source." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/examples" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20API%20Examples&subtitle=REST%2C%20MCP%2C%20GRP" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20API%20Examples&subtitle=REST%2C%20MCP%2C%20GRP" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code,pre { border:1px solid var(--line); border-radius:8px; background:#f8fbfb; color:#244855; }
      code { padding:3px 6px; }
      pre { margin:0; padding:12px; overflow:auto; white-space:pre-wrap; line-height:1.5; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tags { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.example { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:34px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:7px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:12px; margin-top:14px; }
      .examples { display:grid; gap:12px; }
      .example,.panel { display:grid; gap:12px; padding:16px; align-content:start; }
      .example-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .tag { border-radius:999px; min-height:28px; font-size:12px; color:#40505a; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      @media (max-width:900px) { .layout { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/quickstart">Quickstart</a><a href="/recipes">Recipes</a><a href="/examples">Examples</a><a href="/api/examples">JSON</a><a href="/openapi.json">OpenAPI</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">API Examples</p>
        <h1>Copyable REST, MCP, and GRP calls for agents.</h1>
        <p class="lead">${escapeHtml(examples.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/examples">Open Examples JSON</a>
          <a class="button" href="/openapi.json">OpenAPI</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
          <a class="button" href="/quickstart">Quickstart</a>
          <a class="button" href="/mcp">MCP</a>
        </div>
      </header>

      <main class="layout">
        <section class="examples">
          ${examples.examples.map(exampleCard).join("")}
        </section>
        <aside class="panel">
          <p class="eyebrow">Trust Policy</p>
          <h2>Before citing a result</h2>
          <div class="rows">${examples.trustPolicy.map(row).join("")}</div>
          <p class="eyebrow">Example Index</p>
          <div class="actions">${examples.examples.map((item) => `<a class="button" href="#${escapeAttr(item.id)}">${escapeHtml(item.title)}</a>`).join("")}</div>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function exampleCard(item: AgentApiExample): string {
  return String.raw`<article class="example" id="${escapeAttr(item.id)}">
    <div class="example-top">
      <div><p class="eyebrow">${escapeHtml(item.surface)} Example</p><h2>${escapeHtml(item.title)}</h2></div>
      <div class="tags"><span class="tag">${escapeHtml(item.method)}</span><span class="tag">${escapeHtml(item.endpoint)}</span></div>
    </div>
    <p class="muted">${escapeHtml(item.intent)}</p>
    <pre>${escapeHtml(item.command)}</pre>
    <div class="rows">
      <div class="row"><strong>Inspect</strong><span>${escapeHtml(item.inspect.join(", "))}</span></div>
      <div class="row"><strong>Trust checks</strong><span>${escapeHtml(item.trustChecks.join(", "))}</span></div>
      <div class="row"><strong>Next</strong><span>${escapeHtml(item.next)}</span></div>
    </div>
  </article>`;
}

function row(value: string): string {
  return `<div class="row"><span>${escapeHtml(value)}</span></div>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
