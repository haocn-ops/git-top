import assert from "node:assert/strict";
import { validateHealthResponse } from "./smoke-prod.mjs";

const availableHealth = {
  ok: true,
  db: "available",
  project_count: 3,
  raw_project_count: 4,
  knowledge_ready_project_count: 3,
  sync_health: "healthy",
  sync_freshness: "fresh",
  last_successful_sync_at: "2026-06-21T00:00:00.000Z",
  metadata: {
    source: "d1",
    reason: "live D1",
    project_count: 3
  }
};

const availableSummary = validateHealthResponse(availableHealth);
assert.equal(availableSummary.db, "available");
assert.equal(availableSummary.rawProjectCount, 4);
assert.equal(availableSummary.knowledgeReadyProjectCount, 3);

assert.doesNotThrow(() =>
  validateHealthResponse(
    {
      ...availableHealth,
      ok: false,
      db: "missing",
      raw_project_count: 0,
      metadata: {
        source: "seed",
        reason: "D1 binding is missing",
        project_count: 3
      }
    },
    { allowSeed: true }
  )
);

assert.throws(
  () =>
    validateHealthResponse({
      ...availableHealth,
      ok: false
    }),
  /production smoke requires a healthy D1-backed health response/
);

assert.throws(
  () =>
    validateHealthResponse({
      ...availableHealth,
      ok: true,
      db: "missing",
      raw_project_count: 0,
      metadata: {
        source: "seed",
        reason: "D1 binding is missing",
        project_count: 3
      }
    }),
  /production smoke requires an available D1 binding/
);

assert.throws(
  () =>
    validateHealthResponse(
      {
        ...availableHealth,
        raw_project_count: 2
      },
      { allowSeed: true }
    ),
  /raw project count should not be lower than knowledge-ready count/
);
