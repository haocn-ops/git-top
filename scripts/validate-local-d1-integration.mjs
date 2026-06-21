import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cwd = new URL("..", import.meta.url);
const port = Number(process.env.GIT_TOP_INTEGRATION_PORT ?? (await getOpenPort()));
const origin = `http://127.0.0.1:${port}`;

await run("pnpm", ["db:prepare-local"]);
await run("pnpm", ["db:seed"]);

const expectedSeedProjectCount = await countSeedSqlProjects();
const totalSeedRepositories = JSON.parse(await readFile(new URL("../data/seed-repositories.json", import.meta.url), "utf8")).length;

const server = spawn(
  "pnpm",
  [
    "exec",
    "wrangler",
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--log-level",
    "error",
    "--show-interactive-dev-session=false"
  ],
  {
    cwd,
    stdio: ["ignore", "pipe", "pipe"]
  }
);

const output = [];
server.stdout.on("data", (chunk) => output.push(chunk.toString()));
server.stderr.on("data", (chunk) => output.push(chunk.toString()));

try {
  await waitForHealthyD1(origin);
  await testHealth(origin);
  await testSearch(origin);
  await testProject(origin);
  await testQuality(origin);
  await testSyncStatus(origin);
  await testGrp(origin);
  await testMcp(origin);

  console.log(
    JSON.stringify(
      {
        origin,
        localD1: "ok",
        checked: ["/api/health", "/api/search", "/api/project/:owner/:repo", "/api/quality", "/api/sync/status", "/api/grp/query", "/mcp"]
      },
      null,
      2
    )
  );
} finally {
  server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), delay(3000)]);
  if (!server.killed) {
    server.kill("SIGKILL");
  }
}

async function testHealth(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/health`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.db, "available");
  assert.equal(body.metadata.source, "d1");
  assert.equal(body.metadata.reason, "d1_query");
  assert.equal(body.project_count, expectedSeedProjectCount);
}

async function testSearch(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/search?q=observability&limit=5`);
  assert.equal(status, 200);
  assert.equal(body.metadata.source, "d1");
  assert.ok(body.projects.some((project) => project.repo === "langfuse/langfuse"), "expected langfuse in D1 search results");
  const langfuse = body.projects.find((project) => project.repo === "langfuse/langfuse");
  assert.deepEqual(langfuse.category, ["ai_observability"]);
}

async function testProject(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/project/langfuse/langfuse`);
  assert.equal(status, 200);
  assert.equal(body.metadata.source, "d1");
  assert.equal(body.repo, "langfuse/langfuse");
  assert.equal(body.knowledge.project.full_name, "langfuse/langfuse");
  assert.deepEqual(body.category, ["ai_observability"]);
  assert.equal(body.classification.category.confidence, "high");
  assert.equal(body.quality_signal_confidence.commits_30d, "complete");
}

async function testQuality(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/quality`);
  assert.equal(status, 200);
  assert.equal(body.metadata.source, "d1");
  assert.equal(body.project_count, expectedSeedProjectCount);
  assert.equal(body.coverage.covered_categories, 13);
  assert.deepEqual(body.coverage.missing_categories, []);
}

async function testSyncStatus(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/sync/status`);
  assert.equal(status, 200);
  assert.equal(body.synced_count, expectedSeedProjectCount);
  assert.equal(body.health, "unknown");
  assert.equal(body.remaining_count, Math.max(0, totalSeedRepositories - expectedSeedProjectCount));
}

async function testGrp(baseUrl) {
  const { status, body } = await postJson(`${baseUrl}/api/grp/query`, {
    goal: "build an observability stack for AI agents",
    mode: "find",
    constraints: {
      category: "ai_observability"
    }
  });
  assert.equal(status, 200);
  assert.equal(body.metadata.version, "grp.v1");
  assert.equal(body.metadata.data_source.source, "d1");
  assert.ok(Array.isArray(body.nodes));
  assert.ok(body.nodes.some((node) => node.repo === "langfuse/langfuse"), "expected langfuse in local D1 GRP results");
}

async function testMcp(baseUrl) {
  const discovery = await getJson(`${baseUrl}/mcp`);
  assert.equal(discovery.status, 200);
  assert.ok(discovery.body.tools.some((tool) => tool.name === "search_projects"));
  assert.ok(discovery.body.tools.some((tool) => tool.name === "git_top_grp_query"));

  const list = await postJson(`${baseUrl}/mcp`, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  });
  assert.equal(list.status, 200);
  assert.ok(list.body.result.tools.some((tool) => tool.name === "search_projects"));
}

async function waitForHealthyD1(baseUrl) {
  const timeoutAt = Date.now() + 30_000;
  let lastError = null;

  while (Date.now() < timeoutAt) {
    try {
      const { status, body } = await getJson(`${baseUrl}/api/health`);
      if (status === 200 && body.db === "available" && body.metadata?.source === "d1") {
        return;
      }
      lastError = new Error(`health returned ${status} ${JSON.stringify(body)}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }

  throw new Error(
    [
      `Timed out waiting for local Worker D1 health at ${baseUrl}.`,
      lastError ? `Last error: ${lastError.message}` : "",
      output.join("").trim()
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  return {
    status: response.status,
    body
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

async function run(command, args) {
  await execFileAsync(command, args, {
    cwd,
    maxBuffer: 1024 * 1024 * 16
  });
}

async function getOpenPort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;
  server.close();
  await once(server, "close");
  return port;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function countSeedSqlProjects() {
  const seedSql = await readFile(new URL("../seed.sql", import.meta.url), "utf8");
  const projectInserts = seedSql.matchAll(/INSERT OR REPLACE INTO projects[\s\S]*?\n;/g);
  return [...projectInserts].reduce((count, match) => count + [...match[0].matchAll(/\('([^']+)'\s*,/g)].length, 0);
}
