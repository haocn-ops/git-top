import { rowToSyncRun, type SyncRunRow } from "./db-mapping";
import { seedProjects } from "./seed";
import { buildSyncStatus, type SyncStatus } from "./sync-status";
import type { Env, SyncRun } from "./types";

export interface StarDeltaSnapshot {
  delta: number;
  windowDays: number;
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

export async function getSyncStatus(env: Env, seedRepositories: string[] = []): Promise<SyncStatus> {
  const [cursor, recentRuns, indexedCount, seedSyncedCount] = await Promise.all([
    getSyncCursor(env),
    listSyncRuns(env, 10),
    getSyncedProjectCount(env),
    getSyncedSeedProjectCount(env, seedRepositories)
  ]);
  return buildSyncStatus({
    cursor,
    recentRuns,
    indexedCount,
    seedSyncedCount,
    seedRepositories
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

async function getSyncedSeedProjectCount(env: Env, seedRepositories: string[]): Promise<number> {
  if (seedRepositories.length === 0) {
    return 0;
  }
  if (!env.DB) {
    return Math.min(seedProjects.length, seedRepositories.length);
  }

  try {
    let count = 0;
    const uniqueRepositories = Array.from(new Set(seedRepositories.map((repo) => repo.trim()).filter(Boolean)));
    for (const chunk of chunkArray(uniqueRepositories, 40)) {
      const placeholders = chunk.map(() => "?").join(", ");
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM projects
         WHERE lower(id) IN (${placeholders})
            OR lower(full_name) IN (${placeholders})`
      )
        .bind(...chunk.map((repo) => repo.toLowerCase()), ...chunk.map((repo) => repo.toLowerCase()))
        .first<{ count: number }>();
      count += row?.count ?? 0;
    }
    return Math.min(count, uniqueRepositories.length);
  } catch {
    return 0;
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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
