import assert from "node:assert/strict";

const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.GIT_TOP_SMOKE_BASE_URL ?? "https://git.top");
const timeoutMs = Number(options.timeoutMs ?? process.env.GIT_TOP_SMOKE_TIMEOUT_MS ?? 10_000);
const allowSeed = options.allowSeed === true || process.env.GIT_TOP_SMOKE_ALLOW_SEED === "1";

const results = [];

await check("health", async () => {
  const { status, body } = await getJson("/api/health");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.db, "available", "production smoke requires an available D1 binding");
  assertMetadata(body.metadata);
  return {
    db: body.db,
    source: body.metadata.source,
    reason: body.metadata.reason,
    projectCount: body.project_count,
    syncHealth: body.sync_health,
    syncFreshness: body.sync_freshness,
    lastSuccessfulSyncAt: body.last_successful_sync_at
  };
});

await check("search", async () => {
  const { status, body } = await getJson("/api/search?q=cloudflare%20agent&limit=3");
  assert.equal(status, 200);
  assertMetadata(body.metadata);
  assert.ok(Array.isArray(body.projects), "search projects should be an array");
  assert.ok(body.projects.length > 0, "search should return at least one project");
  assert.ok(body.projects.length <= 3, "search should honor limit");
  assert.ok(body.projects.some((project) => typeof project.repo === "string"), "search results should include repo ids");
  return {
    source: body.metadata.source,
    reason: body.metadata.reason,
    candidates: body.projects.map((project) => project.repo)
  };
});

await check("grp_query", async () => {
  const { status, body } = await postJson("/api/grp/query", {
    goal: "build a Cloudflare-ready coding agent stack",
    mode: "plan",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    }
  });
  assert.equal(status, 200);
  assert.equal(body.metadata.version, "grp.v1");
  assertMetadata(body.metadata.data_source);
  assert.ok(Array.isArray(body.nodes), "GRP nodes should be an array");
  assert.ok(body.nodes.length > 0, "GRP should return at least one node");
  return {
    mode: body.mode,
    resultType: body.result_type,
    candidates: body.nodes.slice(0, 5).map((node) => node.repo ?? node.id)
  };
});

await check("mcp_discovery", async () => {
  const { status, body } = await getJson("/mcp");
  assert.equal(status, 200);
  assert.equal(body.name, "git-top");
  assert.ok(Array.isArray(body.tools), "MCP discovery should include tools");
  assert.ok(body.tools.some((tool) => tool.name === "search_projects"), "MCP discovery should include search_projects");
  assert.ok(body.tools.some((tool) => tool.name === "git_top_grp_query"), "MCP discovery should include git_top_grp_query");
  return {
    tools: body.tools.length
  };
});

await check("mcp_tools_list", async () => {
  const { status, body } = await postJson("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  });
  assert.equal(status, 200);
  assert.equal(body.jsonrpc, "2.0");
  assert.ok(Array.isArray(body.result.tools), "MCP tools/list should include tools");
  assert.ok(body.result.tools.some((tool) => tool.name === "search_projects"), "MCP tools/list should include search_projects");
  return {
    tools: body.result.tools.length
  };
});

console.log(
  JSON.stringify(
    {
      baseUrl,
      ok: true,
      checked: results
    },
    null,
    2
  )
);

async function check(name, fn) {
  try {
    const details = await fn();
    results.push({ name, ok: true, ...details });
  } catch (error) {
    error.message = `${name} smoke check failed: ${error.message}`;
    throw error;
  }
}

async function getJson(path) {
  return requestJson(path, { method: "GET" });
}

async function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestJson(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 200)}`);
    }
    return {
      status: response.status,
      body
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertMetadata(metadata) {
  assert.ok(metadata && typeof metadata === "object", "metadata should be present");
  if (allowSeed) {
    assert.ok(["d1", "seed"].includes(metadata.source), "metadata.source should be d1 or seed");
  } else {
    assert.equal(metadata.source, "d1", "production smoke requires D1-backed metadata; pass --allow-seed for seed fallback checks");
  }
  assert.ok(typeof metadata.reason === "string" && metadata.reason.length > 0, "metadata.reason should be present");
  assert.ok(Number.isFinite(metadata.project_count), "metadata.project_count should be numeric");
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = arg.slice("--timeout-ms=".length);
    } else if (arg === "--allow-seed") {
      parsed.allowSeed = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/g, "");
}
