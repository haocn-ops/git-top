import type { Env } from "./types";

export const githubCacheMaxBodyBytes = 64 * 1024;
export const githubCacheMaxEntries = 2500;

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
    ).bind(githubCacheMaxEntries),
    env.DB.prepare("DELETE FROM star_snapshots WHERE captured_at < datetime('now', '-45 days')"),
    env.DB.prepare("DELETE FROM sync_runs WHERE started_at < datetime('now', '-30 days')"),
    env.DB.prepare("DELETE FROM governance_runs WHERE started_at < datetime('now', '-180 days')")
  ]);
}
