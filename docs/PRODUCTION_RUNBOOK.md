# Git.Top Production Runbook

Git.Top V1 uses the Cloudflare Worker as the authoritative production runtime.

Production origin:

```txt
https://git.top
```

## Pre-Deploy

Run the full local gate:

```sh
pnpm release:check -- --skip-prod-smoke
```

Run the combined public V1 release gate after deployment:

```sh
pnpm release:check
```

`pnpm release:check` includes local validation, local D1 integration, production quality, and production smoke. For a pre-deploy check where production is intentionally not available yet:

```sh
pnpm release:check -- --skip-prod-smoke
```

When schema columns changed, apply migrations in `migrations/` to the target D1 database before deploying code that reads those columns.

## Deploy

```sh
pnpm run deploy
```

Required production secrets:

```sh
wrangler secret put GITHUB_TOKEN
wrangler secret put SYNC_SECRET
```

## Post-Deploy Smoke

Run the read-only production smoke check:

```sh
pnpm smoke:prod
```

Run the production quality gate:

```sh
pnpm quality:check
```

The quality gate defaults to `https://git.top/api/quality`, requires D1-backed metadata, and fails when the score is below `MIN_QUALITY_SCORE` or `--min-score` (default `90`). Error and warning issues reduce the score; info issues remain visible as review guidance without reducing the release score.

The current V1 release policy is manual deploy with scripted gates. Do not enable CI-driven production deploys until D1 migration order, production secrets, and rollback ownership are explicit in the CI workflow.

GitHub Actions runs the local public V1 release gate with production smoke disabled:

```sh
pnpm release:check -- --skip-prod-smoke
```

This catches validation and local D1 integration regressions on PRs without depending on production state.

For a preview or local Worker:

```sh
pnpm release:check -- --base-url http://localhost:8787
```

This runs local validation, local D1 integration, preview quality, and preview smoke against the same origin. Use the lighter smoke command only when the local gate has already passed and you only need a read-only origin check:

```sh
pnpm smoke:prod -- --base-url http://localhost:8787
```

Production and preview checks require D1-backed responses by default. Add `--allow-seed` only when intentionally checking seed fallback behavior:

```sh
pnpm release:check -- --base-url http://localhost:8787 --allow-seed
```

GitHub Actions also supports a manual preview check: run the `Validate` workflow with `smoke_base_url` set to the preview Worker origin. Set `allow_seed` only for intentional fallback previews.

The smoke check verifies:

- `/api/health`
- `/api/search`
- `/api/grp/query`
- `/mcp`
- MCP `tools/list`

For `/api/health`, production smoke requires `db: "available"` unless `--allow-seed` is explicit. It also checks that `project_count` matches `knowledge_ready_project_count`, that raw and knowledge-ready counts are numeric, and that raw rows are not lower than knowledge-ready rows when D1 is available.

## Sync Check

Inspect production sync status:

```sh
curl https://git.top/api/sync/status
```

Healthy production should show:

- `synced_count` moving toward the seed repository count.
- `health` as `healthy` after a successful sync run.
- `freshness` as `fresh` when a successful sync completed within the last 24 hours.
- `hours_since_successful_sync` low enough for the current operating window.
- `cycle_complete` true after the seed list has been fully covered at least once.
- `next_batch_wraps` true only when the next sync batch crosses the end of the seed list and wraps back to the beginning.
- `last_failed_sync_at` empty or older than the latest successful run.
- `last_error` empty unless the most recent sync failed.

Cron sync intentionally uses lightweight signal collection: it processes five repositories per invocation, reads README and root files, checks one page each for commits, releases, and contributors, and skips issue-comment deep dives. This keeps steady progress under Cloudflare Worker subrequest limits.

Trigger a small protected sync when needed:

```sh
curl -X POST https://git.top/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":1}'
```

Use lightweight signal collection for catch-up syncs:

```sh
curl -X POST https://git.top/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":5,"signal_depth":"lite"}'
```

Run repeated catch-up rounds from the repo:

```sh
SYNC_SECRET=... pnpm sync:prod:catchup --rounds 10 --limit 5
```

Use larger manual limits only after checking recent `/api/sync/status` runs. If production is `degraded` with a subrequest-limit error, run `limit:1` or `signal_depth:"lite"` until a successful run makes `health` return to `healthy`.

## Data Quality Check

```sh
curl https://git.top/api/quality
```

Review:

- `metadata.source`
- `score`
- `risk_level`
- `risk_summary.reasons`
- `coverage.covered_categories`
- `coverage.missing_categories`
- `coverage.low_confidence_classification_rate`
- `coverage.stale_project_rate`

Treat `metadata.source: "seed"` as a degraded data-source mode even if API requests still succeed.

## Classification Overrides

Use the low-confidence review report to decide whether a generated classification needs an operator override:

```sh
pnpm quality:review
```

Persist a reviewed override:

```sh
curl -X POST https://git.top/api/admin/classification-overrides \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","category":"agent_framework","cloudflare_ready":true,"reviewed_by":"operator"}'
```

List current overrides:

```sh
curl https://git.top/api/admin/classification-overrides \
  -H "authorization: Bearer $SYNC_SECRET"
```

Overrides are an audit ledger first. Apply them to generated Agent Cards only after the review policy for that correction type is clear.

## Rollback Notes

Cloudflare Worker deploys are versioned by Cloudflare. If a deploy breaks smoke checks, roll back to the previous Worker version in the Cloudflare dashboard or redeploy the last known-good commit, then rerun `pnpm smoke:prod`.
