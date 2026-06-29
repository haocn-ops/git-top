# Git.Top Post-V1 Improvement Plan

Git.Top is a solid public V1 baseline: the Worker API is authoritative, D1-backed production checks exist, the seed corpus covers 500 repositories, and CI-safe evals protect exact search, recommendation, MCP, and GRP behavior. The next stage should focus on trust, scaling, and reducing split-runtime maintenance cost.

## Priorities

1. Trustworthy production reads.
   High-confidence agent calls need a fail-closed path that refuses seed fallback when D1 is missing, empty, or failing.

2. Broad discovery ranking.
   Exact-intent ranking is strong, but local eval still shows broad category and deployment misses. Promote browse-mode improvements only when CI-safe exact-intent cases remain green.

3. Data access scaling.
   The current D1 read path is intentionally simple and capped at 500 knowledge-ready rows. Before expanding beyond the V1 seed size, add pagination or a dedicated search/ranking pipeline.

4. Runtime/UI consolidation.
   The Worker is now the single production UI/API runtime. The previous Next.js preview layer has been removed to avoid split surface maintenance.

5. Module boundaries.
   `src/db.ts` and `src/grp.ts` are large enough that future changes should extract query, mapping, sync-state, override, and reasoning submodules.

## Phase 1: Strict Data-Source Mode

Status: complete.

Goal: agents and production integrations can require live D1-backed knowledge instead of silently accepting seed fallback.

Deliverables:

- REST knowledge endpoints accept `require_d1=true`.
- MCP knowledge tools accept `require_d1: true`.
- Strict mode returns a clear unavailable-data error when metadata source is not `d1`.
- API and MCP docs show when to use strict mode.
- Regression tests cover strict success with mocked D1 and strict failure for seed fallback.

Completion notes:

- REST knowledge endpoints now return `503 d1_required` when `require_d1=true` would otherwise use seed fallback.
- MCP knowledge tools now return JSON-RPC tool error `-32003` when `require_d1: true` would otherwise use seed fallback.
- API and MCP validation scripts cover strict failure and mocked-D1 success paths.

Acceptance criteria:

- Existing fallback behavior remains unchanged when strict mode is omitted.
- D1-backed mocked routes still succeed with strict mode enabled.
- Missing, empty, or failing D1 sources fail closed for strict requests.

## Phase 2: Browse Ranking Promotion

Status: complete.

Goal: improve broad category/deployment discovery without hurting exact-intent queries.

Deliverables:

- Review `docs/RANKING_EXPERIMENTS.md` and promote the best `intent_aware_browse` behavior where it is already opt-in.
- Add or update local eval cases for broad `agent_framework`, `rag_framework`, `docker`, `local`, `library_only`, and `serverless` discovery.
- Keep default search exact-intent first; use browse mode only when the caller opts in or the UI is explicitly in browse/discovery mode.

Completion notes:

- Runtime search already exposes opt-in `ranking=browse` with quality-weighted broad discovery and specific-intent protection.
- Local generated category, deployment, and Cloudflare-readiness probes now explicitly use `ranking: "browse"` so broad discovery is continuously evaluated through the promoted runtime path.
- The targeted GitHub MCP probe stays on default exact-intent ranking to guard against browse-style quality boosts leaking into specific user intent.

Acceptance criteria:

- CI-safe eval top-1/top-3 remains 1.0.
- Local eval broad-discovery top-1/top-3 improves over the current baseline.
- GitHub MCP and other owner/name/topic intent probes stay in the expected top results.

## Phase 3: D1 Pagination and Search Shape

Status: complete for bounded D1 pagination; dedicated search indexing remains future work.

Goal: remove the implicit 500-row runtime ceiling before post-V1 corpus growth.

Deliverables:

- Add pagination for project listing or search candidates.
- Decide whether ranking is computed in memory from paged D1 rows, precomputed into indexed fields, or moved into a dedicated search store.
- Update quality and smoke checks to detect incomplete indexed coverage.

Completion notes:

- D1 knowledge loading now pages through knowledge-ready rows in 500-row batches instead of using a single fixed `LIMIT 500`.
- Runtime ranking remains in memory, but the bounded load limit is explicit through `metadata.loaded_project_limit`.
- D1-backed metadata now exposes `truncated`; when true, responses include a warning that search and recommendations may not include every indexed project.
- DB mapping validation covers loading more than one page and reaching the load limit.

Acceptance criteria:

- Production can index more than 500 repositories without hiding valid knowledge.
- Search/recommendation latency stays acceptable for the public Worker.

## Phase 4: UI Runtime Decision

Status: complete; the repository is Worker-only.

Goal: keep Worker-rendered pages as the single product surface.

Deliverables:

- Declare the Worker-only production UI path in deployment docs.
- Implement new human pages in the Worker route tree.
- Keep API, MCP, sync, and human pages in the same runtime.

Completion notes:

- Deployment docs now explicitly state that the Worker owns routing, data loading, API, MCP, sync behavior, and human pages.
- The Next.js preview layer has been removed.
- Prototype console routes stay redirected until backed by real persistence.

Acceptance criteria:

- A new contributor can tell which UI owns production behavior.
- Navigation, copy, and data-source labeling match across the public surface.

## Phase 5: Module Extraction

Status: complete.

Goal: make future changes easier to review and safer to ship.

Suggested extraction order:

- `src/db.ts` to query/mapping/sync-state/override modules.
- `src/grp.ts` to request normalization, candidate selection, explanation, and response builders.
- Shared source metadata helpers for REST, MCP, and UI.

Progress notes:

- Added `src/source-policy.ts` as a shared source-policy helper for REST and MCP strict D1 handling.
- Extracted `src/db-mapping.ts` for D1 row-to-domain conversion and JSON field parsing.
- Extracted `src/sync-status.ts` for sync health, freshness, cursor, next-batch, and recent-run status shaping.
- Extracted `src/grp-request.ts` for GRP request types, mode validation, constraints, and context normalization.
- Extracted `src/grp-response.ts` for GRP response typing, result-type selection, and top-level explanation text.
- Extracted `src/grp-decomposition.ts` for goal decomposition, capability inference, and keyword extraction.
- Extracted `src/grp-types.ts` for shared GRP graph, score, path, stack, alternative, and comparison types.
- Extracted `src/grp-candidates.ts` for GRP candidate retrieval, project-node scoring, constraint scoring, and named-project matching.
- Extracted `src/grp-graph.ts` for GRP graph expansion, concept nodes, deployment/use-case/dependency edges, compatibility edges, and generated alternatives.
- Extracted `src/grp-paths.ts` for GRP solution path construction, stack role selection, path scoring, path explanations, and tradeoff generation.
- Extracted `src/grp-comparison.ts` for compare-mode project matching, indexed/unindexed comparison summaries, overlap, differences, and winner reasoning.
- Extracted `src/grp-alternatives.ts` for recommended-stack alternative output assembly; `src/grp.ts` is now a small GRP orchestration entrypoint.
- Extracted `src/project-search.ts` for pure in-memory project lookup, search ranking, trending, recommendations, and alternatives while keeping `src/db.ts` as the compatibility export surface for existing callers.
- Extracted `src/knowledge-source.ts` for D1 knowledge loading, pagination, seed fallback metadata, and knowledge-ready row counts while keeping `src/db.ts` as the stable caller-facing module.
- Extracted `src/db-sync-store.ts` for sync cursor/run storage, sync status inputs, synced project counts, and star snapshot lookup.
- Extracted `src/db-write-store.ts` for project knowledge upserts, classification overrides, and alternatives updates; `src/db.ts` is now a thin compatibility facade plus health/read wrappers.
- Migrated internal callers and scripts toward focused modules (`project-search`, `knowledge-source`, `db-sync-store`, and `db-write-store`) so `src/db.ts` is now primarily used for health/metadata compatibility.
- Extracted `src/health.ts` for health response shaping and D1/sync freshness checks; `src/db.ts` is now a 64-line compatibility facade for legacy imports.
- `src/grp.ts` is now a 51-line orchestration entrypoint that keeps the public GRP API stable while delegating request parsing, candidate selection, graph construction, path generation, comparison, alternatives, and response shaping to focused modules.

Acceptance criteria:

- Existing tests pass without behavior changes.
- Public API shape remains stable.
