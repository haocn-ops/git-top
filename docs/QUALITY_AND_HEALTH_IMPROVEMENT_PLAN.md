# Git.Top Quality and Health Improvement Plan

## Context

The public V1 baseline is healthy: local validation passes, production D1 is available, sync is fresh, and the curated seed set covers all V1 categories.

The next reliability work should make operational and data-quality risks harder to miss. The current production checks can report a perfect quality score while still showing meaningful review load, and `/api/health` can count raw project rows differently from the knowledge-ready project set used by search and quality endpoints.

## Goals

1. Make project count semantics explicit across health, quality, and knowledge endpoints.
2. Keep the existing quality score stable for release gating, but add a visible risk layer for classification confidence, collection review load, and stale data.
3. Expand evaluation coverage from fixed happy-path cases toward realistic agent queries and ambiguous recommendations.

## Phase 1: Count Semantics and Visible Risk

Status: complete.

Tasks:

- Add `rawProjectCount` to `/api/health` for the physical `projects` table count.
- Keep `projectCount` aligned with the knowledge-ready count used by `/api/search`, `/api/quality`, and MCP tools.
- Add `knowledgeReadyProjectCount` to `/api/health` so clients can compare raw rows and usable knowledge rows directly.
- Add a health warning when raw project rows exceed knowledge-ready rows.
- Add a quality `riskLevel` and `riskSummary` next to the existing release-gate `score`.
- Keep `score` backward compatible so current scripts and dashboards do not break.

Acceptance criteria:

- `/api/health` no longer forces clients to infer whether `project_count` means raw database rows or complete project knowledge.
- `/api/quality` can return `score: 100` while still clearly surfacing review risk.
- Focused API and DB validation cover the new fields.

## Phase 2: Evaluation Expansion

Status: complete for the first CI-safe expansion batch.

Tasks:

- Add more real agent-style prompts to `data/eval-cases.json`.
- Include ambiguous requests such as "best lightweight agent framework for Workers", "MCP server for GitHub automation", and "local RAG stack with observability".
- Track not only hit rate, but also whether the explanation mentions data source, confidence, and deployment caveats.
- Add a small set of negative tests where Cloudflare is mentioned but direct Workers deployment is not appropriate.

Acceptance criteria:

- CI-safe eval remains fast, but includes more ambiguity than current exact-intent cases.
- Local eval remains the place for broader ranking experiments.

Completion notes:

- CI-safe eval now includes 28 cases, up from 24.
- Added Workers-native agent framework coverage.
- Added GitHub repository automation MCP coverage.
- Added Cloudflare-hostable MCP server coverage.
- Added local RAG plus observability recommendation coverage.
- `pnpm eval:quality` remains fully green: top-1, top-3, category, deployment, and Cloudflare readiness rates are all `1.0`.

Backlog:

- Continue adding ambiguous queries that stress both project selection and explanation quality.
- Keep local ranking probes broader than the CI-safe gate so ranking improvements can be evaluated before promotion.

## Phase 3: Curation Loop

Status: complete for the first release-checklist pass.

Tasks:

- Convert the low-confidence review report into a weekly or release-candidate checklist.
- Prioritize projects with high traffic, high stars, or frequent recommendation appearances.
- Use classification overrides for reviewed corrections rather than changing generated logic for one-off cases.
- Track stale collections separately from executable projects in release notes.

Acceptance criteria:

- Data review work is visible before release.
- Corrected classifications have a durable audit trail.
- Collection-style repositories do not dilute confidence in executable project recommendations.

Completion notes:

- `pnpm quality:review` now writes a release-candidate checklist at the top of `docs/LOW_CONFIDENCE_REVIEW.md`.
- Checklist rows are prioritized by classification risk and then by repository star count.
- Collection-style repositories now have a separate summary from metadata exception items.
- The report documents the correction loop: inspect source evidence, use classification overrides for one-off corrections, add hints/eval cases for systemic issues, then re-run review and eval commands.

## Implementation Notes

Phase 1 implementation is complete in the local codebase:

- `/api/health` now separates `projectCount`, `rawProjectCount`, and `knowledgeReadyProjectCount`.
- `/api/health` emits metadata warnings when raw project rows are not complete knowledge rows.
- `/api/quality` now includes `riskLevel` and `riskSummary` while preserving the existing `score`.
- Focused DB and API validation cover the new fields.
- CI-safe eval now has 28 cases covering the first Phase 2 expansion batch.
- `docs/LOW_CONFIDENCE_REVIEW.md` now starts with a prioritized release-candidate checklist and correction loop.

Post-plan ranking follow-up is now complete for the first runtime pass:

- Added `local-target-github-mcp-broad-query` to the local eval suite.
- `pnpm eval:ranking` now reports whether ranking strategies preserve GitHub MCP repository-automation intent.
- `docs/RANKING_EXPERIMENTS.md` documents the targeted probe and promotion guardrail.
- Runtime search now applies `specificIntentBoost` so owner/name/topic terms such as `github` are preserved in both normal and browse ranking.
- Focused core validation now includes a regression case for preserving GitHub MCP specific intent against a stronger generic MCP automation candidate.
- Focused API and MCP validation now covers Agent Card/project collection schema fields and MCP `ranking: "browse"` discovery.
- Focused validation now runs `quality:check` against a local mock quality endpoint so release summary fields such as `risk_level` and `risk_reason_count` stay covered without relying on production.
- The current runtime baseline is the strongest overall ranking result after the latest fixture cleanup; offline browse-quality strategies remain useful probes, but should not be promoted until they improve local discovery without reducing CI-safe exact-intent quality.
- Production smoke health assertions are now importable and covered by focused validation, including D1-required production mode, explicit seed fallback mode, and raw-versus-knowledge-ready count consistency.
- `pnpm db:integration` passed after the health count changes, covering the local Worker plus D1 path for `/api/health`, `/api/search`, project details, quality, sync status, GRP, and MCP routes.

Explanation-level eval is now in place:

- Added `pnpm eval:explanations`.
- The explanation eval checks metadata, classification evidence, quality signal confidence, recommendation reasons/tradeoffs, quality risk explanations, and GRP reasoning metadata.
- The report is written to `docs/EVAL_EXPLANATIONS.md`.
