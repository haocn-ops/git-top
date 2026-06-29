import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { searchProjectList } from "./project-search";
import { toProjectKnowledgeView } from "./project-view";
import type { Env, ProjectKnowledge } from "./types";

type ProjectView = ReturnType<typeof toProjectKnowledgeView>;

export interface AtlasEcosystem {
  id: string;
  title: string;
  description: string;
  query: string;
  category?: string;
  deployment?: string;
  nodes: string[];
}

const ecosystems: AtlasEcosystem[] = [
  {
    id: "cloudflare",
    title: "Cloudflare Ecosystem",
    description: "Edge-native AI and agent projects connected to Workers, D1, R2, Durable Objects, and AI Gateway.",
    query: "cloudflare workers agents",
    deployment: "cloudflare",
    nodes: ["Agents", "Workers", "D1", "R2", "Durable Objects", "AI Gateway"]
  },
  {
    id: "agents",
    title: "AI Agent Ecosystem",
    description: "Agent frameworks, coding agents, orchestration tools, and runtime integrations.",
    query: "agent framework",
    category: "agent_framework",
    nodes: ["LangGraph", "CrewAI", "AutoGen", "Mastra", "OpenAI Agents SDK", "Cloudflare Agents"]
  },
  {
    id: "mcp",
    title: "MCP Ecosystem",
    description: "Model Context Protocol servers, tool surfaces, and agent integration projects.",
    query: "mcp server",
    category: "mcp_server",
    nodes: ["Servers", "Tools", "Clients", "Filesystems", "Browsers", "Cloud APIs"]
  },
  {
    id: "rag",
    title: "RAG Ecosystem",
    description: "Retrieval, indexing, document processing, vector database, and evaluation projects.",
    query: "rag framework",
    category: "rag_framework",
    nodes: ["LangChain", "LlamaIndex", "Vector DB", "Document Loaders", "Memory", "Evaluation"]
  },
  {
    id: "browser-ai",
    title: "Browser AI Ecosystem",
    description: "Browser automation, computer-use agents, Playwright integrations, and web workflow tools.",
    query: "browser automation ai",
    category: "browser_agent",
    nodes: ["Browser Use", "Playwright", "Chromium", "Stagehand", "Crawling", "Computer Use"]
  }
];

export function listAtlasEcosystems(): AtlasEcosystem[] {
  return [...ecosystems];
}

export function findAtlasEcosystem(id: string): AtlasEcosystem | null {
  return ecosystems.find((item) => item.id === normalizeAtlasId(id)) ?? null;
}

export function buildAtlasEcosystemView(projects: ProjectKnowledge[], ecosystem: AtlasEcosystem, limit = 8) {
  const ecosystemProjects = atlasProjects(projects, ecosystem, limit);
  const map = buildAtlasEcosystemMap(ecosystem, ecosystemProjects);
  return {
    id: ecosystem.id,
    title: ecosystem.title,
    description: ecosystem.description,
    query: ecosystem.query,
    category: ecosystem.category ?? null,
    deployment: ecosystem.deployment ?? null,
    nodes: ecosystem.nodes,
    projects: ecosystemProjects,
    project_count: ecosystemProjects.length,
    stats: {
      concept_count: ecosystem.nodes.length,
      project_count: ecosystemProjects.length,
      edge_count: map.edges.length,
      top_project: ecosystemProjects[0]?.repo ?? null,
      average_git_top_score: averageScore(ecosystemProjects)
    },
    map,
    exploration_paths: buildExplorationPaths(ecosystem, ecosystemProjects),
    links: {
      page: `/atlas/${ecosystem.id}`,
      search_api: `/api/search?q=${encodeURIComponent(ecosystem.query)}&ranking=browse&limit=${limit}`,
      graph: ecosystemProjects[0] ? `/api/graph/${ecosystemProjects[0].repo}?limit=24` : "/api/graph?limit=24"
    }
  };
}

function buildExplorationPaths(ecosystem: AtlasEcosystem, projects: ProjectView[]) {
  const primary = projects[0];
  const secondary = projects[1];
  const compareRepos = [primary?.repo, secondary?.repo].filter(Boolean).join(",");
  return [
    {
      label: "Discover Projects",
      description: `Browse indexed projects around ${ecosystem.title}.`,
      href: searchApiHref(ecosystem.query, 12),
      kind: "search"
    },
    {
      label: "Open Graph",
      description: primary ? `Inspect relationships around ${primary.repo}.` : "Inspect the global project graph.",
      href: primary ? `/graph/${primary.repo}` : "/graph",
      kind: "graph"
    },
    {
      label: "Find Alternatives",
      description: primary ? `Find replacements and adjacent options for ${primary.repo}.` : "Find replacement candidates for a project.",
      href: primary ? `/alternatives/${primary.repo}` : "/alternatives",
      kind: "alternatives"
    },
    {
      label: "Explain Score",
      description: primary ? `Understand why ${primary.repo} has its Git.Top Score.` : "Open project score explanations.",
      href: primary ? `/score/${primary.repo}` : "/projects",
      kind: "score"
    },
    {
      label: "Compare Options",
      description: compareRepos ? `Compare ${compareRepos.replace(",", " and ")}.` : "Compare projects by fit and deployability.",
      href: compareRepos ? `/compare/${compareRepos.replaceAll("/", "-").replace(",", "...")}` : "/compare",
      kind: "compare"
    }
  ];
}

function averageScore(projects: ProjectView[]): number | null {
  if (projects.length === 0) {
    return null;
  }
  const total = projects.reduce((sum, project) => sum + project.gitTopScore, 0);
  return Math.round(total / projects.length);
}

function buildAtlasEcosystemMap(ecosystem: AtlasEcosystem, projects: ProjectView[]) {
  const ecosystemNodeId = `ecosystem:${ecosystem.id}`;
  const conceptNodes = ecosystem.nodes.map((node) => ({
    id: `concept:${ecosystem.id}:${slug(node)}`,
    label: node,
    kind: "concept",
    ecosystem_id: ecosystem.id
  }));
  const projectNodes = projects.map((project) => ({
    id: `project:${project.repo}`,
    label: project.name,
    kind: "project",
    repo: project.repo,
    score: project.gitTopScore,
    category: project.category[0] ?? null
  }));

  return {
    nodes: [
      {
        id: ecosystemNodeId,
        label: ecosystem.title,
        kind: "ecosystem",
        ecosystem_id: ecosystem.id
      },
      ...conceptNodes,
      ...projectNodes
    ],
    edges: [
      ...conceptNodes.map((node) => ({
        source: ecosystemNodeId,
        target: node.id,
        kind: "contains",
        weight: 80
      })),
      ...projectNodes.map((node) => ({
        source: ecosystemNodeId,
        target: node.id,
        kind: "contains_project",
        weight: 72
      })),
      ...projects.flatMap((project) =>
        relatedConceptsForProject(ecosystem, project).map((concept) => ({
          source: `project:${project.repo}`,
          target: `concept:${ecosystem.id}:${slug(concept)}`,
          kind: "matches_concept",
          weight: 64
        }))
      )
    ]
  };
}

function relatedConceptsForProject(ecosystem: AtlasEcosystem, project: ProjectView): string[] {
  const text = [project.repo, project.name, project.description, project.overview, project.category.join(" "), project.tags.join(" "), project.deployments.join(" "), project.dependencies.join(" ")].join(" ").toLowerCase();
  const matched = ecosystem.nodes.filter((node) => {
    const normalized = node.toLowerCase();
    return text.includes(normalized) || normalized.split(/\s+/).some((part) => part.length > 2 && text.includes(part));
  });
  return matched.length ? matched.slice(0, 3) : ecosystem.nodes.slice(0, 1);
}

export async function renderAtlasPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const sections = ecosystems.map((ecosystem) => ({
    ecosystem,
    projects: atlasProjects(knowledge.projects, ecosystem, 8)
  }));

  return new Response(renderHtml({ sections, metadata: knowledge.metadata }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=180"
    }
  });
}

export async function renderAtlasEcosystemPage(env: Env, id: string): Promise<Response | null> {
  const ecosystem = findAtlasEcosystem(id);
  if (!ecosystem) {
    return null;
  }
  const knowledge = await listProjectKnowledgeWithMeta(env);
  return new Response(
    renderHtml({
      sections: [
        {
          ecosystem,
          projects: atlasProjects(knowledge.projects, ecosystem, 8)
        }
      ],
      metadata: knowledge.metadata,
      focus: ecosystem
    }),
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=180"
      }
    }
  );
}

function atlasProjects(projects: ProjectKnowledge[], ecosystem: AtlasEcosystem, limit: number): ProjectView[] {
  const results = searchProjectList(projects, {
    q: ecosystem.query,
    category: ecosystem.category,
    deployment: ecosystem.deployment,
    ranking: "browse",
    limit
  });
  return results.map(toProjectKnowledgeView);
}

function renderHtml({
  sections,
  metadata,
  focus
}: {
  sections: Array<{ ecosystem: AtlasEcosystem; projects: ProjectView[] }>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
  focus?: AtlasEcosystem;
}): string {
  const pageTitle = focus ? `${focus.title} | Git.Top Atlas` : "Git.Top Atlas | Open Source Ecosystem Map";
  const pageDescription = focus
    ? `Explore ${focus.title} projects, graph links, alternatives, and scores in Git.Top Atlas.`
    : "Explore open-source ecosystems as a knowledge map across Cloudflare, AI Agents, MCP, RAG, and Browser AI projects.";
  const canonical = focus ? `https://git.top/atlas/${focus.id}` : "https://git.top/atlas";
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeAttr(pageDescription)}" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    <meta property="og:title" content="${escapeAttr(pageTitle)}" />
    <meta property="og:description" content="${escapeAttr(pageDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Atlas&amp;subtitle=Open-source%20ecosystem%20map" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Atlas&amp;subtitle=Open-source%20ecosystem%20map" />
    <style>
      :root { color-scheme: light; --bg:#f6f8fb; --surface:#fff; --ink:#182026; --muted:#66737c; --line:#dce3e8; --teal:#0f766e; --teal-dark:#0b5d56; --green:#147d4f; --amber:#a15c07; --blue:#355c9f; --shadow:0 16px 40px rgba(17,24,39,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      .page { max-width:1240px; margin:0 auto; padding:22px; }
      .nav,.hero-top,.panel-heading,.actions { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
      .nav { margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark,.map-icon { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .eyebrow { color:var(--teal-dark); font-size:12px; font-weight:900; text-transform:uppercase; }
      h1 { max-width:900px; font-size:clamp(36px,6vw,70px); line-height:.98; margin-top:4px; }
      h2 { font-size:21px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,.project-card p { color:#40505a; line-height:1.6; }
      .lead { max-width:840px; font-size:18px; margin-top:12px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:36px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:8px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .hero,.panel,.ecosystem,.project-card,.path-item { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { padding:22px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.94)); }
      .atlas-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-top:16px; }
      .ecosystem { display:grid; gap:12px; min-height:270px; padding:14px; }
      .atlas-nav { display:flex; gap:9px; flex-wrap:wrap; margin-top:12px; }
      .mini-map { position:relative; min-height:150px; border:1px solid var(--line); border-radius:8px; background:#fbfdfd; overflow:hidden; }
      .hub { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); display:grid; place-items:center; width:74px; height:74px; border-radius:50%; background:#e9f4f1; border:1px solid #8fd0b1; color:var(--teal-dark); font-size:12px; font-weight:900; text-align:center; padding:8px; }
      .orbit { position:absolute; display:grid; place-items:center; width:64px; min-height:34px; border:1px solid var(--line); border-radius:999px; background:#fff; color:#40505a; font-size:11px; font-weight:900; text-align:center; padding:5px 7px; }
      .orbit:nth-child(2) { left:8%; top:12%; }
      .orbit:nth-child(3) { right:8%; top:13%; }
      .orbit:nth-child(4) { left:7%; bottom:14%; }
      .orbit:nth-child(5) { right:7%; bottom:13%; }
      .orbit:nth-child(6) { left:50%; top:4%; transform:translateX(-50%); }
      .orbit:nth-child(7) { left:50%; bottom:4%; transform:translateX(-50%); }
      .section { margin-top:18px; }
      .project-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:12px; }
      .project-card { display:grid; gap:10px; min-height:230px; padding:14px; }
      .project-card-top { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:start; }
      .project-card strong,.project-card h3 { overflow-wrap:anywhere; }
      .score { display:inline-flex; align-items:center; justify-content:center; min-width:42px; min-height:30px; border-radius:8px; background:#eefaf4; color:var(--green); font-weight:900; }
      .tag-list { margin-top:auto; }
      .tag { color:#40505a; font-size:12px; }
      .panel { padding:16px; }
      .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }
      .stat { border:1px solid var(--line); border-radius:8px; background:#fbfdfd; padding:10px; }
      .stat span { display:block; color:var(--muted); font-size:12px; font-weight:800; }
      .stat strong { display:block; margin-top:4px; font-size:18px; overflow-wrap:anywhere; }
      .path-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-top:12px; }
      .path-item { display:grid; gap:7px; min-height:130px; padding:12px; box-shadow:none; }
      .path-item span { color:var(--teal-dark); font-size:12px; font-weight:900; text-transform:uppercase; }
      .path-item p { color:#40505a; line-height:1.45; }
      @media (max-width:1100px) { .atlas-grid,.project-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:1100px) { .path-grid,.stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:700px) { .atlas-grid,.project-grid,.path-grid,.stats { grid-template-columns:1fr; } .ecosystem { min-height:auto; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/projects">Projects</a><a href="/graph">Graph</a><a href="/docs">Docs</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <div class="hero-top">
          <div>
            <p class="eyebrow">Atlas Beta</p>
            <h1>${escapeHtml(focus ? focus.title : "Open-source ecosystems as a map")}</h1>
          </div>
          <a class="button primary" href="${escapeAttr(focus ? `/api/atlas/${focus.id}` : "/api/atlas")}">Atlas JSON</a>
        </div>
        <p class="lead">${escapeHtml(focus ? focus.description : "Atlas is the Git.Top map layer: a way to move from ecosystem to project, graph, alternatives, and score without starting from a repository name.")}</p>
        <div class="atlas-nav">
          ${focus ? `<a class="button" href="/atlas">All Ecosystems</a>` : ""}
          <a class="button" href="#cloudflare">Cloudflare</a>
          <a class="button" href="#agents">Agents</a>
          <a class="button" href="#mcp">MCP</a>
          <a class="button" href="#rag">RAG</a>
          <a class="button" href="#browser-ai">Browser AI</a>
        </div>
        <div class="tag-list">
          <span class="tag">Data source: ${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</span>
          <span class="tag">${metadata.projectCount} projects loaded</span>
          <span class="tag">Generated ${escapeHtml(metadata.generatedAt)}</span>
        </div>
      </header>

      <section class="atlas-grid" aria-label="Ecosystem map overview">
        ${sections.map(({ ecosystem }) => ecosystemCard(ecosystem)).join("")}
      </section>

      ${sections.map(({ ecosystem, projects }) => ecosystemSection(ecosystem, projects)).join("")}
    </div>
  </body>
</html>`;
}

function ecosystemCard(ecosystem: AtlasEcosystem): string {
  return `<article class="ecosystem">
    <div class="panel-heading"><div><p class="eyebrow">Ecosystem</p><h2>${escapeHtml(ecosystem.title)}</h2></div><span class="map-icon">Map</span></div>
    <div class="mini-map" aria-hidden="true">
      <div class="hub">${escapeHtml(shortLabel(ecosystem.title.replace(" Ecosystem", ""), 16))}</div>
      ${ecosystem.nodes.slice(0, 6).map((node) => `<span class="orbit">${escapeHtml(shortLabel(node, 16))}</span>`).join("")}
    </div>
    <p class="muted">${escapeHtml(ecosystem.description)}</p>
    <div class="atlas-nav">
      <a class="button primary" href="/atlas/${escapeAttr(ecosystem.id)}">Open</a>
      <a class="button" href="${escapeAttr(searchApiHref(ecosystem.query, 12))}">Projects</a>
      <a class="button" href="#${escapeAttr(ecosystem.id)}">Graph</a>
    </div>
  </article>`;
}

function ecosystemSection(ecosystem: AtlasEcosystem, projects: ProjectView[]): string {
  const stats = {
    concepts: ecosystem.nodes.length,
    projects: projects.length,
    averageScore: averageScore(projects),
    topProject: projects[0]?.repo ?? "Not indexed yet"
  };
  return `<section class="section" id="${escapeAttr(ecosystem.id)}">
    <div class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Atlas Layer</p>
          <h2>${escapeHtml(ecosystem.title)}</h2>
        </div>
        <div class="actions">
          <a class="button" href="${escapeAttr(searchApiHref(ecosystem.query, 12))}">JSON</a>
          <a class="button" href="/graph">Graph</a>
          ${projects[0] ? `<a class="button" href="/alternatives/${escapeAttr(projects[0].repo)}">Alternatives</a><a class="button" href="/score/${escapeAttr(projects[0].repo)}">Score</a>` : ""}
        </div>
      </div>
      <p class="muted">${escapeHtml(ecosystem.description)}</p>
      <div class="stats" aria-label="${escapeAttr(ecosystem.title)} atlas stats">
        <div class="stat"><span>Concepts</span><strong>${stats.concepts}</strong></div>
        <div class="stat"><span>Projects</span><strong>${stats.projects}</strong></div>
        <div class="stat"><span>Avg Git.Top Score</span><strong>${stats.averageScore ?? "-"}</strong></div>
        <div class="stat"><span>Top Project</span><strong>${escapeHtml(stats.topProject)}</strong></div>
      </div>
      <div class="path-grid" aria-label="${escapeAttr(ecosystem.title)} exploration paths">
        ${buildExplorationPaths(ecosystem, projects).map(explorationPath).join("")}
      </div>
      <div class="project-grid">
        ${projects.length ? projects.map(projectCard).join("") : `<article class="project-card"><h3>No indexed projects yet</h3><p>Atlas will fill this ecosystem as Git.Top expands its corpus.</p></article>`}
      </div>
    </div>
  </section>`;
}

function explorationPath(path: ReturnType<typeof buildExplorationPaths>[number]): string {
  return `<a class="path-item" href="${escapeAttr(path.href)}">
    <span>${escapeHtml(path.kind)}</span>
    <strong>${escapeHtml(path.label)}</strong>
    <p>${escapeHtml(path.description)}</p>
  </a>`;
}

function projectCard(view: ProjectView): string {
  return `<article class="project-card">
    <div class="project-card-top">
      <div><p class="eyebrow">${escapeHtml(view.category[0] ?? "Project")}</p><h3><a href="/projects/${escapeAttr(view.repo)}">${escapeHtml(view.repo)}</a></h3></div>
      <span class="score">${view.agentScore}</span>
    </div>
    <p>${escapeHtml(view.description || view.overview)}</p>
    <div class="tag-list">
      ${view.deployments.slice(0, 2).map((deployment) => `<span class="tag">${escapeHtml(label(deployment))}</span>`).join("")}
      <a class="tag" href="/graph/${escapeAttr(view.repo)}">Graph</a>
      <a class="tag" href="/alternatives/${escapeAttr(view.repo)}">Alternatives</a>
      <a class="tag" href="/score/${escapeAttr(view.repo)}">Score</a>
    </div>
  </article>`;
}

function shortLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function label(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function searchApiHref(query: string, limit: number): string {
  return `/api/search?q=${encodeURIComponent(query)}&ranking=browse&limit=${limit}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeAtlasId(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-");
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
