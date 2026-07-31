import { rowToKnowledge } from "./db-mapping";
import { projectLookupCandidates } from "./project-aliases";
import { interpretSearchQuery, type ProjectFilters } from "./project-search";
import { seedProjects } from "./seed";
import type { Env, ProjectKnowledge } from "./types";

export type KnowledgeSource = "d1" | "seed";
export type KnowledgeSourceReason = "d1_query" | "db_missing" | "db_empty" | "db_error";

export interface KnowledgeMetadata {
  source: KnowledgeSource;
  reason: KnowledgeSourceReason;
  projectCount: number;
  generatedAt: string;
  snapshotId: string;
  latestSyncedAt: string | null;
  schemaVersion: "git-top.knowledge.v1";
  loadedProjectLimit?: number;
  truncated?: boolean;
  candidateRetrieval?: "d1_first";
  candidateCount?: number;
  candidateLimit?: number;
  warnings?: string[];
  error?: string;
}

export interface ProjectKnowledgeResult {
  projects: ProjectKnowledge[];
  metadata: KnowledgeMetadata;
}

const knowledgePageSize = 500;
const maxKnowledgeProjects = 2000;
export const d1FirstSearchProjectThreshold = 1500;
export const maxSearchCandidateProjects = 1000;

export async function listProjectKnowledgeWithMeta(env: Env): Promise<ProjectKnowledgeResult> {
  if (!env.DB) {
    return seedResult("db_missing");
  }

  try {
    const rows = await queryProjectKnowledgeRows(env);

    const results = rows.results;
    if (results.length === 0) {
      return seedResult("db_empty");
    }

    const projects = results.map(rowToKnowledge);
    const truncated = rows.truncated;
    const latestSyncedAt = latestProjectSync(projects);
    const warnings = truncated
      ? [`D1 knowledge results reached the ${maxKnowledgeProjects} project load limit; search and recommendations may not include every indexed project.`]
      : undefined;
    return {
      projects,
      metadata: {
        source: "d1",
        reason: "d1_query",
        projectCount: projects.length,
        generatedAt: new Date().toISOString(),
        snapshotId: knowledgeSnapshotId("d1", projects.length, latestSyncedAt),
        latestSyncedAt,
        schemaVersion: "git-top.knowledge.v1",
        loadedProjectLimit: maxKnowledgeProjects,
        truncated,
        ...(warnings ? { warnings } : {})
      }
    };
  } catch (error) {
    return seedResult("db_error", error);
  }
}

export async function searchProjectKnowledgeWithMeta(env: Env, filters: ProjectFilters): Promise<ProjectKnowledgeResult> {
  if (!env.DB) {
    return listProjectKnowledgeWithMeta(env);
  }

  try {
    const stats = await queryKnowledgeStats(env);
    if ((stats?.count ?? 0) < d1FirstSearchProjectThreshold) {
      return listProjectKnowledgeWithMeta(env);
    }

    const rows = await querySearchCandidateRows(env, filters);
    const candidateRows = rows.slice(0, maxSearchCandidateProjects);
    const candidateTruncated = rows.length > maxSearchCandidateProjects;
    const projects = candidateRows.map(rowToKnowledge);
    const projectCount = stats?.count ?? projects.length;
    const latestSyncedAt = stats?.latest_synced_at ?? latestProjectSync(projects);
    const warnings = candidateTruncated
      ? [`D1-first search reached the ${maxSearchCandidateProjects} candidate limit; refine the query or filters for complete results.`]
      : undefined;
    return {
      projects,
      metadata: {
        source: "d1",
        reason: "d1_query",
        projectCount,
        generatedAt: new Date().toISOString(),
        snapshotId: knowledgeSnapshotId("d1", projectCount, latestSyncedAt),
        latestSyncedAt,
        schemaVersion: "git-top.knowledge.v1",
        loadedProjectLimit: maxSearchCandidateProjects,
        truncated: candidateTruncated,
        candidateRetrieval: "d1_first",
        candidateCount: projects.length,
        candidateLimit: maxSearchCandidateProjects,
        ...(warnings ? { warnings } : {})
      }
    };
  } catch {
    return listProjectKnowledgeWithMeta(env);
  }
}

export async function getProjectGraphKnowledge(env: Env, id: string, limit = 32): Promise<ProjectKnowledgeResult> {
  if (!env.DB) {
    return listProjectKnowledgeWithMeta(env);
  }

  try {
    const lookupIds = projectLookupCandidates(id);
    const requestedId = decodeURIComponent(id).trim();
    const lookupPlaceholders = lookupIds.map(() => "?").join(", ");
    const select = graphKnowledgeSelect();
    const focusRow = await env.DB.prepare(
      `${select}
       WHERE lower(p.id) IN (${lookupPlaceholders})
          OR lower(p.name) = lower(?)
          OR lower(replace(p.full_name, '/', '-')) = lower(?)
          OR lower(replace(p.full_name, '/', '--')) = lower(?)
       ORDER BY CASE WHEN lower(p.id) = lower(?) THEN 0 ELSE 1 END, pm.git_score DESC, p.stars DESC
       LIMIT 1`
    )
      .bind(...lookupIds, requestedId, requestedId, requestedId, requestedId)
      .first<Record<string, unknown>>();

    const statsPromise = env.DB.prepare(
      `SELECT COUNT(*) AS count, MAX(p.synced_at) AS latest_synced_at
       FROM projects p
       JOIN agent_cards ac ON ac.project_id = p.id
       JOIN project_metrics pm ON pm.project_id = p.id`
    ).first<{ count: number; latest_synced_at: string | null }>();

    if (!focusRow) {
      return {
        projects: [],
        metadata: graphKnowledgeMetadata(await statsPromise)
      };
    }

    const focus = rowToKnowledge(focusRow);
    const alternativeIds = focus.agentCard.alternatives.slice(0, 12).map((item) => item.project_id);
    const alternativeClause = alternativeIds.length > 0
      ? ` OR lower(p.id) IN (${alternativeIds.map(() => "?").join(", ")})`
      : "";
    const candidateLimit = Math.max(8, Math.min(64, Math.trunc(limit)));
    const relatedRows = await env.DB.prepare(
      `${select}
       WHERE lower(p.id) <> lower(?)
         AND (COALESCE(co.category, ac.category) = ?${alternativeClause})
       ORDER BY pm.git_score DESC, p.stars DESC
       LIMIT ?`
    )
      .bind(focus.project.id, focus.agentCard.category, ...alternativeIds, candidateLimit)
      .all<Record<string, unknown>>();
    const projects = [focus, ...(relatedRows.results ?? []).map(rowToKnowledge)];

    return {
      projects,
      metadata: graphKnowledgeMetadata(await statsPromise)
    };
  } catch {
    return listProjectKnowledgeWithMeta(env);
  }
}

export async function getKnowledgeReadyProjectCount(env: Env): Promise<number> {
  const row = await queryKnowledgeStats(env);
  return row?.count ?? 0;
}

export function seedMetadata(reason: KnowledgeSourceReason, error?: unknown): KnowledgeMetadata {
  const latestSyncedAt = latestProjectSync(seedProjects);
  return {
    source: "seed",
    reason,
    projectCount: seedProjects.length,
    generatedAt: new Date().toISOString(),
    snapshotId: knowledgeSnapshotId("seed", seedProjects.length, latestSyncedAt),
    latestSyncedAt,
    schemaVersion: "git-top.knowledge.v1",
    warnings: [seedWarning(reason)],
    ...(error ? { error: formatError(error) } : {})
  };
}

function latestProjectSync(projects: ProjectKnowledge[]): string | null {
  return projects.reduce<string | null>((latest, project) => {
    const value = project.project.syncedAt;
    return !latest || Date.parse(value) > Date.parse(latest) ? value : latest;
  }, null);
}

function knowledgeSnapshotId(source: KnowledgeSource, projectCount: number, latestSyncedAt: string | null): string {
  return `${source}:${projectCount}:${latestSyncedAt ?? "unknown"}`;
}

function graphKnowledgeMetadata(stats: { count: number; latest_synced_at: string | null } | null): KnowledgeMetadata {
  const projectCount = stats?.count ?? 0;
  const latestSyncedAt = stats?.latest_synced_at ?? null;
  return {
    source: "d1",
    reason: "d1_query",
    projectCount,
    generatedAt: new Date().toISOString(),
    snapshotId: knowledgeSnapshotId("d1", projectCount, latestSyncedAt),
    latestSyncedAt,
    schemaVersion: "git-top.knowledge.v1"
  };
}

function graphKnowledgeSelect(): string {
  return `SELECT
    p.*,
    ac.project_id AS ac_project_id,
    ac.project_kind,
    ac.collection_json,
    ac.category,
    ac.difficulty,
    ac.deployment_json,
    ac.cloudflare_ready,
    ac.use_cases_json,
    ac.not_good_for_json,
    ac.alternatives_json,
    ac.summary_for_agent,
    ac.classification_json,
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
    pm.signal_confidence_json,
    pm.calculated_at,
    co.category AS override_category,
    co.difficulty AS override_difficulty,
    co.deployment_json AS override_deployment_json,
    co.cloudflare_ready AS override_cloudflare_ready,
    co.classification_json AS override_classification_json
    FROM projects p
    JOIN agent_cards ac ON ac.project_id = p.id
    JOIN project_metrics pm ON pm.project_id = p.id
    LEFT JOIN classification_overrides co ON co.project_id = p.id`;
}

async function querySearchCandidateRows(env: Env, filters: ProjectFilters): Promise<Record<string, unknown>[]> {
  const where: string[] = [];
  const bindings: unknown[] = [];
  let exactOrderClause = "";
  const exactOrderBindings: string[] = [];
  if (filters.category) {
    where.push("COALESCE(co.category, ac.category) = ?");
    bindings.push(filters.category);
  }
  if (filters.deployment) {
    where.push("lower(COALESCE(co.deployment_json, ac.deployment_json, '')) LIKE ?");
    bindings.push(`%\"${filters.deployment.toLowerCase()}\"%`);
  }
  if (filters.difficulty) {
    where.push("COALESCE(co.difficulty, ac.difficulty) = ?");
    bindings.push(filters.difficulty);
  }
  if (typeof filters.cloudflareReady === "boolean") {
    where.push("COALESCE(co.cloudflare_ready, ac.cloudflare_ready) = ?");
    bindings.push(filters.cloudflareReady ? 1 : 0);
  }
  if (filters.language) {
    where.push("lower(COALESCE(p.language, '')) = lower(?)");
    bindings.push(filters.language);
  }
  if (filters.projectKind) {
    where.push("COALESCE(ac.project_kind, 'project') = ?");
    bindings.push(filters.projectKind);
  }

  const interpretation = interpretSearchQuery(filters.q);
  const query = interpretation.normalized;
  if (query) {
    const lookupIds = projectLookupCandidates(query).map((value) => value.toLowerCase());
    const tokens = (query.match(/[a-z0-9]+/giu) ?? [])
      .map((token) => token.toLowerCase())
      .filter((token) => token.length > 2)
      .slice(0, 8);
    const textExpression = `lower(
      COALESCE(p.id, '') || ' ' || COALESCE(p.full_name, '') || ' ' || COALESCE(p.name, '') || ' ' ||
      COALESCE(p.description, '') || ' ' || COALESCE(p.language, '') || ' ' || COALESCE(p.topics_json, '') || ' ' ||
      COALESCE(co.category, ac.category, '') || ' ' || COALESCE(co.deployment_json, ac.deployment_json, '') || ' ' ||
      COALESCE(ac.project_kind, '') || ' ' || COALESCE(ac.collection_json, '') || ' ' ||
      COALESCE(ac.use_cases_json, '') || ' ' || COALESCE(ac.summary_for_agent, '')
    )`;
    const queryClauses: string[] = [];
    if (lookupIds.length > 0) {
      queryClauses.push(`lower(p.id) IN (${lookupIds.map(() => "?").join(", ")})`);
      bindings.push(...lookupIds);
      exactOrderClause = `CASE WHEN lower(p.id) IN (${lookupIds.map(() => "?").join(", ")}) THEN 0 ELSE 1 END,`;
      exactOrderBindings.push(...lookupIds);
    }
    for (const token of tokens) {
      queryClauses.push(`${textExpression} LIKE ?`);
      bindings.push(`%${token.toLowerCase()}%`);
    }
    where.push(`(${queryClauses.join(" OR ")})`);
  }

  const rows = await env.DB!.prepare(
    `${graphKnowledgeSelect()}
     /* search_candidates */
     ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${exactOrderClause} pm.git_score DESC, p.stars DESC, lower(p.id) ASC
     LIMIT ?`
  ).bind(...bindings, ...exactOrderBindings, maxSearchCandidateProjects + 1).all<Record<string, unknown>>();
  return rows.results ?? [];
}

async function queryKnowledgeStats(env: Env): Promise<{ count: number; latest_synced_at: string | null } | null> {
  return env.DB!.prepare(
    `SELECT COUNT(*) AS count, MAX(p.synced_at) AS latest_synced_at
     FROM projects p
     JOIN agent_cards ac ON ac.project_id = p.id
     JOIN project_metrics pm ON pm.project_id = p.id`
  ).first<{ count: number; latest_synced_at: string | null }>();
}

interface ProjectKnowledgeRows {
  results: Record<string, unknown>[];
  truncated: boolean;
}

async function queryProjectKnowledgeRows(env: Env): Promise<ProjectKnowledgeRows> {
  const baseSelect = `SELECT
    p.*,
    ac.project_id AS ac_project_id,
        ac.project_kind,
        ac.collection_json,
        ac.category,
    ac.difficulty,
    ac.deployment_json,
    ac.cloudflare_ready,
    ac.use_cases_json,
    ac.not_good_for_json,
        ac.alternatives_json,
        ac.summary_for_agent,
        ac.classification_json,
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
    pm.maintenance_score`;
  const baseJoin = `FROM projects p
    JOIN agent_cards ac ON ac.project_id = p.id
    JOIN project_metrics pm ON pm.project_id = p.id
    ORDER BY pm.git_score DESC, p.stars DESC
    LIMIT ? OFFSET ?`;
  const overrideSelect = `,
        co.category AS override_category,
        co.difficulty AS override_difficulty,
        co.deployment_json AS override_deployment_json,
        co.cloudflare_ready AS override_cloudflare_ready,
        co.classification_json AS override_classification_json`;
  const overrideJoin = `FROM projects p
    JOIN agent_cards ac ON ac.project_id = p.id
    JOIN project_metrics pm ON pm.project_id = p.id
    LEFT JOIN classification_overrides co ON co.project_id = p.id
    ORDER BY pm.git_score DESC, p.stars DESC
    LIMIT ? OFFSET ?`;

  try {
    return await queryProjectKnowledgePages(env, `${baseSelect}${overrideSelect}, pm.signal_confidence_json, pm.calculated_at ${overrideJoin}`);
  } catch (error) {
    if (!isMissingOptionalColumn(error)) {
      throw error;
    }
    return queryProjectKnowledgePages(env, `${legacyProjectKnowledgeSelect()}, '{}' AS signal_confidence_json, pm.calculated_at ${baseJoin}`);
  }
}

async function queryProjectKnowledgePages(env: Env, sql: string): Promise<ProjectKnowledgeRows> {
  const results: Record<string, unknown>[] = [];
  for (let offset = 0; offset < maxKnowledgeProjects; offset += knowledgePageSize) {
    const page = await env.DB!.prepare(sql).bind(knowledgePageSize, offset).all<Record<string, unknown>>();
    const rows = page.results ?? [];
    results.push(...rows);
    if (rows.length < knowledgePageSize) {
      return {
        results,
        truncated: false
      };
    }
  }

  const overflow = await env.DB!.prepare(sql).bind(1, maxKnowledgeProjects).all<Record<string, unknown>>();
  return {
    results,
    truncated: (overflow.results ?? []).length > 0
  };
}

function seedResult(reason: KnowledgeSourceReason, error?: unknown): ProjectKnowledgeResult {
  return {
    projects: seedProjects,
    metadata: seedMetadata(reason, error)
  };
}

function legacyProjectKnowledgeSelect(): string {
  return `SELECT
    p.*,
    ac.project_id AS ac_project_id,
    'project' AS project_kind,
    '{}' AS collection_json,
    ac.category,
    ac.difficulty,
    ac.deployment_json,
    ac.cloudflare_ready,
    ac.use_cases_json,
    ac.not_good_for_json,
    ac.alternatives_json,
    ac.summary_for_agent,
    '{}' AS classification_json,
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
    pm.maintenance_score`;
}

function isMissingOptionalColumn(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("signal_confidence_json") ||
      error.message.includes("classification_json") ||
      error.message.includes("project_kind") ||
      error.message.includes("collection_json") ||
      error.message.includes("classification_overrides"))
  );
}

function seedWarning(reason: KnowledgeSourceReason): string {
  if (reason === "db_missing") {
    return "D1 binding is missing; returning bundled seed projects.";
  }
  if (reason === "db_empty") {
    return "D1 contains no indexed projects; returning bundled seed projects.";
  }
  if (reason === "db_error") {
    return "D1 query failed; returning bundled seed projects.";
  }
  return "Returning bundled seed projects.";
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown data source error";
}
