import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { recommendProjectList, type Recommendation, type RecommendationQuery } from "./project-search";
import type { Env } from "./types";

const categories = ["agent_framework", "coding_agent", "mcp_server", "rag_framework", "browser_agent", "workflow_automation", "ai_app_template"];
const deployments = ["cloudflare", "docker", "local", "library_only", "kubernetes", "cloud", "serverless"];
const difficulties = ["beginner", "intermediate", "advanced"];

export async function renderRecommendPage(env: Env, url: URL): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const query = recommendationPageQuery(url);
  const recommendations = recommendProjectList(knowledge.projects, query);

  return new Response(renderHtml({ query, recommendations, metadata: knowledge.metadata }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function recommendationPageQuery(url: URL): RecommendationQuery {
  const hasQuery = Array.from(url.searchParams.keys()).length > 0;
  return {
    useCase: url.searchParams.get("use_case") ?? "build Cloudflare-ready AI agents",
    deployment: optionalParam(url, "deployment", "cloudflare"),
    category: optionalParam(url, "category", "agent_framework"),
    license: optionalParam(url, "license"),
    difficulty: optionalParam(url, "difficulty"),
    language: optionalParam(url, "language"),
    cloudflareReady: boolParam(url.searchParams.get("cloudflare_ready"), hasQuery ? undefined : true),
    limit: numberParam(url.searchParams.get("limit"), 5)
  };
}

function renderHtml({
  query,
  recommendations,
  metadata
}: {
  query: RecommendationQuery;
  recommendations: Recommendation[];
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  const apiUrl = recommendApiUrl(query);
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Open Source Recommendation Engine | Git.Top</title>
    <meta name="description" content="Find explainable open-source recommendations by use case, category, deployment target, license, and Cloudflare readiness." />
    <link rel="canonical" href="https://git.top/recommend" />
    <meta property="og:title" content="Open Source Recommendation Engine | Git.Top" />
    <meta property="og:description" content="Explainable open-source project recommendations powered by Git.Top knowledge graph signals." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/recommend" />
    <meta property="og:image" content="https://git.top/og.svg?title=Recommendation%20Engine&amp;subtitle=Explainable%20open-source%20project%20fit" />
    <meta name="twitter:card" content="summary" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --green:#147d4f; --blue:#355c9f; --amber:#a15c07; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      input,select { width:100%; min-height:40px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); padding:8px 10px; font:inherit; font-weight:750; }
      label { display:grid; gap:6px; color:#40505a; font-size:12px; font-weight:900; text-transform:uppercase; }
      .page { max-width:1240px; margin:0 auto; padding:22px; }
      .nav,.header,.section-heading,.result-top,.actions,.meta-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark,.rank { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); font-weight:950; }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; text-transform:uppercase; }
      h1 { max-width:900px; font-size:clamp(34px,6vw,64px); line-height:1; margin-top:4px; }
      h2 { font-size:21px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.25; overflow-wrap:anywhere; }
      .lead,.muted,.reason-list li,.tradeoffs li { color:#40505a; line-height:1.58; }
      .lead { max-width:820px; font-size:18px; margin-top:12px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .hero,.form-panel,.result,.metric,.empty { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .form-grid { display:grid; grid-template-columns:2fr repeat(4,minmax(130px,1fr)); gap:10px; margin-top:14px; }
      .form-actions { display:flex; gap:10px; align-items:end; flex-wrap:wrap; margin-top:12px; }
      .query-strip { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .tag { color:#40505a; font-size:12px; background:#fbfdfd; }
      .tag.good { color:var(--green); border-color:#b7dfca; background:#f0fbf5; }
      .tag.warn { color:var(--amber); border-color:#ead2a7; background:#fff9ec; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:12px; margin-top:14px; align-items:start; }
      .results { display:grid; gap:12px; }
      .result { display:grid; gap:12px; }
      .score-box { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
      .metric { box-shadow:none; padding:10px; background:#fbfdfd; }
      .metric span { display:block; color:var(--muted); font-size:11px; font-weight:900; text-transform:uppercase; }
      .metric strong { display:block; margin-top:4px; font-size:18px; }
      .reason-list,.tradeoffs { display:grid; gap:7px; margin:0; padding-left:18px; }
      .fit-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .fit-item { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:10px; }
      .fit-item span { display:block; color:var(--muted); font-size:11px; font-weight:900; text-transform:uppercase; }
      .fit-item strong { display:block; margin-top:5px; color:#22313a; line-height:1.45; }
      .side { display:grid; gap:12px; }
      .data-panel { border:1px solid var(--line); border-radius:8px; background:#fff; padding:14px; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; overflow-wrap:anywhere; }
      @media (max-width:980px) { .layout,.form-grid { grid-template-columns:1fr; } }
      @media (max-width:760px) { .score-box,.fit-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:520px) { .score-box,.fit-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/discover">Discover</a><a href="/compare">Compare</a><a href="/atlas">Atlas</a><a href="/mcp">MCP</a></div>
      </nav>

      <section class="hero">
        <p class="eyebrow">Recommendation Engine</p>
        <h1>Find projects by fit, not only stars.</h1>
        <p class="lead">Explainable recommendations across use case, deployment, category, license, maintainability, readiness, and agent-readable project knowledge.</p>
        <div class="actions" style="margin-top:14px">
          <a class="button primary" href="${escapeAttr(apiUrl)}">Open JSON</a>
          <a class="button" href="/api/openapi.json">OpenAPI</a>
          <a class="button" href="/docs#recommendation-engine">Docs</a>
        </div>
      </section>

      <section class="form-panel" style="margin-top:14px">
        <form method="get" action="/recommend">
          <div class="form-grid">
            <label>Use Case<input name="use_case" value="${escapeAttr(query.useCase ?? "")}" /></label>
            <label>Category${select("category", categories, query.category)}</label>
            <label>Deployment${select("deployment", deployments, query.deployment)}</label>
            <label>Difficulty${select("difficulty", difficulties, query.difficulty)}</label>
            <label>License<input name="license" value="${escapeAttr(query.license ?? "")}" placeholder="MIT" /></label>
          </div>
          <div class="form-actions">
            <label style="min-width:180px">Cloudflare Ready${select("cloudflare_ready", ["true", "false"], typeof query.cloudflareReady === "boolean" ? String(query.cloudflareReady) : undefined)}</label>
            <label style="width:110px">Limit<input name="limit" type="number" min="1" max="20" value="${query.limit ?? 5}" /></label>
            <button class="button primary" type="submit">Recommend</button>
            <a class="button" href="/recommend?use_case=build%20browser%20automation%20agents&amp;deployment=docker&amp;category=browser_agent&amp;limit=5">Browser Agents</a>
            <a class="button" href="/recommend?use_case=build%20RAG%20applications&amp;deployment=local&amp;category=rag_framework&amp;limit=5">RAG</a>
          </div>
        </form>
        <div class="query-strip">
          ${queryTags(query)}
        </div>
      </section>

      <main class="layout">
        <section class="results" aria-label="Recommendations">
          ${recommendations.length ? recommendations.map((item, index) => recommendationCard(item, index)).join("") : `<div class="empty"><h2>No recommendations matched</h2><p class="muted">Try removing one constraint or opening the JSON endpoint to inspect the exact query.</p></div>`}
        </section>
        <aside class="side">
          <div class="data-panel">
            <p class="eyebrow">Agent Endpoint</p>
            <h2>Matching JSON</h2>
            <p class="muted" style="margin-top:8px"><code>${escapeHtml(apiUrl)}</code></p>
          </div>
          <div class="data-panel">
            <p class="eyebrow">Data Source</p>
            <div class="meta-row" style="margin-top:8px"><span>Source</span><strong>${escapeHtml(metadata.source)}</strong></div>
            <div class="meta-row"><span>Reason</span><strong>${escapeHtml(metadata.reason)}</strong></div>
            <div class="meta-row"><span>Projects</span><strong>${metadata.projectCount.toLocaleString()}</strong></div>
          </div>
          <div class="data-panel">
            <p class="eyebrow">Next Hops</p>
            <div class="actions" style="margin-top:10px">
              <a class="button" href="/compare">Compare</a>
              <a class="button" href="/graph">Graph</a>
              <a class="button" href="/quality">Quality</a>
              <a class="button" href="/coverage">Coverage</a>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function recommendationCard(item: Recommendation, index: number): string {
  return `<article class="result">
    <div class="result-top">
      <div style="display:flex; gap:12px; align-items:center">
        <span class="rank">${index + 1}</span>
        <div>
          <p class="eyebrow">Recommendation confidence: ${escapeHtml(item.confidence)}</p>
          <h2>${escapeHtml(item.project.fullName)}</h2>
        </div>
      </div>
      <div class="actions">
        ${item.next_actions.map((action) => `<a class="button${action.kind === "project" ? " primary" : ""}" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
      </div>
    </div>
    <p class="muted">${escapeHtml(displayProse(item.decision_summary))}</p>
    <div class="score-box">
      ${metric("Fit", item.score)}
      ${metric("Use case", item.ranking_signals.use_case_match)}
      ${metric("Community", item.ranking_signals.community)}
      ${metric("Maintenance", item.ranking_signals.maintenance)}
      ${metric("Readiness", item.ranking_signals.readiness)}
    </div>
    <div class="tag-list">
      <span class="tag">${escapeHtml(label(item.agent_card.category))}</span>
      ${item.agent_card.deployment.slice(0, 4).map((deployment) => `<span class="tag">${escapeHtml(label(deployment))}</span>`).join("")}
      ${Object.keys(item.matched_constraints).map((key) => `<span class="tag good">Matched ${escapeHtml(label(key))}</span>`).join("")}
      ${Object.keys(item.unmatched_constraints).map((key) => `<span class="tag warn">Review ${escapeHtml(label(key))}</span>`).join("")}
    </div>
    <div>
      <p class="eyebrow">Fit Profile</p>
      <div class="fit-grid" style="margin-top:8px">
        ${fitItem("Primary fit", item.fit_profile.primary_fit)}
        ${fitItem("Deployment", item.fit_profile.deployment_fit)}
        ${fitItem("Maturity", item.fit_profile.maturity)}
        ${fitItem("Agent readiness", item.fit_profile.agent_readiness)}
      </div>
    </div>
    <div class="layout" style="grid-template-columns:minmax(0,1fr) minmax(260px,.7fr); margin-top:0">
      <div>
        <p class="eyebrow">Reasons</p>
        <ul class="reason-list">${item.reasons.slice(0, 4).map((reason) => `<li>${escapeHtml(displayProse(reason))}</li>`).join("")}</ul>
      </div>
      <div>
        <p class="eyebrow">Tradeoffs</p>
        <ul class="tradeoffs">${item.tradeoffs.length ? item.tradeoffs.slice(0, 3).map((tradeoff) => `<li>${escapeHtml(tradeoff)}</li>`).join("") : "<li>No major tradeoffs generated from indexed signals.</li>"}</ul>
      </div>
    </div>
    <div class="layout" style="grid-template-columns:minmax(0,1fr) minmax(260px,.7fr); margin-top:0">
      <div>
        <p class="eyebrow">Adoption Plan</p>
        <ul class="reason-list">${item.adoption_plan.slice(0, 4).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
      </div>
      <div>
        <p class="eyebrow">Risk Flags</p>
        <ul class="tradeoffs">${item.risk_flags.length ? item.risk_flags.slice(0, 4).map((risk) => `<li>${escapeHtml(risk)}</li>`).join("") : "<li>No major risk flags generated from indexed signals.</li>"}</ul>
      </div>
    </div>
  </article>`;
}

function metric(labelText: string, value: number): string {
  return `<div class="metric"><span>${escapeHtml(labelText)}</span><strong>${Math.round(value)}</strong></div>`;
}

function fitItem(labelText: string, value: string): string {
  return `<div class="fit-item"><span>${escapeHtml(labelText)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function queryTags(query: RecommendationQuery): string {
  const tags = [
    query.useCase ? `Use case: ${query.useCase}` : null,
    query.category ? `Category: ${label(query.category)}` : null,
    query.deployment ? `Deployment: ${label(query.deployment)}` : null,
    query.license ? `License: ${query.license}` : null,
    typeof query.cloudflareReady === "boolean" ? `Cloudflare ready: ${query.cloudflareReady ? "yes" : "no"}` : null
  ].filter((item): item is string => Boolean(item));
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function recommendApiUrl(query: RecommendationQuery): string {
  const params = new URLSearchParams();
  if (query.useCase) params.set("use_case", query.useCase);
  if (query.deployment) params.set("deployment", query.deployment);
  if (query.category) params.set("category", query.category);
  if (query.difficulty) params.set("difficulty", query.difficulty);
  if (query.language) params.set("language", query.language);
  if (query.license) params.set("license", query.license);
  if (typeof query.cloudflareReady === "boolean") params.set("cloudflare_ready", String(query.cloudflareReady));
  if (query.limit) params.set("limit", String(query.limit));
  return `/api/recommend?${params.toString()}`;
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

function displayProse(value: string): string {
  return value.replaceAll("library_only", "library-only").replace(/\ba agent\b/gi, "an agent");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
