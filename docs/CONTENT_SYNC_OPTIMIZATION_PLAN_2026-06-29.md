# Git.Top Content Sync Optimization Plan

Date: 2026-06-29

## Current Content Update Model

Git.Top content is updated by a Cloudflare Worker plus D1 sync pipeline, not by a CMS.

1. `data/seed-repositories.json` is the curated repository input list.
2. Cloudflare Cron triggers the Worker every hour.
3. `src/index.ts` calls `syncGithubProjects` with lightweight GitHub signal collection, then runs conservative candidate discovery.
4. `src/sync.ts` fetches GitHub repository metadata, README/root files, recent commits, releases, and contributors.
5. The Worker generates Agent Cards, scores, alternatives, and star snapshots.
6. `src/db-write-store.ts` writes project knowledge into D1.
7. Public pages and APIs read D1 through `src/knowledge-source.ts`, with bundled seed fallback only when D1 is unavailable, empty, or broken.
8. Protected admin sync is available at `/api/admin/sync` and through `pnpm sync:prod:catchup`.
9. Protected candidate discovery is available at `/api/admin/discovery`; it rotates GitHub search queries and can add new repositories beyond the curated seed list.

Production on 2026-06-29 is D1-backed with 501 knowledge-ready projects. Sync freshness is fresh, but the latest observed run was degraded by a Worker subrequest-limit failure after an oversized batch.

## Problems To Solve

### P0: Cursor Safety

The sync cursor should only advance past repositories that were actually refreshed or intentionally skipped as terminal failures. Retryable platform or rate-limit failures must not skip the remaining repositories in the cycle.

Risk if unfixed: an oversized or throttled run can leave repositories stale until the next full cycle.

### P0: Stable Cron Batch Size

Cron sync must stay comfortably below Cloudflare Worker subrequest limits. The previous production history shows a `limit:40` run exceeding the invocation budget.

Risk if unfixed: sync health remains noisy, and the run records many repeated failures after the first budget error.

### P1: Full-Cycle Freshness

At 500 repositories, a 12-hour cron with a small fixed batch could take weeks to refresh every project. The production schedule now runs hourly so the same conservative batch size still improves freshness materially.

Risk if unfixed: hot projects and recent ecosystem shifts lag behind the public interface.

### P1: GitHub Request Efficiency

The current sync fetches several GitHub resources on every selected repository. It does not yet persist ETag or Last-Modified validators.

Risk if unfixed: rate-limit and subrequest pressure increase as the corpus grows.

### P2: Derived Knowledge Rebuild Cost

Alternatives and graph-like relationships are updated inside project sync runs. As the corpus grows, derived knowledge should be refreshed separately from raw GitHub fetching.

Risk if unfixed: every sync carries more global recomputation than necessary.

### P1: Corpus Growth Beyond Curated Seed

The hourly cron refreshed only repositories already present in the curated seed list or D1. That kept existing records fresh, but could not discover new projects automatically.

Risk if unfixed: the project count plateaus around the seed corpus even while the ecosystem changes.

## Optimization Phases

### Phase 1: Stabilize Existing Sync

Implement now.

- Set Cron batch size to 5 repositories per invocation.
- Keep manual sync default conservative at 1.
- Keep admin catch-up capped, but operators should use small batches unless recent status is healthy.
- Advance the cursor by actual completed or terminally skipped repositories, not by requested limit.
- Stop a batch immediately on retryable platform/rate-limit failures.
- Record the real `nextOffset` in `sync_runs`.
- Update tests and runbook text to match code.

Acceptance:

- `pnpm check` passes.
- Focused validation covers the new scheduled batch size and cursor advancement semantics.
- Runbook states one Cron batch size consistently.
- A subrequest-limit failure no longer skips the rest of the selected batch.

### Phase 2: Hot/Cold Refresh Policy

Implemented in the first pass without adding a migration.

- Add a sync priority model based on stars, recent star delta, recent pushes, category importance, and manual boost.
- Refresh hot repositories daily.
- Refresh warm repositories every 3-7 days.
- Refresh cold repositories every 14-30 days.
- Keep the seed cursor as a fallback coverage loop.

Acceptance:

- `/api/sync/status` exposes hot/warm/cold counts, stale counts, oldest stale age, and a priority preview.
- Trending, homepage, recommendation, and graph-critical projects refresh more often than long-tail projects.

Current implementation computes priority from loaded D1 project knowledge, exposes it in sync status, and lets Cron consume the stale priority queue before filling the batch from the seed cursor. The seed cursor remains the fallback coverage loop, and only processed cursor items advance it, so hot-project refreshes do not starve the long tail.

### Phase 3: Conditional GitHub Requests

Implemented in the first pass.

- Add a D1 table for GitHub request validators: project id, resource key, ETag, Last-Modified, status, checked_at.
- Send `If-None-Match` and `If-Modified-Since` for README, root files, releases, contributors, and repository metadata where supported.
- Treat `304 Not Modified` as a successful lightweight refresh.
- Preserve prior signal values when unchanged.

Acceptance:

- Sync result reports fetched, unchanged, and skipped resource counts.
- Average GitHub requests per repository drops for unchanged projects.

Current implementation adds `github_request_cache`, stores cache entries by GitHub API path, sends validators on subsequent requests, and reuses cached JSON when GitHub returns `304 Not Modified`. Cache reads/writes are best-effort so an unmigrated environment falls back to direct GitHub requests instead of failing sync. Sync results now expose `github_request_metrics` and per-repository `repository_request_metrics` with total requests, conditional requests, 304 cache hits, cold misses, and revalidated responses.

### Phase 4: Split Raw Sync From Derived Rebuilds

Implemented in the first pass for alternatives.

- Store raw GitHub signals separately from derived Agent Cards and alternatives.
- Rebuild global alternatives and graph summaries in a dedicated admin or scheduled task.
- Add a stale-derived-data indicator to quality/status endpoints.

Acceptance:

- Project metadata sync can run without recomputing global alternatives every time.
- Alternatives refresh can run independently and report its own status.

Current implementation extracts alternatives rebuilding into `refreshAlternativesDerivedData`, exposes it through the existing protected `/api/admin/alternatives` endpoint, and records each run as `task=derived:alternatives` in governance run history. Project sync supports `refreshDerived` / `refresh_derived`; Cron defaults to skipping inline alternatives refresh, while admin/manual sync defaults to the previous compatible behavior. Sync responses expose `derived_refresh.alternatives` so operators can tell whether a run updated or skipped derived alternatives.

`/api/sync/status` now includes `derived.alternatives` freshness. Alternatives are considered fresh for 7 days after the latest successful `derived:alternatives` governance run, stale after that, and unknown when no successful derived rebuild has been recorded. The public `/status` page and Trust Gate surface this signal so agents can disclose stale relationship data separately from GitHub metadata freshness.

### Phase 5: Conservative Candidate Discovery

Implemented after the initial sync stabilization.

- Add `candidate_repositories` as an audit table for discovered repositories, source query, status, sync time, and last error.
- Run one rotating GitHub repository search query per hourly cron invocation.
- Sync at most five new candidates per cron run by default.
- Skip repositories already in the curated seed list, D1 projects table, or previously synced candidate set.
- Record every discovery attempt as `task=candidate-discovery` in governance history.
- Expose protected `POST /api/admin/discovery` for manual discovery runs.

Acceptance:

- Cron keeps a five-repository hourly budget, runs candidate discovery first, and uses any remaining budget for existing-project refresh.
- Candidate discovery failure does not break the existing project refresh path.
- Discovery responses show the query, discovered count, selected candidates, synced projects, failed projects, and governance run.
- Operators can inspect discovery history through `/api/governance/runs?task=candidate-discovery`.

## Operator Guidance

Use these commands while Phase 1 is in place:

```sh
curl https://git.top/api/sync/status
```

For a safe health reset after a degraded run:

```sh
curl -X POST https://git.top/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":1,"signal_depth":"lite"}'
```

For catch-up, prefer repeated small rounds when health is degraded:

```sh
SYNC_SECRET=... pnpm sync:prod:catchup --rounds 10 --limit 5 --signal-depth lite
```

Increase catch-up batch size only after recent sync runs are healthy.

For a manual candidate discovery run:

```sh
curl -X POST https://git.top/api/admin/discovery \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"max_candidates":5}'
```

Inspect discovery history:

```sh
curl "https://git.top/api/governance/runs?task=candidate-discovery"
```
