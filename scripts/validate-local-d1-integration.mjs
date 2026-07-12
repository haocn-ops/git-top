import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cwd = new URL("..", import.meta.url);
const port = Number(process.env.GIT_TOP_INTEGRATION_PORT ?? (await getOpenPort()));
const origin = `https://127.0.0.1:${port}`;

await run("pnpm", ["db:prepare-local"]);
await run("pnpm", ["db:seed"]);

const expectedIndexedProjectCount = await countSeedSqlProjects();
const totalSeedRepositories = JSON.parse(await readFile(new URL("../data/seed-repositories.json", import.meta.url), "utf8")).length;

const server = spawn(
  "pnpm",
  [
    "exec",
    "wrangler",
    "dev",
    "--local",
    "--local-protocol",
    "https",
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
  await testAgentDataSemantics(origin);
  await testFeedbackValidation(origin);
  await testQuality(origin);
  await testSyncStatus(origin);
  await testGovernance(origin);
  await testOperationsPage(origin);
  await testGrp(origin);
  await testMcp(origin);

  console.log(
    JSON.stringify(
      {
        origin,
        localD1: "ok",
        checked: [
          "/api/health",
          "/api/search",
          "/api/project/:owner/:repo",
          "/api/projects",
          "/api/changes",
          "/api/feedback/proposals",
          "/api/quality",
          "/api/sync/status",
          "/api/governance/summary",
          "/api/governance/runs",
          "/operations",
          "/api/grp/query",
          "/mcp"
        ]
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
  assert.equal(body.project_count, expectedIndexedProjectCount);
  assert.equal(body.raw_project_count, expectedIndexedProjectCount);
  assert.equal(body.knowledge_ready_project_count, expectedIndexedProjectCount);
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

async function testAgentDataSemantics(baseUrl) {
  const batch = await postJson(`${baseUrl}/api/projects?require_d1=true`, {
    project_ids: ["langfuse/langfuse", "missing/project"],
    profile: "evidence"
  });
  assert.equal(batch.status, 200);
  assert.equal(batch.body.projects[0].project_id, "langfuse/langfuse");
  assert.ok(batch.body.projects[0].evidence);
  assert.deepEqual(batch.body.missing, ["missing/project"]);
  assert.equal(batch.body.metadata.source, "d1");

  const first = await getJson(`${baseUrl}/api/changes?limit=2`);
  assert.equal(first.status, 200);
  assert.equal(first.body.changes.length, 2);
  assert.equal(first.body.page.has_more, true);
  assert.ok(first.body.page.next_cursor);
  assert.equal(first.body.retention.days, 30);
  assert.equal(first.body.metadata.source, "d1");

  const second = await getJson(`${baseUrl}/api/changes?limit=2&cursor=${encodeURIComponent(first.body.page.next_cursor)}`);
  assert.equal(second.status, 200);
  assert.equal(second.body.changes.length, 2);
  assert.notEqual(second.body.changes[0].cursor, first.body.changes[0].cursor);
}

async function testFeedbackValidation(baseUrl) {
  const response = await postJson(`${baseUrl}/api/feedback/proposals`, {
    project_id: "langfuse/langfuse",
    feedback_type: "metadata",
    proposed: { homepage_url: "https://langfuse.com" },
    evidence: [{ url: "https://github.com/langfuse/langfuse", field: "homepage" }],
    rationale: "The canonical repository links to the project homepage."
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.persisted, false);
  assert.equal(response.body.review_required, true);
  assert.ok(response.body.proposal.fingerprint);
}

async function testQuality(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/quality`);
  assert.equal(status, 200);
  assert.equal(body.metadata.source, "d1");
  assert.equal(body.project_count, expectedIndexedProjectCount);
  assert.equal(body.coverage.covered_categories, 13);
  assert.deepEqual(body.coverage.missing_categories, []);
}

async function testSyncStatus(baseUrl) {
  const { status, body } = await getJson(`${baseUrl}/api/sync/status`);
  assert.equal(status, 200);
  assert.equal(body.synced_count, totalSeedRepositories);
  assert.equal(body.health, "unknown");
  assert.equal(body.remaining_count, 0);
}

async function testGovernance(baseUrl) {
  const summary = await getJson(`${baseUrl}/api/governance/summary`);
  assert.equal(summary.status, 200);
  assert.equal(summary.body.run_count, 0);
  assert.equal(summary.body.status_counts.success, 0);

  const runs = await getJson(`${baseUrl}/api/governance/runs?limit=5`);
  assert.equal(runs.status, 200);
  assert.deepEqual(runs.body.runs, []);
}

async function testOperationsPage(baseUrl) {
  const { status, text } = await getText(`${baseUrl}/operations`);
  assert.equal(status, 200);
  assert.match(text, /Automation runs and data governance/);
  assert.match(text, /Latest Automation/);
  assert.match(text, /Operating Rhythm/);
  assert.match(text, /\/api\/governance\/summary/);
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
  assert.ok(discovery.body.tools.some((tool) => tool.name === "get_projects_batch"));
  assert.ok(discovery.body.tools.some((tool) => tool.name === "get_project_changes"));

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
  const timeoutAt = Date.now() + 90_000;
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
  const { status, text } = await curlJson(url, { method: "GET" });
  return {
    status,
    body: JSON.parse(text || "null")
  };
}

async function getText(url) {
  const { status, text } = await curlJson(url, { method: "GET", rawText: true });
  return {
    status,
    text
  };
}

async function postJson(url, body) {
  const { status, text } = await curlJson(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return {
    status,
    body: JSON.parse(text || "null")
  };
}

async function curlJson(url, { method = "GET", body = undefined, rawText = false } = {}) {
  const args = ["-k", "-sS", "-D", "-", "-o", "-"];
  if (method !== "GET") {
    args.push("-X", method);
  }
  if (body !== undefined) {
    args.push("-H", "content-type: application/json", "--data-binary", body);
  }
  args.push(url);

  const { stdout } = await execFileAsync("curl", args, {
    cwd,
    maxBuffer: 1024 * 1024 * 16
  });

  const splitIndex = stdout.indexOf("\r\n\r\n");
  const headerBlock = splitIndex >= 0 ? stdout.slice(0, splitIndex) : stdout;
  const text = splitIndex >= 0 ? stdout.slice(splitIndex + 4) : "";
  const statusLine = headerBlock.split(/\r?\n/)[0] ?? "";
  const status = Number(statusLine.split(" ")[1] ?? 0);
  return { status, text: rawText ? text : text.trimStart() };
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
  const ids = new Set();
  for (const match of projectInserts) {
    for (const row of match[0].matchAll(/^\('([^']+)'\s*,/gm)) {
      ids.add(row[1]);
    }
  }
  return ids.size;
}
