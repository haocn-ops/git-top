export interface PageCursorState {
  snapshotId: string;
  queryKey: string;
  offset: number;
}

export interface CursorPage {
  offset: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  snapshotId: string;
}

export class PageCursorError extends Error {
  readonly code: "invalid_page_cursor" | "stale_page_cursor";

  constructor(
    message: string,
    code: "invalid_page_cursor" | "stale_page_cursor"
  ) {
    super(message);
    this.code = code;
  }
}

export async function pageQueryKey(scope: string, input: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify({ scope, input: canonicalize(input) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export function resolvePageOffset(cursor: string | undefined, snapshotId: string, queryKey: string): number {
  if (!cursor) {
    return 0;
  }
  const state = decodePageCursor(cursor);
  if (state.snapshotId !== snapshotId) {
    throw new PageCursorError("The corpus snapshot changed. Restart pagination without a cursor.", "stale_page_cursor");
  }
  if (state.queryKey !== queryKey) {
    throw new PageCursorError("The cursor belongs to a different query or list surface.", "invalid_page_cursor");
  }
  return state.offset;
}

export function buildCursorPage(input: {
  offset: number;
  limit: number;
  hasMore: boolean;
  snapshotId: string;
  queryKey: string;
}): CursorPage {
  return {
    offset: input.offset,
    limit: input.limit,
    hasMore: input.hasMore,
    nextCursor: input.hasMore
      ? encodePageCursor({ snapshotId: input.snapshotId, queryKey: input.queryKey, offset: input.offset + input.limit })
      : null,
    snapshotId: input.snapshotId
  };
}

export function encodePageCursor(state: PageCursorState): string {
  const payload = JSON.stringify({ v: 1, s: state.snapshotId, q: state.queryKey, o: Math.max(0, Math.trunc(state.offset)) });
  return btoa(payload).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodePageCursor(cursor: string): PageCursorState {
  try {
    const normalized = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as Record<string, unknown>;
    if (payload.v !== 1 || typeof payload.s !== "string" || typeof payload.q !== "string" || !Number.isInteger(payload.o) || Number(payload.o) < 0) {
      throw new Error("invalid cursor payload");
    }
    return { snapshotId: payload.s, queryKey: payload.q, offset: Number(payload.o) };
  } catch {
    throw new PageCursorError("cursor must be a valid Git.Top list cursor.", "invalid_page_cursor");
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}
