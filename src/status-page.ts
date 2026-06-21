import { getSyncStatus } from "./db-sync-store";
import { defaultSeedRepositories } from "./github";
import { getHealth, type HealthStatus } from "./health";
import type { SyncStatus } from "./sync-status";
import type { Env } from "./types";

export async function renderStatusPage(env: Env): Promise<Response> {
  const [health, sync] = await Promise.all([getHealth(env), getSyncStatus(env, defaultSeedRepositories)]);
  return new Response(renderHtml(health, sync), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });
}

function renderHtml(health: HealthStatus, sync: SyncStatus): string {
  const recentRuns = sync.recentRuns.slice(0, 5);
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Status | Data Source, Sync Freshness, and Runtime Health</title>
    <meta name="description" content="Git.Top public status page for D1 availability, sync health, freshness, indexed project counts, and recent sync runs." />
    <link rel="canonical" href="https://git.top/status" />
    <meta property="og:title" content="Git.Top Status" />
    <meta property="og:description" content="Data-source availability, sync freshness, and runtime health for Git.Top." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/status" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Status&subtitle=Data-source%20and%20sync%20freshness" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Status&subtitle=Data-source%20and%20sync%20freshness" />
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
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .status-ok { color:var(--green); }
      .status-warn { color:var(--amber); }
      .status-bad { color:var(--red); }
      @media (max-width:900px) { .metrics,.two { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/quality">Quality</a><a href="/coverage">Coverage</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Status</p>
        <h1>Data source, sync freshness, and runtime health.</h1>
        <p class="lead">Use this status surface before treating Git.Top recommendations as production-grade. It exposes whether the public API is D1-backed, whether sync is fresh, and how much of the seed corpus has been indexed.</p>
        <div class="actions">
          <a class="button primary" href="/api/health">Health JSON</a>
          <a class="button" href="/api/sync/status">Sync JSON</a>
          <a class="button" href="/quality">Quality governance</a>
          <a class="button" href="/coverage">Corpus coverage</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Runtime", health.ok ? "OK" : "CHECK", `D1 binding is ${health.db}.`)}
        ${metric("Data source", health.metadata.source, health.metadata.reason)}
        ${metric("Sync", `${sync.health} / ${sync.freshness}`, sync.lastSuccessfulSyncAt ? `Last success ${sync.lastSuccessfulSyncAt}.` : "No successful sync recorded.")}
        ${metric("Indexed", sync.indexedCount, `${sync.syncedCount}/${sync.seedTotal} seed repositories synced.`)}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Sync Progress</p>
          <h2 class="${statusClass(sync.health)}">${escapeHtml(label(sync.health))}</h2>
          <div class="bar"><span style="width:${Math.max(0, Math.min(100, sync.cycleProgress))}%"></span></div>
          <div class="rows">
            <div class="row"><strong>Cycle progress</strong><span>${sync.cycleProgress}% · cursor ${sync.cursor} of ${sync.seedTotal}</span></div>
            <div class="row"><strong>Remaining seed items</strong><span>${sync.remainingCount} repositories remain before the current cycle is complete.</span></div>
            <div class="row"><strong>Next batch wraps</strong><span>${sync.nextBatchWraps ? "Yes" : "No"}</span></div>
            <div class="row"><strong>Next batch preview</strong><span>${escapeHtml(sync.nextBatch.slice(0, 5).join(", ") || "No queued repositories.")}</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Freshness</p>
          <h2 class="${statusClass(sync.freshness)}">${escapeHtml(label(sync.freshness))}</h2>
          <div class="rows">
            <div class="row"><strong>Last successful sync</strong><span>${escapeHtml(sync.lastSuccessfulSyncAt ?? "Unknown")}</span></div>
            <div class="row"><strong>Hours since success</strong><span>${sync.hoursSinceSuccessfulSync ?? "Unknown"}</span></div>
            <div class="row"><strong>Last failed sync</strong><span>${escapeHtml(sync.lastFailedSyncAt ?? "None recorded")}</span></div>
            <div class="row"><strong>Last error</strong><span>${escapeHtml(sync.lastError ? `${sync.lastError.repository}: ${sync.lastError.error}` : "None recorded")}</span></div>
          </div>
        </aside>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Recent Runs</p>
          <h2>Latest sync attempts</h2>
          <div class="rows">
            ${recentRuns.length ? recentRuns.map(runRow).join("") : `<div class="row"><strong>No sync runs</strong><span>No sync history is available for the current data source.</span></div>`}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Integration Guidance</p>
          <h2>When to fail closed</h2>
          <div class="rows">
            <div class="row"><strong>Require D1 for production answers.</strong><span>Use <code>require_d1=true</code> on REST knowledge endpoints when seed fallback is not acceptable.</span></div>
            <div class="row"><strong>Check source and freshness together.</strong><span>Prefer <code>metadata.source=d1</code>, <code>sync.health=healthy</code>, and <code>sync.freshness=fresh</code> before citing high-confidence recommendations.</span></div>
            <div class="row"><strong>Use quality and coverage for context.</strong><span>Pair this page with <a href="/quality">/quality</a> and <a href="/coverage">/coverage</a> before broad selection tasks.</span></div>
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

function runRow(run: SyncStatus["recentRuns"][number]): string {
  return `<div class="row"><strong>${escapeHtml(run.trigger)} · ${escapeHtml(run.finishedAt)}</strong><span>${run.syncedCount} synced, ${run.failedCount} failed, ${run.alternativesUpdated} alternatives updated, ${run.durationMs}ms.</span></div>`;
}

function statusClass(status: string): string {
  if (status === "healthy" || status === "fresh" || status === "available") {
    return "status-ok";
  }
  if (status === "degraded" || status === "stale" || status === "missing") {
    return "status-warn";
  }
  return "status-bad";
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
