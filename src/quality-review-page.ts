import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildLowConfidenceReviewReport, type LowConfidenceReviewReport } from "./quality";
import type { Env } from "./types";

export async function renderQualityReviewPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const report = buildLowConfidenceReviewReport(knowledge.projects);
  return new Response(renderHtml(report, knowledge.metadata), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

function renderHtml(
  report: LowConfidenceReviewReport,
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string }
): string {
  const items = report.items.slice(0, 30);
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Review Queue | Low-Confidence Classification Governance</title>
    <meta name="description" content="Git.Top low-confidence review queue for classification evidence, collection semantics, Cloudflare readiness ambiguity, and incomplete quality signals." />
    <link rel="canonical" href="https://git.top/quality/review" />
    <meta property="og:title" content="Git.Top Review Queue" />
    <meta property="og:description" content="Low-confidence classification and collection governance queue for Git.Top project knowledge." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/quality/review" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Review%20Queue&subtitle=Low-confidence%20classification%20governance" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Review%20Queue&subtitle=Low-confidence%20classification%20governance" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --amber:#a15c07; --red:#b42318; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
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
      .hero,.panel,.metric,.item { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
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
      .metric { display:grid; gap:8px; padding:14px; min-height:110px; }
      .metric strong { font-size:30px; line-height:1; }
      .metric span { color:var(--muted); font-weight:800; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .queue { display:grid; gap:12px; margin-top:14px; }
      .item { display:grid; gap:11px; padding:16px; }
      .item-head { display:flex; align-items:start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:4px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .signal { display:inline-flex; min-height:28px; align-items:center; border:1px solid var(--line); border-radius:999px; background:#f8fafb; color:#40505a; font-size:12px; font-weight:900; padding:5px 8px; }
      .signal.low { border-color:#f3b8b5; background:#fff4f3; color:var(--red); }
      .signal.medium { border-color:#e7cf9a; background:#fff9ea; color:var(--amber); }
      .category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      @media (max-width:900px) { .metrics,.two,.category-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/quality">Quality</a><a href="/docs">Docs</a><a href="/mcp">MCP</a><a href="/api/quality/review">JSON</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Review Queue</p>
        <h1>Low-confidence classification and collection governance.</h1>
        <p class="lead">This queue highlights projects that need manual review before Git.Top treats their category, deployment, Cloudflare readiness, or collection semantics as high-confidence.</p>
        <div class="actions">
          <a class="button primary" href="/api/quality/review">Open review JSON</a>
          <a class="button" href="/docs#governance">Override workflow</a>
          <a class="button" href="/quality">Quality dashboard</a>
          <a class="button" href="/api/quality">Quality JSON</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Projects", report.projectCount, `${metadata.source} / ${metadata.reason}`)}
        ${metric("Review items", report.reviewCount, "Projects currently needing classification, collection, or signal review.")}
        ${metric("Low signals", report.lowSignalCount, "Low-confidence classification signals across the review queue.")}
        ${metric("Medium signals", report.mediumSignalCount, "Medium-confidence signals kept visible for context.")}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Review Instructions</p>
          <h2>How to use this queue</h2>
          <div class="rows">
            <div class="row"><strong>Prioritize low-confidence categories and Cloudflare readiness.</strong><span>These can directly change project recommendations and deployment-fit answers.</span></div>
            <div class="row"><strong>Review collections separately from runtime projects.</strong><span>Collections are useful for discovery, but should not be presented as direct implementation choices without context.</span></div>
            <div class="row"><strong>Use overrides for high-traffic ambiguous projects.</strong><span>Reviewed corrections should go through the <a href="/docs#governance">classification override workflow</a> instead of being hidden in page copy.</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Category Counts</p>
          <h2>Review items by category</h2>
          <div class="category-grid">
            ${Object.entries(report.categoryCounts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => `<div class="row"><strong>${escapeHtml(label(category))}</strong><span>${count} items</span></div>`)
              .join("")}
          </div>
        </aside>
      </section>

      <section class="queue">
        ${items.length ? items.map(reviewItem).join("") : `<article class="item"><h2>No review items</h2><p class="muted">No low-confidence review items are currently present in the loaded knowledge set.</p></article>`}
      </section>
    </div>
  </body>
</html>`;
}

function metric(label: string, value: string | number, note: string): string {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function reviewItem(item: LowConfidenceReviewReport["items"][number]): string {
  return `<article class="item">
    <div class="item-head">
      <div><p class="eyebrow">${escapeHtml(label(item.category))}</p><h2><a href="/projects/${escapeAttr(item.projectId)}">${escapeHtml(item.projectId)}</a></h2></div>
      <a class="button" href="/api/project/${escapeAttr(item.projectId)}">Project JSON</a>
    </div>
    <div class="pills">${item.classificationSignals.map(signalPill).join("")}</div>
    <div class="rows">
      <div class="row"><strong>Reasons</strong><span>${escapeHtml(item.reasons.join(" "))}</span></div>
      <div class="row"><strong>Suggested action</strong><span>${escapeHtml(item.suggestedAction)}</span></div>
    </div>
  </article>`;
}

function signalPill(signal: LowConfidenceReviewReport["items"][number]["classificationSignals"][number]): string {
  return `<span class="signal ${escapeAttr(signal.confidence)}">${escapeHtml(signal.field)} · ${escapeHtml(signal.confidence)}</span>`;
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
