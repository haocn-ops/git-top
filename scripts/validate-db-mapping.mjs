import assert from "node:assert/strict";
import { getStarsDeltaSnapshot, getSyncStatus, getSyncedProjectCount } from "../src/db-sync-store.ts";
import { getHealth } from "../src/health.ts";
import { listProjectKnowledgeWithMeta } from "../src/knowledge-source.ts";
import { buildGeneratedKnowledgeFixtures } from "./eval-fixtures.mjs";
import { governanceRunRow, mockD1Env, mockD1ProjectId, syncRunRow } from "./mock-d1.mjs";

await testRowToDomainMapping();
await testGeneratedFixtureRows();
await testPaginatedKnowledgeRows();
await testLegacyOptionalColumnFallback();
await testFallbackMetadata();
await testHealthCountSemantics();
await testSyncStatusMapping();
await testStarSnapshotDelta();

console.log("Validated DB row mapping, metadata, sync status, and star snapshot logic.");

async function testRowToDomainMapping() {
  const result = await listProjectKnowledgeWithMeta(mockD1Env());
  assert.equal(result.metadata.source, "d1");
  assert.equal(result.metadata.reason, "d1_query");
  assert.equal(result.metadata.projectCount, 1);

  const knowledge = result.projects[0];
  assert.equal(knowledge.project.id, mockD1ProjectId);
  assert.equal(knowledge.project.fullName, mockD1ProjectId);
  assert.deepEqual(knowledge.project.topics, ["agents", "cloudflare", "workers"]);
  assert.equal(knowledge.agentCard.projectId, mockD1ProjectId);
  assert.equal(knowledge.agentCard.cloudflareReady, true);
  assert.deepEqual(knowledge.agentCard.deployment, ["cloudflare", "serverless", "local"]);
  assert.equal(knowledge.agentCard.classification?.category?.confidence, "high");
  assert.equal(knowledge.metrics.projectId, mockD1ProjectId);
  assert.equal(knowledge.metrics.stars30dDelta, 42);
  assert.equal(knowledge.metrics.signalConfidence?.stars30dDelta, "snapshot");
  assert.equal(knowledge.metrics.signalConfidence?.stars30dWindowDays, 30);

  const metadata = (await listProjectKnowledgeWithMeta(mockD1Env())).metadata;
  assert.equal(metadata.source, "d1");
  assert.equal(metadata.reason, "d1_query");
}

async function testGeneratedFixtureRows() {
  const generated = buildGeneratedKnowledgeFixtures().map((item) => item.knowledge);
  const result = await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: generated }));
  assert.equal(result.metadata.source, "d1");
  assert.equal(result.metadata.reason, "d1_query");
  assert.equal(result.metadata.projectCount, generated.length);
  assert.equal(result.projects.length, generated.length);

  const langfuse = result.projects.find((item) => item.project.id === "langfuse/langfuse");
  assert.ok(langfuse, "expected generated D1 fixtures to include langfuse/langfuse");
  assert.equal(langfuse.agentCard.projectKind, "project");
  assert.equal(langfuse.agentCard.category, "ai_observability");
  assert.equal(langfuse.agentCard.classification?.category?.confidence, "high");
  assert.equal(langfuse.metrics.signalConfidence?.commits30d, "complete");

  const awesomeApps = result.projects.find((item) => item.project.id === "Shubhamsaboo/awesome-llm-apps");
  assert.ok(awesomeApps, "expected generated D1 fixtures to include Shubhamsaboo/awesome-llm-apps");
  assert.equal(awesomeApps.agentCard.projectKind, "collection");
  assert.equal(awesomeApps.agentCard.collectionMetadata?.scope, "awesome_list");
  assert.equal(awesomeApps.agentCard.collectionMetadata?.freshness, "active");
}

async function testPaginatedKnowledgeRows() {
  const base = buildGeneratedKnowledgeFixtures().map((item) => item.knowledge);
  const paged = Array.from({ length: 505 }, (_, index) => cloneKnowledge(base[index % base.length], `mock/paged-${index}`));
  const result = await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: paged }));
  assert.equal(result.metadata.source, "d1");
  assert.equal(result.metadata.projectCount, 505);
  assert.equal(result.metadata.loadedProjectLimit, 2000);
  assert.equal(result.metadata.truncated, false);
  assert.equal(result.projects.length, 505);

  const overflow = Array.from({ length: 2001 }, (_, index) => cloneKnowledge(base[index % base.length], `mock/overflow-${index}`));
  const overflowResult = await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: overflow }));
  assert.equal(overflowResult.metadata.projectCount, 2000);
  assert.equal(overflowResult.metadata.loadedProjectLimit, 2000);
  assert.equal(overflowResult.metadata.truncated, true);
  assert.ok(overflowResult.metadata.warnings?.[0].includes("project load limit"));
  assert.equal(overflowResult.projects.length, 2000);
}

function cloneKnowledge(template, id) {
  const [owner, name] = id.split("/");
  return {
    project: {
      ...template.project,
      id,
      owner,
      name,
      fullName: id,
      githubUrl: `https://github.com/${id}`
    },
    agentCard: {
      ...template.agentCard,
      projectId: id
    },
    metrics: {
      ...template.metrics,
      projectId: id
    }
  };
}

async function testLegacyOptionalColumnFallback() {
  const result = await listProjectKnowledgeWithMeta(mockD1Env("missing_optional_columns"));
  assert.equal(result.metadata.source, "d1");
  assert.equal(result.metadata.reason, "d1_query");

  const knowledge = result.projects[0];
  assert.equal(knowledge.agentCard.projectKind, "project");
  assert.equal(knowledge.agentCard.collectionMetadata, undefined);
  assert.equal(knowledge.agentCard.classification?.category, undefined);
  assert.deepEqual(knowledge.metrics.signalConfidence, {});
  assert.equal(knowledge.metrics.calculatedAt, "2026-06-20T00:00:00Z");
}

async function testFallbackMetadata() {
  const missing = await listProjectKnowledgeWithMeta({});
  assert.equal(missing.metadata.source, "seed");
  assert.equal(missing.metadata.reason, "db_missing");
  assert.ok(missing.metadata.warnings?.[0].includes("D1 binding is missing"));

  const empty = await listProjectKnowledgeWithMeta(mockD1Env("empty"));
  assert.equal(empty.metadata.source, "seed");
  assert.equal(empty.metadata.reason, "db_empty");
  assert.ok(empty.metadata.warnings?.[0].includes("D1 contains no indexed projects"));

  const failed = await listProjectKnowledgeWithMeta(mockD1Env("error"));
  assert.equal(failed.metadata.source, "seed");
  assert.equal(failed.metadata.reason, "db_error");
  assert.equal(failed.metadata.error, "mock d1 failure");
}

async function testHealthCountSemantics() {
  const missing = await getHealth({});
  assert.equal(missing.projectCount, missing.knowledgeReadyProjectCount);
  assert.equal(missing.rawProjectCount, 0);

  const d1 = await getHealth(mockD1Env());
  assert.equal(d1.projectCount, 1);
  assert.equal(d1.rawProjectCount, 1);
  assert.equal(d1.knowledgeReadyProjectCount, 1);
  assert.equal(d1.metadata.projectCount, 1);

  const mismatch = await getHealth(mockD1Env({ rawProjectCount: 2 }));
  assert.equal(mismatch.projectCount, 1);
  assert.equal(mismatch.rawProjectCount, 2);
  assert.equal(mismatch.knowledgeReadyProjectCount, 1);
  assert.ok(mismatch.metadata.warnings?.[0].includes("missing complete Agent Card or metric knowledge"));
}

async function testSyncStatusMapping() {
  const nowMs = Date.now();
  const latestFailedAt = new Date(nowMs - 60 * 60 * 1000).toISOString();
  const previousSuccessAt = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
  const derivedSuccessAt = new Date(nowMs - 60 * 60 * 1000).toISOString();
  const derivedFailedAt = new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();
  const status = await getSyncStatus(
    mockD1Env({
      cursor: 3,
      syncRuns: [
        syncRunRow({
          id: "latest_failed",
          synced_count: 0,
          failed_count: 1,
          finished_at: latestFailedAt,
          failed_json: JSON.stringify([{ repository: mockD1ProjectId, error: "rate limited" }])
        }),
        syncRunRow({
          id: "previous_success",
          synced_count: 2,
          failed_count: 0,
          finished_at: previousSuccessAt
        })
      ],
      governanceRuns: [
        governanceRunRow({
          id: "derived_old",
          task: "derived:alternatives",
          status: "failed",
          trigger: "admin",
          started_at: derivedFailedAt,
          finished_at: derivedFailedAt
        }),
        governanceRunRow({
          id: "derived_alternatives",
          task: "derived:alternatives",
          status: "success",
          trigger: "admin",
          started_at: derivedSuccessAt,
          finished_at: derivedSuccessAt
        })
      ]
    }),
    [mockD1ProjectId, "b/b", "c/c", "d/d", "e/e", "f/f"]
  );

  assert.equal(status.cursor, 3);
  assert.equal(status.health, "degraded");
  assert.equal(status.syncedCount, 1);
  assert.equal(status.indexedCount, 1);
  assert.equal(status.lastSuccessfulSyncAt, previousSuccessAt);
  assert.equal(typeof status.hoursSinceSuccessfulSync, "number");
  assert.equal(status.lastFailedSyncAt, latestFailedAt);
  assert.equal(status.lastError?.repository, mockD1ProjectId);
  assert.equal(status.nextBatchWraps, true);
  assert.deepEqual(status.nextBatch, ["d/d", "e/e", "f/f", mockD1ProjectId, "b/b"]);
  assert.equal(status.derived.alternatives.freshness, "fresh");
  assert.equal(status.derived.alternatives.lastRunStatus, "success");
  assert.equal(status.derived.alternatives.lastSuccessfulRunAt, derivedSuccessAt);

  const overflowKnowledge = buildGeneratedKnowledgeFixtures()
    .slice(0, 3)
    .map((item) => item.knowledge);
  const overflowStatus = await getSyncStatus(mockD1Env({ knowledge: overflowKnowledge }), [
    overflowKnowledge[0].project.id,
    "missing/seed-repo"
  ]);
  assert.equal(overflowStatus.indexedCount, 3);
  assert.equal(overflowStatus.syncedCount, 1);
  assert.equal(overflowStatus.remainingCount, 1);
  assert.equal(overflowStatus.nextBatchWraps, false);
  assert.deepEqual(overflowStatus.nextBatch, [overflowKnowledge[0].project.id, "missing/seed-repo"]);

  const emptyStatus = await getSyncStatus(mockD1Env("empty"), [mockD1ProjectId]);
  assert.equal(emptyStatus.syncedCount, 0);
  assert.ok(emptyStatus.priority && emptyStatus.priority.counts.hot + emptyStatus.priority.counts.warm + emptyStatus.priority.counts.cold > 0);

  assert.equal(await getSyncedProjectCount(mockD1Env()), 1);
}

async function testStarSnapshotDelta() {
  const snapshot = await getStarsDeltaSnapshot(
    mockD1Env({
      starSnapshot: {
        stars: 1000,
        captured_at: "2026-05-21T00:00:00Z"
      }
    }),
    mockD1ProjectId,
    1234,
    "2026-06-20T00:00:00Z"
  );

  assert.deepEqual(snapshot, {
    delta: 234,
    windowDays: 30
  });

  const missing = await getStarsDeltaSnapshot(mockD1Env(), mockD1ProjectId, 1234, "2026-06-20T00:00:00Z");
  assert.equal(missing, null);
}
