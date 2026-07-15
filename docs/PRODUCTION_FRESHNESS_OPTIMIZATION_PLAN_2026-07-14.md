# Git.Top Production Freshness Optimization Plan

Date: 2026-07-14

## Purpose

Git.Top is production-available and its release checks pass, but the previous sync policy could report a fresh global sync while a meaningful part of the corpus missed its own refresh target. This plan aligns sync capacity, corpus freshness, Trust Gate decisions, and scheduled maintenance behavior.

## Baseline

Production snapshot inspected on 2026-07-14:

- D1 was available with 939 knowledge-ready projects.
- Production smoke passed and Trust Gate returned `allow`.
- Release score was 100 and data trust score was 96.
- The old priority model classified 655 projects as hot and targeted all of them for daily refresh.
- The old scheduled budget was 5 projects per hour, or at most 120 project syncs per day before failures.
- 111 hot projects missed the one-day target, while global sync freshness still reported `fresh` because at least one sync had completed in the previous 24 hours.
- Priority refresh was limited to curated seed repositories, so discovered D1 projects depended on manual stale catch-up after admission.

## Root Causes

1. Category membership promoted every project in several broad categories directly to hot.
2. Estimated star growth could be treated like snapshot-backed growth and inflate priority.
3. The hot refresh target exceeded scheduled capacity by design.
4. Global freshness measured recent job activity, not corpus target compliance.
5. Scheduled discovery, refresh, derived data, and governance ran in one sequential failure domain.

## Target Policy

### Sync budget

- Run hourly.
- Allow at most 8 lightweight project syncs per run.
- Let candidate discovery use at most 1 slot in the daily UTC 00 window, and yield whenever refresh backlog or capacity pressure is present.
- Use all 8 slots for priority refresh or cursor progress in the other 23 hourly runs.
- Treat 191 refreshes per day as the scheduled maintenance capacity.

The lightweight sync path uses approximately six GitHub requests per project. Eight projects plus one discovery search stays within the intended Worker external-request budget.

### Priority tiers

- Hot target: 2 days.
- Warm target: 7 days.
- Cold target: 7 days, aligned with the quality freshness gate so cold projects cannot accumulate as quality-stale items.
- Only snapshot-backed star growth may promote a project to hot.
- Strategic categories contribute to priority but no longer make every project hot by themselves.
- Discovered D1 projects participate in the same priority queue as seed projects.

Hot promotion uses the following explicit signals:

- snapshot-backed star growth of at least 1,000;
- Git Score of at least 93;
- at least 200,000 stars;
- reviewed Cloudflare readiness;
- or, for a strategic category, snapshot-backed growth of at least 500, Git Score of at least 90, or at least 100,000 stars.

Projects are warm when they are not hot but have snapshot-backed growth of at least 20, Git Score of at least 70, at least 5,000 stars, or membership in a strategic category. Remaining projects are cold.

### Trust semantics

Global job freshness remains useful for detecting a stopped scheduler, but high-confidence use also requires:

- hot stale rate at or below 10%;
- scheduled refresh capacity at or above modeled daily demand;
- D1, derived alternatives, release score, data trust, and overall risk checks to pass.

Hot stale rates above 10% produce `caution`; rates above 25% produce `block`. Capacity shortfall produces `caution` so agents disclose that freshness targets are not sustainable even when the latest cron succeeded.

## Implementation Phases

### Phase 1: Capacity-aware priority model

Status: implemented in this change.

- Centralize scheduled sync limits and tier targets.
- Use reliable activity signals for hot promotion.
- Expose tier counts, stale rates, modeled daily demand, capacity, utilization, and headroom through `/api/sync/status`.

### Phase 2: Corpus-aware Trust Gate

Status: implemented in this change.

- Add `hot-corpus-freshness` and `sync-capacity` checks.
- Add the corresponding fields to the high-confidence contract and agent disclosure policy.
- Document the new checks in REST and OpenAPI surfaces.

### Phase 3: Automatic backlog consumption

Status: implemented in this change.

- Admit at most one scheduled candidate per day and skip discovery when refresh work needs the capacity.
- Give refresh work all eight slots outside the daily discovery window.
- Queue projects six hours before their tier deadline, and align warm and cold deadlines with the seven-day quality freshness gate.
- Allow priority selection from every D1 project, including repositories admitted after the curated seed corpus was created.
- Preserve one cursor slot so the curated corpus continues to make deterministic progress.

### Phase 4: Failure isolation

Status: implemented in this change.

- Run discovery, refresh, alternatives, and governance as isolated maintenance steps.
- Alert on a failed step without preventing later steps from running.
- Keep existing per-task governance records and operations alerts.

## Acceptance Criteria

- `priority.policy.hot_target_days` is 2.
- `priority.capacity.target_feasible` is structured and visible.
- `priority.stale_rates.hot` is structured and visible.
- A strategic-category project with weak activity is warm rather than hot.
- Estimated star growth alone cannot promote a project to hot.
- A discovered D1 project can be selected ahead of seed cursor fallback when stale.
- Trust Gate includes `hot-corpus-freshness` and `sync-capacity` checks.
- A failed scheduled refresh does not prevent alternatives refresh or governance checks.
- API, MCP, explanation eval, focused tests, docs validation, and TypeScript checks pass.

## Production Rollout

1. Deploy the Worker.
2. Inspect `/api/sync/status` after the first hourly run.
3. Confirm `priority.capacity.target_feasible=true` and review the new hot count.
4. Confirm `/api/trust` remains `allow` or returns an explained `caution`, never a silent freshness pass.
5. Run `pnpm smoke:prod` and `pnpm quality:check`.
6. Observe at least 24 hours of hot stale rate, failure count, GitHub request metrics, and sync duration before increasing the budget again.

## Rollback Conditions

Revert the scheduled limit to 5 while keeping the new metrics and Trust checks if any of the following occurs:

- Worker external-request limit failures;
- sustained GitHub rate limiting;
- scheduled duration approaches the Worker execution limit;
- sync failure rate rises above 5% across three consecutive runs.
