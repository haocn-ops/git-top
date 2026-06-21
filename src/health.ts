import { getSyncCursor, listSyncRuns } from "./db-sync-store";
import { getKnowledgeReadyProjectCount, seedMetadata } from "./knowledge-source";
import { seedProjects } from "./seed";
import { syncFreshness, syncHealth } from "./sync-status";
import type { KnowledgeMetadata } from "./knowledge-source";
import type { Env } from "./types";

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
      metadata: seedMetadata("db_missing")
    };
  }

  try {
    const [rawCountRow, knowledgeReadyCount, cursor, recentRuns] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>(),
      getKnowledgeReadyProjectCount(env),
      getSyncCursor(env),
      listSyncRuns(env, 10)
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
      metadata:
        knowledgeReadyCount > 0
          ? {
              source: "d1",
              reason: "d1_query",
              projectCount: knowledgeReadyCount,
              generatedAt: new Date().toISOString(),
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
      metadata: seedMetadata("db_error", error)
    };
  }
}
