import assert from "node:assert/strict";
import test from "node:test";

import { cachedPublicResponse, canonicalEdgeCacheRequest } from "../src/edge-cache.ts";

test("edge cache keys are shared by the canonical and workers.dev hosts", async () => {
  const workerRequest = new Request("https://git-top.izhenghaocn.workers.dev/api/search?q=agent&limit=3");
  assert.equal(canonicalEdgeCacheRequest(workerRequest).url, "https://git.top/api/search?q=agent&limit=3");

  const originalCaches = globalThis.caches;
  const entries = new Map();
  const pending = [];
  let loads = 0;
  globalThis.caches = {
    default: {
      async match(request) {
        return entries.get(request.url)?.clone();
      },
      async put(request, response) {
        entries.set(request.url, response.clone());
      }
    }
  };

  const ctx = {
    waitUntil(promise) {
      pending.push(promise);
    }
  };

  try {
    const first = await cachedPublicResponse(workerRequest, ctx, async () => {
      loads += 1;
      return Response.json({ source: "d1" });
    });
    assert.equal(first.headers.get("x-git-top-cache"), "miss");
    await Promise.all(pending);

    const canonicalRequest = new Request("https://git.top/api/search?q=agent&limit=3");
    const second = await cachedPublicResponse(canonicalRequest, ctx, async () => {
      loads += 1;
      return Response.json({ source: "unexpected" });
    });
    assert.equal(second.headers.get("x-git-top-cache"), "hit");
    assert.deepEqual(await second.json(), { source: "d1" });
    assert.equal(loads, 1);
  } finally {
    if (originalCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = originalCaches;
    }
  }
});

test("edge cache does not store failed responses", async () => {
  const originalCaches = globalThis.caches;
  let putCount = 0;
  globalThis.caches = {
    default: {
      async match() {
        return undefined;
      },
      async put() {
        putCount += 1;
      }
    }
  };

  try {
    const response = await cachedPublicResponse(
      new Request("https://git.top/api/search?q=agent"),
      { waitUntil() {} },
      async () => new Response("unavailable", { status: 503 })
    );
    assert.equal(response.status, 503);
    assert.equal(putCount, 0);
  } finally {
    if (originalCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = originalCaches;
    }
  }
});
