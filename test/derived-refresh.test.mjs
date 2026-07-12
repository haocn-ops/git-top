import assert from "node:assert/strict";
import test from "node:test";

import { refreshAlternativesIncremental } from "../src/derived-refresh.ts";
import { mockD1Env } from "../scripts/mock-d1.mjs";
import { seedProjects } from "../src/seed.ts";

test("incremental alternatives records freshness only after a complete cycle", async () => {
  const config = {
    knowledge: seedProjects.slice(0, 4),
    governanceRuns: [],
    syncState: {}
  };
  const env = mockD1Env(config);

  const first = await refreshAlternativesIncremental(env, "cron", 2);
  assert.equal(first.batch.complete, false);
  assert.equal(first.nextCursor, 2);
  assert.equal(config.syncState.alternatives_cursor, "2");
  assert.equal(config.governanceRuns.some((run) => run.task === "derived:alternatives"), false);

  const second = await refreshAlternativesIncremental(env, "cron", 2);
  assert.equal(second.batch.complete, true);
  assert.equal(second.nextCursor, 0);
  assert.equal(config.syncState.alternatives_cursor, "0");
  const completed = config.governanceRuns.find((run) => run.task === "derived:alternatives");
  assert.equal(completed.status, "success");
  assert.equal(JSON.parse(completed.summary_json).complete, true);
});

test("incremental alternatives recovers a cursor beyond a shrunken corpus", async () => {
  const config = {
    knowledge: seedProjects.slice(0, 2),
    governanceRuns: [],
    syncState: { alternatives_cursor: "999", alternatives_cycle_started_at: "2026-07-01T00:00:00Z" }
  };
  const result = await refreshAlternativesIncremental(mockD1Env(config), "cron", 1);

  assert.equal(result.batch.offset, 0);
  assert.equal(result.updated, 1);
  assert.equal(config.syncState.alternatives_cursor, "1");
});
