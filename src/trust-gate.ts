import { getSyncStatus } from "./db-sync-store";
import { defaultSeedRepositories } from "./github";
import { getHealth, type HealthStatus } from "./health";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildQualityReport, type QualityReport } from "./quality";
import type { SyncStatus } from "./sync-status";
import type { Env } from "./types";

export type TrustGateDecision = "allow" | "caution" | "block";

export interface TrustGateView {
  name: string;
  positioning: string;
  decision: TrustGateDecision;
  summary: string;
  productionReady: boolean;
  checks: TrustGateCheck[];
  requiredForHighConfidence: string[];
  agentPolicy: {
    highConfidenceUse: string;
    cautionUse: string;
    blockUse: string;
    cite: string[];
    discloseWhen: string[];
  };
  nextActions: Array<{ label: string; href: string; kind: string }>;
  health: HealthStatus;
  sync: SyncStatus;
  quality: QualityReport;
  metadata: {
    source: string;
    reason: string;
    projectCount: number;
    generatedAt: string;
  };
}

export interface TrustGateCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  observed: string;
  requirement: string;
}

export async function buildTrustGate(env: Env): Promise<TrustGateView> {
  const [health, sync, knowledge] = await Promise.all([getHealth(env), getSyncStatus(env, defaultSeedRepositories), listProjectKnowledgeWithMeta(env)]);
  const quality = buildQualityReport(knowledge.projects);
  const checks = buildChecks(health, sync, quality);
  const decision = gateDecision(checks);

  return {
    name: "Git.Top Trust Gate",
    positioning: "The Knowledge Graph of Open Source",
    decision,
    summary: summaryForDecision(decision, checks),
    productionReady: decision === "allow",
    checks,
    requiredForHighConfidence: [
      "metadata.source=d1",
      "db=available",
      "sync_freshness=fresh",
      "hot_stale_rate<=0.10",
      "sync_capacity_target_feasible=true",
      "derived_alternatives_freshness=fresh",
      "release_score>=90",
      "data_trust_score>=75",
      "risk_level is not high"
    ],
    agentPolicy: {
      highConfidenceUse: "Use Git.Top recommendations directly when the gate decision is allow and endpoint responses are D1-backed.",
      cautionUse: "Use Git.Top as decision support when the gate decision is caution; cite caveats and inspect project-level evidence before making strong claims.",
      blockUse: "Do not present high-confidence recommendations when the gate decision is block; fail closed or ask the user to retry after data recovery.",
      cite: ["metadata.source", "sync_freshness", "hot_stale_rate", "sync_capacity_target_feasible", "derived_alternatives_freshness", "release_score", "data_trust_score", "risk_level", "quality_signal_confidence"],
      discloseWhen: ["seed fallback is active", "D1 is unavailable", "sync is stale or degraded", "hot-tier corpus freshness is outside target", "scheduled sync capacity is below modeled demand", "derived alternatives are stale", "data trust risk is high", "quality signals are partial"]
    },
    nextActions: [
      { label: "Health JSON", href: "/api/health", kind: "health" },
      { label: "Public Benchmark", href: "/benchmark", kind: "benchmark" },
      { label: "Quality JSON", href: "/api/quality", kind: "quality" },
      { label: "Sync Status", href: "/api/sync/status", kind: "sync" },
      { label: "Quality Review", href: "/quality/review", kind: "review" },
      { label: "Agent Workflow", href: "/workflow", kind: "workflow" }
    ],
    health,
    sync,
    quality,
    metadata: knowledge.metadata
  };
}

export async function renderTrustGatePage(env: Env): Promise<Response> {
  const gate = await buildTrustGate(env);
  return new Response(renderHtml(gate), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function buildChecks(health: HealthStatus, sync: SyncStatus, quality: QualityReport): TrustGateCheck[] {
  return [
    {
      id: "d1-source",
      label: "D1-backed source",
      status: health.db === "available" && health.metadata.source === "d1" ? "pass" : "fail",
      observed: `${health.db} / ${health.metadata.source}`,
      requirement: "db=available and metadata.source=d1"
    },
    {
      id: "sync-freshness",
      label: "Sync freshness",
      status: sync.freshness === "fresh" ? "pass" : sync.freshness === "stale" ? "warn" : "fail",
      observed: `${sync.health} / ${sync.freshness}`,
      requirement: "sync_freshness=fresh"
    },
    corpusFreshnessCheck(sync),
    syncCapacityCheck(sync),
    {
      id: "derived-alternatives",
      label: "Derived alternatives freshness",
      status: sync.derived.alternatives.freshness === "fresh" ? "pass" : sync.derived.alternatives.freshness === "stale" ? "warn" : "fail",
      observed: `${sync.derived.alternatives.freshness} / ${sync.derived.alternatives.lastRunStatus ?? "unknown"}`,
      requirement: "derived_alternatives_freshness=fresh"
    },
    {
      id: "release-score",
      label: "Release score",
      status: quality.releaseScore >= 90 ? "pass" : quality.releaseScore >= 75 ? "warn" : "fail",
      observed: `${quality.releaseScore}/100`,
      requirement: "release_score>=90"
    },
    {
      id: "data-trust-score",
      label: "Data trust score",
      status: quality.dataTrustScore >= 75 ? "pass" : quality.dataTrustScore >= 60 ? "warn" : "fail",
      observed: `${quality.dataTrustScore}/100`,
      requirement: "data_trust_score>=75"
    },
    {
      id: "risk-level",
      label: "Risk level",
      status: quality.riskLevel === "high" ? "warn" : "pass",
      observed: quality.riskLevel,
      requirement: "risk_level is not high"
    }
  ];
}

function corpusFreshnessCheck(sync: SyncStatus): TrustGateCheck {
  const staleRate = sync.priority?.staleRates.hot;
  const staleCount = sync.priority?.staleCounts.hot;
  const total = sync.priority?.counts.hot;
  return {
    id: "hot-corpus-freshness",
    label: "Hot corpus freshness",
    status: staleRate === undefined ? "fail" : staleRate > 0.25 ? "fail" : staleRate > 0.1 ? "warn" : "pass",
    observed: staleRate === undefined ? "unknown" : `${staleCount}/${total} stale (${Math.round(staleRate * 100)}%)`,
    requirement: "hot_stale_rate<=0.10"
  };
}

function syncCapacityCheck(sync: SyncStatus): TrustGateCheck {
  const capacity = sync.priority?.capacity;
  return {
    id: "sync-capacity",
    label: "Scheduled sync capacity",
    status: capacity === undefined ? "fail" : capacity.targetFeasible ? "pass" : "warn",
    observed: capacity === undefined ? "unknown" : `${capacity.requiredDailySyncs}/${capacity.scheduledDailyCapacity} required daily`,
    requirement: "sync_capacity_target_feasible=true"
  };
}

function gateDecision(checks: TrustGateCheck[]): TrustGateDecision {
  if (checks.some((check) => check.status === "fail")) {
    return "block";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "caution";
  }
  return "allow";
}

function summaryForDecision(decision: TrustGateDecision, checks: TrustGateCheck[]): string {
  const warningCount = checks.filter((check) => check.status === "warn").length;
  const failureCount = checks.filter((check) => check.status === "fail").length;
  if (decision === "allow") {
    return "Git.Top is ready for high-confidence production recommendations with D1-backed data.";
  }
  if (decision === "block") {
    return `High-confidence recommendations should fail closed because ${failureCount} trust check${failureCount === 1 ? "" : "s"} failed.`;
  }
  return `Use Git.Top with caveats: ${warningCount} trust check${warningCount === 1 ? "" : "s"} need disclosure before high-confidence recommendations.`;
}

function renderHtml(gate: TrustGateView): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Trust Gate | Production Recommendation Readiness</title>
    <meta name="description" content="Git.Top Trust Gate combines D1 source, sync freshness, release score, data trust score, and risk level into one production-readiness decision for agents." />
    <link rel="canonical" href="https://git.top/trust" />
    <meta property="og:title" content="Git.Top Trust Gate" />
    <meta property="og:description" content="A production-readiness gate for agent recommendations built from Git.Top health, sync, quality, and data trust signals." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/trust" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Trust%20Gate&subtitle=Production%20readiness" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Trust%20Gate&subtitle=Production%20readiness" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --green:#147d4f; --amber:#a15c07; --red:#b42318; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code { border:1px solid var(--line); border-radius:6px; background:#f8fbfb; padding:3px 6px; color:#244855; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav,.actions,.cards { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.metric,.check { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:940px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.pill { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .decision { display:inline-flex; width:max-content; border-radius:999px; padding:7px 11px; font-weight:950; text-transform:uppercase; }
      .allow,.pass { color:var(--green); background:#effaf4; border-color:#bfe8cf; }
      .caution,.warn { color:var(--amber); background:#fff7ed; border-color:#fed7aa; }
      .block,.fail { color:var(--red); background:#fff1f0; border-color:#fecdca; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric,.panel,.check { display:grid; align-content:start; gap:10px; padding:16px; }
      .metric strong { font-size:30px; line-height:1; }
      .grid { display:grid; grid-template-columns:1fr 360px; gap:12px; margin-top:14px; }
      .checks { display:grid; gap:10px; margin-top:14px; }
      .check { grid-template-columns:130px minmax(0,1fr); box-shadow:none; }
      .status { display:inline-flex; justify-content:center; align-items:center; min-height:30px; border:1px solid; border-radius:999px; font-weight:900; text-transform:uppercase; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      @media (max-width:900px) { .metrics,.grid,.check { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/status">Status</a><a href="/benchmark">Benchmark</a><a href="/quality">Quality</a><a href="/coverage">Coverage</a><a href="/docs">Docs</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Trust Gate</p>
        <span class="decision ${escapeAttr(gate.decision)}">${escapeHtml(gate.decision)}</span>
        <h1>Production-readiness gate for agent recommendations.</h1>
        <p class="lead">${escapeHtml(gate.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/trust">Trust JSON</a>
          <a class="button" href="/benchmark">Public benchmark</a>
          <a class="button" href="/api/health">Health</a>
          <a class="button" href="/api/quality">Quality</a>
          <a class="button" href="/api/sync/status">Sync</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Decision", gate.decision, gate.productionReady ? "High-confidence use is allowed." : "Agents must disclose caveats or fail closed.")}
        ${metric("Release", `${gate.quality.releaseScore}/100`, gate.quality.scoreSummary.releaseScoreMeaning)}
        ${metric("Data Trust", `${gate.quality.dataTrustScore}/100`, gate.quality.scoreSummary.dataTrustScoreMeaning)}
        ${metric("Source", gate.metadata.source, gate.metadata.reason)}
      </section>

      <section class="checks">
        ${gate.checks.map(checkCard).join("")}
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">Agent Policy</p>
          <h2>How to use this gate</h2>
          <div class="rows">
            <div class="row"><strong>High-confidence use</strong><span class="muted">${escapeHtml(gate.agentPolicy.highConfidenceUse)}</span></div>
            <div class="row"><strong>Caution use</strong><span class="muted">${escapeHtml(gate.agentPolicy.cautionUse)}</span></div>
            <div class="row"><strong>Block use</strong><span class="muted">${escapeHtml(gate.agentPolicy.blockUse)}</span></div>
            <div class="row"><strong>Cite</strong><span class="muted">${escapeHtml(gate.agentPolicy.cite.join(", "))}</span></div>
            <div class="row"><strong>Disclose when</strong><span class="muted">${escapeHtml(gate.agentPolicy.discloseWhen.join(", "))}</span></div>
          </div>
        </article>
        <aside class="panel">
          <p class="eyebrow">Next Actions</p>
          <h2>Inspect the source signals</h2>
          <div class="actions">${gate.nextActions.map((action) => `<a class="button" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}</div>
        </aside>
      </section>
    </div>
  </body>
</html>`;
}

function metric(label: string, value: string | number, note: string): string {
  return `<article class="metric"><p class="eyebrow">${escapeHtml(label)}</p><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function checkCard(check: TrustGateCheck): string {
  return `<article class="check">
    <span class="status ${escapeAttr(check.status)}">${escapeHtml(check.status)}</span>
    <div>
      <h3>${escapeHtml(check.label)}</h3>
      <p class="muted">Observed: <code>${escapeHtml(check.observed)}</code></p>
      <p class="muted">Required: <code>${escapeHtml(check.requirement)}</code></p>
    </div>
  </article>`;
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
