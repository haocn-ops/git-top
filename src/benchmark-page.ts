import { buildPublicBenchmarkReport, type PublicBenchmarkReport } from "./benchmark";
import type { Env } from "./types";

export async function renderBenchmarkPage(env: Env): Promise<Response> {
  const report = await buildPublicBenchmarkReport(env);
  return new Response(renderHtml(report), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

function renderHtml(report: PublicBenchmarkReport): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Public Trust Benchmark | Evaluation, Coverage, and Known Limits</title>
    <meta name="description" content="Public Git.Top benchmark summary for recommendation hit rates, explanation coverage, data trust, review queue size, and known limitations." />
    <link rel="canonical" href="https://git.top/benchmark" />
    <meta property="og:title" content="Git.Top Public Trust Benchmark" />
    <meta property="og:description" content="Recommendation health, explanation coverage, data trust, review queue, and known limitations for Git.Top." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/benchmark" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Benchmark&subtitle=Eval%20health%2C%20data%20trust%2C%20and%20limits" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Benchmark&subtitle=Eval%20health%2C%20data%20trust%2C%20and%20limits" />
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
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:112px; }
      .metric strong { font-size:30px; line-height:1; }
      .metric span { color:var(--muted); font-weight:800; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .limit { border-left:4px solid var(--amber); padding-left:10px; }
      .miss { border-left:4px solid var(--red); padding-left:10px; }
      .risk-low { color:var(--green); }
      .risk-medium { color:var(--amber); }
      .risk-high { color:var(--red); }
      @media (max-width:900px) { .metrics,.grid,.two { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/trust">Trust</a><a href="/quality">Quality</a><a href="/coverage">Coverage</a><a href="/docs">Docs</a><a href="/api/benchmark">JSON</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Public Trust Benchmark</p>
        <h1>Evaluation health, explanation coverage, data trust, and known limits.</h1>
        <p class="lead">${escapeHtml(report.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/benchmark">Open benchmark JSON</a>
          <a class="button" href="/trust">Trust Gate</a>
          <a class="button" href="/quality">Quality governance</a>
          <a class="button" href="/quality/review">Review queue</a>
          <a class="button" href="/llms-full.txt">Agent guide</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Top-1 hit rate", percent(report.evaluation.top1HitRate), `${report.evaluation.evaluatedCases} CI-safe eval cases.`)}
        ${metric("Top-3 hit rate", percent(report.evaluation.top3HitRate), "Shortlist health for recommendation and search flows.")}
        ${metric("Explanation coverage", percent(report.explanations.coverage), `${report.explanations.passed}/${report.explanations.checks} explanation checks passed.`)}
        ${metric("Data trust", `${report.dataCoverage.dataTrustScore}/100`, `${report.dataCoverage.riskLevel} current corpus risk.`)}
      </section>

      <section class="grid">
        ${scoreCard("Category accuracy", percent(report.evaluation.categoryAccuracy), report.evaluation.categoryAccuracy * 100, "Eval cases match expected category classifications.")}
        ${scoreCard("Deployment accuracy", percent(report.evaluation.deploymentAccuracy), report.evaluation.deploymentAccuracy * 100, "Eval cases match expected deployment classifications.")}
        ${scoreCard("Cloudflare readiness", percent(report.evaluation.cloudflareReadinessAccuracy), report.evaluation.cloudflareReadinessAccuracy * 100, "Eval cases match expected Cloudflare readiness.")}
        ${scoreCard("Release score", `${report.dataCoverage.releaseScore}/100`, report.dataCoverage.releaseScore, "Quality release gate based on warnings and errors.")}
        ${scoreCard("Category coverage", report.dataCoverage.categoryCoverage, coverageWidth(report), "Tracked taxonomy coverage in the loaded corpus.")}
        ${scoreCard("Review queue", report.reviewQueue.reviewCount, Math.min(100, report.reviewQueue.reviewCount), "Projects needing classification, collection, or signal review.")}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Known Limitations</p>
          <h2>What agents should disclose</h2>
          <div class="rows">
            ${report.knownLimitations.map((item) => `<div class="row limit"><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Source Metadata</p>
          <h2>${escapeHtml(report.metadata.source)} / ${escapeHtml(report.metadata.reason)}</h2>
          <p class="muted">${report.metadata.projectCount} knowledge-ready projects. Benchmark generated at ${escapeHtml(report.generatedAt)}.</p>
          <div class="pills"><a class="pill" href="/api/quality">Quality JSON</a><a class="pill" href="/api/trust">Trust JSON</a><a class="pill" href="/api/quality/review">Review JSON</a></div>
        </aside>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Review Focus</p>
          <h2>Current top-1 misses</h2>
          <div class="rows">
            ${report.evaluation.reviewFocus.map(reviewFocusRow).join("")}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Recommended Use</p>
          <h2>How to cite this benchmark</h2>
          <div class="rows">
            ${report.recommendedUse.map((item) => `<div class="row"><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
        </aside>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Top Review Queue Items</p>
          <h2>Highest-impact data work</h2>
          <div class="rows">
            ${report.reviewQueue.topItems.length ? report.reviewQueue.topItems.map(reviewItemRow).join("") : `<div class="row"><strong>No current review items.</strong><span>The loaded corpus has no low-confidence review queue entries.</span></div>`}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Report Sources</p>
          <h2>Underlying artifacts</h2>
          <div class="rows">
            <div class="row"><strong>Eval quality</strong><span><a href="${escapeAttr(report.links.evalQuality)}">${escapeHtml(report.evaluation.sourceReport)}</a></span></div>
            <div class="row"><strong>Explanation eval</strong><span><a href="${escapeAttr(report.links.evalExplanations)}">${escapeHtml(report.explanations.sourceReport)}</a></span></div>
            <div class="row"><strong>Runtime quality</strong><span><a href="/api/quality">/api/quality</a></span></div>
            <div class="row"><strong>Runtime review queue</strong><span><a href="/api/quality/review">/api/quality/review</a></span></div>
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

function scoreCard(title: string, value: string | number, width: number, note: string): string {
  return `<article class="panel"><p class="eyebrow">Benchmark</p><h2>${escapeHtml(title)}</h2><strong>${escapeHtml(String(value))}</strong><div class="bar"><span style="width:${Math.max(0, Math.min(100, width))}%"></span></div><p class="muted">${escapeHtml(note)}</p></article>`;
}

function reviewFocusRow(item: PublicBenchmarkReport["evaluation"]["reviewFocus"][number]): string {
  return `<div class="row miss"><strong>${escapeHtml(item.id)} · ${escapeHtml(item.issue)}</strong><span>Expected: ${escapeHtml(item.expected.join(", "))}</span><span>Observed: ${escapeHtml(item.observed.join(", "))}</span></div>`;
}

function reviewItemRow(item: PublicBenchmarkReport["reviewQueue"]["topItems"][number]): string {
  return `<div class="row"><strong>${escapeHtml(item.projectId)} · impact ${escapeHtml(item.impactScore)}</strong><span>${escapeHtml(item.reasons.join(" "))}</span><span>${escapeHtml(item.suggestedAction)}</span></div>`;
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function coverageWidth(report: PublicBenchmarkReport): number {
  return report.dataCoverage.totalCategories === 0 ? 0 : (report.dataCoverage.coveredCategories / report.dataCoverage.totalCategories) * 100;
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
