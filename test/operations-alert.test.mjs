import assert from "node:assert/strict";
import test from "node:test";

import { sendOperationsAlert, sendOperationsDigest } from "../src/operations-alert.ts";

test("operations alerts are disabled without a valid HTTPS webhook", async () => {
  assert.equal(await sendOperationsAlert({}, { task: "sync", status: "failed" }), false);
  assert.equal(await sendOperationsAlert({ OPERATIONS_ALERT_WEBHOOK: "http://example.com" }, { task: "sync", status: "failed" }), false);
});

test("operations alerts send a structured best-effort payload", async () => {
  const originalFetch = globalThis.fetch;
  let request = null;
  globalThis.fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(null, { status: 204 });
  };
  try {
    const sent = await sendOperationsAlert(
      { OPERATIONS_ALERT_WEBHOOK: "https://alerts.example.com/git-top" },
      { task: "derived:alternatives-progress", status: "failed", error: "CPU limit" }
    );
    assert.equal(sent, true);
    assert.equal(request.url, "https://alerts.example.com/git-top");
    const body = JSON.parse(request.init.body);
    assert.equal(body.service, "git.top");
    assert.equal(body.task, "derived:alternatives-progress");
    assert.equal(body.error, "CPU limit");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("daily operations digest uses its independent webhook", async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };
  try {
    assert.equal(await sendOperationsDigest({ OPERATIONS_DIGEST_WEBHOOK: "https://example.com/digest" }, { summary: { trust: "allow" } }), true);
    assert.equal(payload.task, "daily-operations-digest");
    assert.equal(payload.status, "digest");
    assert.equal(payload.summary.trust, "allow");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
