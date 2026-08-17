import { normalizeCampaignSource, recordAdoptionEvent } from "./adoption-analytics";
import type { Env } from "./types";

const endpoint = "https://git.top/mcp/core";
const verificationPrompt = "Use Git.Top to recommend three open-source browser-agent projects for Docker, then cite the data source and one caveat for each.";

export function renderConnectPage(request?: Request): Response {
  const campaignSource = request ? normalizeCampaignSource(new URL(request.url).searchParams.get("source")) : undefined;
  return new Response(renderHtml(attributedEndpoint(campaignSource)), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

export function renderConnectEvent(request: Request, env: Env): Response {
  const url = new URL(request.url);
  const client = url.searchParams.get("client");
  if (!client || !["codex", "claude", "generic", "other"].includes(client)) {
    return new Response(null, { status: 400, headers: { "cache-control": "no-store" } });
  }
  recordConnectEvent(env, client === "generic" ? "other" : client, normalizeCampaignSource(url.searchParams.get("source")));
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function recordConnectEvent(env: Env, client: string, campaignSource?: string): void {
  recordAdoptionEvent(env, { name: "connect_config_copy", clientName: client, campaignSource });
}

export function attributedEndpoint(campaignSource?: string): string {
  const normalizedSource = normalizeCampaignSource(campaignSource ?? null);
  if (!normalizedSource) {
    return endpoint;
  }
  const url = new URL(endpoint);
  // Some MCP clients normalize away query parameters but keep the URL path.
  if (/^[a-z0-9][a-z0-9._-]{0,47}$/.test(normalizedSource)) {
    url.pathname = `${url.pathname}/source/${normalizedSource}`;
  }
  url.searchParams.set("source", normalizedSource);
  return url.toString();
}

function renderHtml(mcpEndpoint: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect an AI Agent | Git.Top</title>
    <meta name="description" content="Connect Codex or Claude Code to Git.Top MCP for evidence-backed open-source project discovery and comparison." />
    <link rel="canonical" href="https://git.top/connect" />
    <style>
      :root { color-scheme: light; --ink:#18242b; --muted:#5d6b72; --line:#d8e0e2; --surface:#fff; --wash:#f4f7f7; --accent:#0c6b5e; --accent-dark:#084e46; --shadow:0 12px 30px rgba(24,36,43,.08); }
      * { box-sizing:border-box; }
      body { margin:0; background:var(--wash); color:var(--ink); font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      main { width:min(1080px,calc(100% - 32px)); margin:0 auto; padding:24px 0 64px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:28px; }
      .brand { color:var(--ink); font-weight:900; letter-spacing:.02em; text-decoration:none; }
      .nav-links { display:flex; gap:14px; flex-wrap:wrap; font-weight:800; }
      .nav-links a { color:#40505a; text-decoration:none; }
      .hero { padding:30px 0 24px; border-bottom:1px solid var(--line); }
      .eyebrow { margin:0 0 8px; color:var(--accent); font-size:12px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
      h1 { max-width:760px; margin:0; font-size:clamp(36px,6vw,64px); line-height:1.02; letter-spacing:0; }
      .lead { max-width:720px; margin:18px 0 0; color:var(--muted); font-size:20px; }
      .endpoint { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-top:24px; padding:16px; border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      code { overflow-wrap:anywhere; font:600 14px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
      button,.button { display:inline-flex; align-items:center; justify-content:center; min-height:42px; padding:9px 14px; border:1px solid var(--accent); border-radius:6px; background:var(--accent); color:#fff; cursor:pointer; font:800 14px/1.2 inherit; text-decoration:none; }
      button:hover,.button:hover { background:var(--accent-dark); }
      .section { padding:28px 0; border-bottom:1px solid var(--line); }
      .section h2 { margin:0 0 8px; font-size:26px; line-height:1.15; }
      .muted { color:var(--muted); }
      .steps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:18px; }
      .step { min-height:148px; padding:16px; border:1px solid var(--line); border-radius:8px; background:var(--surface); }
      .step strong { display:block; margin-bottom:8px; font-size:18px; }
      .step span { color:var(--muted); }
      .configs { display:grid; gap:18px; margin-top:18px; }
      .config { padding:18px; border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .config-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .config h3 { margin:0; font-size:20px; }
      .config pre { overflow:auto; margin:14px 0; padding:14px; border-radius:6px; background:#18242b; color:#eef5f3; font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
      .status { color:var(--muted); font-size:13px; }
      .note { margin:16px 0 0; padding:14px 16px; border-left:3px solid var(--accent); background:#eaf4f1; color:#24413c; }
      .prompt { margin-top:14px; padding:14px; border:1px dashed #9bb8b2; border-radius:6px; background:#f7fbfa; }
      .prompt code { display:block; margin-top:7px; color:#24413c; }
      @media (max-width:760px) { .steps { grid-template-columns:1fr; } h1 { font-size:42px; } }
    </style>
  </head>
  <body>
    <main>
      <nav class="nav" aria-label="Primary navigation">
        <a class="brand" href="/">Git.Top</a>
        <div class="nav-links"><a href="/connect">Connect</a><a href="/compatibility">Compatibility</a><a href="/mcp">MCP</a><a href="/quickstart">Quickstart</a><a href="/docs">Docs</a></div>
      </nav>
      <header class="hero">
        <p class="eyebrow">Agent connection</p>
        <h1>Give your agent better open-source project decisions.</h1>
        <p class="lead">Connect Git.Top through MCP, then search, compare, recommend, and cite open-source projects with provenance and caveats.</p>
        <div class="endpoint"><code>${mcpEndpoint}</code><button type="button" data-copy="${mcpEndpoint}" data-client="generic">Copy endpoint</button></div>
      </header>
      <section class="section">
        <h2>Three steps to first value</h2>
        <p class="muted">The core profile keeps the first connection focused. The full profile remains available at <code>https://git.top/mcp</code> for advanced graph, quality, and governance workflows.</p>
        <div class="steps">
          <div class="step"><strong>1. Add the server</strong><span>Choose a client below and add the Streamable HTTP endpoint.</span></div>
          <div class="step"><strong>2. Run the check</strong><span>Ask the agent to find projects for a real task, not just list tools.</span></div>
          <div class="step"><strong>3. Keep the evidence</strong><span>Require the agent to preserve source, confidence, and caveat fields.</span></div>
        </div>
      </section>
      <section class="section">
        <h2>Client setup</h2>
        <p class="muted">These command formats were checked against Codex CLI 0.145.0 and Claude Code 2.1.220 on 2026-07-31. See the <a href="/compatibility">compatibility report</a>; end-to-end checks must pass before a client is called supported.</p>
        <div class="configs">
          <article class="config">
            <div class="config-head"><h3>Codex CLI, app, and IDE</h3><span class="status">Production E2E verified</span></div>
            <pre id="codex-command">codex mcp add git-top --url ${mcpEndpoint}</pre>
            <button type="button" data-copy-target="codex-command" data-client="codex">Copy Codex command</button>
            <p class="muted">The equivalent project-scoped configuration is:</p>
            <pre id="codex-config">[mcp_servers.git_top]
url = "${mcpEndpoint}"
enabled_tools = ["search_projects", "get_project", "recommend_project", "compare_projects", "get_agent_workflow"]
default_tools_approval_mode = "approve"</pre>
            <button type="button" data-copy-target="codex-config" data-client="codex">Copy config.toml</button>
            <p class="muted">The approval setting is for non-interactive <code>codex exec</code> runs and applies only to the five allow-listed, read-only core tools.</p>
          </article>
          <article class="config">
            <div class="config-head"><h3>Claude Code</h3><span class="status">HTTP transport</span></div>
            <pre id="claude-command">claude mcp add --transport http --scope user git-top ${mcpEndpoint}</pre>
            <button type="button" data-copy-target="claude-command" data-client="claude">Copy Claude command</button>
            <p class="muted">Use the same endpoint in any Claude client that accepts a remote Streamable HTTP MCP server.</p>
          </article>
        </div>
        <p class="note"><strong>No credentials required.</strong> Public read-only MCP and REST calls are available without login, OAuth, API keys, or cookies. Use <code>require_d1: true</code> when seed fallback should fail closed.</p>
      </section>
      <section class="section">
        <h2>Verification prompt</h2>
        <p class="muted">Run this after connecting. A useful answer should include project names, why they fit, <code>metadata.source</code>, and at least one caveat per result.</p>
        <div class="prompt"><strong>Ask your agent:</strong><code>${verificationPrompt}</code></div>
      </section>
      <section class="section">
        <h2>Choose the next surface</h2>
        <p class="muted"><a class="button" href="/mcp">Inspect full MCP discovery</a> <a class="button" href="/api/agent-map">Open Agent Map</a> <a class="button" href="/api/trust">Check Trust Gate</a></p>
      </section>
    </main>
    <script>
      (() => {
        const endpoint = async (client) => {
          try {
            const source = new URLSearchParams(window.location.search).get('source');
            const query = new URLSearchParams({ client });
            if (source) query.set('source', source);
            const url = '/connect/event?' + query.toString();
            if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
            await fetch(url, { method: 'POST', keepalive: true, credentials: 'same-origin' });
          } catch {}
        };
        const copy = async (value, client) => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(value);
            } else {
              fallbackCopy(value);
            }
            endpoint(client);
          } catch {
            try { fallbackCopy(value); endpoint(client); } catch {}
          }
        };
        const fallbackCopy = (value) => {
          const input = document.createElement('textarea');
          input.value = value;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          input.remove();
        };
        document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copy(button.dataset.copy, button.dataset.client || 'other')));
        document.querySelectorAll('[data-copy-target]').forEach((button) => button.addEventListener('click', () => { const target = document.getElementById(button.dataset.copyTarget); if (target) copy(target.textContent || '', button.dataset.client || 'other'); }));
      })();
    </script>
  </body>
</html>`;
}
