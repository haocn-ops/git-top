import assert from "node:assert/strict";
import { handleApi } from "../src/api.ts";
import { openApiDocument } from "../src/openapi.ts";
import { mockD1Env, mockD1ProjectId, syncRunRow } from "./mock-d1.mjs";

const env = {};

await testSeedMetadata();
await testSearchAndProjectRoutes();
await testRecommendationAndCompareRoutes();
await testGraphAndQualityRoutes();
await testSchemaRoutes();
await testOpenApiDocument();
await testMethodAndBodyValidation();
await testMockD1Source();
await testRequireD1Mode();
await testD1FallbackReasons();
await testSyncStatusWithMockD1();
await testClassificationOverridesWithMockD1();

console.log("Validated API route behavior with seed and mocked D1 data sources.");

async function testSeedMetadata() {
  const health = await getJson("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.db, "missing");
  assert.equal(health.body.raw_project_count, 0);
  assert.equal(health.body.knowledge_ready_project_count, health.body.project_count);
  assert.equal(health.body.sync_health, "unknown");
  assert.equal(health.body.sync_freshness, "unknown");
  assert.equal(health.body.last_successful_sync_at, null);
  assert.equal(health.body.hours_since_successful_sync, null);
  assertMetadata(health.body.metadata, "db_missing");

  const trending = await getJson("/api/trending?limit=2");
  assert.equal(trending.status, 200);
  assert.equal(trending.body.projects.length, 2);
  assertMetadata(trending.body.metadata, "db_missing");
}

async function testSearchAndProjectRoutes() {
  const search = await getJson("/api/search?q=cloudflare&limit=3");
  assert.equal(search.status, 200);
  assert.equal(search.body.query.q, "cloudflare");
  assert.ok(search.body.projects.length > 0, "search should return at least one seed project");
  assertMetadata(search.body.metadata, "db_missing");

  const browseSearch = await getJson("/api/search?q=agent%20framework&category=agent_framework&deployment=cloudflare&ranking=browse&limit=8");
  assert.equal(browseSearch.status, 200);
  assert.equal(browseSearch.body.query.ranking, "browse");
  assert.ok(browseSearch.body.projects.length > 0, "browse search should return seed projects");
  assert.ok(browseSearch.body.projects.length <= 8, "browse search should honor the limit");
  assertMetadata(browseSearch.body.metadata, "db_missing");

  const project = await getJson("/api/project/cloudflare/agents");
  assert.equal(project.status, 200);
  assert.equal(project.body.repo, "cloudflare/agents");
  assert.equal(project.body.knowledge.project.full_name, "cloudflare/agents");
  assert.equal(project.body.classification.category.confidence, "low");
  assert.equal(project.body.quality_signal_confidence.stars_30d_delta, "estimated");
  assertMetadata(project.body.metadata, "db_missing");

  const encodedProject = await getJson(`/api/project/${encodeURIComponent("cloudflare/agents")}`);
  assert.equal(encodedProject.status, 200);
  assert.equal(encodedProject.body.repo, "cloudflare/agents");

  const missing = await getJson("/api/project/not-a-real/project");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, "project_not_found");
}

async function testRecommendationAndCompareRoutes() {
  const recommend = await getJson("/api/recommend?deployment=cloudflare&cloudflare_ready=true&limit=3");
  assert.equal(recommend.status, 200);
  assert.ok(Array.isArray(recommend.body.recommendations));
  assert.ok(recommend.body.recommendations.length > 0, "recommend should return seed recommendations");
  assertMetadata(recommend.body.metadata, "db_missing");

  const compare = await getJson("/api/compare?repos=cloudflare/agents,run-llama/llama_index&deployment=cloudflare");
  assert.equal(compare.status, 200);
  assert.ok(compare.body.projects.length >= 1);
  assert.equal(compare.body.context.deployment, "cloudflare");
  assertMetadata(compare.body.metadata, "db_missing");
}

async function testGraphAndQualityRoutes() {
  const graph = await getJson("/api/graph?repo=cloudflare/agents&limit=8");
  assert.equal(graph.status, 200);
  assert.equal(graph.body.focus, "cloudflare/agents");
  assert.ok(graph.body.nodes.length > 0);
  assertMetadata(graph.body.metadata, "db_missing");

  const quality = await getJson("/api/quality");
  assert.equal(quality.status, 200);
  assert.ok(typeof quality.body.score === "number");
  assert.ok(["low", "medium", "high"].includes(quality.body.risk_level));
  assert.equal(quality.body.risk_summary.level, quality.body.risk_level);
  assert.ok(Array.isArray(quality.body.risk_summary.reasons));
  assert.ok(typeof quality.body.risk_summary.low_confidence_classification_rate === "number");
  assert.ok(typeof quality.body.coverage.covered_categories === "number");
  assert.ok(Array.isArray(quality.body.coverage.missing_categories));
  assert.ok(typeof quality.body.coverage.collection_count === "number");
  assert.ok(typeof quality.body.coverage.collection_rate === "number");
  assert.ok(typeof quality.body.coverage.collection_scope_counts.awesome_list === "number");
  assert.ok(typeof quality.body.coverage.collection_freshness_counts.active === "number");
  assert.ok(typeof quality.body.coverage.stale_collection_count === "number");
  assert.ok(typeof quality.body.coverage.collection_review_count === "number");
  assertMetadata(quality.body.metadata, "db_missing");

  const review = await getJson("/api/quality/review");
  assert.equal(review.status, 200);
  assert.ok(typeof review.body.project_count === "number");
  assert.ok(typeof review.body.review_count === "number");
  assert.ok(typeof review.body.low_signal_count === "number");
  assert.ok(typeof review.body.medium_signal_count === "number");
  assert.ok(Array.isArray(review.body.items));
  assert.ok(review.body.category_counts && typeof review.body.category_counts === "object");
  assertMetadata(review.body.metadata, "db_missing");
}

async function testSchemaRoutes() {
  const agentCardSchema = await getJson("/api/schema/agent-card.v1");
  assert.equal(agentCardSchema.status, 200);
  assert.equal(agentCardSchema.body.$id, "https://git.top/schemas/agent-card.v1.json");
  assert.deepEqual(agentCardSchema.body.properties.project_kind.enum, ["project", "collection"]);
  assert.equal(agentCardSchema.body.properties.collection_metadata.$ref, "#/$defs/collection_metadata");
  assert.equal(agentCardSchema.body.properties.classification.type, "object");

  const projectKnowledgeSchema = await getJson("/api/schema/project-knowledge.v1");
  assert.equal(projectKnowledgeSchema.status, 200);
  assert.equal(projectKnowledgeSchema.body.$id, "https://git.top/schemas/project-knowledge.v1.json");
  assert.ok(projectKnowledgeSchema.body.required.includes("agent_card"));
  assert.equal(projectKnowledgeSchema.body.properties.agent_card.$id, "https://git.top/schemas/agent-card.v1.json");

  const projectSchema = await getJson("/api/schema/project.v2");
  assert.equal(projectSchema.status, 200);
  assert.equal(projectSchema.body.$id, "https://git.top/schemas/project.v2.json");
  assert.deepEqual(projectSchema.body.properties.project_kind.enum, ["project", "collection"]);
  assert.equal(projectSchema.body.properties.collection_metadata.$ref, "#/$defs/collection_metadata");
  assert.equal(projectSchema.body.properties.quality_signal_confidence.type, "object");
}

async function testOpenApiDocument() {
  const openapi = await getJson("/api/openapi.json");
  assert.equal(openapi.status, 200);
  assert.equal(openapi.body.openapi, "3.1.0");
  assert.ok(openapi.body.paths["/api/quality"], "OpenAPI should document quality report endpoint");
  assert.ok(openapi.body.paths["/api/quality/review"], "OpenAPI should document quality review endpoint");
  assert.ok(openapi.body.paths["/api/admin/classification-overrides"], "OpenAPI should document classification override endpoint");
  assert.deepEqual(openapi.body.paths["/api/admin/classification-overrides"], openApiDocument.paths["/api/admin/classification-overrides"]);
  assert.equal(openapi.body.components.securitySchemes.syncSecret.scheme, "bearer");
  assert.deepEqual(openapi.body.paths["/api/quality/review"], openApiDocument.paths["/api/quality/review"]);
}

async function testMethodAndBodyValidation() {
  const searchPost = await request("/api/search", { method: "POST" });
  assert.equal(searchPost.status, 405);
  assert.equal(searchPost.body.error.code, "method_not_allowed");

  const grpGet = await getJson("/api/grp/query");
  assert.equal(grpGet.status, 405);
  assert.equal(grpGet.body.error.code, "method_not_allowed");

  const grpInvalidJson = await request("/api/grp/query", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" }
  });
  assert.equal(grpInvalidJson.status, 400);
  assert.equal(grpInvalidJson.body.error.code, "invalid_json");

  const adminSync = await request("/api/admin/sync", { method: "POST" });
  assert.equal(adminSync.status, 401);
  assert.equal(adminSync.body.error.code, "unauthorized");

  const authorizedAdminSync = await request(
    "/api/admin/sync",
    {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        repositories: [],
        limit: 5,
        signal_depth: "lite"
      })
    },
    { ...mockD1Env(), SYNC_SECRET: "test-secret" }
  );
  assert.equal(authorizedAdminSync.status, 200);
  assert.deepEqual(authorizedAdminSync.body.synced, []);
  assert.deepEqual(authorizedAdminSync.body.failed, []);

  const adminOverrides = await request("/api/admin/classification-overrides");
  assert.equal(adminOverrides.status, 401);
  assert.equal(adminOverrides.body.error.code, "unauthorized");
}

async function testMockD1Source() {
  const d1Env = mockD1Env();

  const health = await request("/api/health", {}, d1Env);
  assert.equal(health.status, 200);
  assert.equal(health.body.db, "available");
  assert.equal(health.body.raw_project_count, 1);
  assert.equal(health.body.knowledge_ready_project_count, 1);
  assert.equal(health.body.project_count, 1);
  assert.equal(health.body.sync_health, "unknown");
  assert.equal(health.body.sync_freshness, "unknown");
  assertMetadata(health.body.metadata, "d1_query", "d1");

  const search = await request("/api/search?q=mock&limit=5", {}, d1Env);
  assert.equal(search.status, 200);
  assert.equal(search.body.projects.length, 1);
  assert.equal(search.body.knowledge.length, 1);
  assert.equal(search.body.projects[0].repo, mockD1ProjectId);
  assert.equal(search.body.projects[0].project_kind, "project");
  assert.equal(search.body.knowledge[0].agent_card.project_kind, "project");
  assert.equal(search.body.knowledge[0].agent_card.collection_metadata, undefined);
  assert.equal(search.body.knowledge[0].metrics.calculated_at, "2026-06-20T00:00:00Z");
  assert.equal(search.body.projects[0].classification.category.confidence, "high");
  assertMetadata(search.body.metadata, "d1_query", "d1");

  const project = await request(`/api/project/${encodeURIComponent(mockD1ProjectId)}`, {}, d1Env);
  assert.equal(project.status, 200);
  assert.equal(project.body.repo, mockD1ProjectId);
  assert.equal(project.body.project_kind, "project");
  assert.equal(project.body.knowledge.project.full_name, mockD1ProjectId);
  assert.equal(project.body.knowledge.agent_card.project_kind, "project");
  assert.equal(project.body.quality_signal_confidence.stars_30d_delta, "snapshot");
  assertMetadata(project.body.metadata, "d1_query", "d1");
}

async function testRequireD1Mode() {
  const strictFallback = await getJson("/api/search?q=cloudflare&require_d1=true");
  assert.equal(strictFallback.status, 503);
  assert.equal(strictFallback.body.error.code, "d1_required");
  assert.equal(strictFallback.body.error.metadata.source, "seed");
  assert.equal(strictFallback.body.error.metadata.reason, "db_missing");

  const strictProjectFallback = await getJson("/api/project/cloudflare/agents?require_d1=true");
  assert.equal(strictProjectFallback.status, 503);
  assert.equal(strictProjectFallback.body.error.code, "d1_required");

  const strictD1 = await request("/api/search?q=mock&require_d1=true", {}, mockD1Env());
  assert.equal(strictD1.status, 200);
  assert.equal(strictD1.body.projects.length, 1);
  assertMetadata(strictD1.body.metadata, "d1_query", "d1");

  const strictEmpty = await request("/api/search?q=cloudflare&require_d1=true", {}, mockD1Env("empty"));
  assert.equal(strictEmpty.status, 503);
  assert.equal(strictEmpty.body.error.metadata.reason, "db_empty");

  const strictError = await request("/api/search?q=cloudflare&require_d1=true", {}, mockD1Env("error"));
  assert.equal(strictError.status, 503);
  assert.equal(strictError.body.error.metadata.reason, "db_error");
}

async function testD1FallbackReasons() {
  const empty = await request("/api/search?q=cloudflare&limit=2", {}, mockD1Env("empty"));
  assert.equal(empty.status, 200);
  assert.ok(empty.body.projects.length > 0);
  assertMetadata(empty.body.metadata, "db_empty");

  const failed = await request("/api/search?q=cloudflare&limit=2", {}, mockD1Env("error"));
  assert.equal(failed.status, 200);
  assert.ok(failed.body.projects.length > 0);
  assertMetadata(failed.body.metadata, "db_error");
  assert.ok(typeof failed.body.metadata.error === "string");
}

async function testSyncStatusWithMockD1() {
  const now = new Date().toISOString();
  const healthy = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      cursor: 7,
      syncRuns: [
        syncRunRow({
          id: "healthy_sync",
          synced_count: 2,
          failed_count: 0,
          finished_at: now
        })
      ]
    })
  );
  assert.equal(healthy.status, 200);
  assert.equal(healthy.body.health, "healthy");
  assert.equal(healthy.body.freshness, "fresh");
  assert.equal(healthy.body.indexed_count, 1);
  assert.equal(healthy.body.synced_count, 0);
  assert.equal(healthy.body.cursor, 7);
  assert.equal(healthy.body.cycle_complete, false);
  assert.equal(healthy.body.next_batch_wraps, false);
  assert.equal(healthy.body.last_successful_sync_at, now);
  assert.equal(typeof healthy.body.hours_since_successful_sync, "number");
  assert.equal(healthy.body.last_failed_sync_at, null);
  assert.equal(healthy.body.next_batch.length, 5);

  const degraded = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      syncRuns: [
        syncRunRow({
          id: "failed_sync",
          synced_count: 0,
          failed_count: 1,
          finished_at: "2026-06-20T02:00:00Z",
          failed_json: JSON.stringify([{ repository: mockD1ProjectId, error: "rate limited" }])
        })
      ]
    })
  );
  assert.equal(degraded.status, 200);
  assert.equal(degraded.body.health, "degraded");
  assert.equal(degraded.body.freshness, "unknown");
  assert.equal(degraded.body.last_successful_sync_at, null);
  assert.equal(degraded.body.hours_since_successful_sync, null);
  assert.equal(degraded.body.last_failed_sync_at, "2026-06-20T02:00:00Z");
  assert.equal(degraded.body.last_error.repository, mockD1ProjectId);
  assert.equal(degraded.body.last_error.error, "rate limited");

  const wrapping = await request(
    "/api/sync/status",
    {},
    mockD1Env({
      cursor: 498,
      syncRuns: [
        syncRunRow({
          id: "wrapping_sync",
          synced_count: 1,
          failed_count: 0,
          limit_value: 5,
          finished_at: now
        })
      ]
    })
  );
  assert.equal(wrapping.status, 200);
  assert.equal(wrapping.body.cursor, 498);
  assert.equal(wrapping.body.next_batch_wraps, true);
  assert.equal(wrapping.body.next_batch.length, 5);
}

async function testClassificationOverridesWithMockD1() {
  const d1Env = {
    ...mockD1Env({ classificationOverrides: [] }),
    SYNC_SECRET: "test-secret"
  };
  const headers = {
    authorization: "Bearer test-secret",
    "content-type": "application/json"
  };

  const create = await request(
    "/api/admin/classification-overrides",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        project_id: mockD1ProjectId,
        category: "agent_framework",
        difficulty: "beginner",
        deployment: ["cloudflare", "serverless"],
        cloudflare_ready: true,
        classification: {
          category: {
            confidence: "high",
            evidence: ["Manual review confirmed agent framework category."]
          }
        },
        notes: "Reviewed from low-confidence report.",
        reviewed_by: "api-test",
        reviewed_at: "2026-06-21T00:00:00Z"
      })
    },
    d1Env
  );
  assert.equal(create.status, 200);
  assert.equal(create.body.override.project_id, mockD1ProjectId);
  assert.equal(create.body.override.category, "agent_framework");
  assert.deepEqual(create.body.override.deployment, ["cloudflare", "serverless"]);
  assert.equal(create.body.override.cloudflare_ready, true);

  const list = await request(
    "/api/admin/classification-overrides?limit=10",
    {
      headers: {
        authorization: "Bearer test-secret"
      }
    },
    d1Env
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.overrides[0].project_id, mockD1ProjectId);

  const invalid = await request(
    "/api/admin/classification-overrides",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        project_id: "bad",
        category: "agent_framework"
      })
    },
    d1Env
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "invalid_classification_override");
}

async function getJson(path) {
  return request(path);
}

async function request(path, init = {}, requestEnv = env) {
  const response = await handleApi(new Request(`https://git.top${path}`, init), requestEnv);
  const body = await response.json();
  return {
    status: response.status,
    body,
    headers: response.headers
  };
}

function assertMetadata(metadata, reason, source = "seed") {
  assert.equal(metadata.source, source);
  assert.equal(metadata.reason, reason);
  assert.ok(metadata.project_count > 0, "metadata.project_count should be positive");
  assert.ok(typeof metadata.generated_at === "string", "metadata.generated_at should be present");
  if (source === "seed") {
    assert.ok(Array.isArray(metadata.warnings), "metadata.warnings should be an array");
  }
}
