import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildQualityReport, type QualityReport } from "./quality";
import type { Env } from "./types";

export async function renderCoveragePage(env: Env): Promise<Response> {
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
  const categories = Object.entries(report.categoryDistribution)
    .filter(([category]) => category !== "other")
    .sort((a, b) => b[1] - a[1]);
  const otherCount = report.categoryDistribution.other ?? 0;

  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Coverage | Project Corpus, Taxonomy, and Use Boundaries</title>
    <meta name="description" content="Git.Top coverage page for indexed project count, category distribution, collection coverage, Cloudflare-ready coverage, and data-source boundaries." />
    <link rel="canonical" href="https://git.top/coverage" />
    <meta property="og:title" content="Git.Top Coverage" />
    <meta property="og:description" content="Project corpus coverage, taxonomy distribution, and trust boundaries for Git.Top recommendations." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/coverage" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Coverage&subtitle=Project%20corpus%2C%20taxonomy%2C%20and%20trust%20boundaries" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Coverage&subtitle=Project%20corpus%2C%20taxonomy%2C%20and%20trust%20boundaries" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --green:#147d4f; --amber:#a15c07; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:112px; }
      .metric strong { font-size:30px; line-height:1; }
      .metric span { color:var(--muted); font-weight:800; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .panel ul { margin:0; padding-left:20px; }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .ok { color:var(--green); }
      .warn { color:var(--amber); }
      @media (max-width:900px) { .metrics,.two,.grid,.category-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/quality">Quality</a><a href="/quality/review">Review</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Coverage</p>
        <h1>Project corpus, taxonomy, and trust boundaries.</h1>
        <p class="lead">Git.Top is useful when its indexed corpus matches the user’s selection problem. This page makes the current coverage visible before agents rely on recommendations, category rankings, or Cloudflare deployment-fit answers.</p>
        <div class="actions">
          <a class="button primary" href="/api/quality">Open coverage JSON</a>
          <a class="button" href="/quality">Quality governance</a>
          <a class="button" href="/docs#governance">Governance docs</a>
          <a class="button" href="/llms.txt">llms.txt</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Projects", report.projectCount, `${metadata.source} / ${metadata.reason}`)}
        ${metric("Category coverage", `${report.coverage.coveredCategories}/${report.coverage.totalCategories}`, "V1 taxonomy categories represented by the active knowledge source.")}
        ${metric("Collections", report.coverage.collectionCount, `${percent(report.coverage.collectionRate)} of the corpus are resource hubs or curated lists.`)}
        ${metric("Cloudflare-ready", report.coverage.cloudflareReadyCount, "Projects with positive Cloudflare deployment fit signals.")}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Use Boundaries</p>
          <h2>When coverage is strong enough</h2>
          <div class="rows">
            <div class="row"><strong class="ok">Use for AI and agent project selection.</strong><span>The V1 taxonomy covers agent frameworks, coding agents, browser agents, RAG, vector databases, gateways, eval, prompt tooling, workflow automation, local runtimes, app templates, MCP servers, and observability.</span></div>
            <div class="row"><strong class="ok">Use for comparison and alternatives after fetching details.</strong><span>Project pages and JSON include classification evidence, alternatives, deployment fit, source metadata, and signal confidence.</span></div>
            <div class="row"><strong class="warn">Use caution outside the V1 taxonomy.</strong><span>Generic GitHub discovery, non-AI libraries, closed-source services, and private repositories are outside the public corpus boundary.</span></div>
            <div class="row"><strong class="warn">Review collections separately from runtime projects.</strong><span>Collections help discovery, but they should not be treated as implementation choices without checking collection scope and freshness.</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Source Metadata</p>
          <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
          <p class="muted">${metadata.projectCount} knowledge-ready projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
          <div class="pills">
            <a class="pill" href="/api/health">Health</a>
            <a class="pill" href="/api/sync/status">Sync status</a>
            <a class="pill" href="/api/quality">Quality JSON</a>
            <a class="pill" href="/api/quality/review">Review JSON</a>
          </div>
        </aside>
      </section>

      <section class="grid">
        ${coverageCard("Low-confidence rate", percent(report.coverage.lowConfidenceClassificationRate), report.coverage.lowConfidenceClassificationRate * 100, `${report.coverage.lowConfidenceClassificationCount} projects include low-confidence classification evidence.`)}
        ${coverageCard("Collection review load", percent(report.coverage.collectionRate), report.coverage.collectionRate * 100, `${report.coverage.collectionReviewCount} collections need metadata or freshness review.`)}
        ${coverageCard("Stale project rate", percent(report.coverage.staleProjectRate), report.coverage.staleProjectRate * 100, `${report.coverage.staleProjectCount} projects have stale sync data.`)}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Category Distribution</p>
          <h2>V1 taxonomy coverage</h2>
          <div class="category-grid">
            ${categories.map(([category, count]) => categoryRow(category, count, report.projectCount)).join("")}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Collection Semantics</p>
          <h2>Resource hubs are tracked explicitly</h2>
          <div class="rows">
            ${Object.entries(report.coverage.collectionScopeCounts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([scope, count]) => `<div class="row"><strong>${escapeHtml(label(scope))}</strong><span>${count} collections</span></div>`)
              .join("")}
            <div class="row"><strong>Other category</strong><span>${otherCount} projects currently sit outside the V1 taxonomy.</span></div>
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
  return `<article class="panel"><p class="eyebrow">Coverage Signal</p><h2>${escapeHtml(title)}</h2><strong>${escapeHtml(String(value))}</strong><div class="bar"><span style="width:${Math.max(0, Math.min(100, width))}%"></span></div><p class="muted">${escapeHtml(note)}</p></article>`;
}

function categoryRow(category: string, count: number, total: number): string {
  return `<div class="row"><strong>${escapeHtml(label(category))}</strong><span>${count} projects · ${percent(rate(count, total))}</span></div>`;
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
