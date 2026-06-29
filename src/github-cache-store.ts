import type { Env } from "./types";

export interface GithubRequestCacheEntry {
  cacheKey: string;
  etag: string | null;
  lastModified: string | null;
  bodyJson: string;
  status: number;
  checkedAt: string;
  updatedAt: string;
}

export async function getGithubRequestCache(env: Env, cacheKey: string): Promise<GithubRequestCacheEntry | null> {
  if (!env.DB) {
    return null;
  }

  try {
    const row = await env.DB.prepare(
      `SELECT cache_key, etag, last_modified, body_json, status, checked_at, updated_at
       FROM github_request_cache
       WHERE cache_key = ?`
    )
      .bind(cacheKey)
      .first<GithubRequestCacheRow>();
    return row ? rowToCacheEntry(row) : null;
  } catch {
    return null;
  }
}

export async function upsertGithubRequestCache(
  env: Env,
  input: {
    cacheKey: string;
    etag: string | null;
    lastModified: string | null;
    bodyJson: string;
    status: number;
    nowIso?: string;
  }
): Promise<void> {
  if (!env.DB) {
    return;
  }

  const now = input.nowIso ?? new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO github_request_cache (
        cache_key, etag, last_modified, body_json, status, checked_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        etag = excluded.etag,
        last_modified = excluded.last_modified,
        body_json = excluded.body_json,
        status = excluded.status,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at`
    )
      .bind(input.cacheKey, input.etag, input.lastModified, input.bodyJson, input.status, now, now)
      .run();
  } catch {
    // Cache writes are best-effort so schema rollout never blocks sync.
  }
}

export async function touchGithubRequestCache(env: Env, cacheKey: string, nowIso = new Date().toISOString()): Promise<void> {
  if (!env.DB) {
    return;
  }

  try {
    await env.DB.prepare("UPDATE github_request_cache SET checked_at = ? WHERE cache_key = ?").bind(nowIso, cacheKey).run();
  } catch {
    // Cache writes are best-effort so schema rollout never blocks sync.
  }
}

interface GithubRequestCacheRow {
  cache_key: string;
  etag: string | null;
  last_modified: string | null;
  body_json: string;
  status: number;
  checked_at: string;
  updated_at: string;
}

function rowToCacheEntry(row: GithubRequestCacheRow): GithubRequestCacheEntry {
  return {
    cacheKey: row.cache_key,
    etag: row.etag,
    lastModified: row.last_modified,
    bodyJson: row.body_json,
    status: row.status,
    checkedAt: row.checked_at,
    updatedAt: row.updated_at
  };
}
