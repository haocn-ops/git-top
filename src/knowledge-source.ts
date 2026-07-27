import { rowToKnowledge } from "./db-mapping";
import { projectLookupCandidates } from "./project-aliases";
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
  warnings?: string[];
  error?: string;
}

export interface ProjectKnowledgeResult {
  projects: ProjectKnowledge[];
  metadata: KnowledgeMetadata;
}

const knowledgePageSize = 500;
const maxKnowledgeProjects = 2000;

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
  const row = await env.DB!.prepare(
    `SELECT COUNT(*) AS count
     FROM projects p
     JOIN agent_cards ac ON ac.project_id = p.id
     JOIN project_metrics pm ON pm.project_id = p.id`
  ).first<{ count: number }>();
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
