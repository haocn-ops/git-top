import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { collectionFreshness } from "../src/cards.ts";
import { classifySyncPriority } from "../src/sync-priority.ts";
import { shouldRunScheduledCandidateDiscovery } from "../src/sync-policy.ts";
import { seedProjects } from "../src/seed.ts";
import { prioritizeRepositories } from "../scripts/preventive-maintenance-policy.mjs";
import { upsertProjectKnowledge } from "../src/db-write-store.ts";

test("priority refresh enters the queue six hours before the tier deadline", () => {
  const now = "2026-07-15T12:00:00.000Z";
  const project = structuredClone(seedProjects[0]);
  project.metrics.signalConfidence = { stars30dDelta: "estimated" };
  project.metrics.stars30dDelta = 0;
  project.metrics.gitScore = 70;
  project.project.stars = 5_000;
  project.agentCard.cloudflareReady = false;
  project.agentCard.category = "llm_gateway";

  project.project.syncedAt = "2026-07-08T18:01:00.000Z";
  const beforeLeadWindow = classifySyncPriority(project, now);
  assert.equal(beforeLeadWindow.tier, "warm");
  assert.equal(beforeLeadWindow.refreshDue, false);
  assert.equal(beforeLeadWindow.overdue, false);

  project.project.syncedAt = "2026-07-08T18:00:00.000Z";
  const dueSoon = classifySyncPriority(project, now);
  assert.equal(dueSoon.ageHours, 162);
  assert.equal(dueSoon.refreshDue, true);
  assert.equal(dueSoon.overdue, false);

  project.project.syncedAt = "2026-07-08T10:59:00.000Z";
  const overdue = classifySyncPriority(project, now);
  assert.equal(overdue.refreshDue, true);
  assert.equal(overdue.overdue, true);
});

test("cold projects refresh before the shared seven-day quality deadline", () => {
  const now = "2026-07-15T12:00:00.000Z";
  const project = structuredClone(seedProjects[0]);
  project.metrics.signalConfidence = { stars30dDelta: "estimated" };
  project.metrics.stars30dDelta = 0;
  project.metrics.gitScore = 20;
  project.project.stars = 100;
  project.agentCard.cloudflareReady = false;
  project.agentCard.category = "other";
  project.project.syncedAt = "2026-07-08T18:00:00.000Z";

  const dueSoon = classifySyncPriority(project, now);
  assert.equal(dueSoon.tier, "cold");
  assert.equal(dueSoon.targetIntervalDays, 7);
  assert.equal(dueSoon.refreshDue, true);
  assert.equal(dueSoon.overdue, false);
});

test("candidate discovery yields to refresh backlog and runs once daily", () => {
  assert.equal(shouldRunScheduledCandidateDiscovery({ hourUtc: 0, overdueCount: 0, refreshDueCount: 0, capacityHeadroom: 30 }), true);
  assert.equal(shouldRunScheduledCandidateDiscovery({ hourUtc: 1, overdueCount: 0, refreshDueCount: 0, capacityHeadroom: 30 }), false);
  assert.equal(shouldRunScheduledCandidateDiscovery({ hourUtc: 0, overdueCount: 1, refreshDueCount: 1, capacityHeadroom: 30 }), false);
  assert.equal(shouldRunScheduledCandidateDiscovery({ hourUtc: 0, overdueCount: 0, refreshDueCount: 7, capacityHeadroom: 30 }), false);
  assert.equal(shouldRunScheduledCandidateDiscovery({ hourUtc: 0, overdueCount: 0, refreshDueCount: 0, capacityHeadroom: 23 }), false);
});

test("scheduled maintenance treats empty workflow inputs as defaults", () => {
  const result = spawnSync(process.execPath, ["scripts/run-prod-preventive-maintenance.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      SYNC_SECRET: "",
      GIT_TOP_ALTERNATIVES_BATCH_SIZE: "",
      GIT_TOP_PREVENTIVE_REFRESH_LIMIT: ""
    }
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SYNC_SECRET is required/);
  assert.doesNotMatch(result.stderr, /must be an integer/);
});

test("preventive maintenance prioritizes quality-stale projects before the broader due queue", () => {
  assert.deepEqual(
    prioritizeRepositories(["stale/a", "stale/b"], ["due/a", "stale/a", "due/b"], 3),
    ["stale/a", "stale/b", "due/a"]
  );
});

test("raw knowledge sync preserves existing derived alternatives", async () => {
  const prepared = [];
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            const statement = { sql, values };
            prepared.push(statement);
            return statement;
          }
        };
      },
      async batch() {
        return [];
      }
    }
  };

  await upsertProjectKnowledge(env, structuredClone(seedProjects[0]));
  const agentCardUpsert = prepared.find((statement) => statement.sql.includes("INSERT INTO agent_cards"));
  assert.ok(agentCardUpsert);
  assert.match(agentCardUpsert.sql, /alternatives_json = agent_cards\.alternatives_json/);
  assert.doesNotMatch(agentCardUpsert.sql, /alternatives_json = excluded\.alternatives_json/);
});

test("collection freshness uses repository push activity before declaring stale", () => {
  const now = "2026-07-15T12:00:00.000Z";
  const signals = {
    readmeText: "curated list",
    files: ["README.md"],
    commits30d: 0,
    releases180d: 0,
    contributors90d: 0,
    issueFirstResponseMedianHours: null
  };
  const repo = {
    pushed_at: "2026-06-15T12:00:00.000Z"
  };

  assert.equal(collectionFreshness(repo, signals, now), "active");
  repo.pushed_at = "2026-03-01T12:00:00.000Z";
  assert.equal(collectionFreshness(repo, signals, now), "unknown");
  repo.pushed_at = "2025-12-01T12:00:00.000Z";
  assert.equal(collectionFreshness(repo, signals, now), "stale");
});
