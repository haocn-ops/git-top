import { compareProjectKnowledge } from "./graph";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { alternativeAdoptionGuidance, buildAlternativesDecision, generateAlternativeMatches } from "./alternatives";
import { findAlternativesFromList, searchProjectList } from "./project-search";
import { findProjectById, resolveProject } from "./project-aliases";
import { toProjectKnowledgeView } from "./project-view";
import type { Env, ProjectKnowledge } from "./types";

type LandingKind = "category" | "deployment";

const compareExamples = [
  {
    title: "Cloudflare Agents vs LangChain",
    description: "Compare edge-native agent deployment with a broad agent and RAG framework.",
    ids: ["cloudflare/agents", "langchain-ai/langchain"]
  },
  {
    title: "LangChain vs LlamaIndex",
    description: "Compare two common RAG and application framework choices.",
    ids: ["langchain-ai/langchain", "run-llama/llama_index"]
  },
  {
    title: "Browser Use vs Playwright",
    description: "Compare browser-agent workflows with browser automation infrastructure.",
    ids: ["browser-use/browser-use", "microsoft/playwright"]
  },
  {
    title: "Dify vs Langflow",
    description: "Compare AI application builders and workflow-oriented tools.",
    ids: ["langgenius/dify", "langflow-ai/langflow"]
  },
  {
    title: "OpenAI Agents SDK vs Vercel AI SDK",
    description: "Compare agent SDK ergonomics with application AI SDK integration.",
    ids: ["openai/openai-agents-python", "vercel/ai"]
  }
];

const discoverSections = [
  {
    id: "ai-agents",
    title: "AI Agents",
    description: "Agent frameworks, coding agents, orchestration runtimes, and tool-calling projects.",
    query: "agent framework",
    category: "agent_framework",
    apiPath: "/api/search?q=agent%20framework&category=agent_framework&ranking=browse&limit=12",
    guidePath: "/topics/best-ai-agent-frameworks"
  },
  {
    id: "mcp-servers",
    title: "MCP Servers",
    description: "Model Context Protocol servers and tool surfaces for agent integrations.",
    query: "mcp server",
    category: "mcp_server",
    apiPath: "/api/search?category=mcp_server&ranking=browse&limit=12",
    guidePath: "/topics/best-mcp-servers"
  },
  {
    id: "rag",
    title: "RAG",
    description: "Retrieval, indexing, document workflows, memory, and knowledge-base infrastructure.",
    query: "rag framework",
    category: "rag_framework",
    apiPath: "/api/search?q=rag%20framework&category=rag_framework&ranking=browse&limit=12",
    guidePath: "/topics/open-source-rag-frameworks"
  },
  {
    id: "browser-automation",
    title: "Browser Automation",
    description: "Browser agents, Playwright-adjacent automation, computer-use workflows, and crawling tools.",
    query: "browser automation",
    category: "browser_agent",
    apiPath: "/api/search?q=browser%20automation&ranking=browse&limit=12",
    guidePath: "/topics/browser-ai-automation"
  },
  {
    id: "ai-ide",
    title: "AI IDE",
    description: "Coding agents, IDE assistants, code review agents, and local developer workflow tools.",
    query: "ai ide coding agent",
    category: "coding_agent",
    apiPath: "/api/search?q=ai%20ide%20coding%20agent&category=coding_agent&ranking=browse&limit=12",
    guidePath: "/topics/ai-ide-coding-agents"
  }
];

const alternativeExamples = [
  {
    title: "Claude Code Alternatives",
    description: "Find adjacent coding agents, IDE assistants, and developer workflow tools.",
    projectId: "openai/codex"
  },
  {
    title: "Cursor Alternatives",
    description: "Compare open-source coding assistants and local developer workflow tools.",
    projectId: "continuedev/continue"
  },
  {
    title: "OpenAI Alternatives",
    description: "Compare agent SDKs, OpenAI-compatible gateways, and application AI frameworks.",
    projectId: "openai/openai-agents-python"
  },
  {
    title: "LangChain Alternatives",
    description: "Find adjacent RAG, orchestration, and agent framework options.",
    projectId: "langchain-ai/langchain"
  },
  {
    title: "Dify Alternatives",
    description: "Compare AI app builders, workflow tools, and low-code agent platforms.",
    projectId: "langgenius/dify"
  },
  {
    title: "Cloudflare Agents Alternatives",
    description: "Compare agent frameworks and orchestration tools near Cloudflare-native agents.",
    projectId: "cloudflare/agents"
  },
  {
    title: "Browser Use Alternatives",
    description: "Compare browser-agent tooling and automation infrastructure.",
    projectId: "browser-use/browser-use"
  },
  {
    title: "LlamaIndex Alternatives",
    description: "Compare RAG frameworks and retrieval-oriented application stacks.",
    projectId: "run-llama/llama_index"
  }
];

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
  "browser-ai-automation": {
    title: "Browser AI Automation Projects",
    subtitle: "Browser agents, Playwright-adjacent automation, computer-use workflows, and crawling tools for agentic web tasks.",
    query: "browser automation",
    category: "browser_agent",
    apiPath: "/api/search?q=browser%20automation&category=browser_agent&ranking=browse&limit=12",
    sections: [
      {
        title: "What To Inspect",
        body: "Compare browser projects by automation engine, deployment fit, maintenance, safety boundaries, and whether the project is an agent layer or lower-level browser infrastructure."
      },
      {
        title: "Agent Workflow",
        body: "Use this page when selecting tools for browsing, extraction, computer-use tasks, Playwright orchestration, crawling, or browser-based evaluation."
      }
    ]
  },
  "ai-ide-coding-agents": {
    title: "AI IDE and Coding Agent Projects",
    subtitle: "Coding agents, AI IDE assistants, code review agents, and local developer workflow tools.",
    query: "ai ide coding agent",
    category: "coding_agent",
    apiPath: "/api/search?q=ai%20ide%20coding%20agent&category=coding_agent&ranking=browse&limit=12",
    sections: [
      {
        title: "What To Compare",
        body: "Evaluate coding agents by repository access model, local execution support, review workflow, IDE integration, maintenance, and agent readability signals."
      },
      {
        title: "Best Use",
        body: "Use this page for choosing developer copilots, coding agents, AI IDE backends, review assistants, and automation tools for software teams."
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
    .map((id) => resolveProject(knowledge.projects, id)?.project ?? null)
    .filter((item): item is ProjectKnowledge => item !== null);
  if (projects.length < 2) {
    return null;
  }
  const comparison = compareProjectKnowledge(projects);
  const title = `${projects.map((item) => item.project.name).join(" vs ")} Comparison`;
  const subtitle = "Agent-oriented project comparison across deployment, maintenance, quality, and best-fit use cases.";
  return html(renderCompareHtml({ title, subtitle, projects, comparison, metadata: knowledge.metadata }));
}

export async function renderCompareIndexPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const examples = compareExamples.map((example) => {
    const projects = example.ids.map((id) => findProject(knowledge.projects, id)).filter((item): item is ProjectKnowledge => item !== null);
    return {
      ...example,
      projects,
      comparison: projects.length >= 2 ? compareProjectKnowledge(projects) : null
    };
  });

  return html(renderCompareIndexHtml({ examples, metadata: knowledge.metadata }));
}

export async function renderDiscoverPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const sections = discoverSections.map((section) => ({
    section,
    projects: searchProjectList(knowledge.projects, {
      q: section.query,
      category: section.category,
      ranking: "browse",
      limit: 6
    })
  }));

  return html(renderDiscoverHtml({ sections, metadata: knowledge.metadata }));
}

export async function renderAlternativesLandingPage(env: Env, rawId: string): Promise<Response | null> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const resolution = resolveProject(knowledge.projects, rawId);
  if (!resolution) {
    return null;
  }
  const project = resolution.project;

  const alternatives = findAlternativesFromList(knowledge.projects, project.project.id, 12);
  const alternativeMatches = generateAlternativeMatches(project, knowledge.projects, 12);
  const comparisonProjects = [project, ...alternatives.slice(0, 5)];
  const comparison = compareProjectKnowledge(comparisonProjects);
  const title = `${project.project.name} Alternatives`;
  const subtitle = `Compare open-source alternatives to ${project.project.fullName} by fit, deployment, maintenance, quality, and agent readiness.`;

  return html(
    renderAlternativesHtml({
      title,
      subtitle,
      project,
      alternatives,
      alternativeMatches,
      comparison,
      metadata: knowledge.metadata,
      aliasPath: resolution.resolution === "alias" ? resolution.requestedId : undefined
    })
  );
}

export async function renderAlternativesIndexPage(env: Env): Promise<Response> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const examples = alternativeExamples.map((example) => {
    const project = findProject(knowledge.projects, example.projectId);
    const matches = project ? generateAlternativeMatches(project, knowledge.projects, 5) : [];
    return {
      ...example,
      project,
      matches
    };
  });

  return html(renderAlternativesIndexHtml({ examples, metadata: knowledge.metadata }));
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

function renderAlternativesHtml({
  title,
  subtitle,
  project,
  alternatives,
  alternativeMatches,
  comparison,
  metadata,
  aliasPath
}: {
  title: string;
  subtitle: string;
  project: ProjectKnowledge;
  alternatives: ProjectKnowledge[];
  alternativeMatches: ReturnType<typeof generateAlternativeMatches>;
  comparison: ReturnType<typeof compareProjectKnowledge>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
  aliasPath?: string;
}): string {
  const view = toProjectKnowledgeView(project);
  const tableProjects = [project, ...alternatives.slice(0, 5)];
  const repos = [project.project.id, ...alternatives.slice(0, 5).map((item) => item.project.id)].join(",");
  const bestFor = view.useCases.length ? view.useCases : ["project evaluation", "open-source stack planning"];
  const notBestFor = view.notGoodFor.length ? view.notGoodFor : ["decisions without checking source evidence"];
  const decision = buildAlternativesDecision(project, alternativeMatches);
  return pageShell({
    title,
    description: subtitle,
    canonical: `https://git.top/alternatives/${aliasPath ? encodeURIComponent(aliasPath) : projectIdPath(project.project.id)}`,
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Alternatives Engine</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(subtitle)}</p>
        <div class="actions">
          <a class="button primary" href="/api/alternatives/${escapeAttr(project.project.id)}?limit=12">Open JSON</a>
          <a class="button" href="/api/compare?repos=${escapeAttr(repos)}">Compare JSON</a>
          <a class="button" href="/graph/${escapeAttr(project.project.id)}">Project Graph</a>
        </div>
      </header>

      <section class="panel">
        <p class="eyebrow">Decision Summary</p>
        <h2>${escapeHtml(decision.summary)}</h2>
        <div class="compare">
          <div class="compare-row alt-row"><span>Candidates</span><span>Explicit</span><span>Cloudflare-ready</span><span>Avg similarity</span><span>Top candidate</span></div>
          <div class="compare-row alt-row"><strong>${decision.stats.candidateCount}</strong><span>${decision.stats.explicitCount}</span><span>${decision.stats.cloudflareReadyCount}</span><span>${decision.stats.averageSimilarity ?? "-"}</span><strong>${escapeHtml(decision.stats.topCandidate ?? "Pending data")}</strong></div>
        </div>
        <div class="actions">
          ${decision.nextActions.map((action) => `<a class="button" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
        </div>
      </section>

      <section class="grid">
        <article class="panel">
          <p class="eyebrow">Source Project</p>
          <h2>${escapeHtml(view.repo)}</h2>
          <p class="muted">${escapeHtml(view.description || view.overview)}</p>
          <div class="tag-list">
            <span class="tag">${escapeHtml(view.language ?? "Unknown language")}</span>
            <span class="tag">${escapeHtml(view.license ?? "Unknown license")}</span>
            ${view.deployments.slice(0, 3).map((deployment) => `<span class="tag">${escapeHtml(label(deployment))}</span>`).join("")}
          </div>
        </article>
        <article class="panel">
          <p class="eyebrow">Best For</p>
          <h2>Where ${escapeHtml(view.name)} fits</h2>
          <div class="list">${bestFor.slice(0, 4).map((item) => `<div><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>
        </article>
        <article class="panel">
          <p class="eyebrow">Not Best For</p>
          <h2>When to compare alternatives</h2>
          <div class="list">${notBestFor.slice(0, 4).map((item) => `<div><strong>${escapeHtml(item)}</strong></div>`).join("")}</div>
        </article>
      </section>

      <section class="table-wrap panel">
        <p class="eyebrow">Comparison Table</p>
        <h2>${escapeHtml(comparison.winner ?? view.repo)} leads this comparison context</h2>
        <p class="muted">${escapeHtml(comparison.reasoning)}</p>
        <div class="compare">
          <div class="compare-row compare-head alt-row"><span>Project</span><span>Similarity</span><span>Stars</span><span>Language</span><span>Deploy</span><span>Quality</span><span>Agent</span></div>
          ${tableProjects.map((item) => alternativesCompareRow(item, alternativeMatches.find((match) => match.project.project.id === item.project.id)?.similarityScore)).join("")}
        </div>
      </section>

      <section class="grid">
        ${alternativeMatches.length ? alternativeMatches.map(alternativeMatchCard).join("") : `<article class="panel"><h2>No alternatives yet</h2><p class="muted">Git.Top will infer alternatives as the graph grows. Try the project graph or search API for adjacent projects.</p></article>`}
      </section>

      <section class="panel">
        <p class="eyebrow">Data Source</p>
        <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
        <p class="muted">${metadata.projectCount} loaded projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
      </section>`
  });
}

function alternativesCompareRow(item: ProjectKnowledge, similarityScore?: number): string {
  const view = toProjectKnowledgeView(item);
  return `<div class="compare-row alt-row"><strong>${escapeHtml(view.repo)}</strong><span>${similarityScore === undefined ? "Source" : `${similarityScore}/100`}</span><span>${formatNumber(view.qualitySignals.stars)}</span><span>${escapeHtml(view.language ?? "Unknown")}</span><span>${escapeHtml(view.deployments.slice(0, 2).map(label).join(", ") || "Unknown")}</span><span>${view.qualityScore}</span><strong>${view.agentScore}</strong></div>`;
}

function renderAlternativesIndexHtml({
  examples,
  metadata
}: {
  examples: Array<{
    title: string;
    description: string;
    projectId: string;
    project: ProjectKnowledge | null;
    matches: ReturnType<typeof generateAlternativeMatches>;
  }>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  return pageShell({
    title: "Open Source Alternatives",
    description: "Find open-source alternatives to known projects with similarity scores, match signals, comparison tables, and agent-readable JSON.",
    canonical: "https://git.top/alternatives",
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Alternatives</p>
        <h1>Find open-source alternatives with graph-backed context</h1>
        <p class="lead">Start from a known project and use Git.Top to find replacement candidates, adjacent tools, deployment-compatible options, and comparison-ready shortlists.</p>
        <div class="actions">
          <a class="button primary" href="/api/alternatives/cloudflare/agents?limit=12">Alternatives JSON</a>
          <a class="button" href="/compare">Compare</a>
          <a class="button" href="/graph">Graph</a>
          <a class="button" href="/mcp">MCP</a>
        </div>
      </header>

      <section class="grid">
        ${examples.map(alternativeExampleCard).join("")}
      </section>

      <section class="panel">
        <p class="eyebrow">Engine Signals</p>
        <h2>Similarity is not just stars</h2>
        <p class="muted">Alternative matches use explicit alternatives, category overlap, deployment overlap, use-case similarity, topic overlap, dependency context, and quality signals. Data source: ${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)} / ${metadata.projectCount} projects.</p>
      </section>`
  });
}

function alternativeExampleCard(example: {
  title: string;
  description: string;
  projectId: string;
  project: ProjectKnowledge | null;
  matches: ReturnType<typeof generateAlternativeMatches>;
}): string {
  const repo = example.project?.project.id ?? example.projectId;
  const top = example.matches[0];
  return String.raw`<article class="card">
    <div>
      <p class="eyebrow">Alternatives</p>
      <h2>${escapeHtml(example.title)}</h2>
    </div>
    <p>${escapeHtml(example.description)}</p>
    <div class="list">
      <div><span class="muted">Source</span><strong>${escapeHtml(repo)}</strong></div>
      <div><span class="muted">Top match</span><strong>${escapeHtml(top?.project.project.id ?? "Pending data")}</strong></div>
      <div><span class="muted">Candidates</span><strong>${example.matches.length}</strong></div>
    </div>
    <div class="actions">
      <a class="button primary" href="/alternatives/${escapeAttr(repo)}">Open</a>
      <a class="button" href="/api/alternatives/${escapeAttr(repo)}?limit=12">JSON</a>
    </div>
  </article>`;
}

function alternativeMatchCard(match: ReturnType<typeof generateAlternativeMatches>[number]): string {
  const view = toProjectKnowledgeView(match.project);
  const guidance = alternativeAdoptionGuidance(match);
  const signals = [
    match.signals.explicit ? "Explicit" : "",
    match.signals.sharedCategory ? label(view.category[0] ?? "category") : "",
    ...match.signals.sharedDeployments.slice(0, 2).map(label),
    ...match.signals.dependencyOverlap.slice(0, 2).map(label)
  ].filter(Boolean);
  return String.raw`<article class="card">
    <div class="card-top">
      <div><p class="eyebrow">Alternative Match</p><h3><a href="/projects/${escapeAttr(view.repo)}">${escapeHtml(view.repo)}</a></h3></div>
      <span class="tag">${match.similarityScore}/100</span>
    </div>
    <p>${escapeHtml(match.reason)}</p>
    <p class="muted"><strong>Fit:</strong> ${escapeHtml(guidance.fitSummary)}</p>
    <p class="muted">${escapeHtml(view.description || view.overview)}</p>
    <div class="tag-list">${signals.slice(0, 5).map((signal) => `<span class="tag">${escapeHtml(signal)}</span>`).join("")}</div>
    <div class="list">
      <div><span class="muted">Replacement risk</span><strong>${escapeHtml(guidance.replacementRisk)}</strong></div>
      ${guidance.adoptionNotes.slice(0, 2).map((note) => `<div><span class="muted">Adoption note</span><strong>${escapeHtml(note)}</strong></div>`).join("")}
    </div>
    <div class="score"><div><span class="muted">Quality</span><strong>${view.qualityScore}</strong></div><div><span class="muted">Agent</span><strong>${view.agentScore}</strong></div></div>
  </article>`;
}

function projectIdPath(id: string): string {
  return id.split("/").map(encodeURIComponent).join("/");
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
        <p class="muted">${escapeHtml(comparison.summary)}</p>
        <p class="muted">${escapeHtml(comparison.reasoning)}</p>
        <div class="compare">
          <div class="compare-row compare-head"><span>Candidates</span><span>Cloudflare</span><span>Docker</span><span>Local</span><span>Top Agent</span><span>Top Quality</span></div>
          <div class="compare-row"><strong>${comparison.stats.candidateCount}</strong><span>${comparison.stats.cloudflareReadyCount}</span><span>${comparison.stats.dockerReadyCount}</span><span>${comparison.stats.localReadyCount}</span><span>${comparison.stats.highestAgentScore ?? "-"}</span><strong>${comparison.stats.highestQualityScore ?? "-"}</strong></div>
        </div>
        <div class="actions" style="margin-top:12px">
          ${comparison.nextActions.map((action) => `<a class="button" href="${escapeAttr(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
        </div>
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
        ${comparison.decisionMatrix.map(compareDecisionCard).join("")}
      </section>

      <section class="grid">
        ${projects.map(projectCard).join("")}
      </section>`
  });
}

function compareDecisionCard(item: ReturnType<typeof compareProjectKnowledge>["decisionMatrix"][number]): string {
  return `<article class="card">
    <p class="eyebrow">Decision Matrix</p>
    <h3>${escapeHtml(item.repo)}</h3>
    <div class="list">
      <div><span class="muted">Strengths</span><strong>${escapeHtml(item.strengths.join(" "))}</strong></div>
      <div><span class="muted">Tradeoffs</span><strong>${escapeHtml(item.tradeoffs.join(" ") || "No major tradeoff indexed.")}</strong></div>
      <div><span class="muted">Next step</span><strong>${escapeHtml(item.nextStep)}</strong></div>
    </div>
  </article>`;
}

function renderCompareIndexHtml({
  examples,
  metadata
}: {
  examples: Array<{
    title: string;
    description: string;
    ids: string[];
    projects: ProjectKnowledge[];
    comparison: ReturnType<typeof compareProjectKnowledge> | null;
  }>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  return pageShell({
    title: "Open Source Project Comparisons",
    description: "Compare open-source projects by deployment fit, quality, maintenance, agent readiness, and Git.Top knowledge signals.",
    canonical: "https://git.top/compare",
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Compare</p>
        <h1>Compare open-source projects by fit, not just stars</h1>
        <p class="lead">Use Git.Top comparisons to evaluate alternatives across deployment targets, quality signals, maintenance, agent readiness, and best-fit use cases.</p>
        <div class="actions">
          <a class="button primary" href="/api/compare">Compare JSON</a>
          <a class="button" href="/alternatives/langchain-ai/langchain">Alternatives</a>
          <a class="button" href="/docs#scoring">Scoring Methodology</a>
        </div>
      </header>

      <section class="grid">
        ${examples.map(compareExampleCard).join("")}
      </section>

      <section class="panel">
        <p class="eyebrow">Agent Contract</p>
        <h2>Every comparison has a matching JSON result</h2>
        <p class="muted">Call <code>/api/compare?repos=owner/repo,owner/repo</code> to get ordered project columns, winner reasoning, deployment context, and source metadata. Data source: ${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)} / ${metadata.projectCount} projects.</p>
      </section>`
  });
}

function renderDiscoverHtml({
  sections,
  metadata
}: {
  sections: Array<{
    section: (typeof discoverSections)[number];
    projects: ProjectKnowledge[];
  }>;
  metadata: { source: string; reason: string; projectCount: number; generatedAt: string };
}): string {
  return pageShell({
    title: "Discover Open Source Projects",
    description: "Discover open-source AI agents, MCP servers, RAG frameworks, browser automation projects, and AI IDE tools through Git.Top.",
    canonical: "https://git.top/discover",
    body: String.raw`
      <header class="hero">
        <p class="eyebrow">Discover</p>
        <h1>Discover open-source projects by technical intent</h1>
        <p class="lead">Start from the job you need done: agents, MCP servers, RAG, browser automation, or AI IDE workflows. Each section links to matching HTML guides and agent-readable JSON.</p>
        <div class="actions">
          <a class="button primary" href="/trends">Trends</a>
          <a class="button" href="/api/trends?limit=8">Trends JSON</a>
          <a class="button" href="/atlas">Atlas</a>
          <a class="button" href="/compare">Compare</a>
          <a class="button" href="/mcp">MCP</a>
        </div>
      </header>

      <section class="grid">
        ${sections.map(discoverSectionCard).join("")}
      </section>

      ${sections
        .map(
          ({ section, projects }) => String.raw`<section class="panel" id="${escapeAttr(section.id)}">
            <div class="actions">
              <div>
                <p class="eyebrow">Discover</p>
                <h2>${escapeHtml(section.title)}</h2>
              </div>
              <a class="button" href="${escapeAttr(section.apiPath)}">JSON</a>
            </div>
            <p class="muted">${escapeHtml(section.description)}</p>
            <div class="grid">
              ${projects.length ? projects.map(projectCard).join("") : `<article class="card"><h3>No indexed projects yet</h3><p class="muted">Try the JSON API or broaden the query.</p></article>`}
            </div>
          </section>`
        )
        .join("")}

      <section class="panel">
        <p class="eyebrow">Data Source</p>
        <h2>${escapeHtml(metadata.source)} / ${escapeHtml(metadata.reason)}</h2>
        <p class="muted">${metadata.projectCount} loaded projects. Generated at ${escapeHtml(metadata.generatedAt)}.</p>
      </section>`
  });
}

function discoverSectionCard({ section, projects }: { section: (typeof discoverSections)[number]; projects: ProjectKnowledge[] }): string {
  const top = projects[0] ? toProjectKnowledgeView(projects[0]) : null;
  return String.raw`<article class="card">
    <div>
      <p class="eyebrow">Discover</p>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <p>${escapeHtml(section.description)}</p>
    <div class="list">
      <div><span class="muted">Indexed matches</span><strong>${projects.length}</strong></div>
      <div><span class="muted">Top project</span><strong>${escapeHtml(top?.repo ?? "Pending data")}</strong></div>
    </div>
    <div class="actions">
      <a class="button primary" href="#${escapeAttr(section.id)}">Open</a>
      <a class="button" href="${escapeAttr(section.guidePath)}">Guide</a>
      <a class="button" href="${escapeAttr(section.apiPath)}">JSON</a>
    </div>
  </article>`;
}

function compareExampleCard(example: {
  title: string;
  description: string;
  ids: string[];
  projects: ProjectKnowledge[];
  comparison: ReturnType<typeof compareProjectKnowledge> | null;
}): string {
  const repos = example.projects.length >= 2 ? example.projects.map((item) => item.project.id) : example.ids;
  const htmlPath = `/compare/${repos.map((repo) => repo.replace("/", "-")).join("...")}`;
  const apiPath = `/api/compare?repos=${encodeURIComponent(repos.join(","))}`;
  const winner = example.comparison?.winner ?? "Pending data";
  return String.raw`<article class="card">
    <div>
      <p class="eyebrow">Comparison</p>
      <h2>${escapeHtml(example.title)}</h2>
    </div>
    <p>${escapeHtml(example.description)}</p>
    <div class="list">
      <div><span class="muted">Winner signal</span><strong>${escapeHtml(winner)}</strong></div>
      <div><span class="muted">Projects</span><strong>${escapeHtml(repos.join(" vs "))}</strong></div>
    </div>
    <div class="actions">
      <a class="button primary" href="${escapeAttr(htmlPath)}">Open Compare</a>
      <a class="button" href="${escapeAttr(apiPath)}">JSON</a>
    </div>
  </article>`;
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
      .compare-row.alt-row { grid-template-columns:minmax(240px,1.4fr) 100px 100px 130px 180px 90px 90px; }
      .compare-head { border-top:0; color:var(--muted); font-size:12px; font-weight:900; text-transform:uppercase; }
      .list { display:grid; gap:10px; margin-top:12px; }
      .list div { border-top:1px solid var(--line); padding-top:10px; }
      .list div:first-child { border-top:0; padding-top:0; }
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
  return findProjectById(projects, id);
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
