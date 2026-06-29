export interface QuickstartStep {
  id: string;
  title: string;
  purpose: string;
  rest?: string;
  mcpTool?: string;
  command: string;
  inspect: string[];
  next: string;
}

export interface AgentQuickstart {
  name: string;
  positioning: string;
  summary: string;
  productionEndpoints: {
    rest: string;
    mcp: string;
    grp: string;
  };
  steps: QuickstartStep[];
  outputPattern: string[];
  trustPolicy: string[];
}

export function buildAgentQuickstart(): AgentQuickstart {
  return {
    name: "Git.Top Agent Quickstart",
    positioning: "The Knowledge Graph of Open Source",
    summary: "A short, production-oriented path for agents and developers to move from health checks to workflow, project knowledge, recommendations, comparison, MCP, GRP, and trust evidence.",
    productionEndpoints: {
      rest: "https://git.top/api/*",
      mcp: "https://git.top/mcp",
      grp: "https://git.top/api/grp/query"
    },
    steps: [
      {
        id: "check-data-source",
        title: "Check Data Source",
        purpose: "Verify production data is D1-backed before making a high-confidence recommendation.",
        rest: "GET /api/health",
        command: "curl https://git.top/api/health",
        inspect: ["db=available", "metadata.source=d1", "metadata.reason=d1_query", "sync_freshness"],
        next: "Use require_d1=true on critical REST calls when an agent should fail closed instead of accepting seed fallback."
      },
      {
        id: "choose-workflow",
        title: "Choose A Workflow",
        purpose: "Use a guided path when the task spans trends, recommendations, graph, alternatives, score, compare, and trust checks.",
        rest: "GET /api/workflow",
        mcpTool: "get_agent_workflow",
        command: 'curl "https://git.top/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5"',
        inspect: ["recommended_sequence", "shortlist", "trend_context", "agent_map", "trust_policy"],
        next: "Start here for broad or ambiguous project-selection tasks."
      },
      {
        id: "inspect-surface-map",
        title: "Inspect The Surface Map",
        purpose: "Map each Git.Top product concept to the human page, REST endpoint, MCP tool, output fields, and trust fields.",
        rest: "GET /api/agent-map",
        command: "curl https://git.top/api/agent-map",
        inspect: ["surfaces[].concept", "surfaces[].rest", "surfaces[].mcp_tools", "surfaces[].trust_fields"],
        next: "Use this before guessing whether to call recommendations, alternatives, graph, compare, score, Atlas, GRP, or quality endpoints."
      },
      {
        id: "search-projects",
        title: "Search Projects",
        purpose: "Retrieve candidate projects by query, category, deployment, language, project kind, and Cloudflare readiness.",
        rest: "GET /api/search",
        mcpTool: "search_projects",
        command: 'curl "https://git.top/api/search?category=agent_framework&deployment=cloudflare&ranking=browse&limit=10"',
        inspect: ["projects[].repo", "projects[].project_kind", "projects[].collection_metadata", "metadata.source"],
        next: "Use browse ranking for category discovery and query search for direct retrieval."
      },
      {
        id: "inspect-project",
        title: "Inspect One Project",
        purpose: "Fetch structured project knowledge before recommending, comparing, or citing a repository.",
        rest: "GET /api/project/:project",
        mcpTool: "get_project",
        command: "curl https://git.top/api/project/cloudflare/agents",
        inspect: ["knowledge.agent_card.classification", "quality_signal_confidence", "score", "related", "metadata.source"],
        next: "Check classification evidence before saying a project is Cloudflare-ready or production-fit."
      },
      {
        id: "recommend",
        title: "Ask For A Recommendation",
        purpose: "Turn a concrete use case and constraints into an explainable shortlist.",
        rest: "GET /api/recommend",
        mcpTool: "recommend_project",
        command: 'curl "https://git.top/api/recommend?use_case=build%20a%20browser%20automation%20agent&deployment=docker&limit=5"',
        inspect: ["recommendations[].decision_summary", "fit_profile", "adoption_plan", "risk_flags", "confidence"],
        next: "Present the top project, one alternative, caveats, and metadata source."
      },
      {
        id: "compare",
        title: "Compare Candidates",
        purpose: "Use decision matrices instead of raw star counts when the user already has candidates.",
        rest: "GET /api/compare",
        mcpTool: "compare_projects",
        command: 'curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain,run-llama/llama_index&deployment=cloudflare"',
        inspect: ["summary", "decision_matrix", "winner", "reasoning", "next_actions"],
        next: "Move from comparison into graph, alternatives, score, or project pages before finalizing."
      },
      {
        id: "quality",
        title: "Check Trust And Coverage",
        purpose: "Inspect release score, corpus data trust, coverage, stale data, and review risk before high-confidence answers.",
        rest: "GET /api/quality",
        mcpTool: "get_quality_report",
        command: "curl https://git.top/api/quality",
        inspect: ["release_score", "data_trust_score", "risk_level", "coverage", "issues", "metadata.source"],
        next: "Disclose degraded sync, seed fallback, low classification confidence, or partial quality signals."
      },
      {
        id: "grp",
        title: "Use GRP For Goal-Level Planning",
        purpose: "Use graph reasoning when the user asks for a plan, stack, comparison, or project set.",
        rest: "POST /api/grp/query",
        mcpTool: "git_top_grp_query",
        command: 'curl -X POST https://git.top/api/grp/query -H "content-type: application/json" -d \'{"goal":"build a Cloudflare-ready coding agent stack","mode":"plan","constraints":{"deploy":["cloudflare"],"agent_ready":true}}\'',
        inspect: ["solution_paths", "recommended_stack", "nodes", "edges", "metadata.data_source"],
        next: "Use GRP output as a plan, then fetch project, graph, score, and compare details for the final answer."
      }
    ],
    outputPattern: [
      "Recommended repository.",
      "Why it matches the task.",
      "Deployment or runtime caveats.",
      "One credible alternative.",
      "Data source and confidence evidence."
    ],
    trustPolicy: [
      "Prefer metadata.source=d1 for production answers.",
      "Disclose metadata.source=seed as fallback mode.",
      "Check classification evidence before claiming deployment fit.",
      "Check quality_signal_confidence before citing score-driven claims.",
      "Use /api/quality, /api/health, and /api/sync/status when corpus freshness or confidence matters."
    ]
  };
}

export function renderQuickstartPage(): Response {
  const quickstart = buildAgentQuickstart();
  return new Response(renderHtml(quickstart), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function renderHtml(quickstart: AgentQuickstart): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Agent Quickstart | REST, MCP, GRP, and Trust Checks</title>
    <meta name="description" content="Agent quickstart for Git.Top: health, workflow, agent map, search, project lookup, recommendation, compare, quality, MCP, and GRP." />
    <link rel="canonical" href="https://git.top/quickstart" />
    <meta property="og:title" content="Git.Top Agent Quickstart" />
    <meta property="og:description" content="Use Git.Top as the Knowledge Graph of Open Source through REST, MCP, GRP, and trust checks." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/quickstart" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Agent%20Quickstart&subtitle=REST%2C%20MCP%2C%20GRP%2C%20Trust" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Agent%20Quickstart&subtitle=REST%2C%20MCP%2C%20GRP%2C%20Trust" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --blue:#2563eb; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
      .nav-links,.actions,.links { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.step,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:102px; }
      .metric strong { font-size:22px; line-height:1.1; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:12px; margin-top:14px; }
      .steps { display:grid; gap:12px; }
      .step { display:grid; gap:12px; padding:16px; }
      .step-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .tag-list { display:flex; flex-wrap:wrap; gap:7px; }
      .tag { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; min-height:28px; padding:5px 8px; font-size:12px; font-weight:900; color:#40505a; background:#fff; }
      @media (max-width:900px) { .metrics,.layout { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/quickstart">Quickstart</a><a href="/workflow">Workflow</a><a href="/api/quickstart">JSON</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Agent Quickstart</p>
        <h1>Use Git.Top as the Knowledge Graph of Open Source.</h1>
        <p class="lead">${escapeHtml(quickstart.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/quickstart">Open Quickstart JSON</a>
          <a class="button" href="/api/health">Check Health</a>
          <a class="button" href="/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&amp;deployment=cloudflare&amp;category=agent_framework&amp;cloudflare_ready=true&amp;limit=5">Try Workflow</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
          <a class="button" href="/api/quality">Quality</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("REST", quickstart.productionEndpoints.rest, "Structured project knowledge, recommendations, graph, compare, quality, and roadmap.")}
        ${metric("MCP", quickstart.productionEndpoints.mcp, "JSON-RPC discovery and tools for agent runtimes.")}
        ${metric("GRP", quickstart.productionEndpoints.grp, "Goal-level graph reasoning for plans, stacks, comparisons, and project sets.")}
      </section>

      <main class="layout">
        <section class="steps">
          ${quickstart.steps.map(stepCard).join("")}
        </section>
        <aside class="panel">
          <p class="eyebrow">Answer Pattern</p>
          <h2>What an agent should return</h2>
          <div class="rows">${quickstart.outputPattern.map(row).join("")}</div>
          <p class="eyebrow">Trust Policy</p>
          <div class="rows">${quickstart.trustPolicy.map(row).join("")}</div>
          <div class="links"><a class="button" href="/llms.txt">llms.txt</a><a class="button" href="/openapi.json">OpenAPI</a><a class="button" href="/roadmap">Roadmap</a></div>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function stepCard(step: QuickstartStep): string {
  return `<article class="step" id="${escapeAttr(step.id)}">
    <div class="step-top">
      <div><p class="eyebrow">${escapeHtml(step.id)}</p><h2>${escapeHtml(step.title)}</h2></div>
      <div class="tag-list">${step.rest ? `<span class="tag">${escapeHtml(step.rest)}</span>` : ""}${step.mcpTool ? `<span class="tag">MCP ${escapeHtml(step.mcpTool)}</span>` : ""}</div>
    </div>
    <p class="muted">${escapeHtml(step.purpose)}</p>
    <pre>${escapeHtml(step.command)}</pre>
    <div class="tag-list">${step.inspect.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
    <p class="muted">${escapeHtml(step.next)}</p>
  </article>`;
}

function metric(label: string, value: string, note: string): string {
  return `<article class="metric"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function row(value: string): string {
  return `<div class="row"><strong>${escapeHtml(value)}</strong></div>`;
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
