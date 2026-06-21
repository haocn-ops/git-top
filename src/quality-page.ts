import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildQualityReport, type QualityReport } from "./quality";
import type { Env } from "./types";

export async function renderQualityPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const report = buildQualityReport(knowledge.projects);
  return new Response(renderHtml(report, knowledge.metadata), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

function renderHtml(
  report: QualityReport,
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string }
): string {
  const topIssues = report.issues
    .filter((issue) => issue.severity !== "info")
    .slice(0, 8);

  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Quality & Governance | Data Trust, Risk, and Coverage</title>
    <meta name="description" content="Git.Top quality governance dashboard for data source, risk level, classification confidence, category coverage, collection review load, and stale data." />
    <link rel="canonical" href="https://git.top/quality" />
    <meta property="og:title" content="Git.Top Quality & Governance" />
    <meta property="og:description" content="Data trust, risk, coverage, and governance signals for Git.Top project recommendations." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/quality" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Quality&subtitle=Data%20trust%2C%20risk%2C%20and%20coverage" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Quality&subtitle=Data%20trust%2C%20risk%2C%20and%20coverage" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --green:#147d4f; --amber:#a15c07; --red:#b42318; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code { border:1px solid var(--line); border-radius:6px; background:#f7faf9; color:#2e4c58; padding:3px 6px; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.pills { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:21px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:860px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:114px; }
      .metric strong { font-size:30px; line-height:1; }
      .metric span { color:var(--muted); font-weight:800; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .risk-low { color:var(--green); }
      .risk-medium { color:var(--amber); }
      .risk-high { color:var(--red); }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .issue { border-left:4px solid var(--amber); padding-left:10px; }
      .issue.error { border-color:var(--red); }
      .issue.warning { border-color:var(--amber); }
      .category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      @media (max-width:900px) { .metrics,.grid,.two,.category-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/projects">Projects</a><a href="/mcp">MCP</a><a href="/api/quality">JSON</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Quality Governance</p>
        <h1>Data trust, coverage, and review risk for Git.Top recommendations.</h1>
        <p class="lead">Use this page before treating a project recommendation as high-confidence. The release score, risk layer, coverage metrics, and issue list are generated from the same knowledge source used by search, MCP, and project pages.</p>
        <div class="actions">
          <a class="button primary" href="/api/quality">Open quality JSON</a>
          <a class="button" href="/coverage">Corpus coverage</a>
          <a class="button" href="/quality/review">Review queue</a>
          <a class="button" href="/docs#scoring">Scoring methodology</a>
          <a class="button" href="/status">Sync status</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Release score", `${report.score}/100`, "Warnings and errors reduce this gate score; info observations stay visible without lowering it.")}
        ${metric("Risk level", report.riskLevel.toUpperCase(), "Risk summarizes classification confidence, collection review load, and stale data.")}
        ${metric("Projects", report.projectCount, `${metadata.source} / ${metadata.reason}`)}
        ${metric("Issues", report.issueCount, `${report.errorCount} errors / ${report.warningCount} warnings`)}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Risk Summary</p>
          <h2 class="risk-${escapeAttr(report.riskLevel)}">${escapeHtml(report.riskLevel.toUpperCase())}</h2>
          <div class="rows">
            ${report.riskSummary.reasons.map((reason) => `<div class="row"><strong>${escapeHtml(reason)}</strong></div>`).join("")}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Source Metadata</p>
          <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
          <p class="muted">${metadata.projectCount} knowledge-ready projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
          <div class="pills"><a class="pill" href="/api/health">Health</a><a class="pill" href="/api/quality">Quality JSON</a><a class="pill" href="/api/quality/review">Review JSON</a><a class="pill" href="/llms.txt">llms.txt</a></div>
        </aside>
      </section>

      <section class="grid">
        ${coverageCard("Category coverage", `${report.coverage.coveredCategories}/${report.coverage.totalCategories}`, rateWidth(report.coverage.coveredCategories, report.coverage.totalCategories), report.coverage.missingCategories.length ? `Missing: ${report.coverage.missingCategories.join(", ")}` : "All tracked categories are represented.")}
        ${coverageCard("Low-confidence classifications", percent(report.coverage.lowConfidenceClassificationRate), report.coverage.lowConfidenceClassificationRate * 100, `${report.coverage.lowConfidenceClassificationCount} projects include low-confidence classification evidence.`)}
        ${coverageCard("Collection review load", percent(report.coverage.collectionRate), report.coverage.collectionRate * 100, `${report.coverage.collectionCount} collections; ${report.coverage.collectionReviewCount} need metadata or freshness review.`)}
        ${coverageCard("Stale project rate", percent(report.coverage.staleProjectRate), report.coverage.staleProjectRate * 100, `${report.coverage.staleProjectCount} projects have stale sync data.`)}
        ${coverageCard("Average Git Score", report.coverage.averageGitScore, report.coverage.averageGitScore, "Repository activity score average across the loaded knowledge set.")}
        ${coverageCard("Average Maintenance", report.coverage.averageMaintenanceScore, report.coverage.averageMaintenanceScore, "Maintenance score average across the loaded knowledge set.")}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Top Quality Issues</p>
          <h2>What should be reviewed first</h2>
          <div class="rows">
            ${topIssues.length ? topIssues.map(issueRow).join("") : `<div class="row"><strong>No blocking warnings or errors.</strong><span>Info observations may still appear in the JSON quality report.</span></div>`}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Category Distribution</p>
          <h2>Coverage by taxonomy</h2>
          <div class="category-grid">
            ${Object.entries(report.categoryDistribution)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([category, count]) => `<div class="row"><strong>${escapeHtml(label(category))}</strong><span>${count} projects</span></div>`)
              .join("")}
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

function coverageCard(title: string, value: string | number, width: number, note: string): string {
  return `<article class="panel"><p class="eyebrow">Coverage</p><h2>${escapeHtml(title)}</h2><strong>${escapeHtml(String(value))}</strong><div class="bar"><span style="width:${Math.max(0, Math.min(100, width))}%"></span></div><p class="muted">${escapeHtml(note)}</p></article>`;
}

function issueRow(issue: QualityReport["issues"][number]): string {
  return `<div class="row issue ${escapeAttr(issue.severity)}"><strong>${escapeHtml(issue.projectId)} · ${escapeHtml(issue.code)}</strong><span>${escapeHtml(issue.message)}</span></div>`;
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function rateWidth(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
