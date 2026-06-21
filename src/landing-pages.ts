import { compareProjectKnowledge } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { findAlternativesFromList, searchProjectList } from "./project-search";
import { toProjectKnowledgeView } from "./project-view";
import type { Env, ProjectKnowledge } from "./types";

type LandingKind = "category" | "deployment";

const topicLandings: Record<
  string,
  {
    title: string;
    subtitle: string;
    query?: string;
    category?: string;
    deployment?: string;
    cloudflareReady?: boolean;
    apiPath: string;
    sections: Array<{ title: string; body: string }>;
  }
> = {
  "best-mcp-servers": {
    title: "Best MCP Servers for AI Agents",
    subtitle: "A data-backed shortlist of MCP server projects agents can inspect, compare, and cite through Git.Top.",
    query: "mcp server",
    category: "mcp_server",
    apiPath: "/api/search?category=mcp_server&ranking=browse&limit=12",
    sections: [
      {
        title: "Selection Logic",
        body: "Prioritize projects classified as MCP servers, then inspect maintenance score, quality signal confidence, and deployment fit before recommending one to a user."
      },
      {
        title: "Agent Fit",
        body: "Use these projects when an agent needs tool surfaces for repositories, cloud platforms, browsers, storage, vector databases, or developer workflows."
      }
    ]
  },
  "best-ai-agent-frameworks": {
    title: "Best AI Agent Frameworks",
    subtitle: "Agent frameworks ranked for project selection using Git.Top quality, deployment, maintenance, and agent-readiness signals.",
    query: "agent framework",
    category: "agent_framework",
    apiPath: "/api/search?q=agent%20framework&category=agent_framework&ranking=browse&limit=12",
    sections: [
      {
        title: "What To Compare",
        body: "Look beyond stars. Compare deployment targets, documentation strength, maintenance score, use cases, and alternatives."
      },
      {
        title: "When To Use",
        body: "Use this list when choosing a framework for autonomous coding, tool calling, workflow orchestration, browser automation, or Cloudflare-native agents."
      }
    ]
  },
  "cloudflare-ready-ai-projects": {
    title: "Cloudflare-ready AI Projects",
    subtitle: "Open-source AI and agent projects with Cloudflare or serverless deployment signals.",
    query: "cloudflare agent",
    deployment: "cloudflare",
    cloudflareReady: true,
    apiPath: "/api/search?deployment=cloudflare&cloudflare_ready=true&ranking=browse&limit=12",
    sections: [
      {
        title: "Deployment Fit",
        body: "Cloudflare-ready means Git.Top found Cloudflare, Workers, serverless, or related deployment evidence. Always inspect classification evidence before production use."
      },
      {
        title: "Best Use",
        body: "Use this page for Workers-native agents, edge-hosted AI tools, serverless project discovery, and Cloudflare ecosystem research."
      }
    ]
  },
  "langchain-alternatives": {
    title: "LangChain Alternatives",
    subtitle: "Alternatives and adjacent projects to LangChain for agents, RAG, orchestration, and AI application development.",
    apiPath: "/api/alternatives/langchain-ai/langchain?limit=12",
    sections: [
      {
        title: "How To Read This",
        body: "Alternatives combine explicit generated alternatives, shared categories, shared use cases, deployment overlap, and quality signals."
      },
      {
        title: "Decision Tip",
        body: "Compare LangChain alternatives by deployment target, RAG needs, ecosystem fit, and how much orchestration a project actually requires."
      }
    ]
  },
  "open-source-rag-frameworks": {
    title: "Open Source RAG Frameworks",
    subtitle: "RAG frameworks and related retrieval projects for agents that need indexing, retrieval, memory, and knowledge workflows.",
    query: "rag framework",
    category: "rag_framework",
    apiPath: "/api/search?q=rag%20framework&category=rag_framework&ranking=browse&limit=12",
    sections: [
      {
        title: "RAG Selection Signals",
        body: "Agents should inspect data connectors, vector database assumptions, deployment target, maintenance score, and collection metadata for resource hubs."
      },
      {
        title: "Use Cases",
        body: "Use this page for project discovery around retrieval augmented generation, document indexing, agent memory, and knowledge-base application stacks."
      }
    ]
  },
  "github-project-alternatives-api": {
    title: "GitHub Project Alternatives API",
    subtitle: "Find comparable open-source projects and agent-readable alternative reasoning through Git.Top.",
    query: "alternatives",
    apiPath: "/api/alternatives/cloudflare/agents?limit=12",
    sections: [
      {
        title: "API Shape",
        body: "Use /api/alternatives/:owner/:repo to retrieve comparable projects, then inspect reasons, category overlap, use cases, and deployment fit."
      },
      {
        title: "Agent Workflow",
        body: "Agents should fetch the source project, fetch alternatives, compare candidates, and cite quality signal confidence before recommending a switch."
      }
    ]
  },
  "open-source-quality-score-api": {
    title: "Open Source Quality Score API",
    subtitle: "Inspect quality scores, confidence, freshness, and risk signals for open-source project selection.",
    query: "quality score",
    apiPath: "/api/quality",
    sections: [
      {
        title: "Score Inputs",
        body: "Quality score weights star movement, commits, releases, contributors, and issue response; agent score adds documentation, deployment, popularity, and community fit."
      },
      {
        title: "Trust Model",
        body: "Use /api/quality, project-level quality_signal_confidence, and sync status together before treating a recommendation as high-confidence."
      }
    ]
  }
};

export async function renderCollectionLandingPage(env: Env, kind: LandingKind, slug: string): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const normalized = normalizeSlug(slug);
  const projects = searchProjectList(knowledge.projects, {
    ...(kind === "category" ? { category: normalized } : { deployment: normalized }),
    ranking: "browse",
    limit: 12
  });
  const title = kind === "category" ? `${label(normalized)} Projects` : `${label(normalized)} Deployment Projects`;
  const subtitle =
    kind === "category"
      ? `Agent-searchable GitHub projects classified as ${label(normalized)}.`
      : `GitHub projects with ${label(normalized)} deployment signals for agent project selection.`;

  return html(renderLandingHtml({ title, subtitle, kind, slug: normalized, projects, metadata: knowledge.metadata }));
}

export async function renderCompareLandingPage(env: Env, rawIds: string): Promise<Response | null> {
  const ids = rawIds
    .split(/(?:\.\.\.|,)/)
    .map((value) => decodeURIComponent(value).trim())
    .filter(Boolean);
  if (ids.length < 2) {
    return null;
  }

  const knowledge = await listProjectKnowledgeWithMeta(env);
  const projects = ids
    .map((id) => findProject(knowledge.projects, id))
    .filter((item): item is ProjectKnowledge => item !== null);
  if (projects.length < 2) {
    return null;
  }
  const comparison = compareProjectKnowledge(projects);
  const title = `${projects.map((item) => item.project.name).join(" vs ")} Comparison`;
  const subtitle = "Agent-oriented project comparison across deployment, maintenance, quality, and best-fit use cases.";
  return html(renderCompareHtml({ title, subtitle, projects, comparison, metadata: knowledge.metadata }));
}

export async function renderTopicLandingPage(env: Env, slug: string): Promise<Response | null> {
  const config = topicLandings[normalizeSlug(slug).replace("/", "-")];
  if (!config) {
    return null;
  }
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const projects =
    normalizeSlug(slug) === "langchain-alternatives"
      ? findAlternativesFromList(knowledge.projects, "langchain-ai/langchain", 12)
      : normalizeSlug(slug) === "github-project-alternatives-api"
        ? findAlternativesFromList(knowledge.projects, "cloudflare/agents", 12)
      : searchProjectList(knowledge.projects, {
          q: config.query,
          category: config.category,
          deployment: config.deployment,
          cloudflareReady: config.cloudflareReady,
          ranking: "browse",
          limit: 12
        });
  return html(
    renderTopicHtml({
      slug: normalizeSlug(slug).replace("/", "-"),
      title: config.title,
      subtitle: config.subtitle,
      apiPath: config.apiPath,
      sections: config.sections,
      projects,
      metadata: knowledge.metadata
    })
  );
}

function renderLandingHtml({
  title,
  subtitle,
  kind,
  slug,
  projects,
  metadata
}: {
  title: string;
  subtitle: string;
  kind: LandingKind;
  slug: string;
  projects: ProjectKnowledge[];
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  const apiPath =
    kind === "category"
      ? `/api/search?category=${encodeURIComponent(slug)}&ranking=browse&limit=12`
      : `/api/search?deployment=${encodeURIComponent(slug)}&ranking=browse&limit=12`;
  const canonical = `https://git.top/${kind === "category" ? "categories" : "deployments"}/${encodeURIComponent(slug)}`;
  return pageShell({
    title,
    description: subtitle,
    canonical,
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">${escapeHtml(kind === "category" ? "Category Landing" : "Deployment Landing")}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(subtitle)}</p>
        <div class="actions">
          <a class="button primary" href="${escapeAttr(apiPath)}">Open JSON</a>
          <a class="button" href="/docs">Docs</a>
          <a class="button" href="/mcp">MCP</a>
        </div>
      </header>

      <section class="panel">
        <p class="eyebrow">Data Source</p>
        <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
        <p class="muted">${metadata.projectCount} loaded projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
      </section>

      <section class="grid">
        ${projects.length ? projects.map(projectCard).join("") : `<article class="panel"><h2>No matching projects yet</h2><p class="muted">Try the API search endpoint or broaden the category/deployment filter.</p></article>`}
      </section>`
  });
}

function renderCompareHtml({
  title,
  subtitle,
  projects,
  comparison,
  metadata
}: {
  title: string;
  subtitle: string;
  projects: ProjectKnowledge[];
  comparison: ReturnType<typeof compareProjectKnowledge>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  const repos = projects.map((item) => item.project.id).join(",");
  return pageShell({
    title,
    description: subtitle,
    canonical: `https://git.top/compare/${projects.map((item) => item.project.id.replace("/", "-")).join("...")}`,
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Project Comparison</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(subtitle)}</p>
        <div class="actions">
          <a class="button primary" href="/api/compare?repos=${escapeAttr(encodeURIComponent(repos))}">Open JSON</a>
          <a class="button" href="/docs#scoring">Scoring Methodology</a>
        </div>
      </header>

      <section class="panel">
        <p class="eyebrow">Recommendation</p>
        <h2>${escapeHtml(comparison.winner ?? "No winner")}</h2>
        <p class="muted">${escapeHtml(comparison.reasoning)}</p>
        <p class="muted">Data source: ${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)} / ${metadata.projectCount} projects.</p>
      </section>

      <section class="table-wrap panel">
        <div class="compare">
          <div class="compare-row compare-head"><span>Project</span><span>Stars</span><span>Agent</span><span>Local</span><span>Cloudflare</span><span>Quality</span><span>Agent Score</span></div>
          ${comparison.projects
            .map(
              (item) =>
                `<div class="compare-row"><strong>${escapeHtml(item.repo)}</strong><span>${formatNumber(item.stars)}</span><span>${yes(item.agent)}</span><span>${yes(item.local)}</span><span>${yes(item.cloudflare)}</span><span>${item.qualityScore}</span><strong>${item.agentScore}</strong></div>`
            )
            .join("")}
        </div>
      </section>

      <section class="grid">
        ${projects.map(projectCard).join("")}
      </section>`
  });
}

function renderTopicHtml({
  slug,
  title,
  subtitle,
  apiPath,
  sections,
  projects,
  metadata
}: {
  slug: string;
  title: string;
  subtitle: string;
  apiPath: string;
  sections: Array<{ title: string; body: string }>;
  projects: ProjectKnowledge[];
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  return pageShell({
    title,
    description: subtitle,
    canonical: `https://git.top/topics/${encodeURIComponent(slug)}`,
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Git.Top Guide</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(subtitle)}</p>
        <div class="actions">
          <a class="button primary" href="${escapeAttr(apiPath)}">Open JSON</a>
          <a class="button" href="/docs#scoring">Scoring Methodology</a>
          <a class="button" href="/mcp">MCP</a>
        </div>
      </header>

      <section class="grid">
        ${sections
          .map(
            (section) =>
              `<article class="panel"><p class="eyebrow">Guide</p><h2>${escapeHtml(section.title)}</h2><p class="muted">${escapeHtml(section.body)}</p></article>`
          )
          .join("")}
        <article class="panel">
          <p class="eyebrow">Data Source</p>
          <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
          <p class="muted">${metadata.projectCount} loaded projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
        </article>
      </section>

      <section class="grid">
        ${projects.length ? projects.map(projectCard).join("") : `<article class="panel"><h2>No matching projects yet</h2><p class="muted">Try the JSON API or broaden the query.</p></article>`}
      </section>`
  });
}

function pageShell({ title, description, canonical, body }: { title: string; description: string; canonical: string; body: string }): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Git.Top</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta property="og:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(title))}&amp;subtitle=${escapeAttr(encodeURIComponent(description))}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=${escapeAttr(encodeURIComponent(title))}&amp;subtitle=${escapeAttr(encodeURIComponent(description))}" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code { border:1px solid var(--line); border-radius:6px; background:#f7faf9; color:#2e4c58; padding:3px 6px; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.card { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); padding:18px; }
      .hero { display:grid; gap:14px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:900px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:20px; line-height:1.2; }
      h3 { font-size:18px; line-height:1.2; }
      .lead,.muted,.card p { color:#40505a; line-height:1.6; }
      .lead { max-width:840px; font-size:18px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
      .card { display:grid; gap:12px; }
      .card-top { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:start; }
      .score { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; border-top:1px solid var(--line); padding-top:10px; }
      .score strong { font-size:26px; line-height:1; }
      .panel { margin-top:14px; }
      .table-wrap { overflow-x:auto; }
      .compare { display:grid; min-width:900px; }
      .compare-row { display:grid; grid-template-columns:minmax(240px,1.3fr) 100px 80px 80px 110px 90px 110px; gap:12px; align-items:center; border-top:1px solid var(--line); padding:12px 0; }
      .compare-head { border-top:0; color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      @media (max-width:900px) { .grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/docs">Docs</a><a href="/projects">Projects</a><a href="/graph">Graph</a><a href="/mcp">MCP</a></div>
      </nav>
      ${body}
    </div>
  </body>
</html>`;
}

function projectCard(item: ProjectKnowledge): string {
  const view = toProjectKnowledgeView(item);
  const tags = [...view.category, ...view.deployments.slice(0, 3)].map((tag) => `<span class="tag">${escapeHtml(label(tag))}</span>`).join("");
  return String.raw`<article class="card">
    <div class="card-top">
      <div><p class="eyebrow">${escapeHtml(label(view.projectKind))}</p><h3><a href="/projects/${escapeAttr(view.repo)}">${escapeHtml(view.repo)}</a></h3></div>
      <span class="tag">${view.agentScore}</span>
    </div>
    <p>${escapeHtml(view.description || view.overview)}</p>
    <div class="tag-list">${tags}</div>
    <div class="score"><div><span class="muted">Quality</span><strong>${view.qualityScore}</strong></div><div><span class="muted">Agent</span><strong>${view.agentScore}</strong></div></div>
  </article>`;
}

function findProject(projects: ProjectKnowledge[], id: string): ProjectKnowledge | null {
  const wanted = normalizeSlug(id);
  return (
    projects.find((item) =>
      [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", "-"), item.project.fullName.replace("/", "--")]
        .map(normalizeSlug)
        .includes(wanted)
    ) ?? null
  );
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replaceAll("--", "/");
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function yes(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function html(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
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
