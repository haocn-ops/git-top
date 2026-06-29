# Git.Top Project Assessment And Improvement Plan

Generated from the 2026-06-23 local project assessment.

## Assessment

Git.Top is a credible public V1 baseline for an agent-native GitHub knowledge API. The strongest parts of the project are the product positioning, Worker-first runtime shape, API/MCP coverage, and unusually strong validation loop for an early product.

Current rating: 7.8/10.

## Strengths

- Clear product position: a GitHub project knowledge layer for agents, not a generic leaderboard.
- Cloudflare Worker + D1 is the authoritative and only product runtime.
- Public agent surfaces are broad: REST, MCP, GRP, OpenAPI, `llms.txt`, quality, status, coverage, and project pages.
- Seed coverage has reached the public V1 target: 500 repositories across all 13 V1 categories.
- Validation is mature: seed validation, generated knowledge validation, API/MCP route validation, focused tests, evaluation reports, local D1 integration, and production smoke checks.

## Key Risks

- Data quality remains the product's highest-leverage risk. Real repository metadata changes, archived projects, renamed repositories, README drift, and ambiguous collection repositories require continuous correction.
- Evaluation fixture maintenance is concentrated in `scripts/eval-fixtures.mjs`, which is large enough to make future tuning and review harder than it needs to be.
- Worker pages now own the product surface; future drift risk is mostly between API behavior and rendered HTML.
- Low-confidence classification and collection review items still need human review before the corpus scales much further.
- Commercial product shape is not yet defined beyond public API and discovery surfaces.

## Improvement Tracks

### Track 1: Quality Review Loop

Goal: make data corrections auditable and repeatable.

Actions:

- Keep `pnpm quality:review` as the release review report for classification and collection risk.
- Prioritize P0 review items before ranking or classification releases.
- Prefer project-specific classification overrides for isolated mistakes.
- Add eval cases when several projects fail for the same reason.
- Track priority counts in the low-confidence report so release readiness is visible at a glance.

### Track 2: Evaluation Fixture Health

Goal: create a safety net before splitting or tuning generated fixtures.

Actions:

- Add an `eval:fixtures` validation command that checks generated fixture uniqueness, seed coverage, category distribution, and expected classification metadata.
- Generate a fixture health report in `docs/EVAL_FIXTURE_HEALTH.md`.
- Include `eval:fixtures` in the default `pnpm validate` gate before ranking and quality evals.
- Split `scripts/eval-fixtures.mjs` only after the health report is stable.

### Track 3: Data Freshness And Trust

Goal: make trust signals easier to inspect and harder to regress.

Actions:

- Continue exposing `metadata.source`, sync status, project freshness, classification evidence, quality signal confidence, and collection metadata.
- Watch renamed, archived, unavailable, stale, and low-confidence projects as trends rather than one-off snapshots.
- Keep production checks D1-backed by default and require explicit opt-in for seed fallback checks.

### Track 4: UI And Runtime Alignment

Goal: keep the Worker API and UI telling the same story.

Actions:

- Treat Worker routes as canonical for production behavior.
- Build new browsing, graph, atlas, alternatives, and score pages in the Worker route tree.
- Avoid adding account, tenant, billing, or compliance UI until persistence and product behavior exist.

### Track 5: Product Growth

Goal: turn the working infrastructure into a repeatable external workflow.

Actions:

- Choose one commercial wedge before broad expansion: API keys and quotas, private repository indexing, team project selection reports, or MCP marketplace distribution.
- Improve score explanation with concrete examples showing why one project ranks above another.
- Keep public topic pages tied to real project data and trust surfaces, not marketing-only copy.

## Initial Implementation Batch

This batch intentionally avoids public API behavior changes.

- Add this assessment and improvement plan.
- Add `pnpm eval:fixtures` and `docs/EVAL_FIXTURE_HEALTH.md`.
- Include fixture health in `pnpm validate`.
- Add priority-count summary to `docs/LOW_CONFIDENCE_REVIEW.md`.
- Guard reviewed collection policy entries against generated fixture drift.

## Validation

Run this focused gate after the initial batch:

```sh
pnpm eval:fixtures
pnpm quality:review
pnpm eval:quality
pnpm test:focused
pnpm check
```
