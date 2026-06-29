import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildAgentWorkflow, type AgentWorkflowInput } from "./workflow";
import type { Env } from "./types";

const categories = ["agent_framework", "coding_agent", "mcp_server", "rag_framework", "browser_agent", "workflow_automation", "ai_app_template"];
const deployments = ["cloudflare", "docker", "local", "library_only", "kubernetes", "cloud", "serverless"];

export async function renderWorkflowPage(env: Env, url: URL): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const input = workflowPageInput(url);
  const workflow = buildAgentWorkflow(knowledge.projects, input);

  return new Response(renderHtml({ workflow, input, metadata: knowledge.metadata }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function workflowPageInput(url: URL): AgentWorkflowInput {
  const hasQuery = Array.from(url.searchParams.keys()).length > 0;
  return {
    intent: url.searchParams.get("intent") ?? "choose a Cloudflare-ready agent framework",
    useCase: url.searchParams.get("use_case") ?? undefined,
    projectId: optionalParam(url, "project_id"),
    deployment: optionalParam(url, "deployment", hasQuery ? undefined : "cloudflare"),
    category: optionalParam(url, "category", hasQuery ? undefined : "agent_framework"),
    license: optionalParam(url, "license"),
    language: optionalParam(url, "language"),
    difficulty: optionalParam(url, "difficulty"),
    cloudflareReady: boolParam(url.searchParams.get("cloudflare_ready"), hasQuery ? undefined : true),
    limit: numberParam(url.searchParams.get("limit"), 5)
  };
}

function renderHtml({
  workflow,
  input,
  metadata
}: {
  workflow: ReturnType<typeof buildAgentWorkflow>;
  input: AgentWorkflowInput;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  const apiUrl = workflowApiUrl(input);
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent Selection Workflow | Git.Top</title>
    <meta name="description" content="Use Git.Top workflow to move from trends to recommendations, graph, alternatives, score, compare, and trust checks for open-source project selection." />
    <link rel="canonical" href="https://git.top/workflow" />
    <meta property="og:title" content="Agent Selection Workflow | Git.Top" />
    <meta property="og:description" content="A guided Git.Top workflow for agents and humans selecting open-source projects." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/workflow" />
    <meta property="og:image" content="https://git.top/og.svg?title=Agent%20Selection%20Workflow&amp;subtitle=Trends%20to%20recommendations%20to%20decision" />
    <meta name="twitter:card" content="summary" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --green:#147d4f; --blue:#355c9f; --amber:#9a5b00; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      input,select { width:100%; min-height:40px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:8px 10px; font:inherit; font-weight:750; }
      label { display:grid; gap:6px; color:#40505a; font-size:12px; font-weight:900; text-transform:uppercase; }
      .page { max-width:1240px; margin:0 auto; padding:22px; }
      .nav,.actions,.section-heading,.step-top,.meta-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:950; }
      .brand-mark,.step-number { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); font-weight:950; }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.form-panel,.step,.panel,.candidate,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:0; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; margin-top:4px; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.25; overflow-wrap:anywhere; }
      .lead,.muted,.step p,.candidate p,.policy-list li { color:#40505a; line-height:1.58; }
      .lead { max-width:860px; font-size:18px; margin-top:12px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .form-grid { display:grid; grid-template-columns:2fr repeat(4,minmax(130px,1fr)); gap:10px; margin-top:14px; }
      .form-actions { display:flex; gap:10px; align-items:end; flex-wrap:wrap; margin-top:12px; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:12px; margin-top:14px; align-items:start; }
      .steps,.side,.candidate-list { display:grid; gap:12px; }
      .step,.candidate,.metric { box-shadow:none; }
      .step { display:grid; gap:10px; }
      .step-number { flex:0 0 auto; }
      .method { color:var(--blue); font-weight:950; }
      .tag { color:#40505a; font-size:12px; background:#fbfdfd; }
      .tag.good { color:var(--green); border-color:#b7dfca; background:#f0fbf5; }
      .tag.warn { color:var(--amber); border-color:#ead2a7; background:#fff9ec; }
      .metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:14px; }
      .metric { background:#fbfdfd; padding:12px; }
      .metric span { display:block; color:var(--muted); font-size:11px; font-weight:900; text-transform:uppercase; }
      .metric strong { display:block; margin-top:5px; font-size:22px; }
      .panel { display:grid; gap:10px; }
      .policy-list { display:grid; gap:7px; margin:0; padding-left:18px; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; overflow-wrap:anywhere; }
      @media (max-width:980px) { .layout,.form-grid { grid-template-columns:1fr; } }
      @media (max-width:760px) { .metric-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:520px) { .metric-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/discover">Discover</a><a href="/recommend">Recommend</a><a href="/trends">Trends</a><a href="/atlas">Atlas</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Agent Workflow</p>
        <h1>Move from open-source intent to an evidence-backed decision.</h1>
        <p class="lead">${escapeHtml(workflow.summary)}</p>
        <div class="actions" style="margin-top:14px">
          <a class="button primary" href="${escapeAttr(apiUrl)}">Open Workflow JSON</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
          <a class="button" href="/mcp">MCP</a>
          <a class="button" href="/docs#agent-workflow">Docs</a>
        </div>
      </header>

      <section class="form-panel" style="margin-top:14px">
        <form method="get" action="/workflow">
          <div class="form-grid">
            <label>Intent<input name="intent" value="${escapeAttr(input.intent ?? input.useCase ?? "")}" /></label>
            <label>Project<input name="project_id" value="${escapeAttr(input.projectId ?? "")}" placeholder="claude-code" /></label>
            <label>Category${select("category", categories, input.category)}</label>
            <label>Deployment${select("deployment", deployments, input.deployment)}</label>
            <label>License<input name="license" value="${escapeAttr(input.license ?? "")}" placeholder="MIT" /></label>
          </div>
          <div class="form-actions">
            <label style="min-width:180px">Cloudflare Ready${select("cloudflare_ready", ["true", "false", "any"], typeof input.cloudflareReady === "boolean" ? String(input.cloudflareReady) : "any")}</label>
            <label style="width:110px">Limit<input name="limit" type="number" min="1" max="20" value="${input.limit ?? 5}" /></label>
            <button class="button primary" type="submit">Build Workflow</button>
            <a class="button" href="/workflow?intent=evaluate%20Claude%20Code%20alternatives&amp;project_id=claude-code&amp;deployment=local&amp;limit=5">Claude Code</a>
            <a class="button" href="/workflow?intent=choose%20a%20RAG%20framework&amp;category=rag_framework&amp;deployment=local&amp;limit=5">RAG</a>
          </div>
        </form>
      </section>

      <section class="metric-grid">
        ${metric("Workflow Steps", workflow.recommended_sequence.length)}
        ${metric("Shortlist", workflow.shortlist.length)}
        ${metric("Trend Projects", workflow.trend_context.stats.projectCount)}
        ${metric("Data Source", metadata.source)}
      </section>

      <main class="layout">
        <section class="steps" aria-label="Recommended sequence">
          <div class="section-heading">
            <div><p class="eyebrow">Recommended Sequence</p><h2>What to call, inspect, and cite</h2></div>
            <a class="button" href="${escapeAttr(apiUrl)}">JSON</a>
          </div>
          ${workflow.recommended_sequence.map(stepCard).join("")}
        </section>
        <aside class="side">
          <section class="panel">
            <p class="eyebrow">Shortlist</p>
            <div class="candidate-list">${workflow.shortlist.length ? workflow.shortlist.map(candidateCard).join("") : `<p class="muted">No shortlist yet. Relax one constraint and rebuild the workflow.</p>`}</div>
          </section>
          <section class="panel">
            <p class="eyebrow">Trend Context</p>
            <h2>${escapeHtml(workflow.trend_context.summary)}</h2>
            <div class="tag-list">${workflow.trend_context.top_categories.slice(0, 3).map((item) => `<a class="tag" href="${escapeAttr(item.href)}">${escapeHtml(item.label)}: ${item.count}</a>`).join("")}</div>
          </section>
          <section class="panel">
            <p class="eyebrow">Trust Policy</p>
            <ul class="policy-list">${workflow.trust_policy.disclose_when.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
          <section class="panel">
            <p class="eyebrow">Data Source</p>
            <div class="meta-row"><span>Source</span><strong>${escapeHtml(metadata.source)}</strong></div>
            <div class="meta-row"><span>Reason</span><strong>${escapeHtml(metadata.reason)}</strong></div>
            <div class="meta-row"><span>Projects</span><strong>${metadata.projectCount.toLocaleString()}</strong></div>
          </section>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function stepCard(step: ReturnType<typeof buildAgentWorkflow>["recommended_sequence"][number]): string {
  return `<article class="step">
    <div class="step-top">
      <div style="display:flex; align-items:center; gap:12px">
        <span class="step-number">${step.step}</span>
        <div><p class="eyebrow">${escapeHtml(step.mcp_tool ?? "REST")}</p><h3>${escapeHtml(step.name)}</h3></div>
      </div>
      <a class="button${step.step === 1 ? " primary" : ""}" href="${escapeAttr(step.url)}">${escapeHtml(step.method)}</a>
    </div>
    <p>${escapeHtml(step.purpose)}</p>
    <div class="tag-list"><span class="tag method">${escapeHtml(step.method)}</span><span class="tag"><code>${escapeHtml(step.url)}</code></span>${step.mcp_tool ? `<span class="tag good">MCP ${escapeHtml(step.mcp_tool)}</span>` : ""}</div>
  </article>`;
}

function candidateCard(candidate: ReturnType<typeof buildAgentWorkflow>["shortlist"][number]): string {
  return `<article class="candidate">
    <div class="step-top"><h3>${escapeHtml(candidate.project_id)}</h3><span class="tag good">${candidate.score}/100</span></div>
    <p>${escapeHtml(candidate.decision_summary)}</p>
    <div class="tag-list"><span class="tag">${escapeHtml(candidate.confidence)} confidence</span>${candidate.next_actions.slice(0, 3).map((action) => `<a class="tag" href="${escapeAttr(action.href)}">${escapeHtml(action.kind)}</a>`).join("")}</div>
  </article>`;
}

function metric(labelText: string, value: number | string): string {
  return `<div class="metric"><span>${escapeHtml(labelText)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function workflowApiUrl(input: AgentWorkflowInput): string {
  const params = new URLSearchParams();
  if (input.intent) params.set("intent", input.intent);
  if (input.useCase) params.set("use_case", input.useCase);
  if (input.projectId) params.set("project_id", input.projectId);
  if (input.deployment) params.set("deployment", input.deployment);
  if (input.category) params.set("category", input.category);
  if (input.license) params.set("license", input.license);
  if (input.language) params.set("language", input.language);
  if (input.difficulty) params.set("difficulty", input.difficulty);
  if (typeof input.cloudflareReady === "boolean") params.set("cloudflare_ready", String(input.cloudflareReady));
  if (input.limit) params.set("limit", String(input.limit));
  return `/api/workflow?${params.toString()}`;
}

function select(name: string, options: string[], selected?: string): string {
  return `<select name="${escapeAttr(name)}"><option value="">Any</option>${options.map((option) => `<option value="${escapeAttr(option)}"${option === selected ? " selected" : ""}>${escapeHtml(label(option))}</option>`).join("")}</select>`;
}

function optionalParam(url: URL, name: string, fallback?: string): string | undefined {
  const value = url.searchParams.get(name);
  if (value === "any" || value === "") {
    return undefined;
  }
  return value ?? fallback;
}

function boolParam(value: string | null, fallback?: boolean): boolean | undefined {
  if (value === null || value === "") {
    return fallback;
  }
  if (value === "any") {
    return undefined;
  }
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

function numberParam(value: string | null, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 20) : fallback;
}

function label(value: string): string {
  const labels: Record<string, string> = {
    rag: "RAG",
    rag_framework: "RAG Framework",
    mcp_server: "MCP Server",
    ai_app_template: "AI App Template"
  };
  return labels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
