import assert from "node:assert/strict";
import test from "node:test";

import { runScheduledGovernance } from "../src/scheduled-governance.ts";
import { getGovernanceSummary } from "../src/governance-store.ts";
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

test("worker scheduled governance refreshes alternatives on the weekly governance cadence", async () => {
  const now = "2026-07-06T02:00:00.000Z";
  const config = {
    governanceRuns: []
  };
  const env = mockD1Env(config);

  const results = await runScheduledGovernance(env, new Date(now));

  assert.deepEqual(results, [
    { task: "weekly-data-governance", status: "success" },
    { task: "derived:alternatives", status: "success" }
  ]);
  const weeklyRun = config.governanceRuns.find((run) => run.task === "weekly-data-governance");
  assert.equal(weeklyRun.status, "success");
  assert.equal(JSON.parse(weeklyRun.summary_json).cadence, "weekly");

  const alternativesRuns = config.governanceRuns.filter((run) => run.task === "derived:alternatives");
  assert.equal(alternativesRuns.length, 1);
  assert.equal(alternativesRuns[0].id, "derived:alternatives:2026-07-06T02");
  assert.equal(alternativesRuns[0].status, "success");
  assert.equal(JSON.parse(alternativesRuns[0].summary_json).source, "d1");
});

test("governance summary reports scheduled tasks without recent successful runs", async () => {
  const env = mockD1Env({
    governanceRuns: [
      governanceRunRow({
        id: "daily_recent",
        task: "daily-production-health",
        status: "success",
        trigger: "cron",
        finished_at: "2026-07-08T09:00:00.000Z"
      }),
      governanceRunRow({
        id: "derived_old",
        task: "derived:alternatives",
        status: "success",
        trigger: "cron",
        finished_at: "2026-06-29T10:00:00.000Z"
      })
    ]
  });

  const summary = await getGovernanceSummary(env, new Date("2026-07-08T10:00:00.000Z"));
  const missingTasks = summary.missingTasks.map((task) => task.task);

  assert.equal(missingTasks.includes("daily-production-health"), false);
  assert.equal(missingTasks.includes("derived:alternatives"), true);
  assert.equal(missingTasks.includes("weekly-data-governance"), true);
  assert.equal(summary.missingTasks.find((task) => task.task === "derived:alternatives").hoursSinceLastSuccess, 216);
});
