export type RoadmapPhaseStatus = "implemented" | "active" | "planned";

export interface RoadmapPhase {
  id: string;
  phase: number;
  title: string;
  status: RoadmapPhaseStatus;
  progress: number;
  goal: string;
  shipped: string[];
  next: string[];
  humanPages: string[];
  apiEndpoints: string[];
  mcpTools: string[];
}

export interface ProductRoadmap {
  name: string;
  positioning: string;
  summary: string;
  completion: number;
  currentFocus: string[];
  phases: RoadmapPhase[];
  agentUse: string[];
  nextMilestones: string[];
}

export function buildProductRoadmap(): ProductRoadmap {
  const phases: RoadmapPhase[] = [
    {
      id: "homepage-entry-points",
      phase: 1,
      title: "Homepage And Entry Points",
      status: "implemented",
      progress: 92,
      goal: "Make the first visit explain Git.Top's value as the knowledge layer for open source.",
      shipped: [
        "Homepage hero states The Knowledge Graph of Open Source.",
        "Discover, Compare, Alternatives, Workflow, Agent API, Score, Trust, Graph, Atlas, Recommend, and Ecosystems entry cards are live.",
        "High-value topic pages cover agents, MCP, RAG, browser automation, AI IDE, comparison, graph, score, workflow, alternatives, and trust."
      ],
      next: ["Continue adding topic pages for high-intent discovery and SEO clusters."],
      humanPages: ["/", "/discover", "/compare", "/alternatives", "/topics/project-comparison-guide"],
      apiEndpoints: ["/api/search", "/api/trends", "/api/compare", "/api/alternatives"],
      mcpTools: ["search_projects", "get_trends", "compare_projects", "get_alternatives"]
    },
    {
      id: "project-knowledge-graph",
      phase: 2,
      title: "Project Knowledge Graph",
      status: "implemented",
      progress: 88,
      goal: "Make relationship pages the core moat: related projects, alternatives, dependencies, deployments, and graph JSON.",
      shipped: [
        "Project graph pages expose overview, relationship groups, deployment targets, dependencies, related projects, alternatives, filters, and exploration paths.",
        "Graph APIs expose summary, graph stats, relationship groups, nodes, edges, and next actions.",
        "Graph guide pages explain how humans and agents should read project relationships."
      ],
      next: ["Introduce a client-side graph library only when relationship density needs richer interaction."],
      humanPages: ["/graph", "/graph/cloudflare/agents", "/topics/graph-guide", "/topics/project-graph-guide"],
      apiEndpoints: ["/api/graph/cloudflare/agents", "/api/graph?repo=cloudflare/agents"],
      mcpTools: ["get_project_graph"]
    },
    {
      id: "alternatives-engine",
      phase: 3,
      title: "Alternatives Engine",
      status: "implemented",
      progress: 86,
      goal: "Turn alternatives into an SEO and decision-support entry point.",
      shipped: [
        "Alternatives index and project alternatives pages are live.",
        "Alternative matches include fit summary, adoption notes, replacement risk, comparison links, and next actions.",
        "Matching uses explicit alternatives, category, deployment, use cases, topics, dependencies, language, maintenance, and Cloudflare readiness."
      ],
      next: ["Improve semantic similarity when vector infrastructure is introduced."],
      humanPages: ["/alternatives", "/alternatives/langchain-ai/langchain", "/topics/alternatives-engine-guide"],
      apiEndpoints: ["/api/alternatives/langchain-ai/langchain", "/api/alternatives"],
      mcpTools: ["get_alternatives", "find_alternatives"]
    },
    {
      id: "project-score",
      phase: 4,
      title: "Git.Top Score",
      status: "implemented",
      progress: 90,
      goal: "Stop relying on GitHub stars as the primary quality proxy.",
      shipped: [
        "Project pages and score pages show Git.Top Score, Agent Score, Quality Score, weighted dimensions, confidence, evidence, and risk flags.",
        "Score APIs expose dimensions, strongest and weakest dimensions, adoption guidance, related scores, next actions, and score confidence.",
        "Quality and trust pages separate release score from corpus data trust."
      ],
      next: ["Keep improving confidence evidence and reviewed overrides for flagship projects."],
      humanPages: ["/score/cloudflare/agents", "/topics/git-top-score-guide", "/quality", "/coverage"],
      apiEndpoints: ["/api/score/cloudflare/agents", "/api/quality", "/api/quality/review"],
      mcpTools: ["get_quality_score", "get_quality_report"]
    },
    {
      id: "atlas",
      phase: 5,
      title: "Atlas",
      status: "active",
      progress: 82,
      goal: "Create an exploratory map for open-source ecosystems.",
      shipped: [
        "Atlas maps are live for Cloudflare, AI Agents, MCP, RAG, and Browser AI.",
        "Atlas exposes stats, exploration paths, graph nodes, graph edges, representative projects, and journeys.",
        "Atlas Journeys is live as a human page and JSON API for turning ecosystem maps into ordered exploration routes.",
        "Atlas now exposes ecosystem-specific comparison paths so users and agents can move from a map to a decision matrix.",
        "MCP get_atlas exposes the same curated maps to agents."
      ],
      next: ["Add richer interactive graph controls when the Worker UI needs dense exploration."],
      humanPages: ["/atlas", "/journeys", "/atlas/cloudflare", "/atlas/agents", "/topics/atlas-guide"],
      apiEndpoints: ["/api/atlas", "/api/atlas/cloudflare", "/api/journeys"],
      mcpTools: ["get_atlas", "git_top_grp_query"]
    },
    {
      id: "agent-api",
      phase: 6,
      title: "Agent API",
      status: "active",
      progress: 89,
      goal: "Make Git.Top a default structured knowledge source for agents.",
      shipped: [
        "REST endpoints cover project lookup, recommendation, workflow, alternatives, graph, compare, score, trends, atlas, journeys, quality, quickstart, recipes, and agent map.",
        "MCP tools map to the same product concepts and support D1-required strict mode.",
        "llms.txt, llms-full.txt, OpenAPI, schema, Agent Map, Quickstart, Recipes, and workflow pages make the product machine-discoverable.",
        "Quickstart and Recipes now include Atlas journeys and comparison paths as first-class agent workflows.",
        "Knowledge Graph API and MCP integration guide pages now explain the human page, REST, MCP, OpenAPI, LLM discovery, output field, and trust-field pairs."
      ],
      next: ["Continue tightening OpenAPI examples, agent docs, MCP integration recipes, and production trust gates."],
      humanPages: ["/docs", "/quickstart", "/recipes", "/integrations", "/workflow", "/mcp", "/topics/open-source-knowledge-graph-api", "/topics/mcp-integration-guide", "/llms.txt"],
      apiEndpoints: ["/api/project/cloudflare/agents", "/api/recommend", "/api/workflow", "/api/quickstart", "/api/recipes", "/api/agent-map", "/openapi.json", "/mcp"],
      mcpTools: ["get_project", "recommend_project", "get_agent_workflow", "compare_projects", "get_quality_report"]
    }
  ];

  return {
    name: "Git.Top 2.0 Product Roadmap",
    positioning: "The Knowledge Graph of Open Source",
    summary: "Git.Top 2.0 is mostly through the first product cycle: the Worker-only surface now exposes human pages and agent-readable APIs for discovery, alternatives, comparison, graph reasoning, scoring, Atlas, workflow, and trust.",
    completion: Math.round(phases.reduce((sum, phase) => sum + phase.progress, 0) / phases.length),
    currentFocus: [
      "Expand high-intent topic pages and product guides.",
      "Improve Atlas exploration depth without reintroducing a separate frontend surface.",
      "Reduce data trust risk through sync freshness, classification review, and stronger alternatives evidence.",
      "Keep REST, MCP, OpenAPI, llms.txt, Agent Map, and human pages aligned."
    ],
    phases,
    agentUse: [
      "Use /api/roadmap to understand which Git.Top surfaces are production-ready for a task.",
      "Use /api/agent-map to map a product concept to the matching REST endpoint, MCP tool, output fields, and trust fields.",
      "Use /api/workflow when the agent needs a guided path from trend context to shortlist, graph, alternatives, score, compare, and trust checks.",
      "Check /api/quality and /api/health before making high-confidence production recommendations."
    ],
    nextMilestones: [
      "Add more decision-oriented topic pages for SEO and onboarding.",
      "Add richer Atlas journeys and ecosystem-specific comparison paths.",
      "Improve production data trust by shrinking stale sync and weak alternatives review queues.",
      "Extend MCP and OpenAPI examples for common agent selection workflows."
    ]
  };
}

export function renderRoadmapPage(): Response {
  const roadmap = buildProductRoadmap();

  return new Response(renderHtml(roadmap), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function renderHtml(roadmap: ProductRoadmap): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top 2.0 Roadmap | The Knowledge Graph of Open Source</title>
    <meta name="description" content="Git.Top 2.0 roadmap showing shipped product surfaces, current focus, Agent API coverage, Atlas progress, alternatives, graph, score, and trust work." />
    <link rel="canonical" href="https://git.top/roadmap" />
    <meta property="og:title" content="Git.Top 2.0 Roadmap" />
    <meta property="og:description" content="Track Git.Top's progress toward becoming the Knowledge Graph of Open Source." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/roadmap" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%202.0%20Roadmap&subtitle=Open%20Source%20Knowledge%20Graph" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%202.0%20Roadmap&subtitle=Open%20Source%20Knowledge%20Graph" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --blue:#2563eb; --green:#147d4f; --amber:#a15c07; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code { border:1px solid var(--line); border-radius:6px; background:#f8fbfb; padding:3px 6px; color:#244855; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.links { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.phase,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:108px; }
      .metric strong { font-size:30px; line-height:1; }
      .grid { display:grid; grid-template-columns:1fr 360px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .phases { display:grid; gap:12px; margin-top:14px; }
      .phase { display:grid; grid-template-columns:120px minmax(0,1fr); gap:14px; padding:16px; }
      .phase-index { display:grid; align-content:start; gap:8px; }
      .phase-number { display:inline-flex; align-items:center; justify-content:center; width:54px; height:54px; border-radius:8px; background:#e6f3ef; color:#0b5d56; font-size:24px; font-weight:950; }
      .phase-body { display:grid; gap:12px; }
      .phase-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .status { display:inline-flex; align-items:center; border-radius:999px; padding:5px 9px; font-weight:900; font-size:12px; border:1px solid var(--line); color:#40505a; }
      .status.implemented { color:var(--green); background:#effaf4; border-color:#bfe8cf; }
      .status.active { color:var(--blue); background:#eff6ff; border-color:#bfdbfe; }
      .status.planned { color:var(--amber); background:#fff7ed; border-color:#fed7aa; }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .link-list { display:flex; flex-wrap:wrap; gap:7px; }
      @media (max-width:900px) { .metrics,.grid,.phase,.columns { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/roadmap">Roadmap</a><a href="/api/roadmap">JSON</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Git.Top 2.0 Roadmap</p>
        <h1>${escapeHtml(roadmap.positioning)}</h1>
        <p class="lead">${escapeHtml(roadmap.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/roadmap">Open Roadmap JSON</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
          <a class="button" href="/workflow">Workflow</a>
          <a class="button" href="/quality">Trust</a>
          <a class="button" href="/atlas">Atlas</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Overall completion", `${roadmap.completion}/100`, "Average progress across the six 2.0 product phases.")}
        ${metric("Implemented phases", roadmap.phases.filter((phase) => phase.status === "implemented").length, "Core public surfaces that are live on the Worker.")}
        ${metric("Active phases", roadmap.phases.filter((phase) => phase.status === "active").length, "Areas still being deepened through iteration.")}
        ${metric("Worker surface", "1", "Worker remains the only product surface.")}
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">Current Focus</p>
          <h2>What continues next</h2>
          <div class="rows">${roadmap.currentFocus.map(row).join("")}</div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Agent Use</p>
          <h2>How agents should read this</h2>
          <div class="rows">${roadmap.agentUse.map(row).join("")}</div>
        </aside>
      </section>

      <section class="phases">
        ${roadmap.phases.map(phaseCard).join("")}
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">Next Milestones</p>
          <h2>Remaining product work</h2>
          <div class="rows">${roadmap.nextMilestones.map(row).join("")}</div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Machine-readable</p>
          <h2>Use the JSON version</h2>
          <p class="muted">The roadmap JSON keeps phase status, shipped surfaces, remaining work, human pages, REST endpoints, and MCP tools in one stable structure.</p>
          <div class="links"><a class="button" href="/api/roadmap">/api/roadmap</a><a class="button" href="/llms.txt">/llms.txt</a></div>
        </aside>
      </section>
    </div>
  </body>
</html>`;
}

function phaseCard(phase: RoadmapPhase): string {
  return `<article class="phase">
    <div class="phase-index">
      <span class="phase-number">${phase.phase}</span>
      <span class="status ${escapeAttr(phase.status)}">${escapeHtml(phase.status)}</span>
      <div class="bar" aria-label="${phase.progress}% complete"><span style="width:${phase.progress}%"></span></div>
      <p class="muted">${phase.progress}/100</p>
    </div>
    <div class="phase-body">
      <div class="phase-top"><div><p class="eyebrow">${escapeHtml(phase.id)}</p><h2>${escapeHtml(phase.title)}</h2></div></div>
      <p class="muted">${escapeHtml(phase.goal)}</p>
      <div class="columns">
        <div class="panel"><p class="eyebrow">Shipped</p><div class="rows">${phase.shipped.map(row).join("")}</div></div>
        <div class="panel"><p class="eyebrow">Next</p><div class="rows">${phase.next.map(row).join("")}</div></div>
      </div>
      <div class="columns">
        ${linkPanel("Human Pages", phase.humanPages)}
        ${linkPanel("APIs And MCP", [...phase.apiEndpoints, ...phase.mcpTools.map((tool) => `MCP ${tool}`)])}
      </div>
    </div>
  </article>`;
}

function metric(label: string, value: string | number, note: string): string {
  return `<article class="metric"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function row(value: string): string {
  return `<div class="row"><strong>${escapeHtml(value)}</strong></div>`;
}

function linkPanel(title: string, values: string[]): string {
  return `<div class="panel"><p class="eyebrow">${escapeHtml(title)}</p><div class="link-list">${values.map(linkPill).join("")}</div></div>`;
}

function linkPill(value: string): string {
  if (value.startsWith("/")) {
    return `<a class="pill" href="${escapeAttr(value)}">${escapeHtml(value)}</a>`;
  }
  return `<span class="pill">${escapeHtml(value)}</span>`;
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
