import type { SyncFailure, SyncRun } from "./types";

export interface SyncStatusInput {
  cursor: number;
  recentRuns: SyncRun[];
  indexedCount: number;
  seedSyncedCount: number;
  seedRepositories: string[];
}

export interface SyncStatus {
  cursor: number;
  seedTotal: number;
  syncedCount: number;
  indexedCount: number;
  remainingCount: number;
  cycleProgress: number;
  cycleComplete: boolean;
  nextBatchWraps: boolean;
  nextBatch: string[];
  health: "healthy" | "degraded" | "unknown";
  freshness: "fresh" | "stale" | "unknown";
  lastSuccessfulSyncAt: string | null;
  hoursSinceSuccessfulSync: number | null;
  lastFailedSyncAt: string | null;
  lastError: SyncFailure | null;
  recentRuns: SyncRun[];
}

export function buildSyncStatus(input: SyncStatusInput): SyncStatus {
  const { cursor, recentRuns, indexedCount, seedSyncedCount, seedRepositories } = input;
  const seedTotal = seedRepositories.length;
  const normalizedCursor = seedTotal > 0 ? cursor % seedTotal : 0;
  const syncedCount = seedTotal > 0 ? seedSyncedCount : indexedCount;
  const nextLimit = seedTotal > 0 ? Math.min(recentRuns[0]?.limit ?? 5, seedTotal) : 0;
  const nextBatchWraps = seedTotal > 0 && normalizedCursor + nextLimit > seedTotal;
  const nextBatch = nextBatchWraps
    ? [...seedRepositories.slice(normalizedCursor), ...seedRepositories.slice(0, (normalizedCursor + nextLimit) % seedTotal)]
    : seedRepositories.slice(normalizedCursor, normalizedCursor + nextLimit);
  const lastSuccessfulRun = recentRuns.find((run) => run.syncedCount > 0);
  const lastFailedRun = recentRuns.find((run) => run.failedCount > 0);
  const freshness = syncFreshness(recentRuns);

  return {
    cursor: normalizedCursor,
    seedTotal,
    syncedCount,
    indexedCount,
    remainingCount: Math.max(0, seedTotal - syncedCount),
    cycleProgress: seedTotal > 0 ? Math.round((normalizedCursor / seedTotal) * 100) : 0,
    cycleComplete: seedTotal > 0 && syncedCount >= seedTotal,
    nextBatchWraps,
    nextBatch,
    health: syncHealth(recentRuns),
    freshness: freshness.status,
    lastSuccessfulSyncAt: lastSuccessfulRun?.finishedAt ?? null,
    hoursSinceSuccessfulSync: freshness.hoursSinceSuccessfulSync,
    lastFailedSyncAt: lastFailedRun?.finishedAt ?? null,
    lastError: lastFailedRun?.failed[0] ?? null,
    recentRuns
  };
}

export function syncHealth(runs: SyncRun[]): "healthy" | "degraded" | "unknown" {
  if (runs.length === 0) {
    return "unknown";
  }

  const latest = runs[0];
  if (latest.syncedCount > 0 && latest.failedCount === 0) {
    return "healthy";
  }
  return "degraded";
}

export function syncFreshness(runs: SyncRun[]): {
  status: "fresh" | "stale" | "unknown";
  lastSuccessfulSyncAt: string | null;
  hoursSinceSuccessfulSync: number | null;
} {
  const lastSuccessfulRun = runs.find((run) => run.syncedCount > 0);
  if (!lastSuccessfulRun) {
    return {
      status: "unknown",
      lastSuccessfulSyncAt: null,
      hoursSinceSuccessfulSync: null
    };
  }

  const hoursSinceSuccessfulSync = hoursBetween(lastSuccessfulRun.finishedAt, new Date().toISOString());
  return {
    status: hoursSinceSuccessfulSync <= 24 ? "fresh" : "stale",
    lastSuccessfulSyncAt: lastSuccessfulRun.finishedAt,
    hoursSinceSuccessfulSync
  };
}

function hoursBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, Math.floor((end - start) / 1000 / 60 / 60));
}
