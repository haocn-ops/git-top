import { buildKnowledgeGraph } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { findAlternativesFromList, getProjectKnowledgeFromList } from "./project-search";
import { toProjectKnowledgeView } from "./project-view";
import type { Env } from "./types";

export async function renderProjectGraphPage(env: Env, id: string): Promise<Response | null> {
  const all = (await listProjectKnowledgeWithMeta(env)).projects;
  const project = getProjectKnowledgeFromList(all, id);
  if (!project) {
    return null;
  }

  const graph = buildKnowledgeGraph(all, project.project.id, 28);
  const view = toProjectKnowledgeView(project);
  const alternatives = findAlternativesFromList(all, project.project.id, 6).map(toProjectKnowledgeView);

  return new Response(renderGraphHtml({ view, alternatives, graph }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderGraphHtml({
  view,
  alternatives,
  graph
}: {
  view: ReturnType<typeof toProjectKnowledgeView>;
  alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>;
  graph: ReturnType<typeof buildKnowledgeGraph>;
}): string {
  const nodes = graph.nodes.slice(0, 22);
  const focusNode = nodes.find((node) => node.id === view.repo) ?? nodes[0];
  const ringNodes = nodes.filter((node) => node.id !== focusNode?.id).slice(0, 14);

  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(view.name)} Graph | Git.Top</title>
    <meta name="description" content="Knowledge graph for ${escapeAttr(view.repo)}: alternatives, deployments, dependencies, compatible protocols, and use cases." />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --green:#147d4f; --amber:#a15c07; --blue:#355c9f; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
      h3 { font-size:16px; line-height:1.25; }
      .muted,.lead { color:#40505a; line-height:1.55; }
      .lead { max-width:780px; font-size:18px; margin-top:12px; }
      .button { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-weight:900; padding:8px 11px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:12px; margin-top:16px; }
      .panel { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:16px; }
      .graph-box { min-height:620px; overflow:hidden; }
      svg { width:100%; height:auto; display:block; }
      .node-label { font-size:12px; font-weight:800; fill:#22313a; }
      .edge { stroke:#b7c5cc; stroke-width:1.6; }
      .node-project { fill:#eefaf4; stroke:#8fd0b1; }
      .node-deployment { fill:#f0f6ff; stroke:#b8cdf0; }
      .node-category { fill:#fff8e7; stroke:#dfd2a9; }
      .node-use_case,.node-dependency { fill:#fbfdfd; stroke:#dce3e8; }
      .list { display:grid; gap:10px; margin-top:12px; }
      .list div { display:grid; gap:4px; border-top:1px solid var(--line); padding-top:10px; }
      .list div:first-child { border-top:0; padding-top:0; }
      .list span { color:var(--muted); line-height:1.45; }
      .tag-list { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .tag-list span { border:1px solid var(--line); border-radius:999px; background:#f8fafb; color:#40505a; font-size:12px; font-weight:900; padding:6px 9px; }
      .three-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:12px; }
      @media (max-width:900px) { .layout,.three-grid { grid-template-columns:1fr; } .graph-box { min-height:auto; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/projects/${escapeAttr(view.repo)}">Project</a><a href="/api/graph?repo=${escapeAttr(view.repo)}">Graph API</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="header">
        <div>
          <p class="eyebrow">Project Graph</p>
          <h1>${escapeHtml(view.repo)}</h1>
          <p class="lead">A relationship view of alternatives, deployments, compatible protocols, dependencies, use cases, and categories.</p>
        </div>
        <a class="button primary" href="/api/graph?repo=${escapeAttr(view.repo)}">JSON</a>
      </header>

      <section class="layout">
        <article class="panel graph-box">
          <div class="panel-heading"><div><p class="eyebrow">Knowledge Graph</p><h2>${graph.nodes.length} nodes / ${graph.edges.length} edges</h2></div></div>
          ${renderSvg(view.repo, ringNodes)}
        </article>

        <aside class="panel">
          <p class="eyebrow">Alternatives Network</p>
          <h2>${escapeHtml(view.name)} alternatives</h2>
          <div class="list">${alternatives.length ? alternatives.map((item) => `<div><strong>${escapeHtml(view.repo)} ↔ ${escapeHtml(item.repo)}</strong><span>${escapeHtml(item.overview)}</span></div>`).join("") : `<div><strong>No alternatives yet</strong><span>Git.Top will infer alternatives as the graph grows.</span></div>`}</div>
        </aside>
      </section>

      <section class="three-grid">
        ${panel("Deploy", view.deployments)}
        ${panel("Compatible With", view.dependencies.length ? view.dependencies : ["LLM provider"])}
        ${panel("Use Cases", view.useCases)}
      </section>
    </div>
  </body>
</html>`;
}

function renderSvg(focusRepo: string, nodes: Array<{ id: string; label: string; kind: string; score?: number }>): string {
  const centerX = 420;
  const centerY = 310;
  const radius = 220;
  const positioned = nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;
    return {
      ...node,
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius)
    };
  });

  return `<svg viewBox="0 0 840 640" role="img" aria-label="${escapeAttr(focusRepo)} knowledge graph">
    ${positioned.map((node) => `<line class="edge" x1="${centerX}" y1="${centerY}" x2="${node.x}" y2="${node.y}" />`).join("")}
    <circle class="node-project" cx="${centerX}" cy="${centerY}" r="74" />
    <text class="node-label" x="${centerX}" y="${centerY - 6}" text-anchor="middle">${escapeHtml(shortLabel(focusRepo, 18))}</text>
    <text class="node-label" x="${centerX}" y="${centerY + 14}" text-anchor="middle">focus</text>
    ${positioned.map((node) => `<g>
      <circle class="node-${escapeAttr(node.kind)}" cx="${node.x}" cy="${node.y}" r="48" />
      <text class="node-label" x="${node.x}" y="${node.y - 5}" text-anchor="middle">${escapeHtml(shortLabel(node.label, 14))}</text>
      <text class="node-label" x="${node.x}" y="${node.y + 13}" text-anchor="middle">${escapeHtml(node.kind.replace("_", " "))}</text>
    </g>`).join("")}
  </svg>`;
}

function panel(title: string, items: string[]): string {
  return `<article class="panel"><p class="eyebrow">${escapeHtml(title)}</p><div class="tag-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></article>`;
}

function shortLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
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
