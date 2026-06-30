import { compareProjectKnowledge, buildKnowledgeGraph } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { findAlternativesFromList, findRelatedProjectsFromList, getProjectKnowledgeFromList } from "./project-search";
import { toProjectKnowledgeView } from "./project-view";
import type { ClassificationSignal, Env } from "./types";

export async function renderProjectPage(env: Env, id: string): Promise<Response | null> {
  const projects = (await listProjectKnowledgeWithMeta(env)).projects;
  const project = getProjectKnowledgeFromList(projects, id);
  if (!project) {
    return null;
  }

  const view = toProjectKnowledgeView(project);
  const alternativeProjects = findAlternativesFromList(projects, project.project.id, 5);
  const alternatives = alternativeProjects.map(toProjectKnowledgeView);
  const related = findRelatedProjectsFromList(projects, project.project.id, 6).map(toProjectKnowledgeView);
  const compare = compareProjectKnowledge([project, ...alternativeProjects.slice(0, 3)], {
    deployment: view.deployments.includes("cloudflare") ? "cloudflare" : undefined
  });
  const graph = buildKnowledgeGraph([project, ...alternativeProjects], project.project.id, 18);

  return new Response(
    renderHtml({
      view,
      alternatives,
      related,
      compare,
      graphNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
      syncedAt: project.project.syncedAt,
      metricsAt: project.metrics.calculatedAt
    }),
    {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
    }
  );
}

function renderHtml({
  view,
  alternatives,
  related,
  compare,
  graphNodes,
  graphEdges,
  syncedAt,
  metricsAt
}: {
  view: ReturnType<typeof toProjectKnowledgeView>;
  alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>;
  related: Array<ReturnType<typeof toProjectKnowledgeView>>;
  compare: ReturnType<typeof compareProjectKnowledge>;
  graphNodes: number;
  graphEdges: number;
  syncedAt: string;
  metricsAt: string;
}): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(view.name)} | Git.Top Project Knowledge</title>
    <meta name="description" content="${escapeAttr(view.description)}" />
    <link rel="canonical" href="https://git.top/projects/${escapeAttr(view.repo)}" />
    <meta property="og:title" content="${escapeAttr(`${view.repo} | Git.Top Project Knowledge`)}" />
    <meta property="og:description" content="${escapeAttr(view.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/projects/${escapeAttr(view.repo)}" />
    <meta property="og:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(view.repo))}&amp;subtitle=${escapeAttr(encodeURIComponent(view.description))}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(view.repo))}&amp;subtitle=${escapeAttr(encodeURIComponent(view.description))}" />
    <script type="application/ld+json">${jsonLd(view, syncedAt, metricsAt, graphNodes, graphEdges)}</script>
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
      .summary-grid,.score-grid,.section-grid { display:grid; gap:12px; }
      .summary-grid { grid-template-columns:repeat(4,minmax(0,1fr)); margin-top:18px; }
      .score-grid { grid-template-columns:repeat(5,minmax(0,1fr)); margin-top:18px; }
      .section-grid { grid-template-columns:minmax(0,1fr) 360px; margin-top:14px; }
      .three-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .panel { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:16px; }
      .summary-card { display:grid; gap:10px; border:1px solid var(--line); border-radius:8px; background:#fbfdfd; box-shadow:var(--shadow); padding:14px; }
      .metric { display:grid; gap:7px; min-height:110px; border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:13px; }
      .metric span,.list span,.compare-row span { color:var(--muted); }
      .metric strong { font-size:28px; line-height:1; }
      .tag-list { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .tag-list span { border:1px solid var(--line); border-radius:999px; background:#f8fafb; color:#40505a; font-size:12px; font-weight:900; padding:6px 9px; }
      .facts { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }
      .fact { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:10px; }
      .fact span { display:block; color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      .fact strong { display:block; margin-top:4px; overflow-wrap:anywhere; }
      .list { display:grid; gap:10px; margin-top:12px; }
      .list div { display:grid; gap:4px; border-top:1px solid var(--line); padding-top:10px; }
      .list div:first-child { border-top:0; padding-top:0; }
      .compare { display:grid; min-width:820px; }
      .compare-row { display:grid; grid-template-columns:minmax(240px,1.4fr) 90px 80px 80px 110px 110px; align-items:center; gap:12px; border-top:1px solid var(--line); padding:12px 0; }
      .compare-head { border-top:0; color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      .table-wrap { overflow-x:auto; }
      .trust-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .decision-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .evidence-list { display:grid; gap:9px; margin-top:12px; }
      .evidence-list div { border-top:1px solid var(--line); padding-top:9px; }
      .evidence-list div:first-child { border-top:0; padding-top:0; }
      .evidence-list span { color:var(--muted); }
      @media (max-width:900px) { .summary-grid,.score-grid,.section-grid,.three-grid,.facts { grid-template-columns:1fr; } }
      @media (max-width:900px) { .trust-grid,.decision-grid { grid-template-columns:1fr; } }
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
        <div class="facts">
          ${fact("Type", projectKindLabel(view))}
          ${fact("Difficulty", view.difficulty)}
          ${fact("Language", view.language ?? "Unknown")}
          ${fact("License", view.license ?? "Unknown")}
        </div>
        <div class="tag-list">
          <a class="button primary" href="${escapeAttr(view.githubUrl)}">GitHub</a>
          ${view.homepageUrl ? `<a class="button" href="${escapeAttr(view.homepageUrl)}">Homepage</a>` : ""}
          <a class="button" href="/api/project/${escapeAttr(view.repo)}">Project JSON</a>
          <a class="button" href="/graph/${escapeAttr(view.repo)}">Graph</a>
          <a class="button" href="/score/${escapeAttr(view.repo)}">Score</a>
        </div>
      </header>

      <section class="summary-grid" aria-label="Agent summary">
        <article class="summary-card">
          <p class="eyebrow">TL;DR</p>
          <h2>${escapeHtml(view.summary.tl_dr)}</h2>
          <p class="muted">${escapeHtml(view.summary.purpose)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Install</p>
          <h2>${escapeHtml(view.summary.install ?? "No install hint")}</h2>
          <div class="tag-list">${view.summary.deployment.slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Good For</p>
          <div class="list">${view.summary.good_for.slice(0, 3).map((item) => `<div><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Not Good For</p>
          <div class="list">${view.summary.not_good_for.slice(0, 3).map((item) => `<div><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>
        </article>
      </section>

      <section class="score-grid">
        ${metric("Git.Top Score", `${view.gitTopScore}/100`)}
        ${metric("Agent Score", `${view.agentScore}/100`)}
        ${metric("Maintenance", view.gitTopScoreBreakdown.maintenance)}
        ${metric("Stability", view.gitTopScoreBreakdown.stability)}
        ${metric("Quality", `${view.qualityScore}/100`)}
      </section>

      <section class="decision-grid" aria-label="Decision summary">
        ${decisionCard("Best Use", bestUseCase(view), "Primary situation where this project is a good shortlist candidate.")}
        ${decisionCard("Watch Out", primaryCaveat(view), "Main reason to compare alternatives before adopting it.")}
        ${decisionCard("Deployment Fit", deploymentFit(view), cloudflareReadinessDescription(view))}
        ${decisionCard("Best Alternative", alternativeDistinction(alternatives), "Compare this option when the target stack or language preference differs.")}
        ${decisionCard("Confidence", classificationConfidenceSummary(view), "Classification evidence and quality signal confidence should be checked before production recommendations.")}
        ${decisionCard("Freshness", freshnessSummary(syncedAt, metricsAt), "Repository and metric timestamps for this knowledge record.")}
      </section>

      <section class="trust-grid">
        <article class="panel">
          <p class="eyebrow">Freshness</p>
          <h2>Repository and metrics timestamps</h2>
          <div class="evidence-list">
            <div><strong>Repository synced</strong><span>${escapeHtml(syncedAt)}</span></div>
            <div><strong>Metrics calculated</strong><span>${escapeHtml(metricsAt)}</span></div>
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Scoring</p>
          <h2>Quality and agent score are separate</h2>
          <p class="muted">Quality score weights star movement, commits, releases, contributors, and issue response. Agent score weights documentation, maintenance, deployment, popularity, and community.</p>
          <div class="tag-list"><a class="button" href="/score/${escapeAttr(view.repo)}">Why this score</a><a class="button" href="/docs#scoring">Methodology</a></div>
        </article>
        <article class="panel">
          <p class="eyebrow">Confidence</p>
          <h2>Signal confidence</h2>
          <div class="evidence-list">
            ${confidenceRows(view)}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Badge</p>
          <h2>Agent Score badge</h2>
          <p class="muted">Embed a lightweight SVG badge for this repository.</p>
          <div class="tag-list"><a class="button" href="/badge/${escapeAttr(view.repo)}.svg">Open Badge</a></div>
        </article>
      </section>

      <section class="three-grid">
        <article class="panel">
          <p class="eyebrow">Project Type</p>
          <h2>${escapeHtml(projectKindLabel(view))}</h2>
          <p class="muted">${escapeHtml(projectKindDescription(view))}</p>
          ${collectionDetails(view)}
        </article>
        <article class="panel">
          <p class="eyebrow">Cloudflare Readiness</p>
          <h2>${escapeHtml(cloudflareReadinessLabel(view))}</h2>
          <p class="muted">${escapeHtml(cloudflareReadinessDescription(view))}</p>
        </article>
        <article class="panel">
          <p class="eyebrow">Selection Guidance</p>
          <h2>Use the evidence before choosing</h2>
          <p class="muted">Treat this page as a shortlist input. Confirm source metadata, classification confidence, deployment evidence, and current repository activity before making a production recommendation.</p>
        </article>
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

      <section class="panel" style="margin-top:14px">
        <div class="panel-heading"><div><p class="eyebrow">Related Projects</p><h2>Adjacent ecosystem projects</h2></div><a class="button" href="/api/related/${escapeAttr(view.repo)}">JSON</a></div>
        <div class="list">${related.length ? related.map((item) => `<div><strong>${escapeHtml(item.repo)}</strong><span>${escapeHtml(relatedSummary(view, item))}</span></div>`).join("") : `<div><strong>No related projects yet</strong><span>Git.Top will infer related projects from categories, deployments, dependencies, topics, and use cases.</span></div>`}</div>
      </section>

      <section class="three-grid">
        ${panel("Deploy", "Supported deployment paths", view.deployments)}
        ${panel("Compatible With", "Inferred dependencies and protocols", view.dependencies.length ? view.dependencies : ["LLM provider"])}
        ${panel("Use Cases", "Where agents should consider it", view.useCases)}
      </section>

      <section class="panel" style="margin-top:14px">
        <div class="panel-heading"><div><p class="eyebrow">Classification Evidence</p><h2>Why Git.Top categorized this project</h2></div><a class="button" href="/api/project/${escapeAttr(view.repo)}">Full JSON</a></div>
        <div class="evidence-list">
          ${classificationRows(view)}
        </div>
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

function fact(label: string, value: string): string {
  return `<div class="fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function panel(eyebrow: string, title: string, items: string[]): string {
  return `<article class="panel"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><div class="tag-list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div></article>`;
}

function decisionCard(label: string, title: string, note: string): string {
  return `<article class="panel"><p class="eyebrow">${escapeHtml(label)}</p><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(note)}</p></article>`;
}

function bestUseCase(view: ReturnType<typeof toProjectKnowledgeView>): string {
  return view.useCases[0] ?? view.overview;
}

function primaryCaveat(view: ReturnType<typeof toProjectKnowledgeView>): string {
  return view.notGoodFor[0] ?? (view.projectKind === "collection" ? "Treat collection items as discovery inputs, not direct production dependencies." : "Confirm deployment, maintenance, and license fit before adoption.");
}

function deploymentFit(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const targets = view.deployments.slice(0, 3).join(", ") || "Unknown";
  return view.cloudflareReady ? `${targets}; Cloudflare-ready` : targets;
}

function alternativeDistinction(alternatives: Array<ReturnType<typeof toProjectKnowledgeView>>): string {
  const alternative = alternatives[0];
  if (!alternative) {
    return "No strong alternative yet";
  }
  const deploy = alternative.deployments.slice(0, 2).join(", ") || "deployment differs";
  return `${alternative.repo}: ${deploy}`;
}

function relatedSummary(
  source: ReturnType<typeof toProjectKnowledgeView>,
  target: ReturnType<typeof toProjectKnowledgeView>
): string {
  const sharedCategory = source.category.find((category) => target.category.includes(category));
  const sharedDeployment = source.deployments.find((deployment) => target.deployments.includes(deployment));
  const sharedDependency = source.dependencies.find((dependency) => target.dependencies.includes(dependency));
  if (sharedCategory && sharedDeployment) {
    return `${target.overview} Shared ${sharedCategory.replaceAll("_", " ")} category and ${sharedDeployment} deployment context.`;
  }
  if (sharedDependency) {
    return `${target.overview} Shared ${sharedDependency} dependency context.`;
  }
  if (sharedCategory) {
    return `${target.overview} Same ${sharedCategory.replaceAll("_", " ")} ecosystem.`;
  }
  if (sharedDeployment) {
    return `${target.overview} Related through ${sharedDeployment} deployment fit.`;
  }
  return target.overview;
}

function classificationConfidenceSummary(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const signals = Object.values(view.classification ?? {});
  const highCount = signals.filter((signal) => signal?.confidence === "high").length;
  const total = signals.length || 4;
  const quality = Object.values(view.qualitySignalConfidence ?? {}).filter((value) => value === "complete" || value === "snapshot").length;
  return `${highCount}/${total} classification signals high; ${quality} quality signals complete or snapshot`;
}

function freshnessSummary(syncedAt: string, metricsAt: string): string {
  return `Repo ${formatDate(syncedAt)}; metrics ${formatDate(metricsAt)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

function projectKindLabel(view: ReturnType<typeof toProjectKnowledgeView>): string {
  return view.projectKind === "collection" ? "Collection / resource hub" : "Project / implementation";
}

function projectKindDescription(view: ReturnType<typeof toProjectKnowledgeView>): string {
  if (view.projectKind !== "collection") {
    return "This repository is treated as an implementation project. Compare its deployment fit, maintenance, and alternatives before adopting it.";
  }
  return "This repository is treated as a collection, cookbook, awesome list, or resource hub. Use it for discovery and examples before treating linked projects as production dependencies.";
}

function collectionDetails(view: ReturnType<typeof toProjectKnowledgeView>): string {
  if (!view.collectionMetadata) {
    return "";
  }
  const rows = [
    ["Scope", label(view.collectionMetadata.scope)],
    ["Curated", view.collectionMetadata.curated ? "Yes" : "No"],
    ["Estimated items", view.collectionMetadata.estimatedItems === null ? "Unknown" : String(view.collectionMetadata.estimatedItems)],
    ["Freshness", label(view.collectionMetadata.freshness)]
  ];
  return `<div class="evidence-list">${rows.map(([name, value]) => `<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}</div>`;
}

function cloudflareReadinessLabel(view: ReturnType<typeof toProjectKnowledgeView>): string {
  return view.cloudflareReady ? "Cloudflare evidence found" : "No Cloudflare-ready signal";
}

function cloudflareReadinessDescription(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const evidence = view.classification?.cloudflareReady?.evidence?.[0];
  if (view.cloudflareReady) {
    return evidence
      ? `Git.Top found Cloudflare deployment evidence: ${evidence}`
      : "Git.Top found Cloudflare deployment signals. Inspect the JSON classification evidence before relying on it for production.";
  }
  return evidence
    ? `Git.Top did not classify this as Cloudflare-ready. Evidence: ${evidence}`
    : "Git.Top did not find enough Cloudflare or Workers deployment evidence. This does not prove incompatibility; it means no positive readiness signal was recorded.";
}

function jsonLd(
  view: ReturnType<typeof toProjectKnowledgeView>,
  syncedAt: string,
  metricsAt: string,
  graphNodes: number,
  graphEdges: number
): string {
  return scriptSafeJson({
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: view.repo,
    codeRepository: view.githubUrl,
    url: `https://git.top/projects/${view.repo}`,
    description: view.description,
    programmingLanguage: view.language ?? undefined,
    license: view.license ?? undefined,
    keywords: [...view.category, ...view.tags, ...view.deployments].slice(0, 20),
    dateModified: syncedAt,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Git.Top project type", value: projectKindLabel(view) },
      { "@type": "PropertyValue", name: "Git.Top difficulty", value: view.difficulty },
      { "@type": "PropertyValue", name: "Git.Top agent score", value: view.agentScore },
      { "@type": "PropertyValue", name: "Git.Top quality score", value: view.qualityScore },
      { "@type": "PropertyValue", name: "Git.Top metrics calculated at", value: metricsAt },
      { "@type": "PropertyValue", name: "Git.Top Cloudflare readiness", value: cloudflareReadinessLabel(view) },
      { "@type": "PropertyValue", name: "Git.Top graph size", value: `${graphNodes} nodes / ${graphEdges} edges` }
    ]
  });
}

function confidenceRows(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const confidence = view.qualitySignalConfidence ?? {};
  return [
    ["Stars 30d", confidence.stars30dDelta ?? "unknown"],
    ["Commits 30d", confidence.commits30d ?? "unknown"],
    ["Releases 180d", confidence.releases180d ?? "unknown"],
    ["Contributors 90d", confidence.contributors90d ?? "unknown"]
  ]
    .map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`)
    .join("");
}

function classificationRows(view: ReturnType<typeof toProjectKnowledgeView>): string {
  const classification = view.classification;
  if (!classification) {
    return `<div><strong>No classification evidence</strong><span>Inspect the JSON API for generated project data.</span></div>`;
  }
  const rows: Array<[string, ClassificationSignal | undefined]> = [
    ["Category", classification.category],
    ["Deployment", classification.deployment],
    ["Difficulty", classification.difficulty],
    ["Cloudflare Ready", classification.cloudflareReady]
  ];
  return rows
    .map(([label, signal]) => {
      const evidence = signal?.evidence?.slice(0, 2).join(" ") || "No evidence recorded.";
      return `<div><strong>${escapeHtml(label)}: ${escapeHtml(signal?.confidence ?? "unknown")}</strong><span>${escapeHtml(evidence)}</span></div>`;
    })
    .join("");
}


function yes(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
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
