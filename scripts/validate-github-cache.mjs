import assert from "node:assert/strict";
import { getGithubRequestCache, touchGithubRequestCache, upsertGithubRequestCache } from "../src/github-cache-store.ts";
import { GithubClient } from "../src/github.ts";
import { githubRequestCacheRow, mockD1Env } from "./mock-d1.mjs";
import { githubCacheMaxBodyBytes } from "../src/storage-maintenance.ts";

await testCacheStoreRoundTrip();
await testOversizedCacheBodyIsRejected();
await testGithubConditionalRequestCache();

console.log("Validated GitHub conditional request cache behavior.");

async function testCacheStoreRoundTrip() {
  const env = mockD1Env();
  assert.equal(await getGithubRequestCache(env, "/repos/mock/new"), null);

  await upsertGithubRequestCache(env, {
    cacheKey: "/repos/mock/new",
    etag: '"abc"',
    lastModified: "Sat, 20 Jun 2026 00:00:00 GMT",
    bodyJson: JSON.stringify({ ok: true }),
    status: 200,
    nowIso: "2026-06-20T00:00:00Z"
  });

  const cached = await getGithubRequestCache(env, "/repos/mock/new");
  assert.equal(cached?.etag, '"abc"');
  assert.equal(cached?.lastModified, "Sat, 20 Jun 2026 00:00:00 GMT");
  assert.equal(cached?.bodyJson, JSON.stringify({ ok: true }));

  await touchGithubRequestCache(env, "/repos/mock/new", "2026-06-21T00:00:00Z");
  const touched = await getGithubRequestCache(env, "/repos/mock/new");
  assert.equal(touched?.checkedAt, "2026-06-21T00:00:00Z");
}

async function testOversizedCacheBodyIsRejected() {
  const cacheKey = "/repos/mock/oversized";
  const env = mockD1Env({
    githubRequestCache: [githubRequestCacheRow({ cache_key: cacheKey, body_json: JSON.stringify({ stale: true }) })]
  });

  await upsertGithubRequestCache(env, {
    cacheKey,
    etag: '"large"',
    lastModified: null,
    bodyJson: "x".repeat(githubCacheMaxBodyBytes + 1),
    status: 200,
    nowIso: "2026-07-12T00:00:00Z"
  });

  assert.equal(await getGithubRequestCache(env, cacheKey), null, "oversized response bodies should not remain in D1 cache");
}

async function testGithubConditionalRequestCache() {
  const env = mockD1Env({
    githubRequestCache: [
      githubRequestCacheRow({
        cache_key: "/repos/mock/cached",
        etag: '"etag-1"',
        last_modified: "Sat, 20 Jun 2026 00:00:00 GMT",
        body_json: JSON.stringify(mockRepo("mock/cached"))
      })
    ]
  });

  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    const headers = new Headers(init.headers);
    requests.push({
      url: String(url),
      ifNoneMatch: headers.get("if-none-match"),
      ifModifiedSince: headers.get("if-modified-since")
    });
    if (String(url).endsWith("/repos/mock/cached")) {
      return new Response(null, {
        status: 304,
        headers: {
          etag: '"etag-1"'
        }
      });
    }
    return new Response(JSON.stringify(mockRepo("mock/fresh")), {
      status: 200,
      headers: {
        "content-type": "application/json",
        etag: '"etag-2"',
        "last-modified": "Sun, 21 Jun 2026 00:00:00 GMT"
      }
    });
  };

  try {
    const client = new GithubClient(env);
    const cached = await client.getRepository("mock/cached");
    assert.equal(cached.full_name, "mock/cached");
    assert.equal(requests[0].ifNoneMatch, '"etag-1"');
    assert.equal(requests[0].ifModifiedSince, "Sat, 20 Jun 2026 00:00:00 GMT");
    assert.deepEqual(client.getRequestMetrics(), {
      total: 1,
      conditional: 1,
      cacheHits: 1,
      cacheMisses: 0,
      revalidated: 0
    });

    const fresh = await client.getRepository("mock/fresh");
    assert.equal(fresh.full_name, "mock/fresh");
    const written = await getGithubRequestCache(env, "/repos/mock/fresh");
    assert.equal(written?.etag, '"etag-2"');
    assert.deepEqual(client.getRequestMetrics(), {
      total: 2,
      conditional: 1,
      cacheHits: 1,
      cacheMisses: 1,
      revalidated: 0
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function mockRepo(fullName) {
  const [owner, name] = fullName.split("/");
  return {
    id: 1,
    name,
    full_name: fullName,
    owner: {
      login: owner
    },
    html_url: `https://github.com/${fullName}`,
    homepage: null,
    description: "Mock repo",
    language: "TypeScript",
    topics: ["mock"],
    license: {
      spdx_id: "MIT"
    },
    stargazers_count: 100,
    forks_count: 10,
    open_issues_count: 1,
    default_branch: "main",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-20T00:00:00Z",
    pushed_at: "2026-06-20T00:00:00Z"
  };
}
