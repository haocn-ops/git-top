import { compareProjectKnowledge, buildKnowledgeGraph } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { findAlternativesFromList, getProjectKnowledgeFromList } from "./project-search";
import { toProjectKnowledgeView } from "./project-view";
import type { Env } from "./types";

export async function renderProjectPage(env: Env, id: string): Promise<Response | null> {
  const projects = (await listProjectKnowledgeWithMeta(env)).projects;
  const project = getProjectKnowledgeFromList(projects, id);
  if (!project) {
    return null;
  }

  const view = toProjectKnowledgeView(project);
  const alternativeProjects = findAlternativesFromList(projects, project.project.id, 5);
  const alternatives = alternativeProjects.map(toProjectKnowledgeView);
  const compare = compareProjectKnowledge([project, ...alternativeProjects.slice(0, 3)], {
    deployment: view.deployments.includes("cloudflare") ? "cloudflare" : undefined
  });
  const graph = buildKnowledgeGraph([project, ...alternativeProjects], project.project.id, 18);

  return new Response(renderHtml({ view, alternatives, compare, graphNodes: graph.nodes.length, graphEdges: graph.edges.length }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderHtml({
  view,
  alternatives,
  compare,
  graphNodes,
  graphEdges
}: {
  view: ReturnType<typeof toProjectKnowledgeView>;
  alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>;
  compare: ReturnType<typeof compareProjectKnowledge>;
  graphNodes: number;
  graphEdges: number;
}): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(view.name)} | Git.Top Project Knowledge</title>
    <meta name="description" content="${escapeAttr(view.description)}" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --green:#147d4f; --amber:#a15c07; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { max-width:1240px; margin:0 auto; padding:22px; }
      .nav,.header,.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark,.feature-icon { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links { display:flex; gap:10px; color:#40505a; font-weight:800; }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; text-transform:uppercase; }
      h1 { font-size:clamp(34px,5vw,58px); line-height:1; margin-top:4px; }
      h2 { font-size:19px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .muted,.lead { color:#40505a; line-height:1.55; }
      .lead { max-width:780px; font-size:18px; margin-top:12px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:34px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-weight:900; padding:7px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .hero { border:1px solid var(--line); border-radius:8px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.92)); box-shadow:var(--shadow); padding:22px; }
      .score-grid,.section-grid { display:grid; gap:12px; }
      .score-grid { grid-template-columns:repeat(5,minmax(0,1fr)); margin-top:18px; }
      .section-grid { grid-template-columns:minmax(0,1fr) 360px; margin-top:14px; }
      .three-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .panel { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:16px; }
      .metric { display:grid; gap:7px; min-height:110px; border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:13px; }
      .metric span,.list span,.compare-row span { color:var(--muted); }
      .metric strong { font-size:28px; line-height:1; }
      .tag-list { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .tag-list span { border:1px solid var(--line); border-radius:999px; background:#f8fafb; color:#40505a; font-size:12px; font-weight:900; padding:6px 9px; }
      .list { display:grid; gap:10px; margin-top:12px; }
      .list div { display:grid; gap:4px; border-top:1px solid var(--line); padding-top:10px; }
      .list div:first-child { border-top:0; padding-top:0; }
      .compare { display:grid; min-width:820px; }
      .compare-row { display:grid; grid-template-columns:minmax(240px,1.4fr) 90px 80px 80px 110px 110px; align-items:center; gap:12px; border-top:1px solid var(--line); padding:12px 0; }
      .compare-head { border-top:0; color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      .table-wrap { overflow-x:auto; }
      @media (max-width:900px) { .score-grid,.section-grid,.three-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/graph">Graph</a><a href="/api/project/${escapeAttr(view.repo)}">API</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Project Knowledge</p>
        <h1>${escapeHtml(view.repo)}</h1>
        <p class="lead">${escapeHtml(view.overview)}</p>
        <div class="tag-list">${view.category.concat(view.tags.slice(0, 8)).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      </header>

      <section class="score-grid">
        ${metric("Agent Score", `${view.agentScore}/100`)}
        ${metric("Documentation", view.agentScoreBreakdown.documentation)}
        ${metric("Maintenance", view.agentScoreBreakdown.maintenance)}
        ${metric("Deployment", view.agentScoreBreakdown.deployment)}
        ${metric("Quality", `${view.qualityScore}/100`)}
      </section>

      <section class="section-grid">
        <article class="panel">
          <div class="panel-heading"><div><p class="eyebrow">Alternatives</p><h2>Comparable projects</h2></div><a class="button" href="/api/alternatives/${escapeAttr(view.repo)}">JSON</a></div>
          <div class="list">${alternatives.length ? alternatives.map((item) => `<div><strong>${escapeHtml(item.repo)}</strong><span>${escapeHtml(item.overview)}</span></div>`).join("") : `<div><strong>No alternatives yet</strong><span>Git.Top will infer alternatives as the graph grows.</span></div>`}</div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Graph</p>
          <h2>${graphNodes} nodes / ${graphEdges} edges</h2>
          <p class="muted">This project is connected through alternatives, deployments, use cases, dependencies, and categories.</p>
          <div class="tag-list"><a class="button primary" href="/api/graph?repo=${escapeAttr(view.repo)}">Graph JSON</a></div>
        </aside>
      </section>

      <section class="three-grid">
        ${panel("Deploy", "Supported deployment paths", view.deployments)}
        ${panel("Compatible With", "Inferred dependencies and protocols", view.dependencies.length ? view.dependencies : ["LLM provider"])}
        ${panel("Use Cases", "Where agents should consider it", view.useCases)}
      </section>

      <section class="panel table-wrap" style="margin-top:14px">
        <div class="panel-heading"><div><p class="eyebrow">Compare</p><h2>${escapeHtml(compare.winner ?? view.repo)} leads this context</h2></div><a class="button" href="/api/compare?repos=${escapeAttr([view.repo, ...alternatives.slice(0, 3).map((item) => item.repo)].join(","))}">JSON</a></div>
        <div class="compare">
          <div class="compare-row compare-head"><span>Project</span><span>Stars</span><span>Agent</span><span>Local</span><span>Cloudflare</span><span>Score</span></div>
          ${compare.projects.map((item) => `<div class="compare-row"><strong>${escapeHtml(item.repo)}</strong><span>${formatNumber(item.stars)}</span><span>${yes(item.agent)}</span><span>${yes(item.local)}</span><span>${yes(item.cloudflare)}</span><strong>${item.agentScore}</strong></div>`).join("")}
        </div>
      </section>
    </div>
  </body>
</html>`;
}

function metric(label: string, value: string | number): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function panel(eyebrow: string, title: string, items: string[]): string {
  return `<article class="panel"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><div class="tag-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></article>`;
}

function yes(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
