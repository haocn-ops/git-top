import { buildKnowledgeGraph } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { findAlternativesFromList, findRelatedProjectsFromList } from "./project-search";
import { resolveProject } from "./project-aliases";
import { toProjectKnowledgeView } from "./project-view";
import type { Env, ProjectKnowledge } from "./types";

export async function renderProjectGraphPage(env: Env, id: string): Promise<Response | null> {
  const all = (await listProjectKnowledgeWithMeta(env)).projects;
  const resolution = resolveProject(all, id);
  if (!resolution) {
    return null;
  }

  const project = resolution.project;
  const graph = buildKnowledgeGraph(all, project.project.id, 28);
  const view = toProjectKnowledgeView(project);
  const alternatives = findAlternativesFromList(all, project.project.id, 6).map(toProjectKnowledgeView);
  const related = findRelatedProjectsFromList(all, project.project.id, 6).map(toProjectKnowledgeView);

  return new Response(renderGraphHtml({ project, view, alternatives, related, graph }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderGraphHtml({
  view,
  project,
  alternatives,
  related,
  graph
}: {
  project: ProjectKnowledge;
  view: ReturnType<typeof toProjectKnowledgeView>;
  alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>;
  related: Array<ReturnType<typeof toProjectKnowledgeView>>;
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
      html, body { overflow-x:hidden; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { width:100%; max-width:1240px; margin:0 auto; padding:22px; }
      .nav,.header,.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark,.feature-icon { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; color:#40505a; font-weight:800; }
      .nav-links a { white-space:nowrap; }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; text-transform:uppercase; }
      h1 { font-size:clamp(34px,5vw,58px); line-height:1; margin-top:4px; }
      h2 { font-size:19px; line-height:1.2; }
      h3 { font-size:16px; line-height:1.25; }
      h1,h2,h3,p,a,strong,span { overflow-wrap:anywhere; }
      .muted,.lead { color:#40505a; line-height:1.55; }
      .lead { max-width:780px; font-size:18px; margin-top:12px; }
      .button { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-weight:900; padding:8px 11px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:12px; margin-top:16px; }
      .panel { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:16px; }
      .graph-box { min-height:620px; overflow:hidden; }
      .side-stack { display:grid; gap:12px; align-content:start; }
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
      .stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
      .stat { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:10px; }
      .stat span { display:block; color:var(--muted); font-size:12px; font-weight:900; }
      .stat strong { display:block; margin-top:4px; font-size:18px; overflow-wrap:anywhere; }
      .action-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin-top:12px; }
      .action-grid a { min-width:0; border:1px solid var(--line); border-radius:8px; background:#fff; padding:10px; font-weight:900; color:#22313a; }
      .filter-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; margin-top:12px; }
      .filter-grid a { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:10px; font-weight:900; color:#22313a; }
      .filter-grid span { display:block; color:var(--muted); font-size:12px; margin-top:3px; }
      .legend { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .legend-item { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:999px; background:#fbfdfd; padding:7px 10px; color:#40505a; font-size:12px; font-weight:900; }
      .legend-dot { width:10px; height:10px; border-radius:999px; background:#b7c5cc; }
      .legend-dot.alternative { background:var(--teal); }
      .legend-dot.related { background:var(--blue); }
      .legend-dot.deployment { background:#5d8ad4; }
      .legend-dot.dependency { background:var(--amber); }
      .legend-dot.use_case { background:var(--green); }
      .legend-dot.category { background:#8b6a19; }
      .path-list { display:grid; gap:10px; margin-top:12px; }
      .path-list a { display:grid; gap:4px; border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:11px; }
      .path-list strong { color:#22313a; }
      .path-list span { color:var(--muted); line-height:1.45; }
      @media (max-width:900px) { .layout,.three-grid { grid-template-columns:1fr; } .graph-box { min-height:auto; } }
      @media (max-width:900px) { .stat-grid,.action-grid,.filter-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:560px) { .page { padding:16px; } .nav-links { width:100%; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); justify-content:stretch; } .nav-links a { min-height:34px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.72); overflow:hidden; text-align:center; text-overflow:ellipsis; padding:7px 8px; } .stat-grid,.action-grid,.filter-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/projects/${escapeAttr(view.repo)}">Project</a><a href="/alternatives/${escapeAttr(view.repo)}">Alternatives</a><a href="/api/graph?repo=${escapeAttr(view.repo)}">Graph API</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="header">
        <div>
          <p class="eyebrow">Project Graph</p>
          <h1>${escapeHtml(view.repo)}</h1>
          <p class="lead">A relationship view of alternatives, deployments, compatible protocols, dependencies, use cases, and categories.</p>
        </div>
        <div class="nav-links">
          <a class="button primary" href="/api/graph?repo=${escapeAttr(view.repo)}">JSON</a>
          <a class="button" href="/alternatives/${escapeAttr(view.repo)}">Alternatives</a>
          <a class="button" href="/api/compare?repos=${escapeAttr(compareRepos(view, alternatives))}">Compare</a>
        </div>
      </header>

      <section class="panel" aria-label="Graph summary">
        <p class="eyebrow">Graph Summary</p>
        <h2>${escapeHtml(graph.summary ?? `${view.repo} relationship graph`)}</h2>
        <div class="stat-grid">
          <div class="stat"><span>Nodes</span><strong>${graph.graphStats.nodeCount}</strong></div>
          <div class="stat"><span>Edges</span><strong>${graph.graphStats.edgeCount}</strong></div>
          <div class="stat"><span>Projects</span><strong>${graph.graphStats.projectCount}</strong></div>
          <div class="stat"><span>Dependencies</span><strong>${graph.graphStats.relationshipCounts.dependency}</strong></div>
        </div>
        <div class="action-grid">
          ${(graph.nextActions ?? []).map((action) => `<a href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
        </div>
        ${renderRelationshipFilters(graph)}
      </section>

      <section class="three-grid">
        <article class="panel">
          <p class="eyebrow">Project Context</p>
          <h2>${escapeHtml(view.name)}</h2>
          <div class="list">
            <div><strong>Maintainer</strong><span>${escapeHtml(project.project.owner)}</span></div>
            <div><strong>License</strong><span>${escapeHtml(view.license ?? "Unknown")}</span></div>
            <div><strong>Language</strong><span>${escapeHtml(view.language ?? "Unknown")}</span></div>
            <div><strong>Recent activity</strong><span>${escapeHtml(recentActivityLabel(project.metrics.recentPushDays))}</span></div>
          </div>
        </article>
        ${panel("Deployment Targets", view.deployments, "relationship-deployments")}
        ${panel("Dependencies", view.dependencies.length ? view.dependencies : ["LLM provider"], "relationship-dependencies")}
      </section>

      <section class="layout">
        <article class="panel graph-box">
          <div class="panel-heading"><div><p class="eyebrow">Knowledge Graph</p><h2>${graph.nodes.length} nodes / ${graph.edges.length} edges</h2></div></div>
          ${renderSvg(view.repo, ringNodes)}
        </article>

        <div class="side-stack">
          <aside class="panel">
            <p class="eyebrow">Recommended Next Hops</p>
            <h2>Continue the exploration</h2>
            <div class="path-list">
              ${explorationPaths(view, alternatives, related)
                .map((path) => `<a href="${escapeAttr(path.href)}"><strong>${escapeHtml(path.label)}</strong><span>${escapeHtml(path.description)}</span></a>`)
                .join("")}
            </div>
          </aside>

          <aside class="panel">
            <p class="eyebrow">Relationship Legend</p>
            <h2>How to read this graph</h2>
            <div class="legend">${relationshipLegend(graph)
              .map((item) => `<span class="legend-item"><span class="legend-dot ${escapeAttr(item.kind)}"></span>${escapeHtml(item.label)}: ${item.count}</span>`)
              .join("")}</div>
          </aside>

          <aside class="panel">
            <div class="panel-heading" id="relationship-related"><div><p class="eyebrow">Related Network</p><h2>Adjacent projects</h2></div><a class="button" href="/api/related/${escapeAttr(view.repo)}">JSON</a></div>
            <div class="list">${related.length ? related.map((item) => `<div><strong>${escapeHtml(view.repo)} ↔ ${escapeHtml(item.repo)}</strong><span>${escapeHtml(item.overview)}</span></div>`).join("") : `<div><strong>No related projects yet</strong><span>Git.Top will infer related projects as the graph grows.</span></div>`}</div>
          </aside>

          <aside class="panel">
            <div class="panel-heading" id="relationship-alternatives"><div><p class="eyebrow">Alternatives Network</p><h2>Replacement candidates</h2></div><a class="button" href="/api/alternatives/${escapeAttr(view.repo)}">JSON</a></div>
            <div class="list">${alternatives.length ? alternatives.map((item) => `<div><strong>${escapeHtml(view.repo)} ↔ ${escapeHtml(item.repo)}</strong><span>${escapeHtml(item.overview)}</span></div>`).join("") : `<div><strong>No alternatives yet</strong><span>Git.Top will infer alternatives as the graph grows.</span></div>`}</div>
          </aside>
        </div>
      </section>

      <section class="three-grid">
        ${panel("Use Cases", view.useCases, "relationship-use-cases")}
        ${panel("Categories", view.category.map((item) => item.replaceAll("_", " ")), "relationship-categories")}
        ${panel("Alternatives", alternatives.length ? alternatives.map((item) => item.repo) : ["No alternatives yet"])}
        ${panel("Related Projects", related.length ? related.map((item) => item.repo) : ["No related projects yet"])}
      </section>
    </div>
  </body>
</html>`;
}

function renderRelationshipFilters(graph: ReturnType<typeof buildKnowledgeGraph>): string {
  const groups = graph.relationshipGroups;
  if (!groups) {
    return "";
  }
  const filters = [
    { label: "Alternatives", href: "#relationship-alternatives", count: groups.alternatives.length },
    { label: "Related", href: "#relationship-related", count: groups.related.length },
    { label: "Dependencies", href: "#relationship-dependencies", count: groups.dependencies.length },
    { label: "Deployments", href: "#relationship-deployments", count: groups.deploymentTargets.length },
    { label: "Use Cases", href: "#relationship-use-cases", count: groups.useCases.length },
    { label: "Categories", href: "#relationship-categories", count: graph.graphStats.relationshipCounts.category }
  ];
  return `<div class="filter-grid" aria-label="Relationship filters">${filters
    .map((filter) => `<a href="${escapeAttr(filter.href)}">${escapeHtml(filter.label)}<span>${filter.count} linked signals</span></a>`)
    .join("")}</div>`;
}

function relationshipLegend(graph: ReturnType<typeof buildKnowledgeGraph>): Array<{ kind: string; label: string; count: number }> {
  return [
    { kind: "alternative", label: "Alternatives", count: graph.graphStats.relationshipCounts.alternative },
    { kind: "related", label: "Related", count: graph.graphStats.relationshipCounts.related },
    { kind: "deployment", label: "Deployment", count: graph.graphStats.relationshipCounts.deployment },
    { kind: "dependency", label: "Dependency", count: graph.graphStats.relationshipCounts.dependency },
    { kind: "use_case", label: "Use case", count: graph.graphStats.relationshipCounts.use_case },
    { kind: "category", label: "Category", count: graph.graphStats.relationshipCounts.category }
  ];
}

function explorationPaths(
  view: ReturnType<typeof toProjectKnowledgeView>,
  alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>,
  related: Array<ReturnType<typeof toProjectKnowledgeView>>
): Array<{ label: string; href: string; description: string }> {
  return [
    {
      label: "Recommend a matching stack",
      href: recommendHref(view),
      description: "Use category, deployment, license, and Cloudflare fit to find candidates beyond this graph."
    },
    {
      label: "Open the Atlas layer",
      href: `/atlas/${atlasIdFor(view)}`,
      description: "Move from one project into the broader ecosystem map."
    },
    {
      label: "Compare the shortlist",
      href: `/api/compare?repos=${escapeAttr(compareRepos(view, alternatives.length ? alternatives : related))}`,
      description: "Turn this graph neighborhood into a decision matrix."
    },
    {
      label: "Explain adoption risk",
      href: `/score/${escapeAttr(view.repo)}`,
      description: "Inspect Git.Top Score, agent readability, maintenance, and stability signals."
    },
    {
      label: "Use Graph JSON",
      href: `/api/graph?repo=${escapeAttr(view.repo)}&limit=28`,
      description: "Fetch the same relationship model for an agent or external workflow."
    }
  ];
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

function panel(title: string, items: string[], id?: string): string {
  return `<article class="panel"${id ? ` id="${escapeAttr(id)}"` : ""}><p class="eyebrow">${escapeHtml(title)}</p><div class="tag-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></article>`;
}

function compareRepos(view: ReturnType<typeof toProjectKnowledgeView>, alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>): string {
  return [view.repo, ...alternatives.slice(0, 3).map((item) => item.repo)].join(",");
}

function recommendHref(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const params = new URLSearchParams();
  const category = view.category[0];
  const deployment = preferredDeployment(view.deployments);
  if (category) {
    params.set("category", category);
  }
  if (deployment) {
    params.set("deployment", deployment);
  }
  if (view.license) {
    params.set("license", view.license);
  }
  if (view.cloudflareReady) {
    params.set("cloudflare_ready", "true");
  }
  params.set("limit", "5");
  return `/recommend?${params.toString()}`;
}

function preferredDeployment(deployments: string[]): string | null {
  return deployments.find((deployment) => deployment === "cloudflare") ?? deployments.find((deployment) => deployment === "docker") ?? deployments[0] ?? null;
}

function atlasIdFor(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const category = view.category.join(" ");
  if (view.deployments.includes("cloudflare") || view.cloudflareReady) {
    return "cloudflare";
  }
  if (category.includes("mcp")) {
    return "mcp";
  }
  if (category.includes("rag")) {
    return "rag";
  }
  if (category.includes("browser")) {
    return "browser-ai";
  }
  if (category.includes("agent")) {
    return "agents";
  }
  return "agents";
}

function recentActivityLabel(days: number | null): string {
  if (days === null) {
    return "Unknown recent push activity";
  }
  if (days <= 7) {
    return "Active in the last week";
  }
  if (days <= 30) {
    return "Active in the last month";
  }
  if (days <= 90) {
    return "Active in the last quarter";
  }
  return `Last push ${days} days ago`;
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
