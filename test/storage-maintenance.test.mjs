import assert from "node:assert/strict";
import test from "node:test";

import { getOperationalStorageStats, githubCacheMaxEntries } from "../src/storage-maintenance.ts";
import { githubRequestCacheRow, mockD1Env } from "../scripts/mock-d1.mjs";

test("operational storage reports cache utilization and history counts", async () => {
  const env = mockD1Env({
    githubRequestCache: [githubRequestCacheRow(), githubRequestCacheRow({ cache_key: "/second" })],
    syncRuns: [{ id: "sync" }],
    governanceRuns: [{ id: "governance" }]
  });
  const stats = await getOperationalStorageStats(env);

  assert.equal(stats.status, "healthy");
  assert.equal(stats.githubCacheEntries, 2);
  assert.equal(stats.githubCacheMaxEntries, githubCacheMaxEntries);
  assert.ok(stats.githubCacheBodyBytes > 0);
  assert.equal(stats.syncRunCount, 1);
  assert.equal(stats.governanceRunCount, 1);
});
