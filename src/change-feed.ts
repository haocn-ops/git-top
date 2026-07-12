import type { Env } from "./types";
import { getSyncStateValue } from "./db-sync-store";

export const projectChangeRetentionDays = 30;
export const maxProjectChangesPageSize = 100;

export interface ProjectChange {
  cursor: string;
  project_id: string;
  change_type: "added" | "updated" | "classification_changed" | "score_changed" | "deleted";
  changed_fields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
  tombstone: boolean;
}

interface ProjectChangeRow {
  id: number;
  project_id: string;
  change_type: ProjectChange["change_type"];
  changed_fields_json: string;
  before_json: string | null;
  after_json: string | null;
  occurred_at: string;
}

export async function listProjectChanges(
  env: Env,
  options: { cursor?: string; since?: string; limit?: number } = {}
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is required for the project change feed.");
  }
  const afterId = options.cursor ? decodeChangeCursor(options.cursor) : 0;
  const since = normalizeSince(options.since);
  const limit = Math.max(1, Math.min(maxProjectChangesPageSize, Math.trunc(options.limit ?? 50)));
  const [rows, feedStartedAt] = await Promise.all([
    env.DB.prepare(
      `SELECT id, project_id, change_type, changed_fields_json, before_json, after_json, occurred_at
       FROM project_changes
       WHERE id > ? AND (? IS NULL OR occurred_at >= ?)
       ORDER BY id ASC
       LIMIT ?`
    ).bind(afterId, since, since, limit + 1).all<ProjectChangeRow>(),
    getSyncStateValue(env, "project_change_feed_started_at")
  ]);
  const pageRows = (rows.results ?? []).slice(0, limit);
  const hasMore = (rows.results ?? []).length > limit;
  const changes = pageRows.map(toProjectChange);
  const lastId = pageRows.at(-1)?.id ?? afterId;
  return {
    changes,
    page: {
      limit,
      has_more: hasMore,
      next_cursor: encodeChangeCursor(lastId)
    },
    retention: {
      days: projectChangeRetentionDays,
      earliest_guaranteed_at: retentionFloor(feedStartedAt)
    }
  };
}

function retentionFloor(feedStartedAt: string | null): string {
  const retentionStartedAt = Date.now() - projectChangeRetentionDays * 86_400_000;
  const initializedAt = feedStartedAt ? Date.parse(feedStartedAt) : Number.NaN;
  return new Date(Number.isFinite(initializedAt) ? Math.max(retentionStartedAt, initializedAt) : Date.now()).toISOString();
}

export function encodeChangeCursor(id: number): string {
  return btoa(`v1:${Math.max(0, Math.trunc(id))}`).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodeChangeCursor(cursor: string): number {
  try {
    const normalized = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const value = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const match = value.match(/^v1:(\d+)$/u);
    if (!match) {
      throw new Error("invalid cursor");
    }
    return Number(match[1]);
  } catch {
    throw new Error("cursor must be a valid Git.Top change-feed cursor.");
  }
}

function normalizeSince(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error("since must be an ISO-8601 timestamp.");
  }
  return new Date(timestamp).toISOString();
}

function toProjectChange(row: ProjectChangeRow): ProjectChange {
  return {
    cursor: encodeChangeCursor(row.id),
    project_id: row.project_id,
    change_type: row.change_type,
    changed_fields: parseJson<unknown[]>(row.changed_fields_json, []).filter((value): value is string => typeof value === "string"),
    before: parseJson(row.before_json, null),
    after: parseJson(row.after_json, null),
    occurred_at: row.occurred_at,
    tombstone: row.change_type === "deleted"
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
