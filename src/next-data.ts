import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { toProjectKnowledgeView, type ProjectKnowledgeView } from "./project-view";
import { seedProjects } from "./seed";
import type { ProjectKnowledge } from "./types";

export interface NextDataSource {
  source: "d1" | "seed";
  reason: "d1_query" | "db_missing" | "db_empty" | "db_error" | "next_api_unconfigured" | "next_api_error";
  projectCount: number;
  generatedAt: string;
  warnings: string[];
  error?: string;
}

export interface ProjectCollectionData {
  projects: ProjectKnowledge[];
  views: ProjectKnowledgeView[];
  metadata: NextDataSource;
}

export async function getProjectCollectionData(query = "agent", limit = 100): Promise<ProjectCollectionData> {
  const live = await fetchLiveProjectViews(query, limit);
  if (live) {
    return live;
  }

  return {
    projects: seedProjects,
    views: seedProjects.map(toProjectKnowledgeView),
    metadata: seedMetadata(apiBase() ? "next_api_error" : "next_api_unconfigured")
  };
}

export async function getProjectDetailData(id: string): Promise<{
  project: ProjectKnowledge;
  view: ProjectKnowledgeView;
  alternatives: ProjectKnowledgeView[];
  compare: ReturnType<typeof compareProjectKnowledge>;
  graph: ReturnType<typeof buildKnowledgeGraph>;
  metadata: NextDataSource;
} | null> {
  const collection = await getProjectCollectionData("agent", 100);
  const normalizedId = normalizeProjectId(id);
  const liveDetail = await fetchLiveProjectView(normalizedId);
  const project =
    liveDetail?.knowledge ??
    collection.projects.find((item) => projectAliases(item).includes(normalizedId));
  if (!project) {
    return null;
  }

  const view = toProjectKnowledgeView(project);
  const graphProjects = withProject(collection.projects, project);
  const alternativeIds = new Set(project.agentCard.alternatives.map((item) => item.project_id));
  const alternativeProjects = graphProjects.filter((item) => item.project.id !== project.project.id && alternativeIds.has(item.project.id)).slice(0, 6);
  const compareProjects = [project, ...alternativeProjects.slice(0, 3)];

  return {
    project,
    view,
    alternatives: alternativeProjects.map(toProjectKnowledgeView),
    compare: compareProjectKnowledge(compareProjects, {
      deployment: view.deployments.includes("cloudflare") ? "cloudflare" : undefined
    }),
    graph: buildKnowledgeGraph(graphProjects, project.project.id, 28),
    metadata: liveDetail?.metadata ?? collection.metadata
  };
}

export async function getGraphOverviewData(): Promise<{
  collection: ProjectCollectionData;
  focus: ProjectKnowledge;
  focusView: ProjectKnowledgeView;
  graph: ReturnType<typeof buildKnowledgeGraph>;
  compare: ReturnType<typeof compareProjectKnowledge>;
}> {
  const collection = await getProjectCollectionData("cloudflare agent framework", 100);
  const focus = collection.projects.find((item) => item.project.id === "cloudflare/agents") ?? collection.projects[0];

  return {
    collection,
    focus,
    focusView: toProjectKnowledgeView(focus),
    graph: buildKnowledgeGraph(collection.projects, focus.project.id, 18),
    compare: compareProjectKnowledge(collection.projects.slice(0, 4), { deployment: "cloudflare" })
  };
}

function apiBase(): string | undefined {
  const value = process.env.NEXT_PUBLIC_GIT_TOP_API_BASE;
  return value?.replace(/\/$/, "");
}

async function fetchLiveProjectViews(query: string, limit: number): Promise<ProjectCollectionData | null> {
  const base = apiBase();
  if (!base) {
    return null;
  }

  try {
    const response = await fetch(`${base}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { projects?: unknown[]; knowledge?: unknown[]; metadata?: Record<string, unknown> };
    const views = (payload.projects ?? []).map(toCamelCaseValue).filter(isProjectKnowledgeView);
    const knowledge = (payload.knowledge ?? []).map(toCamelCaseValue).filter(isProjectKnowledge);
    if (views.length === 0 && knowledge.length === 0) {
      return null;
    }
    const projects = knowledge.length > 0 ? knowledge : views.map(projectKnowledgeFromView);

    return {
      projects,
      views: views.length > 0 ? views : projects.map(toProjectKnowledgeView),
      metadata: metadataFromApi(payload.metadata, projects.length)
    };
  } catch {
    return null;
  }
}

async function fetchLiveProjectView(id: string): Promise<{ view: ProjectKnowledgeView; knowledge: ProjectKnowledge; metadata: NextDataSource } | null> {
  const base = apiBase();
  if (!base || !id.includes("/")) {
    return null;
  }

  try {
    const response = await fetch(`${base}/api/project/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      return null;
    }
    const payload = toCamelCaseValue(await response.json()) as ProjectKnowledgeView & {
      knowledge?: unknown;
      metadata?: Record<string, unknown>;
    };
    if (!isProjectKnowledgeView(payload)) {
      return null;
    }
    const knowledge = isProjectKnowledge(payload.knowledge) ? payload.knowledge : projectKnowledgeFromView(payload);

    return {
      view: payload,
      knowledge,
      metadata: metadataFromApi(payload.metadata, 1)
    };
  } catch {
    return null;
  }
}

function normalizeProjectId(value: string): string {
  if (value.includes("/")) {
    return value;
  }

  const exactSlug = seedProjects.find((item) => item.project.fullName.replace("/", "-") === value);
  return exactSlug?.project.fullName ?? value;
}

function projectAliases(item: ProjectKnowledge): string[] {
  return [
    item.project.id,
    item.project.fullName,
    item.project.name,
    item.project.fullName.replace("/", "-"),
    item.project.fullName.replace("/", "--")
  ];
}

function metadataFromApi(metadata: Record<string, unknown> | undefined, projectCount: number): NextDataSource {
  return {
    source: metadata?.source === "d1" ? "d1" : "seed",
    reason: sourceReason(metadata?.reason, "d1_query"),
    projectCount: numberValue(metadata?.project_count ?? metadata?.projectCount, projectCount),
    generatedAt: stringValue(metadata?.generated_at ?? metadata?.generatedAt, new Date().toISOString()),
    warnings: stringArray(metadata?.warnings),
    ...(typeof metadata?.error === "string" ? { error: metadata.error } : {})
  };
}

function seedMetadata(reason: NextDataSource["reason"]): NextDataSource {
  return {
    source: "seed",
    reason,
    projectCount: seedProjects.length,
    generatedAt: new Date().toISOString(),
    warnings: ["Next.js UI is using bundled seed data; configure NEXT_PUBLIC_GIT_TOP_API_BASE to read the live Worker API."]
  };
}

function projectKnowledgeFromView(view: ProjectKnowledgeView): ProjectKnowledge {
  return {
    project: {
      id: view.repo,
      owner: view.repo.split("/")[0] ?? view.repo,
      name: view.name,
      fullName: view.repo,
      githubUrl: `https://github.com/${view.repo}`,
      homepageUrl: null,
      description: view.description,
      language: null,
      topics: view.tags,
      license: null,
      stars: view.qualitySignals.stars,
      forks: 0,
      openIssues: 0,
      defaultBranch: null,
      createdAt: null,
      updatedAt: null,
      pushedAt: null,
      syncedAt: new Date().toISOString()
    },
    agentCard: {
      projectId: view.repo,
      projectKind: view.projectKind,
      collectionMetadata: view.collectionMetadata,
      category: view.category[0] as ProjectKnowledge["agentCard"]["category"],
      difficulty: "intermediate",
      deployment: view.deployments as ProjectKnowledge["agentCard"]["deployment"],
      cloudflareReady: view.deployments.includes("cloudflare"),
      useCases: view.useCases,
      notGoodFor: [],
      alternatives: view.alternatives.map((item) => ({ project_id: item.repo, reason: item.reason })),
      summaryForAgent: view.overview,
      classification: view.classification,
      schemaVersion: "v1",
      generatedAt: new Date().toISOString()
    },
    metrics: {
      projectId: view.repo,
      stars30dDelta: 0,
      commits30d: view.qualitySignals.recentCommits,
      releases180d: view.qualitySignals.releaseFrequency180d,
      contributors90d: view.qualitySignals.contributors,
      issueFirstResponseMedianHours: view.qualitySignals.issueResponseTimeHours,
      recentPushDays: null,
      gitScore: view.qualityScore,
      maintenanceScore: view.agentScoreBreakdown.maintenance,
      signalConfidence: view.qualitySignalConfidence,
      calculatedAt: new Date().toISOString()
    }
  };
}

function withProject(projects: ProjectKnowledge[], project: ProjectKnowledge): ProjectKnowledge[] {
  if (projects.some((item) => item.project.id === project.project.id)) {
    return projects;
  }
  return [project, ...projects];
}

function toCamelCaseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCaseValue);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [toCamelCase(key), toCamelCaseValue(nested)])
  );
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function isProjectKnowledgeView(value: unknown): value is ProjectKnowledgeView {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ProjectKnowledgeView).repo === "string" &&
      typeof (value as ProjectKnowledgeView).name === "string" &&
      Array.isArray((value as ProjectKnowledgeView).deployments)
  );
}

function isProjectKnowledge(value: unknown): value is ProjectKnowledge {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as ProjectKnowledge;
  return Boolean(
    candidate.project &&
      typeof candidate.project.id === "string" &&
      typeof candidate.project.fullName === "string" &&
      candidate.agentCard &&
      typeof candidate.agentCard.projectId === "string" &&
      Array.isArray(candidate.agentCard.deployment) &&
      candidate.metrics &&
      typeof candidate.metrics.projectId === "string" &&
      typeof candidate.metrics.gitScore === "number"
  );
}

function sourceReason(value: unknown, fallback: NextDataSource["reason"]): NextDataSource["reason"] {
  return ["d1_query", "db_missing", "db_empty", "db_error", "next_api_unconfigured", "next_api_error"].includes(String(value))
    ? (value as NextDataSource["reason"])
    : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
