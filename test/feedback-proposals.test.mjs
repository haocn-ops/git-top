import assert from "node:assert/strict";
import test from "node:test";
import { handleApi } from "../src/api.ts";
import { buildFeedbackProposal, parseFeedbackProposal } from "../src/feedback-proposals.ts";
import { mockD1Env } from "../scripts/mock-d1.mjs";

const validFeedback = {
  project_id: "cloudflare/agents",
  feedback_type: "classification",
  proposed: { category: "agent_framework" },
  evidence: [{ url: "https://github.com/cloudflare/agents", field: "README", note: "Repository describes an agent framework." }],
  rationale: "The repository documentation explicitly describes an agent framework.",
  source_agent: "test-agent"
};

test("feedback parsing requires structured evidence and a proposed correction", () => {
  assert.equal(parseFeedbackProposal(validFeedback).ok, true);
  assert.equal(parseFeedbackProposal({ ...validFeedback, evidence: [] }).ok, false);
  assert.equal(parseFeedbackProposal({ ...validFeedback, proposed: {} }).ok, false);
  assert.equal(parseFeedbackProposal({ ...validFeedback, proposed: { value: "x".repeat(17 * 1024) } }).ok, false);
});

test("feedback fingerprint is stable for equivalent corrections", async () => {
  const parsed = parseFeedbackProposal(validFeedback);
  assert.equal(parsed.ok, true);
  const first = await buildFeedbackProposal(parsed.input);
  const second = await buildFeedbackProposal(parsed.input);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.notEqual(first.id, second.id);

  const nestedA = await buildFeedbackProposal({ ...parsed.input, proposed: { classification: { category: "agent_framework", confidence: "high" } } });
  const nestedB = await buildFeedbackProposal({ ...parsed.input, proposed: { classification: { confidence: "high", category: "agent_framework" } } });
  assert.equal(nestedA.fingerprint, nestedB.fingerprint);
});

test("public feedback validates without persisting", async () => {
  const response = await feedbackRequest({}, validFeedback);
  assert.equal(response.status, 200);
  assert.equal(response.body.persisted, false);
  assert.equal(response.body.review_required, true);
  assert.match(response.body.authorization, /FEEDBACK_SECRET/);
});

test("authorized feedback persists and admin review does not mutate project knowledge", async () => {
  const env = { ...mockD1Env(), FEEDBACK_SECRET: "feedback-secret", SYNC_SECRET: "admin-secret" };
  const submitted = await feedbackRequest(env, validFeedback, "feedback-secret");
  assert.equal(submitted.status, 202);
  assert.equal(submitted.body.persisted, true);
  assert.equal(submitted.body.proposal.status, "proposed");

  const list = await apiRequest(env, "/api/admin/feedback-proposals?status=proposed", { headers: { authorization: "Bearer admin-secret" } });
  assert.equal(list.status, 200);
  assert.equal(list.body.proposals.length, 1);

  const reviewed = await apiRequest(env, "/api/admin/feedback-proposals", {
    method: "POST",
    headers: { authorization: "Bearer admin-secret", "content-type": "application/json" },
    body: JSON.stringify({ id: submitted.body.proposal.id, status: "accepted", reviewed_by: "test-reviewer", review_notes: "Evidence verified." })
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.proposal.status, "accepted");
  assert.match(reviewed.body.proposal.review_notes, /verified/);
});

test("an explicitly invalid feedback token is rejected", async () => {
  const response = await feedbackRequest({ ...mockD1Env(), FEEDBACK_SECRET: "correct" }, validFeedback, "wrong");
  assert.equal(response.status, 401);
});

async function feedbackRequest(env, body, token) {
  return apiRequest(env, "/api/feedback/proposals", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
}

async function apiRequest(env, path, init = {}) {
  const response = await handleApi(new Request(`https://git.top${path}`, init), env);
  return { status: response.status, body: await response.json() };
}
