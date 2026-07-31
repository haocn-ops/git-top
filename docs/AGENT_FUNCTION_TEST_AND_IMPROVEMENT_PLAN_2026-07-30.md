# Git.Top Agent Function Test and Improvement Plan

Date: 2026-07-30

## Executive Summary

Git.Top's agent-facing product surface is operational and broadly consistent across REST, MCP, GRP, OpenAPI, Agent Map, Trust Gate, evidence, pagination, and feedback governance.

The verification pass completed successfully across local contract tests and production black-box checks:

- 55 focused tests passed.
- REST API, MCP, core logic, TypeScript, explanation, and agent-task validation passed.
- Explanation coverage passed 12/12 checks.
- Agent workflow evaluation passed 10/10 tasks.
- All 21 advertised MCP tools were discovered and exercised.
- Production responses were D1-backed and exposed provenance, evidence, confidence, caveats, and verification timestamps where applicable.

The main actionable defect is inconsistent `limit` validation between REST and MCP search. REST rejects invalid limits, while MCP `search_projects` currently accepts values such as `0`, `-1`, and `101`, producing invalid or misleading pagination metadata. This should be fixed before treating the MCP contract as fully hardened.

## Verified Baseline

### Production Trust and Data

Observed during the 2026-07-30 verification:

| Signal | Result |
| --- | ---: |
| D1 availability | available |
| Knowledge-ready projects | 1,005 |
| Sync health | healthy |
| Sync freshness | fresh |
| Trust Gate | allow |
| Release score | 100/100 |
| Data trust score | 90/100 |
| Risk level | medium |
| Hot corpus stale rate | 5% |
| Recommendation top-1 hit rate | 92.9% |
| Recommendation top-3 hit rate | 100% |
| Explanation coverage | 100% |

### Local Validation

The following commands passed:

```sh
pnpm check
pnpm test:focused
pnpm api:validate
pnpm mcp:validate
pnpm core:validate
pnpm eval:explanations
pnpm eval:agent-tasks
```

The agent-task evaluation covered:

- Trust-first D1 preflight.
- Seed fallback disclosure and strict D1 rejection.
- Snapshot-bound pagination.
- Project evidence to alternatives to comparison.
- Change-feed tombstones.
- Review-gated feedback.
- Multilingual and typo intent handling.
- Renamed-project alias resolution.

## Production Surface Coverage

### Discovery and Contracts

Verified:

- `/api/agent-map` exposes short and reference paths for agents.
- `/openapi.json` is OpenAPI 3.1 with 49 paths and 68 shared schemas.
- `/mcp` advertises 21 tools and documents the JSON-in-text response contract.
- `/api/health`, `/api/trust`, `/api/quality`, and `/api/benchmark` expose D1 provenance and trust signals.

### Search and Project Analysis

Verified:

- Exact-intent search and scoped recommendation.
- Single and batch project lookup.
- Project evidence, classification confidence, quality-signal confidence, caveats, and `last_verified_at`.
- Alternatives, related projects, deployment, score explanation, graph, comparison, and Atlas.
- Search responses include an opaque, snapshot-bound pagination cursor.

### Planning and Change Handling

Verified:

- Workflow recommendations expose a recommended sequence, shortlist, Trust policy, and Agent Map hints.
- GRP plan and compose modes expose nodes, edges, solution paths, recommended stacks, evidence, and D1 provenance.
- Change Feed returns bounded pages, retention details, and a next cursor.
- Feedback proposals validate structured evidence and remain review-gated instead of mutating project knowledge directly.

### MCP Tool Coverage

All advertised tools were exercised:

```text
search_projects
get_trust_gate
get_quality_report
get_public_benchmark
get_project
get_projects_batch
get_project_changes
propose_project_feedback
get_alternatives
get_related_projects
get_deployment
get_quality_score
recommend_project
get_trends
get_agent_workflow
get_atlas
find_alternatives
get_project_card
get_project_graph
compare_projects
git_top_grp_query
```

Unknown tools and unknown JSON-RPC methods correctly returned `-32601`. Invalid empty batch input and an empty GRP goal correctly returned `-32602`.

## Findings

### P1: Enforce MCP Search Limit Bounds

Status: completed in code on 2026-07-30.

Behavior before this improvement pass:

- REST `/api/search?limit=0` returns `400 invalid_search_request`.
- MCP `search_projects` accepts `limit=0`, `limit=-1`, and `limit=101`.
- Invalid values can produce inconsistent page metadata, including negative or zero limits.

Root cause:

- The MCP schema defines `limit` only as `type: number`.
- `numberArg` checks only that a value is a finite number.
- `search_projects` passes the value into ranking and cursor construction without an integer/range check.

Required change:

- Define `minimum: 1` and `maximum: 100` in the MCP input schema.
- Reject non-integers and out-of-range values with JSON-RPC `-32602`.
- Share or mirror the REST validation semantics so the two surfaces cannot drift.
- Add regression cases for `0`, `-1`, `1.5`, `101`, `NaN`-equivalent input, and a valid boundary value.

Acceptance criteria:

- REST and MCP accept integer limits from 1 through 100.
- REST and MCP reject all other limit values.
- Invalid MCP input returns `error.code=-32602` and does not return a result page.
- `pnpm mcp:validate`, `pnpm test:focused`, and `pnpm eval:agent-tasks` cover the behavior.

Completion notes:

- Added shared MCP limit bounds used by both tool discovery schemas and runtime validation.
- Search, recommendation, and related-project limits are bounded at 100.
- Alternatives, workflow, and Atlas limits are bounded at 20; graph is bounded at 80; trends is bounded at 12.
- Invalid zero, negative, fractional, over-limit, string, and null values return JSON-RPC `-32602` before any knowledge query runs.
- Added discovery-contract assertions and boundary regression tests to `pnpm mcp:validate`.

### P2: Normalize Not-Found Semantics

Behavior before this improvement pass:

- REST project lookup returns HTTP 404 for an unknown project.
- MCP `get_project` returns a successful JSON-RPC result with `project: null`.

This is usable when clients explicitly inspect `project`, but it creates avoidable REST/MCP divergence.

Recommended change:

- Use the documented JSON-RPC application error `-32005` for MCP lookup tools; reserve `-32004` for stale pagination cursors.
- Apply the same policy to project card, graph, alternatives, deployment, and score tools.
- Publish the selected error code and client handling guidance in MCP discovery, OpenAPI, and behavior examples.

Acceptance criteria:

- All project-oriented MCP tools use one documented not-found contract.
- Client examples handle the selected behavior explicitly.

Completion notes:

- Singular project tools return `-32005` with the stable message `Project <id> was not found.`.
- Alias resolution remains successful and exposes `resolved_from`.
- `get_projects_batch` preserves partial success and returns unresolved IDs in `missing[]`.

### P2: Add Production-Snapshot Evaluation

Current local evaluation uses generated fixtures, while production has a larger live corpus and a non-empty review queue. A passing fixture evaluation therefore does not prove that current production classifications and collection semantics are clean.

Recommended change:

- Export a redacted, bounded production knowledge snapshot for offline replay, or add a read-only production contract job.
- Compare fixture and production review counts.
- Fail governance when the delta exceeds a documented threshold.
- Keep live checks separate from deterministic pull-request validation.

Acceptance criteria:

- CI remains deterministic.
- Scheduled governance reports fixture-versus-production drift.
- New production-only classification failures become visible before they affect Trust Gate claims.

Completion notes:

- Added the read-only `pnpm eval:production-snapshot` evaluator for D1-backed health, quality, quality-review, and benchmark contracts.
- The evaluator compares deterministic fixture and production review counts and fails when their absolute delta exceeds 10, with an explicit threshold override for reviewed operations changes.
- Added deterministic validation for passing drift, excessive drift, and seed fallback rejection.
- Added the deterministic validator to `pnpm validate`; the live network evaluation remains separate.
- Added the evaluator to `daily-production-health`; successful output is parsed into the persisted `production_snapshot` governance summary, and malformed output fails the task. The live check remains outside PR validation.
- The 2026-07-31 production check observed 504 fixture projects with 0 review items and 1,007 production projects with 7 review items, a delta of 7 within threshold.

### P2: Prepare Search for Corpus Growth

Status: completed in code on 2026-07-31.

The current general knowledge path loads up to 2,000 projects into the Worker before applying search and recommendation logic. The production corpus is already at 1,005 projects.

Recommended change:

- Move deterministic filters and first-stage candidate retrieval into D1.
- Keep the existing TypeScript ranking logic for a bounded candidate set.
- Preserve exact-intent ranking and `ranking=browse` as separate modes.
- Fail closed or disclose truncation when the knowledge load reaches its limit.

Acceptance criteria:

- Search remains operational beyond 2,000 indexed projects. Exact and sufficiently selective queries remain complete; broad candidate overflow must be explicitly disclosed as non-exhaustive.
- Exact-intent regression cases remain unchanged.
- Search, recommend, compare, and graph stay within documented Worker CPU and response-size budgets.

Completion notes:

- Search keeps the existing full knowledge path below 1,500 knowledge-ready projects and switches REST `/api/search` plus MCP `search_projects` to D1-first retrieval at or above that threshold.
- D1 applies deterministic category, deployment, difficulty, Cloudflare readiness, language, and project-kind filters plus deliberately broad query-token matching. The existing TypeScript search remains authoritative for exact filtering and the distinction between exact-intent and `ranking=browse` ordering.
- Exact project and alias-resolved IDs are prioritized before the candidate cap, query tokenization matches the TypeScript search behavior for punctuation-separated terms, and collection kind/scope fields participate in D1 candidate matching.
- The ranking stage is bounded to 1,000 candidates. Responses disclose `candidate_retrieval`, `candidate_count`, `candidate_limit`, `loaded_project_limit`, `truncated`, and a refinement warning when more matching candidates exist. Broad queries that exceed the candidate limit are intentionally non-exhaustive and fail visibly through metadata rather than silently claiming completeness.
- Other knowledge consumers retain the existing source policy, so this optimization does not change recommendation, compare, graph, quality, or governance behavior.
- REST and MCP regression tests cover a 2,001-project corpus, strict D1 mode, candidate metadata, candidate overflow, exact and alias targets below the score cutoff, and collection-scope queries. The candidate SQL also passed a direct read-only query against the migrated and seeded local D1 database.

### P3: Tighten Contract Consistency

Recommended cleanup:

- Add minimum and maximum bounds to every MCP numeric input, not only search.
- Document top-level versus nested payload shapes consistently, especially Atlas, project cards, and batch lookup.
- Add contract assertions for all 21 tools so tool discovery schemas and runtime validation cannot diverge.
- Add a compact MCP conformance matrix to the generated documentation.

Completion notes:

- `pnpm mcp:validate` now asserts the exact 21-tool discovery set, object input schemas, and non-empty descriptions.
- The validator generates `docs/MCP_CONFORMANCE_MATRIX.md` with each tool's input focus, success payload, and error contract.
- The matrix is linked from the MCP guide and README so clients and maintenance agents can use one compact contract reference.

## Implementation Order

1. Fix and test MCP numeric argument validation.
2. Decide and document MCP not-found semantics.
3. Add production-snapshot or scheduled live-corpus evaluation.
4. Introduce D1-first candidate retrieval before the corpus approaches 2,000 projects.
5. Expand cross-surface contract validation to every MCP tool.

## Recommended Validation

For the MCP limit and not-found changes:

```sh
pnpm mcp:validate
pnpm api:validate
pnpm test:focused
pnpm eval:agent-tasks
pnpm check
```

For search execution changes:

```sh
pnpm eval:quality
pnpm eval:ranking
pnpm quality:review
pnpm db:integration
pnpm check
```

For release readiness:

```sh
pnpm validate
pnpm db:integration
pnpm release:check
```

## Completion Definition

This improvement pass is complete when:

- All MCP numeric inputs have schema and runtime bounds.
- REST and MCP use documented, compatible error semantics.
- The agent task eval includes invalid MCP inputs and unknown-project handling.
- Production corpus drift is visible in scheduled governance.
- Search remains operational within Worker limits as the corpus grows, with exact/selective completeness and machine-readable disclosure for broad candidate overflow.

## Final Verification

The improvement pass met its completion definition on 2026-07-31:

- `pnpm validate`, `pnpm db:integration`, and the full read-only `pnpm release:check` passed.
- Focused tests passed 55/55, explanation checks passed 12/12, and agent-task evaluation passed 10/10.
- Search quality remained at 92.9% top-1 and 100% top-3 with no unacceptable hits.
- The production quality check observed 1,007 D1-backed projects, release score 100, data trust score 90, and no error- or warning-level quality findings.
- Production smoke verified D1-backed health and search, GRP, all 21 MCP discovery tools, MCP initialization and project lookup, Trust Gate, OpenAPI, machine discovery, agent workflow, and public page contracts.
- Production verification was read-only. No deployment or production data mutation was performed during this pass.
