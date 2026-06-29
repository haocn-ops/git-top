import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildTrendsView, type TrendBucket, type TrendsView } from "./trends";
import type { Env } from "./types";

export async function renderTrendsPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const trends = buildTrendsView(knowledge.projects, 8);
  return new Response(renderHtml({ trends, metadata: knowledge.metadata }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderHtml({
  trends,
  metadata
}: {
  trends: TrendsView;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Open Source Trends | Git.Top</title>
    <meta name="description" content="Explore current open-source AI project trends by category, deployment, language, score, and agent-readable momentum signals." />
    <link rel="canonical" href="https://git.top/trends" />
    <meta property="og:title" content="Open Source Trends | Git.Top" />
    <meta property="og:description" content="Current Git.Top corpus trends for open-source AI projects, deployments, languages, and rising tools." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/trends" />
    <meta property="og:image" content="https://git.top/og.svg?title=Open%20Source%20Trends&amp;subtitle=AI%20project%20signals%20from%20Git.Top" />
    <meta name="twitter:card" content="summary" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --green:#147d4f; --amber:#9a5b00; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { max-width:1200px; margin:0 auto; padding:22px; }
      .nav,.actions,.card-top,.metric-grid { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:950; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.card,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { display:grid; gap:14px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:0; }
      h1 { max-width:860px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.25; overflow-wrap:anywhere; }
      .lead,.muted,.briefing li { color:#40505a; line-height:1.6; }
      .lead { max-width:820px; font-size:18px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .grid.two { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .card { display:grid; gap:12px; box-shadow:none; }
      .metric { box-shadow:none; background:#fbfdfd; min-width:160px; flex:1; }
      .metric span { display:block; color:var(--muted); font-size:11px; font-weight:900; text-transform:uppercase; }
      .metric strong { display:block; margin-top:5px; font-size:24px; line-height:1; }
      .bar { height:8px; border-radius:999px; background:#e3ebe8; overflow:hidden; }
      .bar span { display:block; height:100%; border-radius:999px; background:var(--teal); }
      .project-list,.briefing { display:grid; gap:8px; margin:0; padding-left:18px; }
      .panel { margin-top:14px; }
      .tag { color:#40505a; font-size:12px; background:#fbfdfd; }
      code { border:1px solid var(--line); border-radius:6px; background:#f7faf9; padding:3px 6px; overflow-wrap:anywhere; }
      @media (max-width:900px) { .grid,.grid.two { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/discover">Discover</a><a href="/atlas">Atlas</a><a href="/recommend">Recommend</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Trends</p>
        <h1>Discover technical trends from the open-source knowledge graph</h1>
        <p class="lead">${escapeHtml(trends.summary)} Trends are computed from the current Git.Top corpus, not claimed as market-wide rankings.</p>
        <div class="actions">
          <a class="button primary" href="/api/trends">Open Trends JSON</a>
          <a class="button" href="/api/trending">Classic Trending JSON</a>
          <a class="button" href="/discover">Discover</a>
          <a class="button" href="/atlas">Atlas</a>
        </div>
      </header>

      <section class="metric-grid" style="margin-top:14px">
        ${metric("Projects", trends.stats.projectCount)}
        ${metric("Categories", trends.stats.categoryCount)}
        ${metric("Deployments", trends.stats.deploymentCount)}
        ${metric("Cloudflare-ready", trends.stats.cloudflareReadyCount)}
      </section>

      <section class="grid">
        ${trends.trendSignals.map(signalCard).join("")}
      </section>

      <section class="panel">
        <div class="actions">
          <div>
            <p class="eyebrow">Category Trends</p>
            <h2>Where the corpus is deepest</h2>
          </div>
          <a class="button" href="/api/trends">JSON</a>
        </div>
        <div class="grid">
          ${trends.categories.map(bucketCard).join("")}
        </div>
      </section>

      <section class="panel">
        <p class="eyebrow">Deployment And Language Signals</p>
        <h2>How projects are being packaged and built</h2>
        <div class="grid two">
          <div>${bucketList("Deployment trends", trends.deployments)}</div>
          <div>${bucketList("Language trends", trends.languages)}</div>
        </div>
      </section>

      <section class="panel">
        <p class="eyebrow">Rising Projects</p>
        <h2>Momentum blend from score, maintenance, contributors, growth, and deployment readiness</h2>
        <div class="grid">
          ${trends.risingProjects.slice(0, 6).map(projectCard).join("")}
        </div>
      </section>

      <section class="panel">
        <p class="eyebrow">Agent Briefing</p>
        <h2>How to use these trends responsibly</h2>
        <ul class="briefing">${trends.agentBriefing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>

      <section class="panel">
        <p class="eyebrow">Data Source</p>
        <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
        <p class="muted">${metadata.projectCount.toLocaleString()} loaded projects. Generated at ${escapeHtml(metadata.generatedAt)}. Agents should cite <code>metadata.source</code> and inspect project score evidence before making strong claims.</p>
      </section>
    </div>
  </body>
</html>`;
}

function metric(label: string, value: number): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value.toLocaleString()}</strong></div>`;
}

function signalCard(signal: TrendsView["trendSignals"][number]): string {
  return `<article class="card">
    <div class="card-top"><p class="eyebrow">${escapeHtml(signal.label)}</p><a class="button" href="${escapeAttr(signal.href)}">Open</a></div>
    <h2>${escapeHtml(String(signal.value))}</h2>
    <p class="muted">${escapeHtml(signal.description)}</p>
  </article>`;
}

function bucketCard(bucket: TrendBucket): string {
  return `<article class="card">
    <div class="card-top"><div><p class="eyebrow">Trend Bucket</p><h3>${escapeHtml(bucket.label)}</h3></div><a class="button" href="${escapeAttr(bucket.href)}">Open</a></div>
    <p class="muted">${escapeHtml(bucket.insight)}</p>
    <div class="bar"><span style="width:${Math.min(100, bucket.averageScore)}%"></span></div>
    <div class="tag-list"><span class="tag">${bucket.count} projects</span><span class="tag">Score ${bucket.averageScore}</span><span class="tag">Maintenance ${bucket.averageMaintenance}</span></div>
    <ul class="project-list">${bucket.topProjects.slice(0, 3).map((project) => `<li><a href="/projects/${escapeAttr(project.repo)}">${escapeHtml(project.repo)}</a></li>`).join("")}</ul>
  </article>`;
}

function bucketList(title: string, buckets: TrendBucket[]): string {
  return `<article class="card"><p class="eyebrow">${escapeHtml(title)}</p>${buckets
    .slice(0, 8)
    .map(
      (bucket) => `<div>
        <div class="card-top"><strong>${escapeHtml(bucket.label)}</strong><a href="${escapeAttr(bucket.href)}">${bucket.count} projects</a></div>
        <div class="bar"><span style="width:${Math.min(100, bucket.count * 4)}%"></span></div>
      </div>`
    )
    .join("")}</article>`;
}

function projectCard(project: TrendsView["risingProjects"][number]): string {
  return `<article class="card">
    <div class="card-top"><div><p class="eyebrow">Rising</p><h3><a href="/projects/${escapeAttr(project.repo)}">${escapeHtml(project.repo)}</a></h3></div><span class="tag">${project.gitTopScore}</span></div>
    <p class="muted">${escapeHtml(project.description)}</p>
    <div class="tag-list"><span class="tag">${escapeHtml(project.language ?? "Unknown")}</span>${project.cloudflareReady ? '<span class="tag">Cloudflare-ready</span>' : ""}<span class="tag">${project.qualityScore} quality</span><span class="tag">${project.agentScore} agent</span></div>
    <div class="actions"><a class="button" href="/graph/${escapeAttr(project.repo)}">Graph</a><a class="button" href="/alternatives/${escapeAttr(project.repo)}">Alternatives</a><a class="button" href="/score/${escapeAttr(project.repo)}">Score</a></div>
  </article>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
