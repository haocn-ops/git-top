import { getGovernanceSummary } from "./governance-store";
import { defaultSeedRepositories } from "./github";
import { getHealth, type HealthStatus } from "./health";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildQualityReport, type QualityReport } from "./quality";
import { getSyncStatus } from "./db-sync-store";
import type { GovernanceRun, Env } from "./types";
import type { SyncStatus } from "./sync-status";

export async function renderOperationsPage(env: Env): Promise<Response> {
  const [health, sync, governance, knowledge] = await Promise.all([
    getHealth(env),
    getSyncStatus(env, defaultSeedRepositories),
    getGovernanceSummary(env),
    listProjectKnowledgeWithMeta(env)
  ]);
  const quality = buildQualityReport(knowledge.projects);
  return new Response(renderHtml({ health, sync, governance, quality }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function renderHtml({
  health,
  sync,
  governance,
  quality
}: {
  health: HealthStatus;
  sync: SyncStatus;
  governance: Awaited<ReturnType<typeof getGovernanceSummary>>;
  quality: QualityReport;
}): string {
  const latestTasks = governance.latestByTask.slice(0, 10);
  const failedTasks = governance.failedTasks.slice(0, 6);
  const topIssues = quality.issues.slice(0, 6);

  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Operations | Automation and Data Governance</title>
    <meta name="description" content="Git.Top operations dashboard for production health, sync freshness, quality, and automated governance runs." />
    <link rel="canonical" href="https://git.top/operations" />
    <meta property="og:title" content="Git.Top Operations" />
    <meta property="og:description" content="Production health, automation runs, sync freshness, and data governance status." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/operations" />
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
      h1 { max-width:940px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:21px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; padding:14px; min-height:112px; }
      .metric strong { font-size:30px; line-height:1; overflow-wrap:anywhere; }
      .metric span { color:var(--muted); font-weight:800; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .two { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:12px; margin-top:14px; }
      .panel { display:grid; align-content:start; gap:12px; padding:16px; }
      .rows { display:grid; gap:9px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:9px; }
      .row:first-child { border-top:0; padding-top:0; }
      .row span { color:var(--muted); line-height:1.5; overflow-wrap:anywhere; }
      .bar { height:9px; overflow:hidden; border-radius:999px; background:#e8eef2; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .status-success,.status-healthy,.status-fresh,.status-ok { color:var(--green); }
      .status-skipped,.status-running,.status-stale,.status-unknown { color:var(--amber); }
      .status-failed,.status-degraded,.status-high { color:var(--red); }
      .issue { border-left:4px solid var(--amber); padding-left:10px; }
      .issue.error,.issue.failed { border-color:var(--red); }
      @media (max-width:900px) { .metrics,.grid,.two { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/status">Status</a><a href="/quality">Quality</a><a href="/coverage">Coverage</a><a href="/docs">Docs</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Operations</p>
        <h1>Automation runs and data governance for Git.Top.</h1>
        <p class="lead">This dashboard brings production health, sync freshness, quality risk, and scheduled governance runs into one read-only operating surface.</p>
        <div class="actions">
          <a class="button primary" href="/api/governance/summary">Governance JSON</a>
          <a class="button" href="/api/governance/runs">Run history</a>
          <a class="button" href="/api/health">Health JSON</a>
          <a class="button" href="/api/sync/status">Sync JSON</a>
          <a class="button" href="/api/quality">Quality JSON</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Runtime", health.ok ? "OK" : "CHECK", `D1 ${health.db}; source ${health.metadata.source}.`)}
        ${metric("Quality", `${quality.score}/100`, `${quality.errorCount} errors / ${quality.warningCount} warnings.`)}
        ${metric("Sync", `${sync.health} / ${sync.freshness}`, sync.lastSuccessfulSyncAt ? `Last success ${sync.lastSuccessfulSyncAt}.` : "No success recorded.")}
        ${metric("Automation", `${governance.statusCounts.failed} failed`, `${governance.runCount} recorded governance runs.`)}
      </section>

      <section class="grid">
        ${panel("Production Counts", [
          ["Knowledge-ready", String(health.knowledgeReadyProjectCount)],
          ["Raw projects", String(health.rawProjectCount)],
          ["Indexed", String(sync.indexedCount)],
          ["Seed synced", `${sync.syncedCount}/${sync.seedTotal}`]
        ])}
        ${panel("Quality Risk", [
          ["Risk level", quality.riskLevel],
          ["Risk reasons", String(quality.riskSummary.reasons.length)],
          ["Review issues", String(quality.issueCount)],
          ["Collections", String(quality.coverage.collectionCount)]
        ])}
        ${panel("Governance Runs", [
          ["Success", String(governance.statusCounts.success)],
          ["Failed", String(governance.statusCounts.failed)],
          ["Skipped", String(governance.statusCounts.skipped)],
          ["Last run", governance.latestRun ? `${governance.latestRun.task} / ${governance.latestRun.status}` : "No run history"]
        ])}
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Latest Automation</p>
          <h2>Most recent run per task</h2>
          <div class="rows">
            ${latestTasks.length ? latestTasks.map(runRow).join("") : `<div class="row"><strong>No governance runs recorded.</strong><span>Scheduled workflows can record runs through <code>/api/admin/governance/runs</code>.</span></div>`}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Action Needed</p>
          <h2>${failedTasks.length ? "Failed tasks" : "No failed tasks"}</h2>
          <div class="rows">
            ${failedTasks.length ? failedTasks.map(runRow).join("") : `<div class="row"><strong>Automation history is clean.</strong><span>Keep watching quality risk and sync freshness during the daily operations check.</span></div>`}
          </div>
        </aside>
      </section>

      <section class="two">
        <article class="panel">
          <p class="eyebrow">Quality Issues</p>
          <h2>Top current review signals</h2>
          <div class="rows">
            ${topIssues.length ? topIssues.map(issueRow).join("") : `<div class="row"><strong>No quality issues.</strong><span>The current quality report has no review signals.</span></div>`}
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Operating Rhythm</p>
          <h2>What automation covers</h2>
          <div class="rows">
            <div class="row"><strong>Daily</strong><span><code>quality:check</code>, <code>smoke:prod</code>, and sync status.</span></div>
            <div class="row"><strong>Weekly</strong><span>Seed coverage, fixture health, quality review, eval quality, explanation eval, and focused tests.</span></div>
            <div class="row"><strong>Biweekly</strong><span>Sampled live repository checks with a GitHub token.</span></div>
            <div class="row"><strong>Monthly</strong><span>Candidate discovery, local eval, ranking experiments, and review queue refresh.</span></div>
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

function panel(title: string, rows: Array<[string, string]>): string {
  return `<article class="panel"><p class="eyebrow">Snapshot</p><h2>${escapeHtml(title)}</h2><div class="rows">${rows
    .map(([label, value]) => `<div class="row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`)
    .join("")}</div></article>`;
}

function runRow(run: GovernanceRun): string {
  const summary = Object.entries(run.summary)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("; ");
  const link = run.reportUrl ? ` <a href="${escapeAttr(run.reportUrl)}">Report</a>` : "";
  return `<div class="row issue ${escapeAttr(run.status)}"><strong class="status-${escapeAttr(run.status)}">${escapeHtml(run.task)} · ${escapeHtml(run.status)}</strong><span>${escapeHtml(run.finishedAt)} · ${run.durationMs}ms · ${escapeHtml(summary || run.error || "No summary")}${link}</span></div>`;
}

function issueRow(issue: QualityReport["issues"][number]): string {
  return `<div class="row issue ${escapeAttr(issue.severity)}"><strong>${escapeHtml(issue.projectId)} · ${escapeHtml(issue.code)}</strong><span>${escapeHtml(issue.message)}</span></div>`;
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
