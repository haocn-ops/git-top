import { seedProjects } from "./seed";
import type { AgentCard, Alternative, Env, Project, ProjectKnowledge, ProjectMetrics, SyncRun } from "./types";

interface ProjectRow {
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

interface AgentCardRow {
  ac_project_id: string;
  category: AgentCard["category"];
  difficulty: AgentCard["difficulty"];
  deployment_json: string;
  cloudflare_ready: number;
  use_cases_json: string;
  not_good_for_json: string;
  alternatives_json: string;
  summary_for_agent: string;
  schema_version: "v1";
  generated_at: string;
}

interface MetricsRow {
  pm_project_id: string;
  stars_30d_delta: number;
  commits_30d: number;
  releases_180d: number;
  contributors_90d: number;
  issue_first_response_median_hours: number | null;
  recent_push_days: number | null;
  git_score: number;
  maintenance_score: number;
  calculated_at: string;
}

interface SyncRunRow {
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

export interface ProjectFilters {
  q?: string;
  category?: string;
  deployment?: string;
  difficulty?: string;
  cloudflareReady?: boolean;
  language?: string;
  limit?: number;
}

export interface RecommendationQuery {
  useCase?: string;
  deployment?: string;
  difficulty?: string;
  language?: string;
  cloudflareReady?: boolean;
  limit?: number;
}

export interface Recommendation {
  project_id: string;
  score: number;
  reason: string;
  tradeoffs: string[];
  project: Project;
  agent_card: AgentCard;
  metrics: ProjectMetrics;
}

const defaultLimit = 20;

export async function listProjectKnowledge(env: Env): Promise<ProjectKnowledge[]> {
  if (!env.DB) {
    return seedProjects;
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT
        p.*,
        ac.project_id AS ac_project_id,
        ac.category,
        ac.difficulty,
        ac.deployment_json,
        ac.cloudflare_ready,
        ac.use_cases_json,
        ac.not_good_for_json,
        ac.alternatives_json,
        ac.summary_for_agent,
        ac.schema_version,
        ac.generated_at,
        pm.project_id AS pm_project_id,
        pm.stars_30d_delta,
        pm.commits_30d,
        pm.releases_180d,
        pm.contributors_90d,
        pm.issue_first_response_median_hours,
        pm.recent_push_days,
        pm.git_score,
        pm.maintenance_score,
        pm.calculated_at
      FROM projects p
      JOIN agent_cards ac ON ac.project_id = p.id
      JOIN project_metrics pm ON pm.project_id = p.id
      ORDER BY pm.git_score DESC, p.stars DESC
      LIMIT 500`
    ).all<Record<string, unknown>>();

    const results = rows.results ?? [];
    if (results.length === 0) {
      return seedProjects;
    }

    return results.map(rowToKnowledge);
  } catch {
    return seedProjects;
  }
}

export async function getHealth(env: Env): Promise<{
  ok: boolean;
  db: "available" | "missing" | "error";
  projectCount: number;
  syncCursor?: number;
}> {
  if (!env.DB) {
    return {
      ok: true,
      db: "missing",
      projectCount: seedProjects.length,
      syncCursor: 0
    };
  }

  try {
    const [countRow, cursor] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>(),
      getSyncCursor(env)
    ]);
    return {
      ok: true,
      db: "available",
      projectCount: countRow?.count ?? 0,
      syncCursor: cursor
    };
  } catch {
    return {
      ok: false,
      db: "error",
      projectCount: seedProjects.length,
      syncCursor: 0
    };
  }
}

export async function getSyncCursor(env: Env): Promise<number> {
  if (!env.DB) {
    return 0;
  }

  try {
    const row = await env.DB.prepare("SELECT value FROM sync_state WHERE key = ?").bind("seed_cursor").first<{ value: string }>();
    const parsed = Number(row?.value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  } catch {
    return 0;
  }
}

export async function setSyncCursor(env: Env, cursor: number): Promise<void> {
  if (!env.DB) {
    return;
  }

  await env.DB.prepare(
    `INSERT OR REPLACE INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)`
  )
    .bind("seed_cursor", String(Math.max(0, Math.trunc(cursor))), new Date().toISOString())
    .run();
}

export async function insertSyncRun(env: Env, run: SyncRun): Promise<void> {
  if (!env.DB) {
    return;
  }

  await env.DB.prepare(
    `INSERT INTO sync_runs (
      id, trigger, started_at, finished_at, duration_ms, offset, next_offset,
      limit_value, synced_count, failed_count, alternatives_updated, synced_json, failed_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      run.id,
      run.trigger,
      run.startedAt,
      run.finishedAt,
      run.durationMs,
      run.offset,
      run.nextOffset,
      run.limit,
      run.syncedCount,
      run.failedCount,
      run.alternativesUpdated,
      JSON.stringify(run.synced),
      JSON.stringify(run.failed)
    )
    .run();
}

export async function listSyncRuns(env: Env, limit = 10): Promise<SyncRun[]> {
  if (!env.DB) {
    return [];
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT * FROM sync_runs
       ORDER BY started_at DESC
       LIMIT ?`
    )
      .bind(Math.max(1, Math.min(50, Math.trunc(limit))))
      .all<SyncRunRow>();

    return (rows.results ?? []).map(rowToSyncRun);
  } catch {
    return [];
  }
}

export async function getSyncStatus(env: Env, seedRepositories: string[] = []): Promise<{
  cursor: number;
  seedTotal: number;
  syncedCount: number;
  remainingCount: number;
  cycleProgress: number;
  nextBatch: string[];
  recentRuns: SyncRun[];
}> {
  const [cursor, recentRuns, syncedCount] = await Promise.all([getSyncCursor(env), listSyncRuns(env, 10), getSyncedProjectCount(env)]);
  const seedTotal = seedRepositories.length;
  const normalizedCursor = seedTotal > 0 ? cursor % seedTotal : 0;
  const nextLimit = recentRuns[0]?.limit ?? 5;
  const nextBatch = seedRepositories.slice(normalizedCursor, normalizedCursor + nextLimit);

  return {
    cursor: normalizedCursor,
    seedTotal,
    syncedCount,
    remainingCount: Math.max(0, seedTotal - syncedCount),
    cycleProgress: seedTotal > 0 ? Math.round((normalizedCursor / seedTotal) * 100) : 0,
    nextBatch,
    recentRuns
  };
}

export async function getSyncedProjectCount(env: Env): Promise<number> {
  if (!env.DB) {
    return seedProjects.length;
  }

  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>();
    return row?.count ?? 0;
  } catch {
    return seedProjects.length;
  }
}

export async function getProjectKnowledge(env: Env, id: string): Promise<ProjectKnowledge | null> {
  const projects = await listProjectKnowledge(env);
  return projects.find((item) => item.project.id === id || item.project.fullName === id) ?? null;
}

export async function searchProjects(env: Env, filters: ProjectFilters): Promise<ProjectKnowledge[]> {
  const limit = clampLimit(filters.limit);
  const query = normalize(filters.q);
  const queryWords = queryTokens(query);

  return (await listProjectKnowledge(env))
    .map((item) => {
      if (filters.category && item.agentCard.category !== filters.category) {
        return null;
      }
      if (filters.deployment && !item.agentCard.deployment.includes(filters.deployment as never)) {
        return null;
      }
      if (filters.difficulty && item.agentCard.difficulty !== filters.difficulty) {
        return null;
      }
      if (typeof filters.cloudflareReady === "boolean" && item.agentCard.cloudflareReady !== filters.cloudflareReady) {
        return null;
      }
      if (filters.language && normalize(item.project.language) !== normalize(filters.language)) {
        return null;
      }
      if (!query) {
        return { item, score: item.metrics.gitScore };
      }

      const haystack = normalize(
        [
          item.project.name,
          item.project.fullName,
          item.project.description,
          item.project.language,
          item.project.topics.join(" "),
          item.agentCard.category,
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );

      const score = queryMatchScore(query, queryWords, haystack, item);
      return score > 0 ? { item, score } : null;
    })
    .filter(isSearchHit)
    .sort((a, b) => b.score - a.score || byGitScore(a.item, b.item))
    .map(({ item }) => item)
    .slice(0, limit);
}

export async function getTrending(env: Env, filters: Pick<ProjectFilters, "category" | "limit">): Promise<ProjectKnowledge[]> {
  return searchProjects(env, { category: filters.category, limit: filters.limit });
}

export async function recommendProjects(env: Env, query: RecommendationQuery): Promise<Recommendation[]> {
  const limit = clampLimit(query.limit, 5);
  const useCase = normalize(query.useCase);
  const candidates = await searchProjects(env, {
    deployment: query.deployment,
    difficulty: query.difficulty,
    language: query.language,
    cloudflareReady: query.cloudflareReady,
    limit: 100
  });

  return candidates
    .map((item) => {
      const text = normalize(
        [
          item.project.description,
          item.project.topics.join(" "),
          item.agentCard.category,
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );

      const useCaseScore = useCase ? keywordOverlapScore(useCase, text) : 20;
      const score = Math.round(
        useCaseScore * 0.45 + item.metrics.gitScore * 0.3 + item.metrics.maintenanceScore * 0.2 + readinessBoost(item, query) * 0.05
      );

      return {
        project_id: item.project.id,
        score,
        reason: buildRecommendationReason(item, query),
        tradeoffs: item.agentCard.notGoodFor.slice(0, 2),
        project: item.project,
        agent_card: item.agentCard,
        metrics: item.metrics
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function findAlternatives(env: Env, id: string, limit = 5): Promise<ProjectKnowledge[]> {
  const project = await getProjectKnowledge(env, id);
  if (!project) {
    return [];
  }

  const explicit = new Set(project.agentCard.alternatives.map((item) => item.project_id));
  const all = await listProjectKnowledge(env);

  return all
    .filter((item) => item.project.id !== project.project.id)
    .map((item) => ({
      item,
      score:
        (explicit.has(item.project.id) ? 100 : 0) +
        (item.agentCard.category === project.agentCard.category ? 50 : 0) +
        sharedCount(item.agentCard.useCases, project.agentCard.useCases) * 10 +
        item.metrics.gitScore * 0.2
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, clampLimit(limit, 5))
    .map(({ item }) => item);
}

export async function upsertProjectKnowledge(env: Env, knowledge: ProjectKnowledge): Promise<void> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to sync project knowledge.");
  }

  const { project, agentCard, metrics } = knowledge;

  const statements = [
    env.DB.prepare(
      `INSERT OR REPLACE INTO projects (
        id, owner, name, full_name, github_url, homepage_url, description, language,
        topics_json, license, stars, forks, open_issues, default_branch,
        created_at, updated_at, pushed_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      project.id,
      project.owner,
      project.name,
      project.fullName,
      project.githubUrl,
      project.homepageUrl,
      project.description,
      project.language,
      JSON.stringify(project.topics),
      project.license,
      project.stars,
      project.forks,
      project.openIssues,
      project.defaultBranch,
      project.createdAt,
      project.updatedAt,
      project.pushedAt,
      project.syncedAt
    ),
    env.DB.prepare(
      `INSERT OR REPLACE INTO project_metrics (
        project_id, stars_30d_delta, commits_30d, releases_180d, contributors_90d,
        issue_first_response_median_hours, recent_push_days, git_score,
        maintenance_score, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      metrics.projectId,
      metrics.stars30dDelta,
      metrics.commits30d,
      metrics.releases180d,
      metrics.contributors90d,
      metrics.issueFirstResponseMedianHours,
      metrics.recentPushDays,
      metrics.gitScore,
      metrics.maintenanceScore,
      metrics.calculatedAt
    ),
    env.DB.prepare(
      `INSERT OR REPLACE INTO agent_cards (
        project_id, category, difficulty, deployment_json, cloudflare_ready,
        use_cases_json, not_good_for_json, alternatives_json, summary_for_agent,
        schema_version, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      agentCard.projectId,
      agentCard.category,
      agentCard.difficulty,
      JSON.stringify(agentCard.deployment),
      agentCard.cloudflareReady ? 1 : 0,
      JSON.stringify(agentCard.useCases),
      JSON.stringify(agentCard.notGoodFor),
      JSON.stringify(agentCard.alternatives),
      agentCard.summaryForAgent,
      agentCard.schemaVersion,
      agentCard.generatedAt
    ),
    env.DB.prepare(
      `INSERT OR REPLACE INTO star_snapshots (
        project_id, stars, captured_at
      ) VALUES (?, ?, ?)`
    ).bind(project.id, project.stars, project.syncedAt)
  ];

  await env.DB.batch(statements);
}

export async function updateProjectAlternatives(
  env: Env,
  updates: Array<{ projectId: string; alternatives: Alternative[] }>
): Promise<number> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to update alternatives.");
  }

  if (updates.length === 0) {
    return 0;
  }

  await env.DB.batch(
    updates.map((update) =>
      env.DB!.prepare("UPDATE agent_cards SET alternatives_json = ? WHERE project_id = ?").bind(
        JSON.stringify(update.alternatives),
        update.projectId
      )
    )
  );

  return updates.length;
}

function rowToKnowledge(row: Record<string, unknown>): ProjectKnowledge {
  const projectRow = row as unknown as ProjectRow;
  const cardRow = row as unknown as AgentCardRow;
  const metricsRow = row as unknown as MetricsRow;

  return {
    project: rowToProject(projectRow),
    agentCard: rowToAgentCard(cardRow),
    metrics: rowToMetrics(metricsRow)
  };
}

function rowToProject(row: ProjectRow): Project {
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

function rowToAgentCard(row: AgentCardRow): AgentCard {
  return {
    projectId: row.ac_project_id,
    category: row.category,
    difficulty: row.difficulty,
    deployment: parseJson<AgentCard["deployment"]>(row.deployment_json, []),
    cloudflareReady: row.cloudflare_ready === 1,
    useCases: parseJson<string[]>(row.use_cases_json, []),
    notGoodFor: parseJson<string[]>(row.not_good_for_json, []),
    alternatives: parseJson<AgentCard["alternatives"]>(row.alternatives_json, []),
    summaryForAgent: row.summary_for_agent,
    schemaVersion: row.schema_version,
    generatedAt: row.generated_at
  };
}

function rowToMetrics(row: MetricsRow): ProjectMetrics {
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
    calculatedAt: row.calculated_at
  };
}

function rowToSyncRun(row: SyncRunRow): SyncRun {
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

function buildRecommendationReason(item: ProjectKnowledge, query: RecommendationQuery): string {
  const parts = [item.agentCard.summaryForAgent];
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    parts.push(`It matches the requested ${query.deployment} deployment target.`);
  }
  if (query.cloudflareReady && item.agentCard.cloudflareReady) {
    parts.push("It is marked Cloudflare-ready.");
  }
  if (query.difficulty && item.agentCard.difficulty === query.difficulty) {
    parts.push(`Its difficulty is ${query.difficulty}.`);
  }
  return parts.join(" ");
}

function readinessBoost(item: ProjectKnowledge, query: RecommendationQuery): number {
  let score = 0;
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    score += 60;
  }
  if (query.cloudflareReady && item.agentCard.cloudflareReady) {
    score += 40;
  }
  return Math.min(100, score);
}

function keywordOverlapScore(query: string, text: string): number {
  const words = queryTokens(query);
  if (words.length === 0) {
    return 0;
  }

  const hits = words.filter((word) => text.includes(word)).length;
  return Math.round((hits / words.length) * 100);
}

function queryMatchScore(query: string, words: string[], haystack: string, item: ProjectKnowledge): number {
  if (haystack.includes(query)) {
    return 1000 + item.metrics.gitScore;
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;

  return hits * 120 + deploymentHits * 80 + topicHits * 60 + categoryHits * 60 + item.metrics.gitScore;
}

function queryTokens(query: string): string[] {
  return query
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2);
}

function isSearchHit(value: { item: ProjectKnowledge; score: number } | null): value is { item: ProjectKnowledge; score: number } {
  return value !== null;
}

function sharedCount(left: string[], right: string[]): number {
  const rightText = normalize(right.join(" "));
  return left.filter((item) => rightText.includes(normalize(item))).length;
}

function byGitScore(a: ProjectKnowledge, b: ProjectKnowledge): number {
  return b.metrics.gitScore - a.metrics.gitScore || b.project.stars - a.project.stars;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function clampLimit(value: number | undefined, fallback = defaultLimit): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
}
