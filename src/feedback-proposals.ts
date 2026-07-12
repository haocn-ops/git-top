import type { Env } from "./types";

export type FeedbackType = "classification" | "alternative" | "metadata" | "stale" | "other";
export type FeedbackStatus = "proposed" | "accepted" | "rejected";

export interface FeedbackProposalInput {
  projectId: string;
  feedbackType: FeedbackType;
  proposed: Record<string, unknown>;
  evidence: Array<{ url?: string; field?: string; value?: unknown; note?: string }>;
  rationale: string;
  sourceAgent: string | null;
  sourceUrl: string | null;
}

export interface FeedbackProposal extends FeedbackProposalInput {
  id: string;
  fingerprint: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface FeedbackProposalRow {
  id: string;
  fingerprint: string;
  project_id: string;
  feedback_type: FeedbackType;
  proposed_json: string;
  evidence_json: string;
  rationale: string;
  source_agent: string | null;
  source_url: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

const feedbackTypes = new Set<FeedbackType>(["classification", "alternative", "metadata", "stale", "other"]);
const feedbackStatuses = new Set<FeedbackStatus>(["proposed", "accepted", "rejected"]);

export function parseFeedbackProposal(body: unknown): { ok: true; input: FeedbackProposalInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Feedback proposal body must be an object." };
  }
  const value = body as Record<string, unknown>;
  const projectId = stringValue(value.project_id ?? value.projectId, 200);
  const feedbackType = stringValue(value.feedback_type ?? value.feedbackType, 40) as FeedbackType | null;
  const rationale = stringValue(value.rationale, 2000);
  const proposed = plainObject(value.proposed);
  const evidence = parseEvidence(value.evidence);
  if (!projectId || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(projectId)) {
    return { ok: false, message: "project_id must be a canonical owner/repo identifier." };
  }
  if (!feedbackType || !feedbackTypes.has(feedbackType)) {
    return { ok: false, message: "feedback_type must be classification, alternative, metadata, stale, or other." };
  }
  if (!rationale || rationale.length < 12) {
    return { ok: false, message: "rationale must contain at least 12 characters." };
  }
  if (!proposed || Object.keys(proposed).length === 0) {
    return { ok: false, message: "proposed must be a non-empty object containing the suggested structured correction." };
  }
  if (jsonBytes(proposed) > 16 * 1024) {
    return { ok: false, message: "proposed must be no larger than 16 KB." };
  }
  if (!evidence.ok) {
    return evidence;
  }
  if (jsonBytes(evidence.value) > 24 * 1024) {
    return { ok: false, message: "evidence must be no larger than 24 KB." };
  }
  return {
    ok: true,
    input: {
      projectId,
      feedbackType,
      proposed,
      evidence: evidence.value,
      rationale,
      sourceAgent: stringValue(value.source_agent ?? value.sourceAgent, 200),
      sourceUrl: httpUrl(value.source_url ?? value.sourceUrl)
    }
  };
}

export async function buildFeedbackProposal(input: FeedbackProposalInput): Promise<FeedbackProposal> {
  const now = new Date().toISOString();
  const fingerprint = await proposalFingerprint(input);
  return {
    ...input,
    id: crypto.randomUUID(),
    fingerprint,
    status: "proposed",
    createdAt: now,
    updatedAt: now,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null
  };
}

export async function persistFeedbackProposal(env: Env, proposal: FeedbackProposal): Promise<FeedbackProposal> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to persist feedback proposals.");
  }
  await env.DB.prepare(
    `INSERT INTO feedback_proposals (
      id, fingerprint, project_id, feedback_type, proposed_json, evidence_json, rationale,
      source_agent, source_url, status, created_at, updated_at, reviewed_by, reviewed_at, review_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      evidence_json = excluded.evidence_json,
      rationale = excluded.rationale,
      source_agent = COALESCE(excluded.source_agent, feedback_proposals.source_agent),
      source_url = COALESCE(excluded.source_url, feedback_proposals.source_url),
      updated_at = excluded.updated_at
    WHERE feedback_proposals.status = 'proposed'`
  ).bind(...proposalBindings(proposal)).run();
  const stored = await env.DB.prepare("SELECT * FROM feedback_proposals WHERE fingerprint = ?").bind(proposal.fingerprint).first<FeedbackProposalRow>();
  return stored ? rowToFeedbackProposal(stored) : proposal;
}

export async function listFeedbackProposals(env: Env, options: { status?: FeedbackStatus; limit?: number } = {}): Promise<FeedbackProposal[]> {
  if (!env.DB) {
    return [];
  }
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 50)));
  const statement = options.status
    ? env.DB.prepare("SELECT * FROM feedback_proposals WHERE status = ? ORDER BY created_at DESC LIMIT ?").bind(options.status, limit)
    : env.DB.prepare("SELECT * FROM feedback_proposals ORDER BY created_at DESC LIMIT ?").bind(limit);
  const rows = await statement.all<FeedbackProposalRow>();
  return (rows.results ?? []).map(rowToFeedbackProposal);
}

export async function reviewFeedbackProposal(
  env: Env,
  input: { id: string; status: "accepted" | "rejected"; reviewedBy: string; reviewNotes?: string | null }
): Promise<FeedbackProposal | null> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to review feedback proposals.");
  }
  const reviewedAt = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE feedback_proposals
     SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
     WHERE id = ? AND status = 'proposed'`
  ).bind(input.status, input.reviewedBy, reviewedAt, input.reviewNotes ?? null, reviewedAt, input.id).run();
  const row = await env.DB.prepare("SELECT * FROM feedback_proposals WHERE id = ?").bind(input.id).first<FeedbackProposalRow>();
  return row ? rowToFeedbackProposal(row) : null;
}

export function parseFeedbackStatus(value: unknown): FeedbackStatus | null {
  return typeof value === "string" && feedbackStatuses.has(value as FeedbackStatus) ? (value as FeedbackStatus) : null;
}

async function proposalFingerprint(input: FeedbackProposalInput): Promise<string> {
  const normalized = JSON.stringify({
    project_id: input.projectId.toLowerCase(),
    feedback_type: input.feedbackType,
    proposed: canonicalize(input.proposed)
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function proposalBindings(proposal: FeedbackProposal): unknown[] {
  return [
    proposal.id, proposal.fingerprint, proposal.projectId, proposal.feedbackType,
    JSON.stringify(proposal.proposed), JSON.stringify(proposal.evidence), proposal.rationale,
    proposal.sourceAgent, proposal.sourceUrl, proposal.status, proposal.createdAt, proposal.updatedAt,
    proposal.reviewedBy, proposal.reviewedAt, proposal.reviewNotes
  ];
}

function rowToFeedbackProposal(row: FeedbackProposalRow): FeedbackProposal {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    projectId: row.project_id,
    feedbackType: row.feedback_type,
    proposed: parseJson(row.proposed_json, {}),
    evidence: parseJson(row.evidence_json, []),
    rationale: row.rationale,
    sourceAgent: row.source_agent,
    sourceUrl: row.source_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes
  };
}

function parseEvidence(value: unknown): { ok: true; value: FeedbackProposalInput["evidence"] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    return { ok: false, message: "evidence must contain 1 to 10 structured evidence objects." };
  }
  const parsed: FeedbackProposalInput["evidence"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "Each evidence item must be an object." };
    }
    const data = item as Record<string, unknown>;
    const evidence = {
      ...(httpUrl(data.url) ? { url: httpUrl(data.url)! } : {}),
      ...(stringValue(data.field, 200) ? { field: stringValue(data.field, 200)! } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(stringValue(data.note, 1000) ? { note: stringValue(data.note, 1000)! } : {})
    };
    if (Object.keys(evidence).length === 0) {
      return { ok: false, message: "Each evidence item must include url, field, value, or note." };
    }
    parsed.push(evidence);
  }
  return { ok: true, value: parsed };
}

function stringValue(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function plainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function httpUrl(value: unknown): string | null {
  const raw = stringValue(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
