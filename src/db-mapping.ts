import type {
  AgentCard,
  Category,
  ClassificationOverride,
  Deployment,
  Difficulty,
  Project,
  ProjectKnowledge,
  ProjectMetrics,
  SyncRun
} from "./types";

export interface ProjectRow {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  github_url: string;
  homepage_url: string | null;
  description: string | null;
  language: string | null;
  topics_json: string;
  license: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  default_branch: string | null;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  synced_at: string;
}

export interface AgentCardRow {
  ac_project_id: string;
  project_kind?: AgentCard["projectKind"];
  collection_json?: string;
  category: AgentCard["category"];
  difficulty: AgentCard["difficulty"];
  deployment_json: string;
  cloudflare_ready: number;
  use_cases_json: string;
  not_good_for_json: string;
  alternatives_json: string;
  summary_for_agent: string;
  classification_json?: string;
  schema_version: "v1";
  generated_at: string;
  override_category?: AgentCard["category"] | null;
  override_difficulty?: AgentCard["difficulty"] | null;
  override_deployment_json?: string | null;
  override_cloudflare_ready?: number | null;
  override_classification_json?: string | null;
}

export interface MetricsRow {
  pm_project_id: string;
  stars_30d_delta: number;
  commits_30d: number;
  releases_180d: number;
  contributors_90d: number;
  issue_first_response_median_hours: number | null;
  recent_push_days: number | null;
  git_score: number;
  maintenance_score: number;
  signal_confidence_json?: string;
  calculated_at: string;
}

export interface SyncRunRow {
  id: string;
  trigger: SyncRun["trigger"];
  started_at: string;
  finished_at: string;
  duration_ms: number;
  offset: number;
  next_offset: number;
  limit_value: number;
  synced_count: number;
  failed_count: number;
  alternatives_updated: number;
  synced_json: string;
  failed_json: string;
}

export interface ClassificationOverrideRow {
  project_id: string;
  category: Category | null;
  difficulty: Difficulty | null;
  deployment_json: string | null;
  cloudflare_ready: number | null;
  classification_json: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
  updated_at: string;
}

export function rowToKnowledge(row: Record<string, unknown>): ProjectKnowledge {
  const projectRow = row as unknown as ProjectRow;
  const cardRow = row as unknown as AgentCardRow;
  const metricsRow = row as unknown as MetricsRow;

  return {
    project: rowToProject(projectRow),
    agentCard: rowToAgentCard(cardRow),
    metrics: rowToMetrics(metricsRow)
  };
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    githubUrl: row.github_url,
    homepageUrl: row.homepage_url,
    description: row.description,
    language: row.language,
    topics: parseJson<string[]>(row.topics_json, []),
    license: row.license,
    stars: row.stars,
    forks: row.forks,
    openIssues: row.open_issues,
    defaultBranch: row.default_branch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pushedAt: row.pushed_at,
    syncedAt: row.synced_at
  };
}

export function rowToAgentCard(row: AgentCardRow): AgentCard {
  const baseClassification = parseJson<AgentCard["classification"]>(row.classification_json ?? "{}", {});
  const overrideClassification = row.override_classification_json
    ? parseJson<AgentCard["classification"]>(row.override_classification_json, {})
    : {};

  return {
    projectId: row.ac_project_id,
    projectKind: row.project_kind ?? "project",
    collectionMetadata: parseCollectionMetadata(row.collection_json),
    category: row.override_category ?? row.category,
    difficulty: row.override_difficulty ?? row.difficulty,
    deployment: row.override_deployment_json
      ? parseJson<AgentCard["deployment"]>(row.override_deployment_json, [])
      : parseJson<AgentCard["deployment"]>(row.deployment_json, []),
    cloudflareReady:
      row.override_cloudflare_ready === null || row.override_cloudflare_ready === undefined
        ? row.cloudflare_ready === 1
        : row.override_cloudflare_ready === 1,
    useCases: parseJson<string[]>(row.use_cases_json, []),
    notGoodFor: parseJson<string[]>(row.not_good_for_json, []),
    alternatives: parseJson<AgentCard["alternatives"]>(row.alternatives_json, []),
    summaryForAgent: row.summary_for_agent,
    classification: mergeClassification(baseClassification, overrideClassification),
    schemaVersion: row.schema_version,
    generatedAt: row.generated_at
  };
}

export function rowToMetrics(row: MetricsRow): ProjectMetrics {
  return {
    projectId: row.pm_project_id,
    stars30dDelta: row.stars_30d_delta,
    commits30d: row.commits_30d,
    releases180d: row.releases_180d,
    contributors90d: row.contributors_90d,
    issueFirstResponseMedianHours: row.issue_first_response_median_hours,
    recentPushDays: row.recent_push_days,
    gitScore: row.git_score,
    maintenanceScore: row.maintenance_score,
    signalConfidence: parseJson<ProjectMetrics["signalConfidence"]>(row.signal_confidence_json ?? "{}", {}),
    calculatedAt: row.calculated_at
  };
}

export function rowToClassificationOverride(row: ClassificationOverrideRow): ClassificationOverride {
  return {
    projectId: row.project_id,
    category: row.category,
    difficulty: row.difficulty,
    deployment: row.deployment_json ? parseJson<Deployment[]>(row.deployment_json, []) : null,
    cloudflareReady: row.cloudflare_ready === null ? null : row.cloudflare_ready === 1,
    classification: parseJson<AgentCard["classification"]>(row.classification_json, {}),
    notes: row.notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at
  };
}

export function rowToSyncRun(row: SyncRunRow): SyncRun {
  return {
    id: row.id,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    offset: row.offset,
    nextOffset: row.next_offset,
    limit: row.limit_value,
    syncedCount: row.synced_count,
    failedCount: row.failed_count,
    alternativesUpdated: row.alternatives_updated,
    synced: parseJson<string[]>(row.synced_json, []),
    failed: parseJson<SyncRun["failed"]>(row.failed_json, [])
  };
}

function mergeClassification(
  base: AgentCard["classification"],
  override: AgentCard["classification"]
): AgentCard["classification"] {
  return {
    ...(base ?? {}),
    ...(override ?? {})
  };
}

function parseCollectionMetadata(value: string | undefined): AgentCard["collectionMetadata"] {
  const parsed = parseJson<AgentCard["collectionMetadata"] | Record<string, never>>(value ?? "{}", {});
  return parsed && "scope" in parsed ? (parsed as AgentCard["collectionMetadata"]) : undefined;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
