export function renderExplorer(options: { page?: "home" | "projects" } = {}): Response {
  return new Response(options.page === "projects" ? projectsHtml() : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

export function renderGraph(): Response {
  return new Response(graphHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

const html = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top | The Knowledge Graph of Open Source</title>
    <meta name="description" content="Open-source project knowledge graph for discovery, comparisons, alternatives, ecosystems, scores, and agent-readable recommendations." />
    <link rel="canonical" href="https://git.top/" />
    <meta property="og:title" content="Git.Top | The Knowledge Graph of Open Source" />
    <meta property="og:description" content="Open-source project knowledge graph for discovery, comparisons, alternatives, ecosystems, scores, and agent-readable recommendations." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/" />
    <meta property="og:image" content="https://git.top/og.svg" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f8fb;
        --surface: #ffffff;
        --surface-soft: #f1f5f3;
        --ink: #182026;
        --muted: #66737c;
        --line: #dce3e8;
        --line-strong: #c8d3da;
        --teal: #0f766e;
        --teal-dark: #0b5d56;
        --green: #147d4f;
        --amber: #a15c07;
        --shadow: 0 16px 40px rgba(17, 24, 39, 0.08);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      html {
        overflow-x: hidden;
      }

      body {
        margin: 0;
        min-width: 320px;
        min-height: 100vh;
        background: var(--bg);
        color: var(--ink);
        overflow-x: hidden;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      button,
      input,
      select {
        font: inherit;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      code {
        display: inline-block;
        max-width: 100%;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: #f7faf9;
        color: #2e4c58;
        overflow-wrap: anywhere;
        padding: 4px 6px;
      }

      .page {
        max-width: 1240px;
        width: 100%;
        margin: 0 auto;
        padding: 22px;
      }

      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 900;
      }

      .brand-mark,
      .feature-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: #e6f3ef;
        color: var(--teal);
      }

      .nav-links {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
        color: #40505a;
        font-weight: 800;
      }

      .nav-links a {
        white-space: nowrap;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
        gap: 14px;
        min-height: 430px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background:
          linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(255, 255, 255, 0.88)),
          linear-gradient(45deg, #f9fbfb, #eef5f8);
        box-shadow: var(--shadow);
        padding: 24px;
      }

      .hero-copy {
        display: grid;
        align-content: center;
        gap: 18px;
      }

      .eyebrow {
        color: var(--teal-dark);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        max-width: 780px;
        font-size: clamp(40px, 6vw, 76px);
        line-height: 0.98;
        letter-spacing: 0;
      }

      h2 {
        font-size: 20px;
        line-height: 1.2;
      }

      h3 {
        font-size: 22px;
        line-height: 1.1;
      }

      .hero-lede,
      .muted {
        color: #40505a;
        line-height: 1.55;
      }

      .hero-lede {
        max-width: 760px;
        font-size: 18px;
      }

      .actions,
      .section-heading,
      .search-form {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        border: 1px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 900;
        padding: 9px 12px;
      }

      .button.primary {
        border-color: var(--teal);
        background: var(--teal);
        color: #fff;
      }

      .button.secondary {
        border-color: var(--line-strong);
        background: var(--surface);
        color: var(--ink);
      }

      .knowledge-preview,
      .panel,
      .project-card,
      .category-chip,
      .graph-node {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      .knowledge-preview {
        display: grid;
        align-content: space-between;
        gap: 16px;
        min-width: 0;
        background: rgba(255, 255, 255, 0.82);
        padding: 18px;
      }

      .preview-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        min-width: 0;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        border: 1px solid #b7dfcc;
        border-radius: 999px;
        background: #eefaf4;
        color: var(--green);
        font-size: 12px;
        font-weight: 900;
        padding: 5px 9px;
        white-space: nowrap;
      }

      .knowledge-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .knowledge-grid div {
        display: grid;
        gap: 8px;
        min-height: 110px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fbfdfd;
        padding: 14px;
      }

      .knowledge-grid span,
      .project-card p,
      .signal-row span,
      .score-pair span {
        color: var(--muted);
      }

      .knowledge-grid strong {
        font-size: 20px;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .category-strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        margin: 22px 0;
        padding-bottom: 2px;
      }

      .intent-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .intent-card {
        display: grid;
        align-content: start;
        gap: 14px;
        min-height: 330px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
        padding: 16px;
      }

      .intent-card-top {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
      }

      .intent-links {
        display: grid;
        gap: 8px;
        margin-top: auto;
      }

      .intent-links a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 34px;
        border-top: 1px solid var(--line);
        color: #33525a;
        font-size: 14px;
        font-weight: 900;
        line-height: 1.25;
        padding-top: 8px;
      }

      .intent-links span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .intent-links a:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .category-chip {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        min-height: 38px;
        color: #33525a;
        font-weight: 900;
        padding: 8px 11px;
      }

      .section-heading {
        justify-content: space-between;
        margin: 20px 0 12px;
      }

      .project-card-grid,
      .agent-grid,
      .trust-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .agent-grid,
      .trust-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 22px;
      }

      .project-card,
      .panel {
        display: grid;
        gap: 14px;
        padding: 16px;
      }

      .project-card {
        min-height: 340px;
      }

      .project-summary {
        display: grid;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--line);
      }

      .project-summary h4 {
        font-size: 16px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .project-summary .summary-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .summary-pill {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #f7faf9;
        color: #40505a;
        font-size: 12px;
        font-weight: 900;
        padding: 4px 8px;
      }

      .summary-pill.good {
        border-color: #b7dfcc;
        background: #eefaf4;
        color: var(--green);
      }

      .summary-pill.warn {
        border-color: #ead2a7;
        background: #fff9ec;
        color: var(--amber);
      }

      .project-summary .summary-list {
        display: grid;
        gap: 6px;
      }

      .project-summary .summary-list div {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .project-summary .summary-list span {
        color: var(--muted);
      }

      .project-card-top,
      .score-pair,
      .graph-section {
        display: grid;
        gap: 8px;
      }

      .project-card-top {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
      }

      .project-card h3,
      .project-card a,
      .project-card p {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .project-card p {
        line-height: 1.5;
      }

      .signal-row {
        display: grid;
        gap: 4px;
      }

      .signal-row strong {
        overflow-wrap: anywhere;
      }

      .score-pair {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: auto;
      }

      .score-pair div {
        display: grid;
        gap: 4px;
        border-top: 1px solid var(--line);
        padding-top: 10px;
      }

      .score-pair strong {
        font-size: 26px;
        line-height: 1;
      }

      .feature-icon {
        width: 42px;
        height: 42px;
      }

      .search-panel {
        margin-top: 22px;
      }

      .search-status {
        color: var(--muted);
        font-size: 13px;
        font-weight: 800;
        line-height: 1.45;
      }

      .doc-panel {
        margin-top: 22px;
      }

      .link-list {
        display: grid;
        gap: 9px;
      }

      .link-list a,
      .link-list span {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        border-top: 1px solid var(--line);
        color: #40505a;
        font-weight: 800;
        padding-top: 9px;
      }

      .link-list a:first-child,
      .link-list span:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .guide-strip {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 10px;
        margin-top: 22px;
      }

      .guide-strip a {
        display: grid;
        align-content: center;
        min-height: 72px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
        color: #33525a;
        font-weight: 900;
        padding: 11px;
      }

      .agent-rail {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .agent-rail a {
        display: grid;
        gap: 5px;
        min-height: 74px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
        padding: 12px;
      }

      .agent-rail span {
        color: var(--muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .agent-rail strong {
        color: #33525a;
        overflow-wrap: anywhere;
      }

      .search-form input,
      .search-form select {
        flex: 1 1 320px;
        min-width: 0;
        min-height: 40px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        background: #fff;
        color: var(--ink);
        padding: 9px 10px;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(130px, 1fr));
        gap: 10px;
        width: 100%;
        margin-top: 10px;
      }

      .filter-field,
      .checkbox-row {
        display: grid;
        gap: 5px;
      }

      .filter-field span,
      .checkbox-row span,
      .match-reasons span {
        color: var(--muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .checkbox-row {
        align-content: end;
      }

      .checkbox-row label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        background: #fff;
        color: #40505a;
        font-weight: 900;
        padding: 8px 10px;
      }

      .checkbox-row input {
        width: 18px;
        height: 18px;
      }

      .match-reasons {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .match-reasons span {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #f7faf9;
        color: #40505a;
        padding: 5px 8px;
      }

      .graph-section {
        grid-template-columns: 280px minmax(0, 1fr);
        align-items: center;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        margin-top: 22px;
        padding: 18px 0;
      }

      .graph-lines {
        display: grid;
        grid-template-columns: 1.2fr repeat(5, minmax(120px, 1fr));
        gap: 8px;
        overflow-x: auto;
      }

      .graph-node {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 120px;
        min-height: 46px;
        color: #40505a;
        font-weight: 900;
        padding: 9px 10px;
      }

      .graph-node.root {
        background: #e9f4f1;
        color: var(--teal-dark);
      }

      .empty {
        border: 1px dashed var(--line);
        border-radius: 8px;
        background: #fff;
        color: var(--muted);
        padding: 18px;
      }

      @media (max-width: 1060px) {
        .hero,
        .graph-section {
          grid-template-columns: 1fr;
        }

        .project-card-grid,
        .agent-rail,
        .intent-grid,
        .agent-grid,
        .trust-grid,
        .guide-strip,
        .filter-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 700px) {
        .page {
          padding: 16px;
        }

        .nav {
          align-items: flex-start;
        }

        .nav-links {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          justify-content: stretch;
        }

        .nav-links a {
          min-height: 34px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.72);
          overflow: hidden;
          text-align: center;
          text-overflow: ellipsis;
          padding: 7px 8px;
        }

        .hero {
          min-height: auto;
          padding: 18px;
        }

        h1 {
          font-size: 38px;
        }

        .actions .button {
          flex: 1 1 100%;
        }

        .knowledge-grid,
        .agent-rail,
        .project-card-grid,
        .intent-grid,
        .agent-grid,
        .trust-grid,
        .guide-strip,
        .filter-grid {
          grid-template-columns: 1fr;
        }
      }

      .intent-card:nth-child(n + 4) {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav" aria-label="Main navigation">
        <a class="brand" href="/">
          <span class="brand-mark">G</span>
          <span>Git.Top</span>
        </a>
        <div class="nav-links">
          <a href="/atlas">Atlas</a>
          <a href="/recommend">Recommend</a>
          <a href="/trends">Trends</a>
          <a href="/graph">Graph</a>
          <a href="/docs">Docs</a>
          <a href="/mcp">MCP</a>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Open Source Knowledge Graph</p>
          <h1>The Knowledge Graph of Open Source</h1>
          <p class="hero-lede">GitHub provides the code. Git.Top provides the knowledge: project meaning, alternatives, dependencies, ecosystems, scores, and agent-readable recommendations.</p>
          <div class="actions">
            <a class="button primary" href="/discover">Discover Projects</a>
            <a class="button secondary" href="/recommend">Get Recommendations</a>
            <a class="button secondary" href="/compare">Compare Projects</a>
          </div>
          <div class="agent-rail" aria-label="Agent entry points">
            <a href="/quickstart"><span>Fast start</span><strong>Quickstart + trust checks</strong></a>
            <a href="/api/agent-map"><span>Surface map</span><strong>REST, MCP, output fields</strong></a>
            <a href="/trust"><span>Trust gate</span><strong>Production readiness</strong></a>
          </div>
        </div>

        <div class="knowledge-preview" aria-label="Agent knowledge preview">
          <div class="preview-toolbar">
            <span class="status-pill">Agent friendly</span>
            <code>GET /api/project/cloudflare/agents</code>
          </div>
          <div class="knowledge-grid">
            <div><span>What</span><strong>Cloudflare-native agent framework</strong></div>
            <div><span>Source</span><strong>D1-backed</strong></div>
            <div><span>Install</span><strong>Cloudflare Workers deployment path</strong></div>
            <div><span>Trust</span><strong>Trust gate + quality signals</strong></div>
            <div><span>Next</span><strong>Quickstart, Agent Map, Project JSON</strong></div>
          </div>
        </div>
      </section>

      <section class="intent-grid" aria-label="Git.Top product entry points">
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">DIS</div><div><p class="eyebrow">Find what is rising</p><h2>Discover</h2></div></div>
          <p class="muted">Explore hot open-source categories by intent, not repo names.</p>
          <div class="intent-links">
            <a href="/topics/best-ai-agent-frameworks"><span>AI Agents</span><span>-></span></a>
            <a href="/topics/best-mcp-servers"><span>MCP Servers</span><span>-></span></a>
            <a href="/topics/open-source-rag-frameworks"><span>RAG</span><span>-></span></a>
            <a href="/topics/browser-ai-automation"><span>Browser Automation</span><span>-></span></a>
            <a href="/topics/ai-ide-coding-agents"><span>AI IDE</span><span>-></span></a>
            <a href="/topics/open-source-llm-gateways"><span>LLM Gateways</span><span>-></span></a>
            <a href="/topics/ai-observability-tools"><span>AI Observability</span><span>-></span></a>
            <a href="/topics/ai-workflow-automation"><span>Workflow Automation</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">CMP</div><div><p class="eyebrow">Decide between projects</p><h2>Compare</h2></div></div>
          <p class="muted">Compare open-source tools by deployability, maintenance, fit, and score.</p>
          <div class="intent-links">
            <a href="/compare/langchain-ai/langchain...run-llama/llama_index"><span>LangChain vs LlamaIndex</span><span>-></span></a>
            <a href="/compare/browser-use/browser-use...microsoft/playwright"><span>Browser Use vs Playwright</span><span>-></span></a>
            <a href="/topics/project-comparison-guide"><span>Project Comparison Guide</span><span>-></span></a>
            <a href="/alternatives"><span>Browse Alternatives</span><span>-></span></a>
            <a href="/api/compare?repos=openai/openai-agents-python,vercel/ai"><span>OpenAI Agents SDK vs Vercel AI SDK</span><span>-></span></a>
            <a href="/api/compare?repos=langgenius/dify,langflow-ai/langflow"><span>Dify vs Langflow</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">REC</div><div><p class="eyebrow">Pick by fit</p><h2>Recommend</h2></div></div>
          <p class="muted">Turn a use case and deployment constraints into an explainable shortlist.</p>
          <div class="intent-links">
            <a href="/recommend"><span>Recommendation Engine</span><span>-></span></a>
            <a href="/recommend?use_case=build%20Cloudflare-ready%20AI%20agents&amp;deployment=cloudflare&amp;category=agent_framework&amp;cloudflare_ready=true"><span>Cloudflare Agents</span><span>-></span></a>
            <a href="/recommend?use_case=build%20browser%20automation%20agents&amp;deployment=docker&amp;category=browser_agent"><span>Browser Agents</span><span>-></span></a>
            <a href="/recommend?use_case=build%20RAG%20applications&amp;deployment=local&amp;category=rag_framework"><span>RAG Stack</span><span>-></span></a>
            <a href="/topics/recommendation-guide"><span>Recommendation Guide</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">FLW</div><div><p class="eyebrow">Guide the agent</p><h2>Workflow</h2></div></div>
          <p class="muted">Move from intent to trend context, shortlist, graph, alternatives, score, compare, and trust checks.</p>
          <div class="intent-links">
            <a href="/workflow"><span>Agent Selection Workflow</span><span>-></span></a>
            <a href="/topics/agent-workflow-guide"><span>Agent Workflow Guide</span><span>-></span></a>
            <a href="/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&amp;deployment=cloudflare&amp;category=agent_framework&amp;cloudflare_ready=true"><span>Cloudflare Agent Workflow</span><span>-></span></a>
            <a href="/workflow?intent=evaluate%20Claude%20Code%20alternatives&amp;project_id=claude-code&amp;deployment=local"><span>Claude Code Alternatives</span><span>-></span></a>
            <a href="/api/workflow?intent=choose%20a%20RAG%20framework&amp;category=rag_framework&amp;deployment=local"><span>Workflow JSON</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">API</div><div><p class="eyebrow">Serve agents</p><h2>Agent API</h2></div></div>
          <p class="muted">Expose project knowledge, relationship maps, recommendations, scores, and trust fields to agents.</p>
          <div class="intent-links">
            <a href="/topics/open-source-knowledge-graph-api"><span>Knowledge Graph API Guide</span><span>-></span></a>
            <a href="/topics/mcp-integration-guide"><span>MCP Integration Guide</span><span>-></span></a>
            <a href="/api/agent-map"><span>Agent Surface Map</span><span>-></span></a>
            <a href="/openapi.json"><span>OpenAPI JSON</span><span>-></span></a>
            <a href="/examples"><span>API Examples</span><span>-></span></a>
            <a href="/mcp"><span>MCP Discovery</span><span>-></span></a>
            <a href="/llms.txt"><span>LLM Discovery</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">SCR</div><div><p class="eyebrow">Trust the signal</p><h2>Score</h2></div></div>
          <p class="muted">Read project quality, agent readiness, freshness, and risk before choosing.</p>
          <div class="intent-links">
            <a href="/topics/git-top-score-guide"><span>Git.Top Score Guide</span><span>-></span></a>
            <a href="/score/cloudflare/agents"><span>Cloudflare Agents Score</span><span>-></span></a>
            <a href="/score/langchain-ai/langchain"><span>LangChain Score</span><span>-></span></a>
            <a href="/api/quality"><span>Quality API</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">TRU</div><div><p class="eyebrow">Check readiness</p><h2>Trust</h2></div></div>
          <p class="muted">Inspect corpus coverage, sync freshness, governance, and low-confidence review queues.</p>
          <div class="intent-links">
            <a href="/trust"><span>Trust Gate</span><span>-></span></a>
            <a href="/topics/trust-gate-guide"><span>Trust Gate Guide</span><span>-></span></a>
            <a href="/api/trust"><span>Trust Gate JSON</span><span>-></span></a>
            <a href="/topics/data-trust-guide"><span>Data Trust Guide</span><span>-></span></a>
            <a href="/quality"><span>Quality Governance</span><span>-></span></a>
            <a href="/coverage"><span>Corpus Coverage</span><span>-></span></a>
            <a href="/status"><span>Status</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">ATL</div><div><p class="eyebrow">Map the ecosystem</p><h2>Atlas</h2></div></div>
          <p class="muted">Navigate ecosystems as connected project maps instead of isolated lists.</p>
          <div class="intent-links">
            <a href="/atlas"><span>Atlas Home</span><span>-></span></a>
            <a href="/journeys"><span>Atlas Journeys</span><span>-></span></a>
            <a href="/topics/atlas-journey-guide"><span>Atlas Journey Guide</span><span>-></span></a>
            <a href="/topics/atlas-guide"><span>Atlas Guide</span><span>-></span></a>
            <a href="/atlas/cloudflare"><span>Cloudflare Ecosystem</span><span>-></span></a>
            <a href="/atlas/agents"><span>AI Agent Ecosystem</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">GRP</div><div><p class="eyebrow">See relationships</p><h2>Graph</h2></div></div>
          <p class="muted">Follow project relationships, dependencies, and alternatives as connected knowledge.</p>
          <div class="intent-links">
            <a href="/graph"><span>Graph Home</span><span>-></span></a>
            <a href="/topics/graph-guide"><span>Graph Guide</span><span>-></span></a>
            <a href="/topics/project-graph-guide"><span>Project Graph Guide</span><span>-></span></a>
            <a href="/graph/cloudflare-agents"><span>Cloudflare Agents</span><span>-></span></a>
            <a href="/graph/browser-use/browser-use"><span>Browser Use</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">REC</div><div><p class="eyebrow">Pick by fit</p><h2>Recommend</h2></div></div>
          <p class="muted">Turn a use case and constraints into an explainable shortlist.</p>
          <div class="intent-links">
            <a href="/recommend"><span>Recommendation Engine</span><span>-></span></a>
            <a href="/topics/recommendation-guide"><span>Recommendation Guide</span><span>-></span></a>
            <a href="/recommend?use_case=build%20Cloudflare-ready%20AI%20agents&amp;deployment=cloudflare&amp;category=agent_framework&amp;cloudflare_ready=true"><span>Cloudflare Agents</span><span>-></span></a>
            <a href="/recommend?use_case=build%20browser%20automation%20agents&amp;deployment=docker&amp;category=browser_agent"><span>Browser Agents</span><span>-></span></a>
            <a href="/recommend?use_case=build%20RAG%20applications&amp;deployment=local&amp;category=rag_framework"><span>RAG Stack</span><span>-></span></a>
          </div>
        </article>
        <article class="intent-card">
          <div class="intent-card-top"><div class="feature-icon">ECO</div><div><p class="eyebrow">Map the stack</p><h2>Ecosystems</h2></div></div>
          <p class="muted">Explore project clusters, deployment targets, dependencies, and related tools.</p>
          <div class="intent-links">
            <a href="/atlas"><span>Atlas</span><span>-></span></a>
            <a href="/journeys"><span>Atlas Journeys</span><span>-></span></a>
            <a href="/topics/atlas-journey-guide"><span>Atlas Journey Guide</span><span>-></span></a>
            <a href="/atlas#cloudflare"><span>Cloudflare Ecosystem</span><span>-></span></a>
            <a href="/atlas#agents"><span>AI Agent Ecosystem</span><span>-></span></a>
            <a href="/atlas#mcp"><span>MCP Ecosystem</span><span>-></span></a>
            <a href="/atlas#rag"><span>RAG Ecosystem</span><span>-></span></a>
            <a href="/atlas#browser-ai"><span>Browser AI Ecosystem</span><span>-></span></a>
            <a href="/atlas#ai-ide"><span>AI IDE Ecosystem</span><span>-></span></a>
            <a href="/atlas#llm-gateway"><span>LLM Gateway Ecosystem</span><span>-></span></a>
            <a href="/atlas#ai-observability"><span>AI Observability Ecosystem</span><span>-></span></a>
            <a href="/atlas#workflow-automation"><span>Workflow Automation Ecosystem</span><span>-></span></a>
          </div>
        </article>
      </section>

      <section class="category-strip" aria-label="Trending categories">
        <a class="category-chip" href="/trends">Open Source Trends</a>
        <a class="category-chip" href="/api/search?q=AI%20Agents&ranking=browse">AI Agents</a>
        <a class="category-chip" href="/api/search?q=MCP%20Servers&ranking=browse">MCP Servers</a>
        <a class="category-chip" href="/api/search?q=RAG&ranking=browse">RAG</a>
        <a class="category-chip" href="/api/search?q=Browser%20Automation&ranking=browse">Browser Automation</a>
        <a class="category-chip" href="/api/search?q=AI%20IDE&ranking=browse">AI IDE</a>
        <a class="category-chip" href="/api/search?q=LLM%20Gateway&ranking=browse">LLM Gateway</a>
        <a class="category-chip" href="/api/search?q=AI%20Observability&ranking=browse">AI Observability</a>
        <a class="category-chip" href="/api/search?q=Workflow%20Automation&ranking=browse">Workflow Automation</a>
      </section>

      <section id="projects">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Trending Projects</p>
            <h2>Structured signals agents can act on</h2>
          </div>
          <a class="button secondary" href="/api/trending">JSON</a>
        </div>
        <p class="search-status" id="search-status" aria-live="polite">Loading default results for cloudflare agent framework...</p>
        <div class="project-card-grid" id="project-grid">
          <div class="empty">Loading projects...</div>
        </div>
      </section>

      <section class="panel search-panel" aria-label="Agent search">
        <p class="eyebrow">Agent Search</p>
        <h2>Search by intent, deployment target, and quality signals</h2>
        <form class="search-form" id="search-form">
          <input id="query" value="cloudflare agent framework" aria-label="Search query" />
          <div class="filter-grid" aria-label="Project filters">
            <label class="filter-field"><span>Category</span><select id="category-filter"><option value="">Any</option><option value="agent_framework">Agent framework</option><option value="mcp_server">MCP server</option><option value="rag_framework">RAG framework</option><option value="coding_agent">Coding agent</option><option value="browser_agent">Browser agent</option><option value="workflow_automation">Workflow automation</option><option value="llm_gateway">LLM gateway</option><option value="ai_observability">AI observability</option></select></label>
            <label class="filter-field"><span>Deploy</span><select id="deployment-filter"><option value="">Any</option><option value="cloudflare">Cloudflare</option><option value="serverless">Serverless</option><option value="docker">Docker</option><option value="local">Local</option><option value="library_only">Library only</option><option value="kubernetes">Kubernetes</option><option value="vercel">Vercel</option></select></label>
            <label class="filter-field"><span>Language</span><select id="language-filter"><option value="">Any</option><option value="TypeScript">TypeScript</option><option value="Python">Python</option><option value="Go">Go</option><option value="Rust">Rust</option><option value="JavaScript">JavaScript</option><option value="Java">Java</option><option value="C++">C++</option></select></label>
            <label class="filter-field"><span>Type</span><select id="kind-filter"><option value="">Any</option><option value="project">Project</option><option value="collection">Collection</option></select></label>
            <label class="filter-field"><span>Confidence</span><select id="confidence-filter"><option value="">Any</option><option value="medium">Medium+</option><option value="high">High</option></select></label>
            <div class="checkbox-row"><span>Cloudflare</span><label><input id="cloudflare-filter" type="checkbox" /> Ready</label></div>
          </div>
          <button class="button primary" type="submit">Search</button>
        </form>
      </section>

      <section class="trust-grid" aria-label="Developer trust signals">
        <article class="panel">
          <div class="feature-icon">DOC</div>
          <p class="eyebrow">Docs</p>
          <h2>API, MCP, scoring, and data freshness</h2>
          <p class="muted">Start from the public docs before integrating an agent runtime or citing a recommendation.</p>
          <div class="link-list">
            <a href="/docs">Developer docs</a>
            <a href="/integrations">Integration paths</a>
            <a href="/status">Public status</a>
            <a href="/quality">Quality governance</a>
            <a href="/coverage">Corpus coverage</a>
            <a href="/api/quality">Quality JSON</a>
            <a href="/api/sync/status">Sync status</a>
          </div>
        </article>
        <article class="panel">
          <div class="feature-icon">MCP</div>
          <p class="eyebrow">Install Path</p>
          <h2>Use Git.Top as an agent project intelligence tool</h2>
          <p class="muted">MCP discovery exposes search, project lookup, alternatives, deployment, quality, comparison, and graph reasoning tools.</p>
          <div class="link-list">
            <a href="/mcp">MCP discovery</a>
            <a href="/topics/mcp-integration-guide">MCP integration guide</a>
            <a href="/integrations">REST / MCP / GRP</a>
            <a href="/docs#mcp">MCP guidance</a>
            <a href="/api/schema/project.v2">Project schema</a>
          </div>
        </article>
        <article class="panel">
          <div class="feature-icon">QA</div>
          <p class="eyebrow">Trust Model</p>
          <h2>Scores include evidence and confidence</h2>
          <p class="muted">Quality score and agent score are separate. Responses include source metadata, classification evidence, and signal confidence.</p>
          <div class="link-list">
            <a href="/trust">Trust Gate</a>
            <a href="/docs#scoring">Scoring methodology</a>
            <a href="/docs#freshness">Data freshness</a>
            <a href="/quality">Quality governance</a>
            <a href="/coverage">Corpus coverage</a>
            <a href="/status">Public status</a>
            <a href="/quality/review">Review queue</a>
            <a href="/.well-known/security.txt">Security contact</a>
          </div>
        </article>
      </section>

      <section class="agent-grid">
        <article class="panel">
          <div class="feature-icon">API</div>
          <p class="eyebrow">Project API</p>
          <h2>One schema for project knowledge</h2>
          <code>{ repo, alternatives, deployments, quality_score, agent_score }</code>
        </article>
        <article class="panel">
          <div class="feature-icon">MCP</div>
          <p class="eyebrow">Git.Top MCP</p>
          <h2>Tools agents can call directly</h2>
          <p class="muted">search_projects, get_project, get_alternatives, get_deployment, and get_quality_score.</p>
        </article>
        <article class="panel">
          <div class="feature-icon">KG</div>
          <p class="eyebrow">Knowledge Graph</p>
          <h2>Relationships are the product surface</h2>
          <p class="muted">Alternatives, deployments, dependencies, use cases, and categories become reusable graph edges.</p>
        </article>
      </section>

      <section class="graph-section">
        <div>
          <p class="eyebrow">Project Graph</p>
          <h2>Relationships, dependencies, alternatives</h2>
        </div>
        <div class="graph-lines" aria-label="Project graph example">
          <div class="graph-node root">Claude Code</div>
          <div class="graph-node">MCP</div>
          <div class="graph-node">OpenRouter</div>
          <div class="graph-node">Playwright</div>
          <div class="graph-node">Browser Use</div>
          <div class="graph-node">A2A</div>
        </div>
      </section>
    </div>

    <script>
      const grid = document.querySelector("#project-grid");
      const form = document.querySelector("#search-form");
      const query = document.querySelector("#query");
      const categoryFilter = document.querySelector("#category-filter");
      const deploymentFilter = document.querySelector("#deployment-filter");
      const languageFilter = document.querySelector("#language-filter");
      const kindFilter = document.querySelector("#kind-filter");
      const confidenceFilter = document.querySelector("#confidence-filter");
      const cloudflareFilter = document.querySelector("#cloudflare-filter");
      const searchStatus = document.querySelector("#search-status");

      registerWebMcpTools();

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        loadProjects({ reveal: true });
      });
      [categoryFilter, deploymentFilter, languageFilter, kindFilter, confidenceFilter, cloudflareFilter].forEach((control) => {
        control.addEventListener("change", () => loadProjects());
      });

      loadProjects();

      function registerWebMcpTools() {
        if (!("modelContext" in navigator) || !navigator.modelContext || !navigator.modelContext.registerTool) {
          return;
        }
        navigator.modelContext.registerTool({
          name: "git_top_search_projects",
          description: "Search Git.Top public project intelligence by query, category, deployment, language, and Cloudflare readiness.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query or project discovery goal." },
              limit: { type: "number", description: "Maximum number of projects to return." }
            },
            required: ["query"]
          },
          execute: async function(input) {
            const params = new URLSearchParams({ q: input.query, limit: String(input.limit || 5) });
            const response = await fetch("/api/search?" + params.toString(), { headers: { accept: "application/json" } });
            if (!response.ok) {
              return { error: "Git.Top search failed", status: response.status };
            }
            return response.json();
          },
          annotations: { readOnlyHint: true }
        });
      }

      async function loadProjects(options = {}) {
        const q = query.value.trim() || "agent";
        const params = new URLSearchParams({ q, limit: "12" });
        if (categoryFilter.value) params.set("category", categoryFilter.value);
        if (deploymentFilter.value) params.set("deployment", deploymentFilter.value);
        if (languageFilter.value) params.set("language", languageFilter.value);
        if (kindFilter.value) params.set("project_kind", kindFilter.value);
        if (confidenceFilter.value) params.set("min_confidence", confidenceFilter.value);
        if (cloudflareFilter.checked) params.set("cloudflare_ready", "true");
        if (categoryFilter.value || deploymentFilter.value) params.set("ranking", "browse");
        grid.innerHTML = '<div class="empty">Loading projects...</div>';
        searchStatus.textContent = 'Searching for "' + q + '"...';
        try {
          const response = await fetch("/api/search?" + params.toString(), { headers: { accept: "application/json" } });
          if (!response.ok) throw new Error("HTTP " + response.status);
          const data = await response.json();
          const projects = data.projects || [];
          const source = data.metadata?.source || "unknown";
          const count = projects.length;
          searchStatus.textContent = count
            ? 'Showing ' + count + ' results for "' + q + '" from ' + source + '.'
            : 'No results found for "' + q + '" from ' + source + '. Try fewer filters.';
          grid.dataset.source = source;
          grid.innerHTML = projects.length ? projects.map(projectCard).join("") : '<div class="empty">No projects matched this query.</div>';
          if (options.reveal) {
            document.querySelector("#projects").scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } catch (error) {
          searchStatus.textContent = 'Search failed for "' + q + '".';
          grid.innerHTML = '<div class="empty">Project search failed: ' + escapeHtml(error.message || "unknown error") + '</div>';
        }
      }

      function projectCard(item) {
        const repo = item.repo || item.project_id || item.projectId || item.name || "unknown";
        const agentScore = item.agent_score ?? item.agentScore ?? "-";
        const qualityScore = item.quality_score ?? item.qualityScore ?? "-";
        const projectKind = item.project_kind || item.projectKind;
        const alternative = item.alternatives?.[0]?.repo || "Discoverable";
        const deploy = (item.deployments || []).slice(0, 2).join(", ") || "Unknown";
        const kind = projectKind === "collection" ? "collection" : "project";
        const reasons = matchReasons(item).map((reason) => '<span>' + escapeHtml(reason) + '</span>').join("");
        const summary = item.summary || {};
        const tlDr = summary.tl_dr || item.overview || item.description || "";
        const install = summary.install || (item.deployments || []).slice(0, 1).join(", ") || "Unknown";
        const goodFor = (summary.good_for || item.use_cases || item.useCases || []).slice(0, 2);
        const notGoodFor = (summary.not_good_for || item.not_good_for || item.notGoodFor || []).slice(0, 2);
        const source = item.metadata?.source || grid.dataset.source || "d1";
        const trust = confidenceSummary(item.classification || {});
        return '<article class="project-card">' +
          '<div class="project-card-top"><div><p class="eyebrow">' + escapeHtml((item.category || [])[0] || kind) + '</p><h3><a href="/projects/' + escapeHtml(repo) + '">' + escapeHtml(item.name || repo) + '</a></h3></div><span class="status-pill">' + escapeHtml(String(agentScore)) + '</span></div>' +
          '<div class="project-summary">' +
            '<h4>' + escapeHtml(tlDr) + '</h4>' +
            '<div class="summary-meta">' +
              '<span class="summary-pill good">' + escapeHtml(source.toUpperCase()) + '</span>' +
              '<span class="summary-pill">Install: ' + escapeHtml(install) + '</span>' +
              '<span class="summary-pill">Trust: ' + escapeHtml(trust) + '</span>' +
            '</div>' +
            '<div class="summary-list">' +
              '<div><span>Good for</span><strong>' + escapeHtml(goodFor.join(", ") || "Unknown") + '</strong></div>' +
              '<div><span>Not good for</span><strong>' + escapeHtml(notGoodFor.join(", ") || "Unknown") + '</strong></div>' +
            '</div>' +
          '</div>' +
          '<div class="match-reasons">' + reasons + '</div>' +
          '<div class="signal-row"><span>Alternative</span><strong>' + escapeHtml(alternative) + '</strong></div>' +
          '<div class="signal-row"><span>Deploy</span><strong>' + escapeHtml(deploy) + '</strong></div>' +
          '<div class="score-pair"><div><span>Quality</span><strong>' + escapeHtml(String(qualityScore)) + '</strong></div><div><span>Agent</span><strong>' + escapeHtml(String(agentScore)) + '</strong></div></div>' +
        '</article>';
      }

      function matchReasons(item) {
        const reasons = [];
        const category = (item.category || [])[0];
        const deployments = item.deployments || [];
        const classification = item.classification || {};
        const projectKind = item.project_kind || item.projectKind;
        if (categoryFilter.value && category === categoryFilter.value) reasons.push("category match");
        if (deploymentFilter.value && deployments.includes(deploymentFilter.value)) reasons.push("deployment match");
        if (languageFilter.value && item.language === languageFilter.value) reasons.push("language match");
        if (cloudflareFilter.checked && item.cloudflare_ready) reasons.push("Cloudflare ready");
        if (kindFilter.value && projectKind === kindFilter.value) reasons.push(kindFilter.value);
        if (confidenceFilter.value) reasons.push("confidence " + confidenceSummary(classification));
        if (!reasons.length) {
          reasons.push(category || "project");
          if (deployments[0]) reasons.push(deployments[0]);
          reasons.push(projectKind || "project");
        }
        return reasons.slice(0, 4);
      }

      function confidenceSummary(classification) {
        const values = [classification.category, classification.deployment, classification.difficulty, classification.cloudflare_ready || classification.cloudflareReady]
          .map((signal) => signal?.confidence)
          .filter(Boolean);
        const high = values.filter((value) => value === "high").length;
        return high + "/" + (values.length || 4) + " high";
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }
    </script>
  </body>
</html>`;

function projectsHtml(): string {
  const title = "Git.Top Projects | Agent-Native GitHub Project Index";
  const description =
    "Browse Git.Top indexed GitHub projects with agent scores, quality signals, deployment fit, alternatives, and structured project knowledge.";
  const ogImage =
    "https://git.top/og.svg?title=Git.Top%20Projects&subtitle=Agent-native%20GitHub%20project%20index";

  return html
    .replace("<title>Git.Top | The Knowledge Graph of Open Source</title>", `<title>${title}</title>`)
    .replace(
      '<meta name="description" content="Open-source project knowledge graph for discovery, comparisons, alternatives, ecosystems, scores, and agent-readable recommendations." />',
      `<meta name="description" content="${description}" />`
    )
    .replace('<link rel="canonical" href="https://git.top/" />', '<link rel="canonical" href="https://git.top/projects" />')
    .replace(
      '<meta property="og:title" content="Git.Top | The Knowledge Graph of Open Source" />',
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      '<meta property="og:description" content="Open-source project knowledge graph for discovery, comparisons, alternatives, ecosystems, scores, and agent-readable recommendations." />',
      `<meta property="og:description" content="${description}" />`
    )
    .replace('<meta property="og:url" content="https://git.top/" />', '<meta property="og:url" content="https://git.top/projects" />')
    .replace('<meta property="og:image" content="https://git.top/og.svg" />', `<meta property="og:image" content="${ogImage}" />`)
    .replace('<meta name="twitter:image" content="https://git.top/og.svg" />', `<meta name="twitter:image" content="${ogImage}" />`);
}

const graphHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Graph | Project Knowledge Graph</title>
    <meta name="description" content="Explore Git.Top project graph relationships across alternatives, deployments, dependencies, use cases, and agent-ready open-source stacks." />
    <link rel="canonical" href="https://git.top/graph" />
    <meta property="og:title" content="Git.Top Graph | Project Knowledge Graph" />
    <meta property="og:description" content="Graph relationships for agent-native GitHub project discovery, comparison, deployment fit, and alternatives." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/graph" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Graph&subtitle=Project%20relationships%20for%20AI%20agents" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Graph&subtitle=Project%20relationships%20for%20AI%20agents" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f8fb;
        --surface: #ffffff;
        --ink: #182026;
        --muted: #66737c;
        --line: #dce3e8;
        --teal: #0f766e;
        --green: #147d4f;
        --shadow: 0 16px 40px rgba(17, 24, 39, 0.08);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      html, body { overflow-x: hidden; }
      body { margin: 0; min-width: 320px; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      h1, h2, h3, p { margin: 0; }
      .page { width: 100%; max-width: 1240px; margin: 0 auto; padding: 22px; }
      .nav, .header, .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
      .nav { margin-bottom: 18px; }
      .brand { display: flex; align-items: center; gap: 10px; font-weight: 900; }
      .brand-mark, .feature-icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; background: #e6f3ef; color: var(--teal); }
      .nav-links { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; color: #40505a; font-weight: 800; }
      .nav-links a { white-space: nowrap; }
      .eyebrow { color: #0b5d56; font-size: 12px; font-weight: 900; text-transform: uppercase; }
      h1 { font-size: clamp(32px, 5vw, 56px); line-height: 1; margin-top: 4px; }
      h2 { font-size: 19px; line-height: 1.2; }
      .muted { color: var(--muted); line-height: 1.55; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); font-weight: 900; padding: 9px 12px; }
      .button.primary { border-color: var(--teal); background: var(--teal); color: #fff; }
      .panel { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); box-shadow: var(--shadow); padding: 16px; }
      .grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 12px; margin-top: 18px; }
      .node-map { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
      .node { display: grid; gap: 6px; min-height: 106px; border: 1px solid var(--line); border-radius: 8px; background: #fbfdfd; padding: 12px; }
      .node.project { border-color: #b7dfcc; background: #eefaf4; }
      .node.deployment { background: #f0f6ff; }
      .node.category { background: #fff8e7; }
      .node span, .node small { color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
      .node strong { overflow-wrap: anywhere; }
      .status-note { color: var(--muted); font-size: 13px; font-weight: 800; line-height: 1.45; margin-top: 10px; }
      .score > strong { display: inline-block; font-size: 58px; line-height: 0.9; margin-top: 8px; }
      .list { display: grid; gap: 9px; margin-top: 14px; }
      .list > div { display: grid; gap: 4px; border-top: 1px solid var(--line); padding-top: 9px; }
      .list > div:first-child { border-top: 0; padding-top: 0; }
      .compare { display: grid; min-width: 760px; margin-top: 12px; }
      .compare-row { display: grid; grid-template-columns: minmax(200px, 1.3fr) 90px 70px 70px 90px 90px; gap: 12px; align-items: center; border-top: 1px solid var(--line); padding: 12px 0; }
      .compare-head { border-top: 0; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
      .table-wrap { max-width: 100%; overflow-x: auto; margin-top: 18px; }
      .table-wrap .panel-heading { min-width: 0; }
      @media (max-width: 900px) { .grid, .node-map { grid-template-columns: 1fr; } }
      @media (max-width: 700px) {
        .page { padding: 16px; }
        .nav-links { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); justify-content: stretch; }
        .nav-links a { min-height: 34px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 255, 255, 0.72); overflow: hidden; text-align: center; text-overflow: ellipsis; padding: 7px 8px; }
        .button { width: 100%; }
        .compare { min-width: 680px; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/">Home</a><a href="/graph/cloudflare/agents">Project Graph</a><a href="/api/graph?repo=cloudflare/agents">Graph API</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="header">
        <div>
          <p class="eyebrow">Project Knowledge Graph</p>
          <h1>Knowledge, then Graph, then Agent</h1>
          <p class="muted">Start from a real project graph, then follow alternatives, dependencies, deployment targets, and score evidence.</p>
        </div>
        <a class="button primary" href="/graph/cloudflare/agents">Open Project Graph</a>
      </header>

      <section class="grid">
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Focus Graph</p><h2>cloudflare/agents</h2></div><span id="graph-count" class="button">Example graph</span></div>
          <p class="status-note" id="graph-status">Loading live graph details for cloudflare/agents. The example below remains useful if the API is unavailable.</p>
          <div class="node-map" id="node-map">
            <div class="node project"><span>Focus</span><strong>cloudflare/agents</strong></div>
            <div class="node deployment"><span>Deployment</span><strong>Cloudflare Workers</strong></div>
            <div class="node deployment"><span>Deployment</span><strong>Serverless</strong></div>
            <div class="node category"><span>Category</span><strong>Agent framework</strong></div>
            <div class="node"><span>Dependency</span><strong>LLM provider</strong></div>
            <div class="node project"><span>Alternative</span><strong>vercel/ai</strong></div>
            <div class="node project"><span>Related</span><strong>cloudflare/ai-utils</strong></div>
            <div class="node"><span>Use case</span><strong>Build Cloudflare-ready AI agents</strong></div>
          </div>
        </article>
        <aside class="panel score">
          <p class="eyebrow">Agent Score</p>
          <strong id="agent-score">87</strong><span>/100</span>
          <p class="status-note">Live score details load from the project API and stay separate from Git.Top quality score.</p>
          <div class="list" id="score-list">
            <div><strong>documentation</strong><p class="muted">Evidence-bearing docs and API surfaces</p></div>
            <div><strong>deployment</strong><p class="muted">Cloudflare and serverless fit</p></div>
            <div><strong>maintenance</strong><p class="muted">Freshness and repository activity</p></div>
          </div>
        </aside>
      </section>

      <section class="panel table-wrap">
        <div class="panel-heading"><div><p class="eyebrow">Compare Matrix</p><h2>What agents need to decide</h2></div><a class="button" href="/api/compare">Compare API</a></div>
        <div class="compare" id="compare">
          <div class="compare-row compare-head"><span>Project</span><span>Stars</span><span>Agent</span><span>Local</span><span>Cloudflare</span><span>Score</span></div>
          <div class="compare-row"><strong>cloudflare/agents</strong><span>-</span><span>Yes</span><span>Yes</span><span>Yes</span><strong>87</strong></div>
          <div class="compare-row"><strong>vercel/ai</strong><span>-</span><span>Yes</span><span>Yes</span><span>No</span><strong>-</strong></div>
        </div>
      </section>
    </div>
    <script>
      const nodeMap = document.querySelector("#node-map");
      const graphCount = document.querySelector("#graph-count");
      const agentScore = document.querySelector("#agent-score");
      const scoreList = document.querySelector("#score-list");
      const compare = document.querySelector("#compare");
      registerWebMcpTools();
      init();
      function registerWebMcpTools() {
        if (!("modelContext" in navigator) || !navigator.modelContext || !navigator.modelContext.registerTool) {
          return;
        }
        navigator.modelContext.registerTool({
          name: "git_top_search_projects",
          description: "Search Git.Top public project intelligence by query, category, deployment, language, and Cloudflare readiness.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query or project discovery goal." },
              limit: { type: "number", description: "Maximum number of projects to return." }
            },
            required: ["query"]
          },
          execute: async function(input) {
            const params = new URLSearchParams({ q: input.query, limit: String(input.limit || 5) });
            const response = await fetch("/api/search?" + params.toString(), { headers: { accept: "application/json" } });
            if (!response.ok) {
              return { error: "Git.Top search failed", status: response.status };
            }
            return response.json();
          },
          annotations: { readOnlyHint: true }
        });
      }
      async function init() {
        try {
          const [graph, project, comparison] = await Promise.all([
            getJson("/api/graph?repo=cloudflare/agents&limit=18"),
            getJson("/api/project/cloudflare/agents"),
            getJson("/api/compare")
          ]);
          graphCount.textContent = graph.nodes.length + " nodes / " + graph.edges.length + " edges";
          document.querySelector("#graph-status").textContent = "Live graph loaded from Git.Top API.";
          nodeMap.innerHTML = graph.nodes.slice(0, 18).map((node) => '<div class="node ' + escapeHtml(node.kind) + '"><span>' + escapeHtml(node.kind) + '</span><strong>' + escapeHtml(node.label) + '</strong>' + (node.score ? '<small>' + escapeHtml(node.score) + '/100</small>' : '') + '</div>').join("");
          agentScore.textContent = project.agent_score || "87";
          const parts = project.agent_score_breakdown || {};
          scoreList.innerHTML = ["documentation", "deployment", "maintenance", "community", "popularity"].map((key) => '<div><strong>' + key + '</strong><p class="muted">' + escapeHtml(parts[key] ?? "-") + '</p></div>').join("");
          compare.innerHTML = '<div class="compare-row compare-head"><span>Project</span><span>Stars</span><span>Agent</span><span>Local</span><span>Cloudflare</span><span>Score</span></div>' +
            (comparison.projects || []).map((project) => '<div class="compare-row"><strong>' + escapeHtml(project.repo) + '</strong><span>' + Number(project.stars || 0).toLocaleString() + '</span><span>' + yes(project.agent) + '</span><span>' + yes(project.local) + '</span><span>' + yes(project.cloudflare) + '</span><strong>' + escapeHtml(project.agent_score) + '</strong></div>').join("");
        } catch (error) {
          graphCount.textContent = "Example graph";
          document.querySelector("#graph-status").textContent = "Live graph details could not load. Use the project graph link or Graph API for the full relationship model.";
        }
      }
      async function getJson(path) {
        const response = await fetch(path, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(path + " HTTP " + response.status);
        return response.json();
      }
      function yes(value) { return value ? "Yes" : "No"; }
      function escapeHtml(value) {
        return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
      }
    </script>
  </body>
</html>`;
