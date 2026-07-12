import { projectChangeRetentionDays } from "./change-feed";
import type { Env } from "./types";

export const githubCacheMaxBodyBytes = 64 * 1024;
export const githubCacheMaxEntries = 2500;
export const githubCacheRetentionEntries = 1500;
export const githubCacheTotalBodyBudgetBytes = githubCacheMaxEntries * githubCacheMaxBodyBytes;

export interface OperationalStorageStats {
  status: "healthy" | "warning" | "critical" | "unknown";
  githubCacheEntries: number;
  githubCacheBodyBytes: number;
  githubCacheMaxEntries: number;
  githubCacheRetentionEntries: number;
  githubCacheBodyBudgetBytes: number;
  utilization: number;
  starSnapshotCount: number;
  syncRunCount: number;
  governanceRunCount: number;
  projectChangeCount: number;
  feedbackProposalCount: number;
}

export async function getOperationalStorageStats(env: Env): Promise<OperationalStorageStats> {
  if (!env.DB) {
    return emptyOperationalStorageStats("unknown");
  }

  try {
    const row = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM github_request_cache) AS cache_entries,
        (SELECT COALESCE(SUM(length(CAST(body_json AS BLOB))), 0) FROM github_request_cache) AS cache_body_bytes,
        (SELECT COUNT(*) FROM star_snapshots) AS star_snapshot_count,
        (SELECT COUNT(*) FROM sync_runs) AS sync_run_count,
        (SELECT COUNT(*) FROM governance_runs) AS governance_run_count,
        (SELECT COUNT(*) FROM project_changes) AS project_change_count,
        (SELECT COUNT(*) FROM feedback_proposals WHERE status = 'proposed') AS feedback_proposal_count`
    ).first<{
      cache_entries: number;
      cache_body_bytes: number;
      star_snapshot_count: number;
      sync_run_count: number;
      governance_run_count: number;
      project_change_count: number;
      feedback_proposal_count: number;
    }>();
    const githubCacheEntries = Number(row?.cache_entries ?? 0);
    const githubCacheBodyBytes = Number(row?.cache_body_bytes ?? 0);
    const utilization = Math.max(
      githubCacheEntries / githubCacheMaxEntries,
      githubCacheBodyBytes / githubCacheTotalBodyBudgetBytes
    );
    return {
      status: utilization >= 0.85 ? "critical" : utilization >= 0.7 ? "warning" : "healthy",
      githubCacheEntries,
      githubCacheBodyBytes,
      githubCacheMaxEntries,
      githubCacheRetentionEntries,
      githubCacheBodyBudgetBytes: githubCacheTotalBodyBudgetBytes,
      utilization: Math.round(utilization * 1000) / 1000,
      starSnapshotCount: Number(row?.star_snapshot_count ?? 0),
      syncRunCount: Number(row?.sync_run_count ?? 0),
      governanceRunCount: Number(row?.governance_run_count ?? 0),
      projectChangeCount: Number(row?.project_change_count ?? 0),
      feedbackProposalCount: Number(row?.feedback_proposal_count ?? 0)
    };
  } catch {
    return emptyOperationalStorageStats("unknown");
  }
}

export async function pruneOperationalData(env: Env): Promise<void> {
  if (!env.DB) {
    return;
  }

  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM github_request_cache
       WHERE length(CAST(body_json AS BLOB)) > ?
          OR checked_at < datetime('now', '-14 days')`
    ).bind(githubCacheMaxBodyBytes),
    env.DB.prepare(
      `DELETE FROM github_request_cache
       WHERE cache_key NOT IN (
         SELECT cache_key
         FROM github_request_cache
         ORDER BY checked_at DESC
         LIMIT ?
       )`
    ).bind(githubCacheRetentionEntries),
    env.DB.prepare("DELETE FROM star_snapshots WHERE captured_at < datetime('now', '-45 days')"),
    env.DB.prepare("DELETE FROM sync_runs WHERE started_at < datetime('now', '-30 days')"),
    env.DB.prepare("DELETE FROM governance_runs WHERE started_at < datetime('now', '-180 days')"),
    env.DB.prepare(`DELETE FROM project_changes WHERE occurred_at < datetime('now', '-${projectChangeRetentionDays} days')`),
    env.DB.prepare("DELETE FROM feedback_proposals WHERE status != 'proposed' AND updated_at < datetime('now', '-365 days')")
  ]);
}

function emptyOperationalStorageStats(status: OperationalStorageStats["status"]): OperationalStorageStats {
  return {
    status,
    githubCacheEntries: 0,
    githubCacheBodyBytes: 0,
    githubCacheMaxEntries,
    githubCacheRetentionEntries,
    githubCacheBodyBudgetBytes: githubCacheTotalBodyBudgetBytes,
    utilization: 0,
    starSnapshotCount: 0,
    syncRunCount: 0,
    governanceRunCount: 0,
    projectChangeCount: 0,
    feedbackProposalCount: 0
  };
}
