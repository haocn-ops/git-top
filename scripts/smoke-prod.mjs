import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runSmoke(process.argv.slice(2), process.env), null, 2));
}

export async function runSmoke(args = [], env = process.env) {
  const options = parseArgs(args);
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? env.GIT_TOP_SMOKE_BASE_URL ?? "https://git.top");
  const timeoutMs = Number(options.timeoutMs ?? env.GIT_TOP_SMOKE_TIMEOUT_MS ?? 10_000);
  const allowSeed = options.allowSeed === true || env.GIT_TOP_SMOKE_ALLOW_SEED === "1";
  const context = {
    allowSeed,
    baseUrl,
    results: [],
    timeoutMs
  };

  await check(context, "health", async () => {
    const { status, body } = await getJson(context, "/api/health");
    assert.equal(status, 200);
    return validateHealthResponse(body, { allowSeed });
  });

  await check(context, "search", async () => {
    const { status, body } = await getJson(context, "/api/search?q=cloudflare%20agent&limit=3");
    assert.equal(status, 200);
    assertMetadata(body.metadata, { allowSeed });
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

  await check(context, "grp_query", async () => {
    const { status, body } = await postJson(context, "/api/grp/query", {
      goal: "build a Cloudflare-ready coding agent stack",
      mode: "plan",
      constraints: {
        deploy: ["cloudflare"],
        agent_ready: true
      }
    });
    assert.equal(status, 200);
    assert.equal(body.metadata.version, "grp.v1");
    assertMetadata(body.metadata.data_source, { allowSeed });
    assert.ok(Array.isArray(body.nodes), "GRP nodes should be an array");
    assert.ok(body.nodes.length > 0, "GRP should return at least one node");
    return {
      mode: body.mode,
      resultType: body.result_type,
      candidates: body.nodes.slice(0, 5).map((node) => node.repo ?? node.id)
    };
  });

  await check(context, "mcp_discovery", async () => {
    const { status, body } = await getJson(context, "/mcp");
    assert.equal(status, 200);
    assert.equal(body.name, "git-top");
    assert.ok(Array.isArray(body.tools), "MCP discovery should include tools");
    assert.ok(body.tools.some((tool) => tool.name === "search_projects"), "MCP discovery should include search_projects");
    assert.ok(body.tools.some((tool) => tool.name === "git_top_grp_query"), "MCP discovery should include git_top_grp_query");
    return {
      tools: body.tools.length
    };
  });

  await check(context, "mcp_tools_list", async () => {
    const { status, body } = await postJson(context, "/mcp", {
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

  await check(context, "machine_discovery", async () => {
    const sitemap = await getText(context, "/sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/llms\.txt<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/llms-full\.txt<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/git\.top\/projects\/cloudflare\/agents<\/loc>/);

    const llms = await getText(context, "/llms.txt");
    assert.equal(llms.status, 200);
    assert.match(llms.text, /Git\.Top is an agent-native GitHub project knowledge layer/);

    return {
      sitemapProjectUrls: Array.from(sitemap.text.matchAll(/<loc>https:\/\/git\.top\/projects\//g)).length
    };
  });

  await check(context, "project_page_seo", async () => {
    const { status, text } = await getText(context, "/projects/cloudflare/agents");
    assert.equal(status, 200);
    assert.match(text, /<link rel="canonical" href="https:\/\/git\.top\/projects\/cloudflare\/agents"/);
    assert.match(text, /<script type="application\/ld\+json">/);
    assert.match(text, /Project \/ implementation|Collection \/ resource hub/);
    assert.match(text, /Cloudflare Readiness/);
    assert.match(text, /Project JSON/);
    assert.match(text, /GitHub/);

    const jsonLdMatch = text.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(jsonLdMatch, "project page should include JSON-LD");
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    assert.equal(jsonLd["@type"], "SoftwareSourceCode");
    assert.equal(jsonLd.name, "cloudflare/agents");
    assert.equal(jsonLd.codeRepository, "https://github.com/cloudflare/agents");

    return {
      type: jsonLd["@type"],
      repo: jsonLd.name,
      properties: jsonLd.additionalProperty.length
    };
  });

  return {
    baseUrl,
    ok: true,
    checked: context.results
  };
}

export function validateHealthResponse(body, { allowSeed = false } = {}) {
  if (allowSeed) {
    assert.ok(["available", "missing", "error"].includes(body.db), "health.db should describe D1 state");
  } else {
    assert.equal(body.ok, true, "production smoke requires a healthy D1-backed health response");
    assert.equal(body.db, "available", "production smoke requires an available D1 binding");
  }
  assert.ok(Number.isFinite(body.raw_project_count), "health.raw_project_count should be numeric");
  assert.ok(Number.isFinite(body.knowledge_ready_project_count), "health.knowledge_ready_project_count should be numeric");
  assert.equal(body.project_count, body.knowledge_ready_project_count, "health.project_count should match knowledge-ready project count");
  if (body.db === "available") {
    assert.ok(body.raw_project_count >= body.knowledge_ready_project_count, "raw project count should not be lower than knowledge-ready count");
  }
  assertMetadata(body.metadata, { allowSeed });
  return {
    db: body.db,
    source: body.metadata.source,
    reason: body.metadata.reason,
    projectCount: body.project_count,
    rawProjectCount: body.raw_project_count,
    knowledgeReadyProjectCount: body.knowledge_ready_project_count,
    syncHealth: body.sync_health,
    syncFreshness: body.sync_freshness,
    lastSuccessfulSyncAt: body.last_successful_sync_at
  };
}

async function check(context, name, fn) {
  try {
    const details = await fn();
    context.results.push({ name, ok: true, ...details });
  } catch (error) {
    error.message = `${name} smoke check failed: ${error.message}`;
    throw error;
  }
}

async function getJson(context, path) {
  return requestJson(context, path, { method: "GET" });
}

async function getText(context, path) {
  return requestText(context, path, { method: "GET" });
}

async function postJson(context, path, body) {
  return requestJson(context, path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestText(context, path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
  try {
    const response = await fetch(`${context.baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    return {
      status: response.status,
      text: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson(context, path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
  try {
    const response = await fetch(`${context.baseUrl}${path}`, {
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

export function assertMetadata(metadata, { allowSeed = false } = {}) {
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
