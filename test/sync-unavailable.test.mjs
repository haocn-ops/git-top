import assert from "node:assert/strict";
import test from "node:test";
import { defaultSeedRepositories } from "../src/github.ts";
import { syncHealth } from "../src/sync-status.ts";
import { syncGithubProjects } from "../src/sync.ts";
import { mockD1Env } from "../scripts/mock-d1.mjs";

test("sync retires discovery-backed GitHub 404 projects without degrading the run", async () => {
  const unavailableRepository = "discovery/missing-project";
  const candidateRepositories = [
    {
      repository: unavailableRepository,
      status: "synced",
      last_error: null
    }
  ];
  const env = mockD1Env({ candidateRepositories });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "Not Found" }, { status: 404 });

  try {
    const result = await syncGithubProjects(env, {
      repositories: [unavailableRepository],
      limit: 1,
      trigger: "admin",
      signalDepth: "lite",
      refreshDerived: false
    });

    assert.deepEqual(result.synced, []);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.unavailable, [{ repository: unavailableRepository, reason: "github_not_found" }]);
    assert.equal(candidateRepositories[0].status, "unavailable");
    assert.match(candidateRepositories[0].last_error, /GitHub API 404/);

    const seedResult = await syncGithubProjects(env, {
      repositories: [defaultSeedRepositories[0]],
      limit: 1,
      trigger: "admin",
      signalDepth: "lite",
      refreshDerived: false
    });
    assert.deepEqual(seedResult.unavailable, []);
    assert.equal(seedResult.failed.length, 1);
    assert.match(seedResult.failed[0].error, /GitHub API 404/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a completed sync run with no failures is healthy even when it only retired unavailable data", () => {
  assert.equal(syncHealth([{ syncedCount: 0, failedCount: 0 }]), "healthy");
  assert.equal(syncHealth([{ syncedCount: 0, failedCount: 1 }]), "degraded");
});
