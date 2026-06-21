export function renderIntegrationsPage(): Response {
  return new Response(renderHtml(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function renderHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Integrations | REST, MCP, and GRP for Agent Project Intelligence</title>
    <meta name="description" content="Integrate Git.Top through REST, MCP, or Graph Reasoning Protocol for agent-native open-source project discovery, comparison, and deployment-fit checks." />
    <link rel="canonical" href="https://git.top/integrations" />
    <meta property="og:title" content="Git.Top Integrations" />
    <meta property="og:description" content="REST, MCP, and GRP integration paths for agent-native open-source project intelligence." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/integrations" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Integrations&subtitle=REST%2C%20MCP%2C%20and%20GRP%20for%20agents" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Integrations&subtitle=REST%2C%20MCP%2C%20and%20GRP%20for%20agents" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --green:#147d4f; --amber:#a15c07; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code, pre { border:1px solid var(--line); border-radius:8px; background:#f7faf9; color:#2e4c58; }
      code { padding:3px 6px; }
      pre { overflow-x:auto; padding:13px; line-height:1.5; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.pills { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:940px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:21px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:106px; }
      .metric strong { font-size:28px; line-height:1; }
      .metric span { color:var(--muted); font-weight:800; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .panel ul { margin:0; padding-left:20px; }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .ok { color:var(--green); }
      .warn { color:var(--amber); }
      @media (max-width:900px) { .metrics,.grid,.two { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/status">Status</a><a href="/coverage">Coverage</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Integrations</p>
        <h1>Use Git.Top as project intelligence inside agents and developer tools.</h1>
        <p class="lead">Git.Top exposes the same project knowledge through REST, MCP, and GRP. Use it when an agent needs to choose open-source AI projects by deployment fit, alternatives, quality signals, data confidence, and graph context.</p>
        <div class="actions">
          <a class="button primary" href="/docs#quickstart">Start quickstart</a>
          <a class="button" href="/mcp">Inspect MCP discovery</a>
          <a class="button" href="/openapi.json">OpenAPI</a>
          <a class="button" href="/status">Production status</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("REST", "/api/*", "Search, project lookup, recommendation, comparison, graph, quality, and schemas.")}
        ${metric("MCP", "/mcp", "Tool discovery and JSON-RPC tool calls for agent runtimes.")}
        ${metric("GRP", "/api/grp/query", "Goal-level graph reasoning for plans, project sets, comparisons, and stacks.")}
        ${metric("Trust", "/status", "D1 source, sync freshness, quality, and corpus coverage checks.")}
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">REST</p>
          <h2>Embed direct project intelligence</h2>
          <pre>curl "https://git.top/api/search?q=cloudflare%20agent&limit=5"
curl "https://git.top/api/project/cloudflare/agents"
curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare"</pre>
          <p class="muted">Best for product UIs, API clients, dashboards, and workflows that want typed HTTP responses.</p>
        </article>
        <article class="panel">
          <p class="eyebrow">MCP</p>
          <h2>Install as an agent tool source</h2>
          <pre>curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'</pre>
          <p class="muted">Best for clients that already speak Model Context Protocol and want tool schemas before calling.</p>
        </article>
        <article class="panel">
          <p class="eyebrow">GRP</p>
          <h2>Ask for graph-grounded plans</h2>
          <pre>curl -X POST https://git.top/api/grp/query \
  -H "content-type: application/json" \
  -d '{"goal":"build a Cloudflare-ready coding agent stack","mode":"plan","constraints":{"deploy":["cloudflare"]}}'</pre>
          <p class="muted">Best for higher-level planning where relationships, roles, alternatives, and deployment fit matter together.</p>
        </article>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Production Checklist</p>
          <h2>Checks before citing a recommendation</h2>
          <div class="rows">
            <div class="row"><strong class="ok">Confirm source metadata.</strong><span>Use <code>/status</code> or <code>/api/health</code> and prefer <code>metadata.source=d1</code>.</span></div>
            <div class="row"><strong class="ok">Inspect confidence evidence.</strong><span>Use project <code>classification</code> and <code>quality_signal_confidence</code> before presenting quality scores as authoritative.</span></div>
            <div class="row"><strong class="ok">Check corpus fit.</strong><span>Use <code>/coverage</code> when the user's task depends on broad category representation.</span></div>
            <div class="row"><strong class="warn">Fail closed when needed.</strong><span>Use <code>require_d1=true</code> on REST knowledge endpoints when seed fallback is not acceptable.</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Integration Fit</p>
          <h2>Good use cases</h2>
          <ul>
            <li>Agent project recommendation and comparison.</li>
            <li>MCP server and AI framework discovery.</li>
            <li>Cloudflare deployment-fit screening.</li>
            <li>Open-source alternatives and stack planning.</li>
            <li>Quality, freshness, and confidence checks before tool selection.</li>
          </ul>
        </aside>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Boundaries</p>
          <h2>What Git.Top is not</h2>
          <div class="rows">
            <div class="row"><strong>Not a generic GitHub leaderboard.</strong><span>Ranking is tuned for agent project selection, not raw popularity.</span></div>
            <div class="row"><strong>Not private repository indexing yet.</strong><span>The public site covers open-source repositories in the current V1 taxonomy.</span></div>
            <div class="row"><strong>Not a compliance certification source.</strong><span>Use Git.Top as structured discovery and evidence, then verify licenses, security, and deployment requirements directly.</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Contact</p>
          <h2>Integration and security paths</h2>
          <div class="rows">
            <div class="row"><strong>Security</strong><span><a href="/.well-known/security.txt">security@git.top</a></span></div>
            <div class="row"><strong>Agent docs</strong><span><a href="/llms-full.txt">llms-full.txt</a> and <a href="/docs">developer docs</a></span></div>
            <div class="row"><strong>Future fit</strong><span>Higher-limit API keys, MCP marketplace packaging, and private indexing are product directions, not active public commitments.</span></div>
          </div>
        </aside>
      </section>
    </div>
  </body>
</html>`;
}

function metric(label: string, value: string | number, note: string): string {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
