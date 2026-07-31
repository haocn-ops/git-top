import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { buildEvaluationContext } from "./eval-lib.mjs";
import { buildLowConfidenceReviewReport } from "../src/quality.ts";

const defaultMaxReviewDelta = 10;
const defaultTimeoutMs = 10_000;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await evaluateProductionSnapshot({
      baseUrl: options.baseUrl ?? process.env.GIT_TOP_PRODUCTION_EVAL_BASE_URL ?? "https://git.top",
      maxReviewDelta: options.maxReviewDelta ?? process.env.PRODUCTION_REVIEW_COUNT_DELTA_MAX ?? defaultMaxReviewDelta,
      timeoutMs: options.timeoutMs ?? process.env.GIT_TOP_PRODUCTION_EVAL_TIMEOUT_MS ?? defaultTimeoutMs
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Production snapshot evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export async function evaluateProductionSnapshot({
  baseUrl = "https://git.top",
  fetchImpl = fetch,
  fixtureReport,
  maxReviewDelta = defaultMaxReviewDelta,
  timeoutMs = defaultTimeoutMs
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const threshold = parseNonNegativeInteger(maxReviewDelta, "maxReviewDelta");
  const requestTimeoutMs = parsePositiveInteger(timeoutMs, "timeoutMs");
  const fixture = fixtureReport ?? (await buildFixtureReviewReport());
  const [health, quality, review, benchmark] = await Promise.all([
    getJson(fetchImpl, `${normalizedBaseUrl}/api/health`, requestTimeoutMs),
    getJson(fetchImpl, `${normalizedBaseUrl}/api/quality?require_d1=true`, requestTimeoutMs),
    getJson(fetchImpl, `${normalizedBaseUrl}/api/quality/review?require_d1=true`, requestTimeoutMs),
    getJson(fetchImpl, `${normalizedBaseUrl}/api/benchmark?require_d1=true`, requestTimeoutMs)
  ]);

  for (const [name, response] of Object.entries({ health, quality, review, benchmark })) {
    assert.equal(response.ok, true, `${name} endpoint should return HTTP 2xx, received ${response.status}`);
    assert.equal(response.body.metadata?.source, "d1", `${name} endpoint must be D1-backed`);
  }
  assert.equal(health.body.db, "available", "production D1 binding must be available");

  const production = {
    project_count: integerField(review.body.project_count, "production project_count"),
    review_count: integerField(review.body.review_count, "production review_count"),
    low_signal_count: integerField(review.body.low_signal_count, "production low_signal_count"),
    medium_signal_count: integerField(review.body.medium_signal_count, "production medium_signal_count"),
    quality_release_score: numberField(quality.body.release_score ?? quality.body.score, "production release_score"),
    data_trust_score: numberField(quality.body.data_trust_score, "production data_trust_score"),
    database: health.body.db,
    benchmark_name: benchmark.body.name ?? null
  };
  const reviewDelta = production.review_count - integerField(fixture.reviewCount, "fixture review_count");
  const result = {
    generated_at: new Date().toISOString(),
    target: normalizedBaseUrl,
    source: "d1",
    fixture: {
      project_count: integerField(fixture.projectCount, "fixture project_count"),
      review_count: integerField(fixture.reviewCount, "fixture review_count")
    },
    production,
    review_count_delta: reviewDelta,
    max_review_count_delta: threshold,
    timeout_ms: requestTimeoutMs,
    within_threshold: Math.abs(reviewDelta) <= threshold
  };

  if (!result.within_threshold) {
    throw new Error(`production review count drift ${reviewDelta} exceeds allowed absolute delta ${threshold}`);
  }
  return result;
}

async function buildFixtureReviewReport() {
  const { evaluationProjects } = await buildEvaluationContext();
  return buildLowConfidenceReviewReport(evaluationProjects);
}

async function getJson(fetchImpl, url, timeoutMs) {
  let response;
  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new Error(`${url} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body: body ?? {} };
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--base-url") {
      parsed.baseUrl = args[++index];
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--max-review-delta") {
      parsed.maxReviewDelta = args[++index];
      continue;
    }
    if (arg.startsWith("--max-review-delta=")) {
      parsed.maxReviewDelta = arg.slice("--max-review-delta=".length);
      continue;
    }
    if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[++index];
      continue;
    }
    if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  const normalized = String(value).replace(/\/+$/g, "");
  assert.match(normalized, /^https?:\/\//u, "baseUrl must be an HTTP(S) URL");
  return normalized;
}

function parseNonNegativeInteger(value, label) {
  const number = typeof value === "number" ? value : Number(value);
  assert.ok(Number.isInteger(number) && number >= 0, `${label} must be a non-negative integer`);
  return number;
}

function parsePositiveInteger(value, label) {
  const number = typeof value === "number" ? value : Number(value);
  assert.ok(Number.isInteger(number) && number > 0, `${label} must be a positive integer`);
  return number;
}

function integerField(value, label) {
  assert.ok(Number.isInteger(value) && value >= 0, `${label} must be a non-negative integer`);
  return value;
}

function numberField(value, label) {
  assert.equal(typeof value, "number", `${label} must be a number`);
  assert.ok(Number.isFinite(value), `${label} must be finite`);
  return value;
}
