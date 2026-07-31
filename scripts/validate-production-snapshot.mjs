import assert from "node:assert/strict";
import { evaluateProductionSnapshot } from "./eval-production-snapshot.mjs";

const fixtureReport = { projectCount: 100, reviewCount: 3 };
const calls = [];
const successBodies = {
  "/api/health": { db: "available", metadata: { source: "d1" } },
  "/api/quality?require_d1=true": { release_score: 100, data_trust_score: 90, metadata: { source: "d1" } },
  "/api/quality/review?require_d1=true": { project_count: 102, review_count: 5, low_signal_count: 2, medium_signal_count: 3, metadata: { source: "d1" } },
  "/api/benchmark?require_d1=true": { name: "Git.Top Public Trust Benchmark", metadata: { source: "d1" } }
};

const result = await evaluateProductionSnapshot({
  baseUrl: "https://example.test/",
  fixtureReport,
  fetchImpl: async (url) => {
    const path = new URL(url).pathname + (new URL(url).search || "");
    calls.push(path);
    return response(successBodies[path]);
  },
  maxReviewDelta: 2
});

assert.deepEqual(calls.sort(), Object.keys(successBodies).sort());
assert.equal(result.target, "https://example.test");
assert.equal(result.fixture.review_count, 3);
assert.equal(result.production.review_count, 5);
assert.equal(result.production.database, "available");
assert.equal(result.review_count_delta, 2);
assert.equal(result.within_threshold, true);
assert.equal(result.timeout_ms, 10_000);

await assert.rejects(
  evaluateProductionSnapshot({
    baseUrl: "https://example.test",
    fixtureReport,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + (new URL(url).search || "");
      if (path.startsWith("/api/quality/review")) {
        return response({ project_count: 102, review_count: 40, low_signal_count: 20, medium_signal_count: 20, metadata: { source: "d1" } });
      }
      return response(successBodies[path]);
    },
    maxReviewDelta: 2
  }),
  /exceeds allowed absolute delta/
);

await assert.rejects(
  evaluateProductionSnapshot({
    baseUrl: "https://example.test",
    fixtureReport,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + (new URL(url).search || "");
      const body = path.startsWith("/api/quality/review") ? { ...successBodies[path], metadata: { source: "seed" } } : successBodies[path];
      return response(body);
    }
  }),
  /must be D1-backed/
);

console.log("Validated production snapshot drift evaluation and fail-closed source policy.");

function response(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}
