import assert from "node:assert/strict";
import test from "node:test";

import { runScheduledGovernance } from "../src/scheduled-governance.ts";
import { governanceRunRow, mockD1Env, syncRunRow } from "../scripts/mock-d1.mjs";

test("worker scheduled governance records the daily production health task in its UTC hour", async () => {
  const scheduledAt = new Date();
  scheduledAt.setUTCHours(1, 0, 0, 0);
  const now = scheduledAt.toISOString();
  const env = mockD1Env({
    syncRuns: [
      syncRunRow({
        id: "fresh_sync",
        trigger: "cron",
        synced_count: 5,
        failed_count: 0,
        finished_at: now
      })
    ],
    governanceRuns: [
      governanceRunRow({
        id: "derived_alternatives",
        task: "derived:alternatives",
        status: "success",
        trigger: "cron",
        finished_at: now
      })
    ]
  });

  const results = await runScheduledGovernance(env, new Date(now));

  assert.deepEqual(results, [{ task: "daily-production-health", status: "success" }]);
  const dailyRun = env.DB.prepare("").config.governanceRuns.find((run) => run.task === "daily-production-health");
  assert.equal(dailyRun.status, "success");
  assert.equal(dailyRun.trigger, "cron");
  assert.equal(dailyRun.id, `daily-production-health:${now.slice(0, 13)}`);
  assert.equal(JSON.parse(dailyRun.summary_json).runner, "cloudflare_worker");
});

test("worker scheduled governance skips non-governance hours", async () => {
  const config = {
    governanceRuns: []
  };
  const env = mockD1Env(config);

  const results = await runScheduledGovernance(env, new Date("2026-07-02T05:00:00.000Z"));

  assert.deepEqual(results, []);
  assert.equal(config.governanceRuns.length, 0);
});
