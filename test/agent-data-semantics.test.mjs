import assert from "node:assert/strict";
import test from "node:test";
import { handleApi } from "../src/api.ts";
import { handleMcp } from "../src/mcp.ts";
import { decodeChangeCursor, encodeChangeCursor, listProjectChanges } from "../src/change-feed.ts";
import { projectProfileView } from "../src/project-profiles.ts";
import { mockD1Env } from "../scripts/mock-d1.mjs";
import { seedProjects } from "../src/seed.ts";

test("change cursors are opaque, versioned, and reject invalid input", () => {
  const cursor = encodeChangeCursor(42);
  assert.notEqual(cursor, "42");
  assert.equal(decodeChangeCursor(cursor), 42);
  assert.throws(() => decodeChangeCursor("42"), /valid Git.Top change-feed cursor/);
});

test("change feed paginates and exposes deletion tombstones", async () => {
  const env = mockD1Env({
    syncState: { project_change_feed_started_at: "2026-07-01T00:00:00.000Z" },
    projectChanges: [
      changeRow(1, "added", "cloudflare/agents"),
      changeRow(2, "updated", "openai/codex"),
      changeRow(3, "deleted", "old/project")
    ]
  });
  const first = await listProjectChanges(env, { limit: 2 });
  assert.equal(first.changes.length, 2);
  assert.equal(first.page.has_more, true);
  assert.ok(first.page.next_cursor);

  const second = await listProjectChanges(env, { cursor: first.page.next_cursor, limit: 2 });
  assert.equal(second.changes.length, 1);
  assert.equal(second.changes[0].project_id, "old/project");
  assert.equal(second.changes[0].tombstone, true);
  assert.equal(second.page.has_more, false);
  assert.ok(second.page.next_cursor);
  assert.equal(second.retention.days, 30);
  assert.equal(second.retention.earliest_guaranteed_at, "2026-07-01T00:00:00.000Z");
});

test("project profiles provide bounded compact and evidence payloads", () => {
  const project = seedProjects[0];
  const compact = projectProfileView(project, "compact");
  assert.equal(compact.project_id, project.project.fullName);
  assert.ok(!("evidence" in compact));

  const evidence = projectProfileView(project, "evidence");
  assert.equal(evidence.project_id, project.project.fullName);
  assert.ok(evidence.evidence);
  assert.ok(!("description" in evidence));

  const decision = projectProfileView(project, "decision");
  assert.equal(decision.projectId, project.project.fullName);
  assert.ok(decision.summary);
});

test("batch project API preserves request order and reports missing ids", async () => {
  const existing = seedProjects.slice(0, 2).map((item) => item.project.fullName);
  const response = await handleApi(new Request("https://git.top/api/projects?require_d1=true", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project_ids: [existing[1], "missing/project", existing[0]], profile: "compact" })
  }), mockD1Env({ knowledge: seedProjects.slice(0, 2) }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.projects.map((item) => item.project_id), [existing[1], existing[0]]);
  assert.deepEqual(body.missing, ["missing/project"]);
  assert.equal(body.metadata.source, "d1");
});

test("change API fails closed without D1", async () => {
  const response = await handleApi(new Request("https://git.top/api/changes"), {});
  assert.equal(response.status, 503);
});

test("MCP exposes batch reads and D1 change feed", async () => {
  const projectId = seedProjects[0].project.fullName;
  const env = mockD1Env({
    knowledge: seedProjects.slice(0, 1),
    projectChanges: [changeRow(1, "added", projectId)]
  });
  const batch = await mcpCall(env, "get_projects_batch", { project_ids: [projectId], profile: "evidence", require_d1: true });
  assert.equal(batch.projects[0].project_id, projectId);
  assert.ok(batch.projects[0].evidence);
  assert.equal(batch.metadata.source, "d1");

  const changes = await mcpCall(env, "get_project_changes", { limit: 10 });
  assert.equal(changes.changes[0].project_id, projectId);
  assert.equal(changes.retention.days, 30);
  assert.equal(changes.metadata.source, "d1");
});

function changeRow(id, changeType, projectId) {
  return {
    id,
    project_id: projectId,
    change_type: changeType,
    changed_fields_json: JSON.stringify(["project"]),
    before_json: changeType === "deleted" ? JSON.stringify({ full_name: projectId }) : null,
    after_json: changeType === "deleted" ? null : JSON.stringify({ full_name: projectId }),
    occurred_at: `2026-07-12T00:00:0${id}.000Z`
  };
}

async function mcpCall(env, name, args) {
  const response = await handleMcp(new Request("https://git.top/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return JSON.parse(body.result.content[0].text);
}
