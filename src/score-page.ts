import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { resolveProject } from "./project-aliases";
import { toProjectKnowledgeView } from "./project-view";
import { buildProjectScoreExplanation } from "./score";
import type { Env } from "./types";

type ProjectView = ReturnType<typeof toProjectKnowledgeView>;

const scoreWeights = [
  { key: "community", label: "Community", weight: 16 },
  { key: "maintenance", label: "Maintenance", weight: 20 },
  { key: "documentation", label: "Documentation", weight: 16 },
  { key: "stability", label: "Stability", weight: 16 },
  { key: "adoption", label: "Adoption", weight: 16 },
  { key: "agentReadability", label: "Agent Readability", weight: 16 }
] as const;

export async function renderProjectScorePage(env: Env, id: string): Promise<Response | null> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const resolution = resolveProject(knowledge.projects, id);
  if (!resolution) {
    return null;
  }

  const project = resolution.project;
  const view = toProjectKnowledgeView(project);
  const explanation = buildProjectScoreExplanation(project);
  return new Response(renderHtml({ view, explanation, syncedAt: project.project.syncedAt, metricsAt: project.metrics.calculatedAt, metadata: knowledge.metadata }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderHtml({
  view,
  explanation,
  syncedAt,
  metricsAt,
  metadata
}: {
  view: ProjectView;
  explanation: ReturnType<typeof buildProjectScoreExplanation>;
  syncedAt: string;
  metricsAt: string;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  const title = `${view.name} Score`;
  const description = `Why ${view.repo} has a ${view.gitTopScore}/100 Git.Top Score, ${view.agentScore}/100 Agent Score, and ${view.qualityScore}/100 Quality Score.`;
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Git.Top</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="https://git.top/score/${projectIdPath(view.repo)}" />
    <meta property="og:title" content="${escapeAttr(`${view.repo} Score | Git.Top`)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/score/${projectIdPath(view.repo)}" />
    <meta property="og:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(`${view.name} Score`))}&amp;subtitle=${escapeAttr(encodeURIComponent(description))}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(`${view.name} Score`))}&amp;subtitle=${escapeAttr(encodeURIComponent(description))}" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav,.actions,.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; text-transform:uppercase; }
      h1 { max-width:900px; font-size:clamp(34px,6vw,64px); line-height:1; margin-top:4px; }
      h2 { font-size:20px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,.dimension p { color:#40505a; line-height:1.6; }
      .lead { max-width:820px; font-size:18px; margin-top:12px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .hero,.panel,.score-card,.dimension { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .score-hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(260px,.42fr); gap:14px; align-items:stretch; }
      .score-card { display:grid; align-content:center; gap:8px; background:#fbfdfd; }
      .score-card strong { font-size:58px; line-height:.95; }
      .score-card span { color:var(--muted); font-weight:800; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .dimension-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .dimension { display:grid; gap:12px; min-height:220px; }
      .dimension-meter { height:10px; border-radius:999px; background:#e8eef2; overflow:hidden; }
      .dimension-meter span { display:block; height:100%; background:var(--teal); }
      .facts { display:grid; gap:10px; margin-top:12px; }
      .fact { display:grid; gap:4px; border-top:1px solid var(--line); padding-top:10px; }
      .fact:first-child { border-top:0; padding-top:0; }
      .fact span,.dimension small { color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      .tag-list { margin-top:12px; }
      .tag { color:#40505a; font-size:12px; }
      .formula { display:grid; gap:10px; margin-top:12px; }
      .formula div { display:grid; grid-template-columns:150px minmax(0,1fr) 70px; gap:10px; align-items:center; border-top:1px solid var(--line); padding-top:10px; }
      .formula div:first-child { border-top:0; padding-top:0; }
      .formula strong,.formula span { overflow-wrap:anywhere; }
      .guidance-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .guidance-item { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:14px; }
      @media (max-width:960px) { .score-hero,.grid,.dimension-grid { grid-template-columns:1fr; } .formula div { grid-template-columns:1fr; } }
      @media (max-width:960px) { .guidance-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/projects/${escapeAttr(view.repo)}">Project</a><a href="/graph/${escapeAttr(view.repo)}">Graph</a><a href="/api/project/${escapeAttr(view.repo)}">API</a><a href="/docs#scoring">Docs</a></div>
      </nav>

      <section class="hero score-hero">
        <div>
          <p class="eyebrow">Project Score</p>
          <h1>Why ${escapeHtml(view.repo)} scores ${view.gitTopScore}/100</h1>
          <p class="lead">${escapeHtml(description)}</p>
          <div class="tag-list">
            ${view.category.concat(view.deployments.slice(0, 4), view.dependencies.slice(0, 3)).map((tag) => `<span class="tag">${escapeHtml(label(tag))}</span>`).join("")}
          </div>
          <div class="actions" style="margin-top:14px">
            <a class="button primary" href="/api/project/${escapeAttr(view.repo)}">Project JSON</a>
            <a class="button" href="/projects/${escapeAttr(view.repo)}">Project Page</a>
            <a class="button" href="/alternatives/${escapeAttr(view.repo)}">Alternatives</a>
          </div>
        </div>
        <aside class="score-card">
          <span>Git.Top Score</span>
          <strong>${view.gitTopScore}</strong>
          <p class="muted">Weighted project knowledge score across community, maintenance, documentation, stability, adoption, and agent readability.</p>
        </aside>
      </section>

      <section class="dimension-grid" aria-label="Agent score dimensions">
        ${scoreWeights.map((item) => dimensionCard(view, item)).join("")}
      </section>

      <section class="panel" style="margin-top:14px">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Adoption Guidance</p>
            <h2>${escapeHtml(explanation.adoption_guidance)}</h2>
          </div>
          <a class="button" href="/api/score/${escapeAttr(view.repo)}">Score JSON</a>
        </div>
        <div class="guidance-grid">
          <article class="guidance-item">
            <p class="eyebrow">Strongest Dimension</p>
            <h3>${escapeHtml(explanation.strongest_dimension.label)} / ${explanation.strongest_dimension.score}</h3>
            <p class="muted">${escapeHtml(explanation.strongest_dimension.explanation)}</p>
          </article>
          <article class="guidance-item">
            <p class="eyebrow">Weakest Dimension</p>
            <h3>${escapeHtml(explanation.weakest_dimension.label)} / ${explanation.weakest_dimension.score}</h3>
            <p class="muted">${escapeHtml(explanation.weakest_dimension.explanation)}</p>
          </article>
          <article class="guidance-item">
            <p class="eyebrow">Risk Flags</p>
            <div class="facts">${explanation.risk_flags.length ? explanation.risk_flags.map((flag) => fact("Review", flag)).join("") : fact("Review", "No major score risk flags were generated from indexed signals.")}</div>
          </article>
        </div>
        <div class="actions" style="margin-top:12px">
          ${explanation.next_actions.map((action) => `<a class="button" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
        </div>
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">Agent Score</p>
          <h2>${view.agentScore}/100 agent-readiness score</h2>
          <p class="muted">Agent Score is optimized for agent use: documentation, maintenance, deployment clarity, popularity, and community activity.</p>
          <div class="facts">
            ${fact("Documentation", `${view.agentScoreBreakdown.documentation}/100`)}
            ${fact("Maintenance", `${view.agentScoreBreakdown.maintenance}/100`)}
            ${fact("Deployment", `${view.agentScoreBreakdown.deployment}/100`)}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Quality Score</p>
          <h2>${view.qualityScore}/100 repository activity score</h2>
          <p class="muted">Quality score is separate from Agent Score. It weights star movement, commits, releases, contributors, and issue response.</p>
          <div class="facts">
            ${fact("Stars", formatNumber(view.qualitySignals.stars))}
            ${fact("Recent commits", formatNumber(view.qualitySignals.recentCommits))}
            ${fact("Contributors", formatNumber(view.qualitySignals.contributors))}
            ${fact("180d releases", formatNumber(view.qualitySignals.releaseFrequency180d))}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Why This Score</p>
          <h2>${escapeHtml(scoreSummary(view))}</h2>
          <p class="muted">${escapeHtml(scoreExplanation(view))}</p>
          <div class="facts">
            ${fact("Cloudflare ready", view.cloudflareReady ? "Yes" : "No")}
            ${fact("Deployment targets", view.deployments.length.toLocaleString())}
            ${fact("Dependencies", view.dependencies.length.toLocaleString())}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Data Confidence</p>
          <h2>${escapeHtml(confidenceSummary(view))}</h2>
          <p class="muted">Scores are useful for ranking, but production recommendations should cite source metadata and signal confidence.</p>
          <div class="facts">
            ${fact("Repository synced", formatDate(syncedAt))}
            ${fact("Metrics calculated", formatDate(metricsAt))}
            ${fact("Data source", `${metadata.source} / ${metadata.reason}`)}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Score Confidence</p>
          <h2>${escapeHtml(explanation.score_confidence.level.toUpperCase())}</h2>
          <p class="muted">${escapeHtml(explanation.score_confidence.summary)}</p>
          <div class="facts">
            ${explanation.score_confidence.evidence_checklist.slice(0, 3).map((item) => fact(item.signal, `${item.status}: ${item.description}`)).join("")}
          </div>
        </article>
      </section>

      <section class="panel" style="margin-top:14px">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Formula</p>
            <h2>Agent Score weighted breakdown</h2>
          </div>
          <a class="button" href="/docs#scoring">Scoring Docs</a>
        </div>
        <div class="formula">
          ${scoreWeights
            .map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>${scoreValue(view, item.key)}/100 x ${item.weight}%</span><strong>${weightedContribution(view, item.key, item.weight)}</strong></div>`)
            .join("")}
        </div>
      </section>
    </div>
  </body>
</html>`;
}

function dimensionCard(view: ProjectView, item: (typeof scoreWeights)[number]): string {
  const value = scoreValue(view, item.key);
  return `<article class="dimension">
    <div>
      <p class="eyebrow">${escapeHtml(item.label)}</p>
      <h2>${value}/100</h2>
    </div>
    <div class="dimension-meter" aria-hidden="true"><span style="width:${value}%"></span></div>
    <p>${escapeHtml(dimensionExplanation(view, item.key))}</p>
    <small>Weight ${item.weight}%</small>
  </article>`;
}

function scoreValue(view: ProjectView, key: (typeof scoreWeights)[number]["key"]): number {
  return view.gitTopScoreBreakdown[key];
}

function weightedContribution(view: ProjectView, key: (typeof scoreWeights)[number]["key"], weight: number): string {
  return (scoreValue(view, key) * (weight / 100)).toFixed(1);
}

function dimensionExplanation(view: ProjectView, key: (typeof scoreWeights)[number]["key"]): string {
  if (key === "documentation") {
    return view.overview.length > 80 ? "The project has an agent-readable summary with enough context for recommendation workflows." : "The project has a shorter summary, so agents should inspect the source before citing it.";
  }
  if (key === "maintenance") {
    return `Maintenance combines repository activity, recent commits, release cadence, and issue-response signals.`;
  }
  if (key === "stability") {
    return `Stability considers release cadence, issue load, recent pushes, and maturity signals.`;
  }
  if (key === "adoption") {
    return `Adoption is normalized from ecosystem attention, stars, forks, and integration-like signals.`;
  }
  if (key === "agentReadability") {
    return `Agent readability measures structured summaries, use cases, tradeoffs, dependencies, alternatives, and deployment clarity.`;
  }
  return `Community is based on recent contributor activity. Git.Top recorded ${formatNumber(view.qualitySignals.contributors)} contributors in the current metrics window.`;
}

function scoreSummary(view: ProjectView): string {
  const strongest = [...scoreWeights].sort((a, b) => scoreValue(view, b.key) - scoreValue(view, a.key))[0];
  return `${strongest.label} is the strongest dimension`;
}

function scoreExplanation(view: ProjectView): string {
  const weak = [...scoreWeights].sort((a, b) => scoreValue(view, a.key) - scoreValue(view, b.key))[0];
  return `${view.repo} scores ${view.gitTopScore}/100 overall. The lowest dimension is ${weak.label.toLowerCase()} at ${scoreValue(view, weak.key)}/100, which is the first place to inspect before adopting it.`;
}

function confidenceSummary(view: ProjectView): string {
  const classificationSignals = Object.values(view.classification ?? {});
  const high = classificationSignals.filter((signal) => signal?.confidence === "high").length;
  const total = classificationSignals.length || 4;
  const qualitySignals = Object.values(view.qualitySignalConfidence ?? {}).filter((value) => value === "complete" || value === "snapshot").length;
  return `${high}/${total} classification signals high; ${qualitySignals} quality signals complete or snapshot`;
}

function fact(labelText: string, value: string): string {
  return `<div class="fact"><span>${escapeHtml(labelText)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function projectIdPath(id: string): string {
  return id.split("/").map(encodeURIComponent).join("/");
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
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
