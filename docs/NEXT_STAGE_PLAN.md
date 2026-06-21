# Git.Top Next Stage Plan

## Current Position

Git.Top is a hardened V1 prototype for an agent-native GitHub knowledge layer. It already has:

- Cloudflare Worker APIs backed by D1.
- GitHub repository sync.
- Agent Card generation.
- REST APIs for search, recommendation, comparison, alternatives, quality, graph, and GRP.
- MCP tools for agent runtimes.
- Next.js pages that can use seed data or a live Worker API.
- Validation scripts for seed data, generated knowledge, DB mapping, core logic, API routes, MCP tools, TypeScript, and production Next builds.

The next stage should move Git.Top from a validated prototype to a public V1 that agents can depend on.

## Stage Goal

Make Git.Top a trustworthy agent-native project knowledge API:

1. Expand from dozens of indexed projects to 300-500 high-quality AI and agent repositories.
2. Make recommendation, classification, and deployment decisions measurable through evaluation cases.
3. Keep the public deployment shape simple and consistent across UI, API, MCP, and GRP.
4. Make MCP and GRP easy for external agents to try.
5. Establish a sync, quality, and correction loop before scaling further.

## Phase 1: Product Shape and Deployment

Status: in progress.

Purpose: remove ambiguity about how Git.Top is published and consumed.

Decisions:

- The primary V1 runtime is the Cloudflare Worker defined by `wrangler.toml`.
- `https://git.top` is the public product surface.
- `https://git.top/api/*` is the stable REST API surface.
- `https://git.top/mcp` is the stable MCP endpoint.
- The Next.js app remains a richer UI and static preview layer. It reads seed data by default and can read the live Worker API through `NEXT_PUBLIC_GIT_TOP_API_BASE`.
- Console prototype pages such as users, tenants, settings, and reports should stay out of primary navigation until they are backed by real persistence.

Deliverables:

- `docs/DEPLOYMENT_DECISION.md`
- `docs/API.md`
- `docs/MCP.md`
- `docs/GRP_EXAMPLES.md`
- README links to the new docs.
- UI wording aligned with the current product reality.

Acceptance criteria:

- A new developer can tell which surface is authoritative.
- A new agent developer can find the REST, MCP, and GRP entry points quickly.
- The UI does not imply unsupported compliance or account-management capabilities.

## Phase 2: Data Coverage Expansion

Status: in progress.

Purpose: prove Git.Top works beyond a curated demo set.

Tasks:

- Expand `data/seed-repositories.json` to 300-500 repositories.
- Cover these V1 categories:
  - `agent_framework`
  - `coding_agent`
  - `browser_agent`
  - `rag_framework`
  - `vector_database`
  - `llm_gateway`
  - `llm_eval`
  - `prompt_tooling`
  - `workflow_automation`
  - `local_llm_runtime`
  - `ai_app_template`
  - `mcp_server`
  - `ai_observability`
- Enhance seed validation to detect duplicates, malformed repository IDs, category coverage gaps, and likely non-AI repositories where possible.
- Track archived or unavailable repositories during sync and expose the failure reasons.
- Add a data coverage summary to `/api/quality`.

Deliverables:

- Expanded seed list.
- Stronger `pnpm seed:validate`.
- `docs/DATA_COVERAGE.md`.
- Quality report fields for category coverage, freshness, low-confidence rates, and sync failures.

Initial baseline:

- `pnpm seed:coverage` generates `docs/DATA_COVERAGE.md` from `data/seed-repositories.json`.
- `/api/quality` now includes a `coverage` object with category coverage, missing categories, low-confidence classification rate, stale project rate, Cloudflare-ready count, and average scores.
- The seed list has reached 120 repositories and covers all 13 V1 categories.
- `pnpm validate` now includes `seed:coverage` and `eval:quality` so coverage and recommendation regressions are part of the default gate.
- After live verification cleanup and the next expansion batches, the current seed baseline is 308 repositories, all live, unarchived, canonical, and covering all 13 V1 categories.

Next expansion target:

- Grow from 308 toward 500 repositories.
- Add live sync verification for renamed, archived, or unavailable repositories.
- Sync the larger seed set into local D1 fixtures or integration data so evaluation can move from synthetic seed metadata to generated Agent Cards.

Live verification:

- `pnpm seed:live-check` checks seed repositories against GitHub and writes `docs/SEED_LIVE_CHECK.md`.
- It is network-dependent, so it is intentionally not part of default `pnpm validate`.
- Use `pnpm seed:live-check -- --limit 20` for a sampled check, or run without `--limit` for the full list.
- If GitHub rate limits unauthenticated requests, the script stops early and reports `nextOffset`; resume with `pnpm seed:live-check -- --offset <nextOffset> --limit 20`.
- A full unauthenticated run hit GitHub API rate limits after 40 successful checks.
- A full authenticated run using `GITHUB_TOKEN` found and cleaned renamed, archived, and missing repositories.
- The latest full authenticated live check passed with 308/308 repositories OK.

Acceptance criteria:

- At least 300 valid repository IDs are available in the seed list.
- Every V1 category has representative projects.
- Quality output can explain whether the index is broad enough to trust.

## Phase 3: Evaluation Set and Recommendation Baseline

Status: in progress.

Purpose: make ranking and classification quality measurable before optimizing heuristics.

Tasks:

- Add `data/eval-cases.json`.
- Each case should include:
  - user query or GRP goal
  - expected categories
  - acceptable projects
  - unacceptable projects
  - deployment constraints
  - notes explaining the expected behavior
- Add `scripts/eval-quality.mjs`.
- Report top-1 hit rate, top-3 hit rate, category accuracy, deployment accuracy, and known false positives.
- Add a small CI-safe eval subset and a larger local eval command.

Deliverables:

- `pnpm eval:quality`.
- Baseline quality report.
- Regression cases for Cloudflare readiness, alternatives, and category detection.

Initial baseline:

- `data/eval-cases.json` contains the first seed-backed search, recommendation, and GRP cases.
- `scripts/eval-quality.mjs` reports top-1 hit rate, top-3 hit rate, category accuracy, deployment accuracy, Cloudflare readiness accuracy, and unacceptable hits.
- `scripts/eval-quality.mjs` now builds lightweight evaluation knowledge from the full live-verified seed list, while preserving hand-authored seed knowledge overrides.
- `pnpm eval:quality` writes `docs/EVAL_QUALITY.md` so quality drift is reviewable outside terminal logs.
- `scripts/eval-fixtures.mjs` provides reusable generated Agent Card fixtures across all 13 V1 categories, and `pnpm eval:quality` now reads those fixtures through mocked D1 row mapping before merging them with hand-authored seed knowledge and synthetic seed metadata.
- `pnpm db:seed-sql` generates `seed.sql` from hand-authored seed knowledge plus generated eval fixtures, so local D1 seed data follows the same Agent Card fixture path.
- `pnpm db:execute` prepares local D1 for current schema expectations, including optional columns missing from older local databases.
- `pnpm db:integration` now seeds local D1, starts a temporary local Worker, and validates `/api/health`, `/api/search`, `/api/project/:owner/:repo`, `/api/quality`, and `/api/sync/status` against the real D1-backed HTTP path.
- The baseline has expanded from 6 to 21 cases and covers search, recommendation, GRP, local LLM runtime, vector databases, prompt tooling, observability, workflow automation, coding agents, browser agents, coding resource hubs, AI app resource collections, MCP observability integrations, open SaaS templates, ambiguous-name repositories that require README/topic evidence, and Cloudflare-readiness false positives.
- Current eval baseline: evaluated cases 21, generated fixture projects 313, D1 fixture projects 313, effective generated fixture projects 308, local D1 seed projects 312, synthetic projects 0, top-1 hit rate 1.0, top-3 hit rate 1.0, category accuracy 1.0, deployment accuracy 1.0, Cloudflare readiness accuracy 1.0, unacceptable hit count 0.
- Seed category hints are shared by coverage and evaluation scripts so category drift is easier to catch while the seed list grows.

Next evaluation target:

- Full-seed evaluation no longer depends on synthetic project knowledge, and collection/resource-hub projects now have regression coverage.
- Agent Cards now expose V1-compatible `project_kind` and `collection_metadata` fields so resource hubs can be represented without changing category semantics.
- Collection metadata is now visible in the Next.js project list/detail UI, preserved across live API view-to-knowledge conversion, described in MCP tool discovery, and covered by MCP mocked-D1 regression checks.
- Ambiguous repository-name regressions now cover memory/RAG (`mem0ai/mem0`), structured output (`dottxt-ai/outlines`), and observability (`pydantic/logfire`) queries.
- Cloudflare-readiness regression now tracks a dedicated readiness accuracy metric and covers false positives where Cloudflare Workers is mentioned but Python, filesystem, Docker daemon, or Postgres blockers prevent direct Workers readiness.
- Cloudflare readiness evidence now separates positive signals (`Cloudflare signal: ...`) from blockers (`Runtime blocker: ...`) and regression validation requires both sides for Cloudflare-mentioned projects.
- `pnpm quality:review` now writes `docs/LOW_CONFIDENCE_REVIEW.md` from generated Agent Card fixtures and keeps the default validation loop aware of low-confidence classification, collection semantics, and weak evidence review items.
- Current low-confidence review baseline: 312 projects reviewed, 14 projects needing review, 8 low-confidence signals, 29 medium-confidence signals.
- `pnpm eval:quality` remains the CI-safe regression gate, while `pnpm eval:local` now runs broader generated category and deployment probes across the fixture-backed project set and writes `docs/EVAL_LOCAL.md`.
- Current local eval baseline: evaluated cases 22, generated fixture projects 313, D1 fixture projects 313, effective generated fixture projects 308, synthetic projects 0, top-1 hit rate 0.773, top-3 hit rate 0.864, category accuracy 1.0, deployment accuracy 1.0, Cloudflare readiness accuracy 1.0, unacceptable hit count 0.
- The first local tuning targets are ranking order, not classification correctness: category probes for `agent_framework` and `rag_framework`, plus deployment probes for `local`, `docker`, and `serverless`.
- Eval reports now include a `Review Focus` section that lists top-1/top-3 misses, expected candidates, observed candidates, and tuning hints. This keeps ranking experiments grounded before changing global scoring weights.
- `pnpm eval:ranking` now compares offline ranking strategies against both CI-safe and local eval cases and writes `docs/RANKING_EXPERIMENTS.md`, so scoring experiments can be rejected before touching runtime search.
- Current ranking experiment result: `browse_mode_quality` preserves CI-safe top-1/top-3 at 1.0 while improving local top-1 from 0.773 to 0.909 and local top-3 from 0.864 to 0.909.
- Runtime search now keeps exact-intent ranking by default and exposes an explicit `ranking=browse` / MCP `ranking: "browse"` mode for broad category/deployment discovery with larger result limits.

Acceptance criteria:

- A change to classification or scoring can be judged against a fixed baseline.
- The project can identify when a ranking improvement in one category harms another.

## Phase 4: Classification and Deployment Quality

Status: in progress.

Purpose: improve the most important trust surface after a baseline exists.

Tasks:

- Split Cloudflare readiness into a stricter detector.
- Add explicit edge incompatibility reasons where relevant.
- Weight README deployment sections higher than incidental keyword matches.
- Separate metadata, README, file, and topic evidence in classification output.
- Add low-confidence review lists for manual correction.
- Avoid treating a repository as Cloudflare-ready only because it mentions Cloudflare.

Deliverables:

- Stronger classification evidence.
- Cloudflare readiness regression tests.
- Low-confidence project report.
- Optional persisted override table for manually reviewed classifications.

Acceptance criteria:

- Classification changes improve eval results or preserve them while improving evidence.
- Cloudflare readiness errors become easy to inspect and correct.

## Phase 5: Agent Integration Experience

Status: planned.

Purpose: make Git.Top useful to external agents without private context.

Tasks:

- Provide copyable REST examples for search, project lookup, recommendation, comparison, alternatives, and quality.
- Provide copyable JSON-RPC examples for MCP `tools/list` and `tools/call`.
- Provide real GRP prompts and responses for plan, find, compare, and compose modes.
- Document how agents should treat `metadata`, `classification`, and `quality_signal_confidence`.

Deliverables:

- Expanded `docs/API.md`.
- Expanded `docs/MCP.md`.
- Expanded `docs/GRP_EXAMPLES.md`.
- README quickstart for agent developers.

Acceptance criteria:

- An agent developer can make a useful API, MCP, or GRP request in under five minutes.
- Examples show confidence and data-source handling, not just happy-path payloads.

## Phase 6: Production Reliability

Status: in progress.

Purpose: make deployment and operations repeatable.

Tasks:

- Keep Wrangler local D1 integration tests passing as schema and API response contracts evolve.
- Add production smoke tests for:
  - `/api/health`
  - `/api/search`
  - `/api/grp/query`
  - `/mcp` tool listing
- Extend `/api/health` and `/api/sync/status` with operator-friendly freshness and failure fields where missing.
- Add deployment preview checks after CI.
- Decide whether production deploys are manual or CI-driven.

Deliverables:

- `pnpm smoke:prod`.
- `pnpm db:integration`.
- Deployment checklist.
- Production runbook.

Initial baseline:

- `pnpm db:integration` seeds local D1, starts a temporary local Worker, and verifies `/api/health`, `/api/search`, `/api/project/:owner/:repo`, `/api/quality`, `/api/sync/status`, `/api/grp/query`, and `/mcp`.
- `pnpm smoke:prod` verifies a deployed or preview Worker, defaulting to `https://git.top`, requires D1-backed responses by default, and checks `/api/health`, `/api/search`, `/api/grp/query`, `/mcp`, and MCP `tools/list`.
- `pnpm smoke:prod -- --base-url <origin>` can validate local, preview, or production origins with the same read-only contract checks; `--allow-seed` is reserved for intentional seed fallback checks.
- `docs/PRODUCTION_RUNBOOK.md` documents pre-deploy gates, deploy command, smoke verification, sync checks, quality checks, and rollback notes.

Acceptance criteria:

- A deploy can be validated without manual browser inspection.
- Sync failures are visible through an API and actionable by an operator.

## Suggested Milestones

Week 1:

- Finish Phase 1 docs and UI wording.
- Expand the seed list materially.
- Add the first evaluation cases and baseline script.

Week 2:

- Calibrate classification and Cloudflare readiness against the eval baseline.
- Finish MCP and GRP examples.
- Add production smoke tests.
- Prepare `git.top` for public V1 trial use.

## Operating Rule

Do not optimize recommendation heuristics without an eval case proving the change helps or an explicit product decision documenting why the tradeoff is acceptable.
