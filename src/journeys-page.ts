import { buildAtlasEcosystemView, listAtlasEcosystems } from "./atlas-page";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import type { Env, ProjectKnowledge } from "./types";

type AtlasView = ReturnType<typeof buildAtlasEcosystemView>;
type AtlasJourney = AtlasView["exploration_journeys"][number];

export interface AtlasJourneyView extends AtlasJourney {
  id: string;
  ecosystemId: string;
  ecosystemTitle: string;
  apiHref: string;
  pageHref: string;
}

export interface AtlasJourneysView {
  name: string;
  positioning: string;
  summary: string;
  journeys: AtlasJourneyView[];
  stats: {
    ecosystemCount: number;
    journeyCount: number;
    stepCount: number;
  };
  metadata: {
    source: string;
    reason: string;
    projectCount: number;
    generatedAt: string;
  };
}

export async function buildAtlasJourneysView(env: Env, limit = 8): Promise<AtlasJourneysView> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  return buildAtlasJourneysFromProjects(knowledge.projects, knowledge.metadata, limit);
}

export function buildAtlasJourneysFromProjects(
  projects: ProjectKnowledge[],
  metadata: AtlasJourneysView["metadata"],
  limit = 8
): AtlasJourneysView {
  const ecosystems = listAtlasEcosystems();
  const journeys = ecosystems.flatMap((ecosystem) => {
    const atlas = buildAtlasEcosystemView(projects, ecosystem, limit);
    return atlas.exploration_journeys.map((journey, index) => ({
      ...journey,
      id: `${ecosystem.id}-${slug(journey.label)}-${index + 1}`,
      ecosystemId: ecosystem.id,
      ecosystemTitle: ecosystem.title,
      apiHref: `/api/atlas/${ecosystem.id}?limit=${limit}`,
      pageHref: `/atlas/${ecosystem.id}`
    }));
  });

  return {
    name: "Git.Top Atlas Journeys",
    positioning: "The Knowledge Graph of Open Source",
    summary: "Reusable exploration routes that move users and agents from ecosystem maps into recommendations, graph context, alternatives, comparisons, scores, and Agent Map surfaces.",
    journeys,
    stats: {
      ecosystemCount: ecosystems.length,
      journeyCount: journeys.length,
      stepCount: journeys.reduce((sum, journey) => sum + journey.steps.length, 0)
    },
    metadata
  };
}

export async function renderJourneysPage(env: Env): Promise<Response> {
  const view = await buildAtlasJourneysView(env);
  return new Response(renderHtml(view), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

function renderHtml(view: AtlasJourneysView): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Atlas Journeys | Explore Open Source Ecosystems</title>
    <meta name="description" content="Atlas journeys for moving through open-source ecosystems from discovery to recommendations, graph, alternatives, compare, score, and Agent Map." />
    <link rel="canonical" href="https://git.top/journeys" />
    <meta property="og:title" content="Git.Top Atlas Journeys" />
    <meta property="og:description" content="Reusable exploration routes across open-source ecosystem maps." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/journeys" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Atlas%20Journeys&subtitle=Explore%20open-source%20ecosystems" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Atlas%20Journeys&subtitle=Explore%20open-source%20ecosystems" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.journey,.metric { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:34px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:7px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .metric { display:grid; gap:8px; min-height:100px; padding:14px; }
      .metric strong { font-size:26px; line-height:1; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:12px; margin-top:14px; }
      .journeys { display:grid; gap:12px; }
      .journey,.panel { display:grid; gap:12px; padding:16px; align-content:start; }
      .journey-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      ol { display:grid; gap:9px; margin:0; padding-left:20px; }
      li a { font-weight:900; color:#22313a; }
      .tag { border-radius:999px; min-height:28px; font-size:12px; color:#40505a; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      @media (max-width:900px) { .metrics,.layout { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/atlas">Atlas</a><a href="/journeys">Journeys</a><a href="/api/journeys">JSON</a><a href="/recipes">Recipes</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Atlas Journeys</p>
        <h1>Explore open-source ecosystems as routes, not lists.</h1>
        <p class="lead">${escapeHtml(view.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/journeys">Open Journeys JSON</a>
          <a class="button" href="/atlas">Open Atlas</a>
          <a class="button" href="/api/atlas">Atlas JSON</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
        </div>
      </header>

      <section class="metrics">
        ${metric("Ecosystems", view.stats.ecosystemCount, "Curated Atlas maps.")}
        ${metric("Journeys", view.stats.journeyCount, "Reusable exploration routes.")}
        ${metric("Steps", view.stats.stepCount, "Linked actions across Git.Top surfaces.")}
        ${metric("Source", view.metadata.source, `${view.metadata.projectCount} projects / ${view.metadata.reason}`)}
      </section>

      <main class="layout">
        <section class="journeys">
          ${view.journeys.map(journeyCard).join("")}
        </section>
        <aside class="panel">
          <p class="eyebrow">How To Use</p>
          <h2>Follow a route from ecosystem to decision</h2>
          <p class="muted">Journeys are designed for humans and agents: each step links to a page or JSON endpoint that narrows context before a project recommendation.</p>
          <div class="rows">
            ${view.journeys.slice(0, 10).map((journey) => `<a class="button" href="#${escapeAttr(journey.id)}">${escapeHtml(journey.ecosystemTitle)}: ${escapeHtml(journey.label)}</a>`).join("")}
          </div>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function journeyCard(journey: AtlasJourneyView): string {
  return `<article class="journey" id="${escapeAttr(journey.id)}">
    <div class="journey-top">
      <div><p class="eyebrow">${escapeHtml(journey.ecosystemTitle)}</p><h2>${escapeHtml(journey.label)}</h2></div>
      <div class="actions"><a class="button" href="${escapeAttr(journey.pageHref)}">Atlas</a><a class="button" href="${escapeAttr(journey.apiHref)}">JSON</a></div>
    </div>
    <p class="muted">${escapeHtml(journey.description)}</p>
    <ol>
      ${journey.steps.map((step) => `<li><a href="${escapeAttr(step.href)}">${escapeHtml(step.label)}</a>: ${escapeHtml(step.description)}</li>`).join("")}
    </ol>
    <div class="tag-list"><span class="tag">${escapeHtml(journey.ecosystemId)}</span><span class="tag">${journey.steps.length} steps</span></div>
  </article>`;
}

function metric(label: string, value: string | number, note: string): string {
  return `<article class="metric"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(note)}</p></article>`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
