import assert from "node:assert/strict";
import test from "node:test";
import { handleApi } from "../src/api.ts";
import { buildCursorPage, pageQueryKey, PageCursorError, resolvePageOffset } from "../src/page-cursor.ts";
import { mockD1Env } from "../scripts/mock-d1.mjs";
import { seedProjects } from "../src/seed.ts";

test("REST search cursor returns stable non-overlapping pages", async () => {
  const env = mockD1Env({ knowledge: seedProjects.slice(0, 4) });
  const first = await get(env, "/api/search?limit=2&require_d1=true");
  assert.equal(first.status, 200);
  assert.equal(first.body.projects.length, 2);
  assert.equal(first.body.page.has_more, true);
  assert.ok(first.body.page.next_cursor);

  const second = await get(env, `/api/search?limit=2&require_d1=true&cursor=${encodeURIComponent(first.body.page.next_cursor)}`);
  assert.equal(second.status, 200);
  assert.equal(second.body.page.offset, 2);
  assert.equal(second.body.page.snapshot_id, first.body.page.snapshot_id);
  assert.deepEqual(
    second.body.projects.map((project) => project.repo).filter((repo) => first.body.projects.some((project) => project.repo === repo)),
    []
  );
});

test("REST cursor rejects a changed query", async () => {
  const env = mockD1Env({ knowledge: seedProjects.slice(0, 4) });
  const first = await get(env, "/api/search?limit=1&require_d1=true");
  const changed = await get(env, `/api/search?q=agent&limit=1&require_d1=true&cursor=${encodeURIComponent(first.body.page.next_cursor)}`);
  assert.equal(changed.status, 400);
  assert.equal(changed.body.error.code, "invalid_page_cursor");
});

test("page cursor is snapshot-bound and handles multilingual query keys", async () => {
  const key = await pageQueryKey("search", { q: "中文 Agent 框架", category: "agent_framework" });
  const page = buildCursorPage({ offset: 0, limit: 10, hasMore: true, snapshotId: "d1:10:now", queryKey: key });
  assert.equal(resolvePageOffset(page.nextCursor, "d1:10:now", key), 10);
  assert.throws(
    () => resolvePageOffset(page.nextCursor, "d1:11:later", key),
    (error) => error instanceof PageCursorError && error.code === "stale_page_cursor"
  );
});

async function get(env, path) {
  const response = await handleApi(new Request(`https://git.top${path}`), env);
  return { status: response.status, body: await response.json() };
}
