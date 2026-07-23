import { rowToSyncRun, type SyncRunRow } from "./db-mapping";
import { seedProjects } from "./seed";
import { buildSyncPrioritySummary, type SyncPriorityProject } from "./sync-priority";
import { buildSyncStatus, type SyncStatus } from "./sync-status";
import { getLatestGovernanceRun, listGovernanceRuns } from "./governance-store";
import type { Env, ProjectMetrics, SyncRun } from "./types";

export interface StarDeltaSnapshot {
  delta: number;
  windowDays: number;
}

export interface SyncStatusOptions {
  priorityProjects?: SyncPriorityProject[];
  priorityProjectsAreSynced?: boolean;
  recentRunLimit?: number;
  priorityPreviewLimit?: number;
}

interface SyncPriorityProjectLoad {
  priorityProjects: SyncPriorityProject[];
  syncedProjects: SyncPriorityProject[];
}

export async function getSyncCursor(env: Env): Promise<number> {
  return getSyncStateNumber(env, "seed_cursor");
}

export async function getSyncStateNumber(env: Env, key: string): Promise<number> {
  if (!env.DB) {
    return 0;
  }

  try {
    const row = await env.DB.prepare("SELECT value FROM sync_state WHERE key = ?").bind(key).first<{ value: string }>();
    const parsed = Number(row?.value ?? 0);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  } catch {
    return 0;
  }
}

export async function setSyncCursor(env: Env, cursor: number): Promise<void> {
  await setSyncStateValue(env, "seed_cursor", String(Math.max(0, Math.trunc(cursor))));
}

export async function getSyncStateValue(env: Env, key: string): Promise<string | null> {
  if (!env.DB) {
    return null;
  }

  try {
    const row = await env.DB.prepare("SELECT value FROM sync_state WHERE key = ?").bind(key).first<{ value: string }>();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSyncStateValue(env: Env, key: string, value: string): Promise<void> {
  if (!env.DB) {
    return;
  }

  await env.DB.prepare(
    `INSERT INTO sync_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(key, value, new Date().toISOString())
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

export async function getSyncStatus(env: Env, seedRepositories: string[] = [], options: SyncStatusOptions = {}): Promise<SyncStatus> {
  const recentRunLimit = boundedLimit(options.recentRunLimit, 5, 10);
  const priorityPreviewLimit = boundedLimit(options.priorityPreviewLimit, 5, 50);
  const priorityProjectsPromise: Promise<SyncPriorityProjectLoad> = options.priorityProjects
    ? Promise.resolve({
        priorityProjects: options.priorityProjects,
        syncedProjects: options.priorityProjectsAreSynced === false ? [] : options.priorityProjects
      })
    : loadSyncPriorityProjects(env);
  const [cursor, recentRuns, indexedCount, priorityLoad, derivedRun, derivedProgressRun] = await Promise.all([
    getSyncCursor(env),
    listSyncRuns(env, recentRunLimit),
    getSyncedProjectCount(env),
    priorityProjectsPromise,
    getLatestGovernanceRun(env, "derived:alternatives"),
    getLatestGovernanceRun(env, "derived:alternatives-progress")
  ]);
  return buildSyncStatus({
    cursor,
    recentRuns,
    indexedCount,
    seedSyncedCount: countSyncedSeedProjects(priorityLoad.syncedProjects, seedRepositories),
    seedRepositories,
    priority: buildSyncPrioritySummary(priorityLoad.priorityProjects, new Date().toISOString(), priorityPreviewLimit),
    derivedRuns: [derivedRun, derivedProgressRun].filter((run): run is NonNullable<typeof run> => run !== null)
  });
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

export async function getStarsDeltaSnapshot(
  env: Env,
  projectId: string,
  currentStars: number,
  nowIso: string,
  targetDays = 30,
  minimumDays = 7
): Promise<StarDeltaSnapshot | null> {
  if (!env.DB) {
    return null;
  }

  try {
    const targetIso = daysBefore(nowIso, targetDays);
    const minimumIso = daysBefore(nowIso, minimumDays);
    const row =
      (await env.DB.prepare(
        `SELECT stars, captured_at FROM star_snapshots
         WHERE project_id = ? AND captured_at <= ?
         ORDER BY captured_at DESC
         LIMIT 1`
      )
        .bind(projectId, targetIso)
        .first<{ stars: number; captured_at: string }>()) ??
      (await env.DB.prepare(
        `SELECT stars, captured_at FROM star_snapshots
         WHERE project_id = ? AND captured_at <= ?
         ORDER BY captured_at ASC
         LIMIT 1`
      )
        .bind(projectId, minimumIso)
        .first<{ stars: number; captured_at: string }>());

    if (!row) {
      return null;
    }

    return {
      delta: Math.max(0, currentStars - row.stars),
      windowDays: daysBetween(row.captured_at, nowIso)
    };
  } catch {
    return null;
  }
}

async function loadSyncPriorityProjects(env: Env): Promise<SyncPriorityProjectLoad> {
  if (!env.DB) {
    return {
      priorityProjects: seedProjects,
      syncedProjects: seedProjects
    };
  }

  const enrichedSelect = `SELECT
    p.id,
    p.stars,
    p.synced_at,
    COALESCE(co.category, ac.category) AS category,
    COALESCE(co.cloudflare_ready, ac.cloudflare_ready) AS cloudflare_ready,
    pm.stars_30d_delta,
    pm.git_score,
    pm.signal_confidence_json
    FROM projects p
    JOIN agent_cards ac ON ac.project_id = p.id
    JOIN project_metrics pm ON pm.project_id = p.id
    LEFT JOIN classification_overrides co ON co.project_id = p.id`;
  const legacySelect = `SELECT
    p.id,
    p.stars,
    p.synced_at,
    ac.category,
    ac.cloudflare_ready,
    pm.stars_30d_delta,
    pm.git_score,
    '{}' AS signal_confidence_json
    FROM projects p
    JOIN agent_cards ac ON ac.project_id = p.id
    JOIN project_metrics pm ON pm.project_id = p.id`;

  try {
    const rows = await env.DB.prepare(enrichedSelect).all<Record<string, unknown>>();
    return priorityProjectLoad(rows.results);
  } catch (error) {
    if (isMissingPriorityOptionalData(error)) {
      try {
        const rows = await env.DB.prepare(legacySelect).all<Record<string, unknown>>();
        return priorityProjectLoad(rows.results);
      } catch {
        return seedPriorityFallback();
      }
    }
    return seedPriorityFallback();
  }
}

function priorityProjectLoad(rows: Record<string, unknown>[] | undefined): SyncPriorityProjectLoad {
  if (!rows || rows.length === 0) {
    return seedPriorityFallback();
  }
  const projects = rows.map(rowToSyncPriorityProject);
  return {
    priorityProjects: projects,
    syncedProjects: projects
  };
}

function seedPriorityFallback(): SyncPriorityProjectLoad {
  return {
    priorityProjects: seedProjects,
    syncedProjects: []
  };
}

function rowToSyncPriorityProject(row: Record<string, unknown>): SyncPriorityProject {
  return {
    project: {
      id: stringValue(row.id),
      stars: numberValue(row.stars),
      syncedAt: stringValue(row.synced_at)
    },
    agentCard: {
      category: stringValue(row.category) as SyncPriorityProject["agentCard"]["category"],
      cloudflareReady: row.cloudflare_ready === true || row.cloudflare_ready === 1
    },
    metrics: {
      stars30dDelta: numberValue(row.stars_30d_delta),
      gitScore: numberValue(row.git_score),
      signalConfidence: parseSignalConfidence(row.signal_confidence_json)
    }
  };
}

function countSyncedSeedProjects(projects: SyncPriorityProject[], seedRepositories: string[]): number {
  const seedIds = new Set(seedRepositories.map((repository) => repository.trim().toLowerCase()).filter(Boolean));
  if (seedIds.size === 0) {
    return 0;
  }
  return Math.min(
    seedIds.size,
    projects.reduce((count, project) => count + (seedIds.has(project.project.id.toLowerCase()) ? 1 : 0), 0)
  );
}

function parseSignalConfidence(value: unknown): ProjectMetrics["signalConfidence"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as ProjectMetrics["signalConfidence"];
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function boundedLimit(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(maximum, Math.trunc(value!)));
}

function isMissingPriorityOptionalData(error: unknown): boolean {
  return error instanceof Error && (error.message.includes("signal_confidence_json") || error.message.includes("classification_overrides"));
}

function daysBefore(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, Math.floor((end - start) / 1000 / 60 / 60 / 24));
}
