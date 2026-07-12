import { getSyncCursor, listSyncRuns } from "./db-sync-store";
import { getKnowledgeReadyProjectCount, seedMetadata } from "./knowledge-source";
import { seedProjects } from "./seed";
import { syncFreshness, syncHealth } from "./sync-status";
import type { KnowledgeMetadata } from "./knowledge-source";
import type { Env } from "./types";
import { getOperationalStorageStats, type OperationalStorageStats } from "./storage-maintenance";

export interface HealthStatus {
  ok: boolean;
  db: "available" | "missing" | "error";
  projectCount: number;
  rawProjectCount?: number;
  knowledgeReadyProjectCount?: number;
  syncCursor?: number;
  syncHealth?: "healthy" | "degraded" | "unknown";
  syncFreshness?: "fresh" | "stale" | "unknown";
  lastSuccessfulSyncAt?: string | null;
  hoursSinceSuccessfulSync?: number | null;
  operationalStorage?: OperationalStorageStats;
  metadata: KnowledgeMetadata;
}

export async function getHealth(env: Env): Promise<HealthStatus> {
  if (!env.DB) {
    return {
      ok: true,
      db: "missing",
      projectCount: seedProjects.length,
      rawProjectCount: 0,
      knowledgeReadyProjectCount: seedProjects.length,
      syncCursor: 0,
      syncHealth: "unknown",
      syncFreshness: "unknown",
      lastSuccessfulSyncAt: null,
      hoursSinceSuccessfulSync: null,
      operationalStorage: await getOperationalStorageStats(env),
      metadata: seedMetadata("db_missing")
    };
  }

  try {
    const [rawCountRow, knowledgeReadyCount, cursor, recentRuns, operationalStorage] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count, MAX(synced_at) AS latest_synced_at FROM projects").first<{ count: number; latest_synced_at: string | null }>(),
      getKnowledgeReadyProjectCount(env),
      getSyncCursor(env),
      listSyncRuns(env, 10),
      getOperationalStorageStats(env)
    ]);
    const rawProjectCount = rawCountRow?.count ?? 0;
    const warnings =
      rawProjectCount > knowledgeReadyCount
        ? [`${rawProjectCount - knowledgeReadyCount} project row(s) are missing complete Agent Card or metric knowledge.`]
        : undefined;
    const freshness = syncFreshness(recentRuns);
    return {
      ok: true,
      db: "available",
      projectCount: knowledgeReadyCount,
      rawProjectCount,
      knowledgeReadyProjectCount: knowledgeReadyCount,
      syncCursor: cursor,
      syncHealth: syncHealth(recentRuns),
      syncFreshness: freshness.status,
      lastSuccessfulSyncAt: freshness.lastSuccessfulSyncAt,
      hoursSinceSuccessfulSync: freshness.hoursSinceSuccessfulSync,
      operationalStorage,
      metadata:
        knowledgeReadyCount > 0
          ? {
              source: "d1",
              reason: "d1_query",
              projectCount: knowledgeReadyCount,
              generatedAt: new Date().toISOString(),
              snapshotId: `d1:${knowledgeReadyCount}:${rawCountRow?.latest_synced_at ?? "unknown"}`,
              latestSyncedAt: rawCountRow?.latest_synced_at ?? null,
              schemaVersion: "git-top.knowledge.v1",
              ...(warnings ? { warnings } : {})
            }
          : seedMetadata("db_empty")
    };
  } catch (error) {
    return {
      ok: false,
      db: "error",
      projectCount: seedProjects.length,
      rawProjectCount: 0,
      knowledgeReadyProjectCount: seedProjects.length,
      syncCursor: 0,
      syncHealth: "unknown",
      syncFreshness: "unknown",
      lastSuccessfulSyncAt: null,
      hoursSinceSuccessfulSync: null,
      operationalStorage: await getOperationalStorageStats(env),
      metadata: seedMetadata("db_error", error)
    };
  }
}
