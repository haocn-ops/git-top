import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.ts";
import { handleMcp } from "../src/mcp.ts";
import { normalizeAnalyticsPoint, recordAdoptionEvent, responseSizeBucket, summarizeAdoptionEvents } from "../src/adoption-analytics.ts";
import { adoptionAnalyticsDataset, buildAdoptionExportQuery, parseAdoptionExportOptions } from "../src/adoption-export.ts";
import { buildAdoptionOperationsReport, parseAdoptionReportOptions, renderAdoptionOperationsMarkdown } from "../src/adoption-report.ts";
import { attributedEndpoint } from "../src/connect-page.ts";

test("MCP core profile exposes only the first-use project decision tools", async () => {
  const response = await handleMcp(new Request("https://git.top/mcp/core"), {}, { profile: "core" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.profile, "core");
  assert.equal(body.endpoint, "/mcp/core");
  assert.deepEqual(body.tools.map((tool) => tool.name), [
    "search_projects",
    "get_project",
    "recommend_project",
    "get_agent_workflow",
    "compare_projects"
  ]);
  assert.equal(body.profiles.core.tool_count, 5);
  assert.equal(body.profiles.full.endpoint, "/mcp");
  assert.ok(body.tools.every((tool) => tool.annotations?.read_only_hint === true));
  assert.ok(body.tools.every((tool) => tool.annotations?.open_world_hint === false));
  assert.ok(body.tools.every((tool) => tool.annotations?.destructive_hint === false));
  const rpcResponse = await handleMcp(new Request("https://git.top/mcp/core", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
  }), {}, { profile: "core" });
  const rpcBody = await rpcResponse.json();
  assert.ok(rpcBody.result.tools.every((tool) => tool.annotations?.readOnlyHint === true));
  assert.ok(rpcBody.result.tools.every((tool) => tool.annotations?.openWorldHint === false));
  assert.ok(rpcBody.result.tools.every((tool) => tool.annotations?.destructiveHint === false));
});

test("MCP core profile rejects full-surface tools without running them", async () => {
  const response = await handleMcp(
    new Request("https://git.top/mcp/core?source=registry-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_trust_gate", arguments: {} }
      })
    }),
    {},
    { profile: "core" }
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, -32601);
  assert.match(body.error.message, /not available in the core MCP profile/);
});

test("MCP adoption analytics records bounded protocol outcomes when configured", async () => {
  const points = [];
  const env = {
    ADOPTION_ANALYTICS: {
      writeDataPoint(point) {
        points.push(point);
      }
    }
  };

  await handleMcp(
    new Request("https://git.top/mcp/core?source=registry-test", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "codex/1.2.3" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: "Codex", version: "1.2.3" } }
      })
    }),
    env,
    { profile: "core" }
  );

  await handleMcp(
    new Request("https://git.top/mcp/core", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "codex/1.2.3" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
    }),
    env,
    { profile: "core" }
  );

  assert.equal(points.length, 2);
  assert.deepEqual(points.map((point) => point.blobs[0]), ["mcp_initialize", "mcp_tools_list"]);
  assert.ok(points.every((point) => point.indexes === undefined));
  assert.equal(points[0].blobs[1], "core");
  assert.equal(points[0].blobs[2], "codex");
  assert.equal(points[0].blobs[3], "1.2.3");
  assert.equal(points[0].blobs[7], "registry-test");
  assert.equal(points[0].blobs[8], "small");
  assert.equal(points[0].doubles[0], 200);
  assert.ok(Number.isFinite(points[0].doubles[1]) && points[0].doubles[1] >= 0, "initialize should record bounded latency");
  assert.ok(Number.isFinite(points[1].doubles[1]) && points[1].doubles[1] >= 0, "tools/list should record bounded latency");

  await handleMcp(
    new Request("https://git.top/mcp/core?source=registry-test", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "codex/1.2.3" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_agent_workflow", arguments: { intent: "choose an agent framework", limit: 2 } }
      })
    }),
    env,
    { profile: "core" }
  );

  assert.deepEqual(points.slice(2).map((point) => point.blobs[0]), ["mcp_tool_call_completed", "workflow_completed"]);
  assert.equal(points[2].blobs[4], "get_agent_workflow");
  assert.equal(points[2].blobs[6], "seed");
  assert.equal(points[2].blobs[7], "registry-test");
});

test("connect page and config event are public and degrade without analytics", async () => {
  const executionContext = { waitUntil() {} };
  const page = await worker.fetch(new Request("https://git.top/connect?source=test"), {}, executionContext);
  const pageText = await page.text();
  assert.equal(page.status, 200);
  assert.match(pageText, /https:\/\/git\.top\/mcp\/core/);
  assert.match(pageText, /https:\/\/git\.top\/mcp\/core\?source=test/);
  assert.match(pageText, /codex mcp add git-top/);
  assert.match(pageText, /claude mcp add --transport http/);

  const event = await worker.fetch(new Request("https://git.top/connect/event?client=codex", { method: "POST" }), {}, executionContext);
  assert.equal(event.status, 204);
  const genericEvent = await worker.fetch(new Request("https://git.top/connect/event?client=generic&source=catalog", { method: "POST" }), {}, executionContext);
  assert.equal(genericEvent.status, 204);
});

test("connect campaign attribution continues into copied MCP endpoints", async () => {
  assert.equal(attributedEndpoint(), "https://git.top/mcp/core");
  assert.equal(attributedEndpoint("mcp-registry"), "https://git.top/mcp/core?source=mcp-registry");

  const page = await worker.fetch(new Request("https://git.top/connect?source=Smithery%20Campaign"), {}, { waitUntil() {} });
  const pageText = await page.text();
  assert.match(pageText, /https:\/\/git\.top\/mcp\/core\?source=smitherycampaign/);
  assert.doesNotMatch(pageText, /Smithery%20Campaign/);
});

test("analytics response size buckets stay bounded", () => {
  assert.equal(responseSizeBucket(undefined), "unknown");
  assert.equal(responseSizeBucket(0), "empty");
  assert.equal(responseSizeBucket(16_384), "small");
  assert.equal(responseSizeBucket(16_385), "medium");
  assert.equal(responseSizeBucket(262_145), "very_large");
});

test("analytics write failures are isolated from product responses", () => {
  assert.doesNotThrow(() =>
    recordAdoptionEvent(
      { ADOPTION_ANALYTICS: { writeDataPoint() { throw new Error("analytics unavailable"); } } },
      { name: "connect_page_view", status: 200, durationMs: 25, campaignSource: "test input" }
    )
  );
});

test("adoption metrics summarize the funnel without implying unique users", () => {
  const summary = summarizeAdoptionEvents([
    { name: "connect_page_view", campaignSource: "registry", resultClass: "success", durationMs: 12 },
    { name: "connect_config_copy", campaignSource: "registry", resultClass: "success" },
    { name: "mcp_initialize", clientName: "codex", resultClass: "success", durationMs: 20 },
    { name: "mcp_tools_list", clientName: "codex", resultClass: "success", durationMs: 30 },
    { name: "mcp_tool_call_completed", clientName: "codex", operation: "recommend_project", resultClass: "success", source: "d1", durationMs: 100 },
    { name: "mcp_tool_call_completed", clientName: "codex", operation: "get_project", resultClass: "strict_source_rejection", durationMs: 200 },
    { name: "workflow_completed", clientName: "codex", resultClass: "success", source: "d1", durationMs: 300 }
  ]);

  assert.equal(summary.eventCount, 7);
  assert.deepEqual(summary.funnel, {
    connectPageViews: 1,
    connectConfigCopies: 1,
    successfulInitializations: 1,
    successfulToolDiscovery: 1,
    successfulFirstValueCalls: 1,
    successfulWorkflows: 1,
    firstValueCallsPerInitialization: 1
  });
  assert.equal(summary.toolSuccessRate, 0.5);
  assert.equal(summary.strictSourceRejectionRate, 0.5);
  assert.equal(summary.fallbackRate, 0);
  assert.deepEqual(summary.latencyMs, { sampleCount: 2, p50: 100, p95: 200 });
  assert.deepEqual(summary.byClient.codex, {
    connectPageViews: 0,
    configCopies: 0,
    initializeSuccesses: 1,
    toolDiscoverySuccesses: 1,
    firstValueCalls: 1,
    workflowCompletions: 1,
    agentCalls: 2,
    agentCallSuccesses: 1,
    errors: 1
  });
  assert.deepEqual(summary.byCampaignSource.registry, {
    connectPageViews: 1,
    configCopies: 1,
    initializeSuccesses: 0,
    toolDiscoverySuccesses: 0,
    firstValueCalls: 0,
    workflowCompletions: 0,
    agentCalls: 0,
    agentCallSuccesses: 0,
    errors: 0
  });
  assert.deepEqual(summary.attribution, {
    campaignTaggedEvents: 2,
    agentCallsWithCampaign: 0,
    agentCallsWithoutCampaign: 2,
    agentCallAttributionRate: 0
  });
  assert.equal(summary.byOperation.recommend_project.agentCallSuccesses, 1);
  assert.equal(summary.byOperation.get_project.errors, 1);
  assert.deepEqual(summary.insights, {
    strongestClient: "codex",
    strongestCampaignSource: null,
    strongestOperation: "recommend_project",
    primaryFailureMode: "strict_source_rejection"
  });
});

test("first-value calls per initialization is an activity ratio, not a conversion rate", () => {
  const summary = summarizeAdoptionEvents([
    { name: "mcp_initialize", resultClass: "success" },
    { name: "mcp_tool_call_completed", operation: "recommend_project", resultClass: "success" },
    { name: "mcp_tool_call_completed", operation: "get_project", resultClass: "success" }
  ]);

  assert.equal(summary.funnel.firstValueCallsPerInitialization, 2);
});

test("analytics engine rows normalize into the bounded adoption event contract", () => {
  assert.deepEqual(normalizeAnalyticsPoint({
    blob1: "mcp_tool_call_completed",
    blob2: "core",
    blob3: "codex",
    blob4: "1.2.3",
    blob5: "recommend_project",
    blob6: "success",
    blob7: "d1",
    blob8: "registry",
    blob9: "small",
    double1: 200,
    double2: 42
  }), {
    name: "mcp_tool_call_completed",
    profile: "core",
    clientName: "codex",
    clientVersion: "1.2.3",
    operation: "recommend_project",
    resultClass: "success",
    source: "d1",
    campaignSource: "registry",
    responseSizeBucket: "small",
    status: 200,
    durationMs: 42
  });
  assert.equal(normalizeAnalyticsPoint({ blob1: "mcp_initialize", blob3: "unknown" }).clientName, "unknown");
  assert.throws(() => normalizeAnalyticsPoint({ blob1: "unknown_event" }), /Unknown adoption event name/);
});

test("analytics export query is fixed-field and bounded", () => {
  const options = parseAdoptionExportOptions(["--hours", "48", "--limit", "250", "--output", "events.json"]);
  assert.deepEqual(options, { hours: 48, limit: 250, output: "events.json" });
  const query = buildAdoptionExportQuery(options);
  assert.match(query, new RegExp(`FROM ${adoptionAnalyticsDataset}`));
  assert.match(query, /SELECT blob1, blob2, blob3, blob4, blob5, blob6, blob7, blob8, blob9, double1, double2/);
  assert.match(query, /INTERVAL '48' HOUR/);
  assert.match(query, /LIMIT 250/);
  assert.doesNotMatch(query, /prompt|argument|result|repository/i);
});

test("analytics export options reject arbitrary or oversized requests", () => {
  assert.deepEqual(parseAdoptionExportOptions([]), { hours: 24, limit: 10_000, output: null });
  assert.deepEqual(parseAdoptionExportOptions(["--", "--hours", "48"]), { hours: 48, limit: 10_000, output: null });
  assert.throws(() => parseAdoptionExportOptions(["--hours", "0"]), /hours must be an integer from 1 to 720/);
  assert.throws(() => parseAdoptionExportOptions(["--limit", "10001"]), /limit must be an integer from 1 to 10000/);
  assert.throws(() => parseAdoptionExportOptions(["--query", "SELECT 1"]), /Unknown option/);
});

test("adoption operations report compares bounded 7 and 30 day signals while excluding tagged smoke traffic", () => {
  const organicFirstValue = { name: "mcp_tool_call_completed", operation: "recommend_project", resultClass: "success", source: "d1" };
  const smokeFirstValue = { ...organicFirstValue, campaignSource: "production-smoke" };
  const report = buildAdoptionOperationsReport({
    weeklyEvents: [organicFirstValue, smokeFirstValue, { name: "workflow_completed", resultClass: "success", source: "d1" }],
    monthlyEvents: [organicFirstValue, organicFirstValue, smokeFirstValue],
    limit: 10_000,
    generatedAt: "2026-08-14T00:00:00.000Z"
  });

  assert.equal(report.generated_at, "2026-08-14T00:00:00.000Z");
  assert.equal(report.windows.last_7_days.excluded_event_count, 1);
  assert.equal(report.windows.last_7_days.metrics.funnel.successfulFirstValueCalls, 1);
  assert.equal(report.windows.last_30_days.metrics.funnel.successfulFirstValueCalls, 2);
  assert.equal(report.trend.first_value_calls_daily_rate_ratio, 2.143);
  assert.equal(report.adoption_signal.status, "early_signal");
  assert.equal(report.measurement.identity_free, true);
  assert.equal(report.operational_review.status, "attention");
  assert.ok(report.operational_review.items.some((item) => item.code === "campaign_attribution_below_target"));
  const markdown = renderAdoptionOperationsMarkdown(report);
  assert.match(markdown, /Git\.Top Adoption Operations Report/);
  assert.match(markdown, /MCP tool success rate/);
  assert.match(markdown, /Counts are bounded events and calls, not unique users/);
});

test("adoption report options keep production smoke excluded by default", () => {
  assert.deepEqual(parseAdoptionReportOptions([]), {
    limit: 10_000,
    output: null,
    summaryOutput: null,
    failOnTruncated: false,
    excludedCampaignSources: ["production-smoke"]
  });
  assert.deepEqual(parseAdoptionReportOptions(["--limit", "500", "--exclude-source", "production-smoke,operator-check", "--output", "report.json", "--summary-output", "summary.md", "--fail-on-truncated"]), {
    limit: 500,
    output: "report.json",
    summaryOutput: "summary.md",
    failOnTruncated: true,
    excludedCampaignSources: ["production-smoke", "operator-check"]
  });
  assert.throws(() => parseAdoptionReportOptions(["--limit", "10001"]), /limit must be an integer from 1 to 10000/);
  assert.throws(() => parseAdoptionReportOptions(["--summary-output", "--bad"]), /summary-output requires a file path/);
});

test("scheduled adoption report fails closed on missing credentials or truncated data", async () => {
  const workflow = await readFile(new URL("../.github/workflows/adoption-report.yml", import.meta.url), "utf8");
  const packageManifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(workflow, /cron: "40 2 \* \* 1"/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /--summary-output "\$GITHUB_STEP_SUMMARY" --fail-on-truncated/);
  assert.match(workflow, /retention-days: 30/);
  assert.doesNotMatch(workflow, /adoption-events|raw-events/);
  assert.match(packageManifest.scripts["adoption:report"], /--import \.\/scripts\/register-ts-loader\.mjs/);
  assert.match(packageManifest.scripts["adoption:export"], /--import \.\/scripts\/register-ts-loader\.mjs/);
});
