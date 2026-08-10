import test from "node:test";
import assert from "node:assert/strict";
import {
  ProductionHttpError,
  cacheBustedPath,
  isRetryableRequestError,
  parseRetryAfter,
  requestJsonWithRetry,
  retryDelayMs
} from "../scripts/prod-http-client.mjs";

test("production HTTP client retries a transient HTML 503 and rotates origins", async () => {
  const requests = [];
  const delays = [];
  const retries = [];
  const responses = [
    new Response("<html>temporarily unavailable</html>", { status: 503 }),
    Response.json({ ok: true })
  ];

  const result = await requestJsonWithRetry({
    path: "/api/admin/alternatives?offset=360",
    init: { method: "POST" },
    baseUrls: ["https://git.top", "https://worker.example"],
    maxRetries: 3,
    timeoutMs: 1_000,
    fetchImpl: async (url) => {
      requests.push(url);
      return responses.shift();
    },
    sleep: async (milliseconds) => delays.push(milliseconds),
    onRetry: (retry) => retries.push(retry)
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(requests, [
    "https://git.top/api/admin/alternatives?offset=360",
    "https://worker.example/api/admin/alternatives?offset=360"
  ]);
  assert.deepEqual(delays, [2_000]);
  assert.equal(retries[0].error.status, 503);
});

test("production HTTP client fails fast for permanent HTTP errors", async () => {
  let requestCount = 0;
  await assert.rejects(
    requestJsonWithRetry({
      path: "/api/admin/alternatives",
      init: { method: "POST" },
      baseUrls: ["https://git.top"],
      maxRetries: 10,
      timeoutMs: 1_000,
      fetchImpl: async () => {
        requestCount += 1;
        return Response.json({ error: "unauthorized" }, { status: 401 });
      },
      sleep: async () => assert.fail("permanent errors must not sleep before failing")
    }),
    /HTTP 401/
  );
  assert.equal(requestCount, 1);
});

test("production HTTP retry policy covers transient failures and Retry-After", () => {
  assert.equal(isRetryableRequestError(new ProductionHttpError("busy", { status: 429 })), true);
  assert.equal(isRetryableRequestError(new ProductionHttpError("bad request", { status: 400 })), false);
  assert.equal(parseRetryAfter("12"), 12_000);
  assert.equal(parseRetryAfter("Wed, 21 Oct 2015 07:28:00 GMT", Date.parse("Wed, 21 Oct 2015 07:27:55 GMT")), 5_000);
  assert.equal(retryDelayMs({ attempt: 4, baseDelayMs: 2_000, maxDelayMs: 30_000 }), 16_000);
  assert.equal(retryDelayMs({ attempt: 2, baseDelayMs: 2_000, maxDelayMs: 30_000, retryAfterMs: 20_000 }), 20_000);
  assert.equal(cacheBustedPath("/api/quality?require_d1=true", "run 42"), "/api/quality?require_d1=true&_=run%2042");
});
