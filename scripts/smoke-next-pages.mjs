import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

const port = await findAvailablePort(Number(process.env.GIT_TOP_NEXT_SMOKE_PORT ?? 3210));
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: false
});

const logs = [];
server.stdout.on("data", (chunk) => logs.push(chunk.toString()));
server.stderr.on("data", (chunk) => logs.push(chunk.toString()));

try {
  await waitForServer(baseUrl);
  const checks = [];

  checks.push(await checkHtml("/", ["GitHub Knowledge Layer for AI Agents", "Agent friendly"], ["Register API"]));
  checks.push(await checkHtml("/projects", ["Project Knowledge", "Agent Search Results"], ["Register API"]));
  checks.push(await checkHtml("/graph", ["Project Knowledge Graph", "Graph API"], ["Register API"]));
  checks.push(await checkHtml("/projects/cloudflare/agents", ["cloudflare/agents", "Project Knowledge"], ["Register API"]));
  checks.push(await checkHtml("/graph/cloudflare-agents", ["Knowledge Graph", "cloudflare/agents"], ["Register API"]));
  checks.push(await checkRedirect("/register", "/projects"));
  checks.push(await checkRedirect("/users", "/projects"));
  checks.push(await checkRedirect("/tenants", "/projects"));
  checks.push(await checkRedirect("/settings", "/projects"));
  checks.push(await checkRedirect("/reports", "/graph"));

  console.log(
    JSON.stringify(
      {
        baseUrl,
        ok: true,
        checked: checks
      },
      null,
      2
    )
  );
} finally {
  server.kill("SIGTERM");
  await waitForExit(server);
}

async function checkHtml(path, requiredText, forbiddenText = []) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  assert.equal(response.status, 200, `${path} should render HTML`);
  const html = await response.text();
  for (const text of requiredText) {
    assert.ok(html.includes(text), `${path} should include "${text}"`);
  }
  for (const text of forbiddenText) {
    assert.equal(html.includes(text), false, `${path} should not include "${text}"`);
  }
  return { name: path, ok: true, status: response.status };
}

async function checkRedirect(path, expectedPath) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `${path} should redirect`);
  const location = response.headers.get("location");
  assert.ok(location, `${path} should include a location header`);
  const redirectUrl = new URL(location, baseUrl);
  assert.equal(redirectUrl.pathname, expectedPath, `${path} should redirect to ${expectedPath}`);
  return { name: path, ok: true, status: response.status, location: redirectUrl.pathname };
}

async function waitForServer(url) {
  const deadline = Date.now() + 20_000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`next start exited early with code ${server.exitCode}: ${logs.join("").slice(-1200)}`);
    }
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`next start did not become ready: ${lastError?.message ?? logs.join("").slice(-1200)}`);
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(findAvailablePort(startPort + 1));
        return;
      }
      reject(error);
    });
    server.listen(startPort, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        resolve(typeof address === "object" && address ? address.port : startPort);
      });
    });
  });
}

function waitForExit(child) {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
