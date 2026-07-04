# Git.Top Operations And Data Governance Plan

## Purpose

Git.Top V1 development is complete. Ongoing work is now an operations and data-governance loop: keep production D1 healthy, keep repository data fresh, keep classification and collection decisions auditable, and prevent ranking or corpus changes from silently lowering agent trust.

This plan is intentionally separate from implementation plans. It defines the repeatable operating rhythm after V1.

## Operating Principles

1. Production reads must be D1-backed by default.
2. Seed fallback is acceptable for demos and local previews, but it is a degraded production mode.
3. Data changes are reviewed changes, not automatic growth.
4. Classification overrides are an audit ledger for one-off corrections.
5. Global classification or ranking logic changes require eval coverage before promotion.
6. Collection and resource-hub repositories are useful, but reviewed separately from executable projects.

## Cadence

### Daily Production Health

Run or inspect:

```sh
pnpm quality:check
pnpm smoke:prod
curl https://git.top/api/sync/status
```

Automation:

- Cloudflare Worker cron: `src/scheduled-governance.ts`.
- Task id: `daily-production-health`.
- Result history: `/api/governance/runs?task=daily-production-health`.

Pass criteria:

- `/api/quality` returns `metadata.source: "d1"`.
- Quality score is at least `90`.
- Error count is `0`.
- Warning count is `0` or has an explicit owner decision.
- Production smoke passes with D1 required.
- Sync status is `healthy` or has a documented mitigation.
- `freshness` is `fresh` for normal operations.

Escalation:

- If quality is seed-backed, treat production knowledge as degraded.
- If smoke fails, do not deploy more product changes until the failure is understood.
- If sync is degraded because of subrequest limits, run smaller catch-up batches with `limit:1` or `signal_depth:"lite"`.

### Weekly Data Governance

Run:

```sh
pnpm seed:validate
pnpm seed:coverage
pnpm eval:fixtures
pnpm quality:review
pnpm eval:quality
pnpm eval:explanations
pnpm test:focused
pnpm docs:validate
```

Automation:

- Cloudflare Worker cron: `src/scheduled-governance.ts`.
- Task id: `weekly-data-governance`.
- Result history: `/api/governance/runs?task=weekly-data-governance`.

Review:

- `docs/DATA_COVERAGE.md`
- `docs/EVAL_FIXTURE_HEALTH.md`
- `docs/LOW_CONFIDENCE_REVIEW.md`
- `docs/EVAL_QUALITY.md`
- `docs/EVAL_EXPLANATIONS.md`

Pass criteria:

- Seed list remains valid.
- Category coverage remains 13/13.
- Missing seed fixtures stay at `0`.
- Duplicate fixture counts stay at `0`.
- P0 and P1 review items stay at `0`, or have a documented owner decision.
- CI-safe eval remains green.
- Explanation eval remains green.

### Biweekly Live Repository Check

Run a sampled live check:

```sh
pnpm seed:live-check -- --limit 50
```

For a full corpus check, use an authenticated GitHub token:

```sh
GITHUB_TOKEN=... pnpm seed:live-check -- --fail-on-archived --fail-on-error
```

Automation:

- Cloudflare Worker cron: `src/scheduled-governance.ts`.
- Task id: `biweekly-live-check`.
- Scheduled check: verifies recent sync health, seed coverage, remaining count, and priority staleness from D1.

Actions:

- Renamed repositories: update `data/seed-repositories.json` to the canonical ID, then rerun seed validation and eval.
- Archived repositories: decide whether the archive is still valuable as historical knowledge. Remove or mark through review policy.
- Missing repositories: remove unless there is a known temporary GitHub access issue.
- Repeated stale projects: schedule targeted sync or replacement candidate review.

### Monthly Corpus Review

Run:

```sh
pnpm seed:candidates
pnpm eval:local
pnpm eval:ranking
pnpm quality:review
```

Automation:

- Cloudflare Worker cron: `src/scheduled-governance.ts`.
- Task id: `monthly-corpus-review`.
- Scheduled check: refreshes derived alternatives and records corpus quality/risk summary from D1.

Review:

- `docs/SEED_CANDIDATES.md`
- `docs/EVAL_LOCAL.md`
- `docs/RANKING_EXPERIMENTS.md`
- `docs/LOW_CONFIDENCE_REVIEW.md`

Decision rules:

- Do not append candidates directly from discovery output.
- Add candidates only when they improve category coverage, query quality, or missing user workflows.
- Add eval cases for meaningfully new project types.
- Run live checks before merging seed expansion.
- Do not promote ranking changes unless CI-safe eval stays green and local eval improves or the tradeoff is explicitly accepted.

## Release-Candidate Gate

Before release:

```sh
pnpm release:check -- --skip-prod-smoke
pnpm quality:review
pnpm eval:quality
pnpm eval:explanations
pnpm test:focused
```

After deploy:

```sh
pnpm release:check
pnpm quality:check
pnpm smoke:prod
curl https://git.top/api/sync/status
```

Release blockers:

- Production quality score below `90`.
- Production quality or smoke is not D1-backed.
- Any P0 review item without an owner decision.
- Any eval regression in CI-safe cases.
- Any migration required by the release has not been applied to production D1.

## Correction Workflow

Use this path for data-quality corrections:

1. Reproduce the issue with API, MCP, GRP, or an eval case.
2. Inspect repository README, topics, metadata, and generated Agent Card evidence.
3. If one project is wrong, add a protected classification override.
4. If multiple projects are wrong for the same reason, adjust hints or detector logic and add eval coverage.
5. If ranking is wrong, run `pnpm eval:ranking` before changing runtime scoring.
6. Re-run `pnpm quality:review`, `pnpm eval:quality`, and `pnpm test:focused`.

## Ownership

| Area | Primary Artifact | Check | Decision |
| --- | --- | --- | --- |
| Production health | `docs/PRODUCTION_RUNBOOK.md` | `pnpm smoke:prod` | Block deploys on failure |
| Production quality | `/api/quality` | `pnpm quality:check` | Block release below threshold |
| Seed coverage | `docs/DATA_COVERAGE.md` | `pnpm seed:coverage` | Curate before growth |
| Live repository status | `docs/SEED_LIVE_CHECK.md` | `pnpm seed:live-check` | Rename, remove, or retain with policy |
| Classification review | `docs/LOW_CONFIDENCE_REVIEW.md` | `pnpm quality:review` | Override one-offs, fix systemic issues |
| Eval quality | `docs/EVAL_QUALITY.md` | `pnpm eval:quality` | Block regressions |
| Ranking experiments | `docs/RANKING_EXPERIMENTS.md` | `pnpm eval:ranking` | Promote only with evidence |

## Automation Surfaces

Website:

- `/operations`: read-only operations and data-governance dashboard.
- `/api/governance/summary`: latest run summary and failure list.
- `/api/governance/runs`: recent run history, with optional `task` and `limit` filters.

Protected writer:

- `/api/admin/governance/runs`: records scheduled task results.
- Authorization uses the existing `SYNC_SECRET` bearer token.

Storage:

- D1 table: `governance_runs`.
- Migration: `migrations/0005_governance_runs.sql`.

Automation:

- Cloudflare Worker cron: `src/index.ts`.
- Worker-native governance runner: `src/scheduled-governance.ts`.
- Optional external recorder endpoint: `/api/admin/governance/runs`.

Required production secrets:

- `GITHUB_TOKEN`: used by Worker sync and candidate discovery.
- `SYNC_SECRET`: protects manual admin governance and sync endpoints.

## First Execution Record

Date: 2026-06-24

Initial local governance baseline:

- `pnpm seed:validate`: passed, 500 seed repositories.
- `pnpm docs:validate`: passed.
- `pnpm seed:coverage`: passed, 500 repositories, 13/13 categories covered, no uncategorized repositories.
- `pnpm eval:fixtures`: passed, 504 generated fixtures, 0 missing seed fixtures, 0 duplicate fixtures, 0 reviewed collection policy drift.
- `pnpm quality:review`: passed, 504 projects reviewed, 0 review items, 0 low-confidence signals, 0 medium-confidence signals.
- `pnpm test:focused`: passed, 6 tests.
- `pnpm eval:quality`: passed, 28 cases, top-1/top-3/category/deployment/Cloudflare-readiness rates all `1.0`, unacceptable hits `0`.
- `pnpm eval:explanations`: passed, 7 checks, 0 failures.
- `pnpm quality:check`: passed against production, score `100`, project count `501`, source `d1`, 0 errors, 0 warnings, 3 info-only `score_skew` issues, risk level `high`.
- `pnpm smoke:prod`: passed against production, D1 available, project/knowledge-ready/raw counts all `501`, sync health `healthy`, sync freshness `fresh`.
- `curl https://git.top/api/sync/status`: passed, synced count `500`, indexed count `501`, remaining count `0`, cycle complete `true`, health `healthy`, freshness `fresh`, last successful sync `2026-06-24T00:00:34.509Z`, last error `null`.

Immediate follow-up:

- Review the 3 production info-only `score_skew` items during the weekly quality review; they are not release blockers while errors and warnings remain `0`.
- Run a sampled `pnpm seed:live-check -- --limit 50` with `GITHUB_TOKEN` during the first biweekly live repository cycle.
