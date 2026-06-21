# Git.Top Improvement Plan

## Current Position

Git.Top is now a substantially hardened prototype for an agent-native GitHub knowledge layer. It has a coherent product direction, Cloudflare Worker APIs, D1 persistence, GitHub sync, live/seed-aware Next.js pages, MCP tools, and a GRP reasoning surface.

The original trust gap has been addressed: API, MCP, UI, scoring, classification, and sync responses now expose data source, freshness, confidence, or evidence where agents need it.

Status: implementation complete for the planned phases. Remaining work is optional product hardening rather than a blocker for the original improvement plan.

## Goals

1. Make every API and MCP result traceable to its data source.
2. Replace silent seed fallback with explicit metadata.
3. Improve scoring and classification from keyword heuristics toward auditable signals.
4. Align the frontend with the live Worker/D1 API instead of static seed-only views.
5. Add focused tests around API behavior, MCP tools, sync, scoring, and GRP.

## Phase 1: Trust and Observability - Complete

- Add response metadata to API and MCP results:
  - `source`: `d1` or `seed`
  - `reason`: `db_missing`, `db_empty`, `db_error`, or `d1_query`
  - `project_count`
  - `generated_at`
  - `warnings` when seed fallback is used
- Keep seed fallback for development and demos, but make it visible to callers.
- Expose the same source metadata from `/api/health`, `/api/quality`, `/api/search`, `/api/recommend`, `/api/compare`, `/api/graph`, `/api/grp/query`, and MCP tool results.
- Avoid duplicate D1 reads inside a single API or MCP request so data results and metadata describe the same loaded knowledge snapshot.

Acceptance criteria:

- A client can tell whether an answer came from D1 or seed data.
- A D1 error no longer looks identical to a successful live query.
- Seed fallback includes a human-readable warning.
- TypeScript and production Next build pass.

## Phase 2: Better Signals - Complete

- Replace estimated `stars_30d_delta` with real snapshot deltas from `star_snapshots`.
- Fall back to an estimate only when there is not yet enough snapshot history.
- Prefer a snapshot at least 30 days old for `stars_30d_delta`; if unavailable, allow a minimum 7-day snapshot and expose the actual window length.
- Return sync-time metric provenance for `stars_30d_delta` so callers can distinguish `snapshot` from `estimated`.
- Page GitHub API calls where needed for commits, releases, and contributors.
- Bound GitHub pagination to protect rate limits and mark capped/failed signal counts as `partial` or `unknown`.
- Store a `signal_confidence` or per-field confidence object for metrics derived from partial GitHub data.
- Add `last_successful_sync_at`, `last_failed_sync_at`, and `last_error` style fields to sync status.
- Derive sync `health` from recent runs so operators can distinguish healthy, degraded, and unknown sync state.

Acceptance criteria:

- Growth score is based on stored observations, not repository age averages.
- First sync remains usable through an explicit estimated fallback.
- Snapshot-based star growth reports the actual snapshot window length.
- Metrics expose enough confidence information for agents to reason cautiously.
- Admin sync output identifies whether star growth came from snapshots and whether paged GitHub signals are complete, partial, or unknown.
- `/api/sync/status` exposes last successful sync, last failed sync, last error, and current sync health.

## Phase 3: Classification Quality - Complete

- Split agent card generation into explicit detectors:
  - category detector
  - deployment detector
  - runtime blocker detector
  - difficulty detector
  - use-case detector
- Add confidence scores and evidence snippets for every classification.
- Persist Agent Card classification evidence so API and MCP callers can inspect why category, deployment, difficulty, and Cloudflare readiness were assigned.
- Add regression fixtures for known categories such as Cloudflare agent frameworks, RAG frameworks, MCP servers, browser agents, and coding agents.
- Validate seed knowledge and generated category fixtures in `pnpm knowledge:validate`.

Acceptance criteria:

- Category/deployment mistakes are testable across representative generated fixtures.
- Agent Card output can explain why a label was assigned.
- Existing databases can fall back to empty classification metadata until the classification migration is applied.
- Generated Agent Cards must pass classification structure validation before sync writes them to D1.

## Phase 4: Product Surface Alignment - Complete

- Decide whether Next.js is the primary public UI, an internal dashboard, or a static marketing/demo shell.
- Move project listing/detail/graph pages toward live API data when deployed.
- Mark user, tenant, registration, and reports pages as console prototypes or remove them from primary navigation until backed by real data.
- Show data source/freshness in the UI.

Acceptance criteria:

- The UI and API tell the same product story.
- Users do not confuse static demo pages with live knowledge.

## Phase 5: Test and Release Discipline - Complete

- Add unit tests for:
  - `handleApi` routing
  - MCP `tools/list` and `tools/call`
  - row-to-domain mapping
  - scoring
  - alternatives
  - GRP request normalization
- Add integration tests with a mocked D1 binding.
- Add CI commands for `pnpm check`, seed validation, and API behavior tests.

Acceptance criteria:

- Core API and MCP behavior can be changed safely.
- Regressions in project scoring and routing are caught before deploy.

## Completed Implementation Notes

- API and MCP responses expose source metadata for D1, seed fallback, empty DB, and DB error paths.
- Metrics include snapshot-based star deltas where possible and confidence metadata for partial GitHub signals.
- Agent Card classification is split into a dedicated module and includes confidence/evidence.
- D1 schema migrations cover metric confidence and classification JSON.
- Next.js project and graph pages can read live Worker API data through `NEXT_PUBLIC_GIT_TOP_API_BASE`, with explicit seed fallback display.
- Console prototype pages are removed from primary navigation and redirect to real product surfaces.
- Validation scripts now cover seed data, generated knowledge fixtures, DB row mapping, core logic, API routing, MCP tools, TypeScript, and Next production build.
- GitHub Actions runs `pnpm validate` on pull requests and pushes to `main`.

## Optional Backlog

1. Replace the Node strip-types validation scripts with a formal test runner if the project grows.
2. Add Wrangler-based integration tests against a real local D1 database.
3. Add deployment preview checks that call a deployed Worker after CI.
4. Completed: `/register` is removed from primary navigation and redirects to `/projects` until backed by real account persistence.
5. Add visual regression or Playwright coverage for the Next.js project and graph pages.
