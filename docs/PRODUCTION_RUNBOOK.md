# Git.Top Production Runbook

Git.Top V1 uses the Cloudflare Worker as the authoritative production runtime.

Production origin:

```txt
https://git.top
```

## Pre-Deploy

Run the full local gate:

```sh
pnpm validate
pnpm db:integration
```

When schema columns changed, apply migrations in `migrations/` to the target D1 database before deploying code that reads those columns.

## Deploy

```sh
pnpm deploy
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

For a preview or local Worker:

```sh
pnpm smoke:prod -- --base-url http://localhost:8787
```

Production smoke requires D1-backed responses. Add `--allow-seed` only when intentionally checking seed fallback behavior:

```sh
pnpm smoke:prod -- --base-url http://localhost:8787 --allow-seed
```

The smoke check verifies:

- `/api/health`
- `/api/search`
- `/api/grp/query`
- `/mcp`
- MCP `tools/list`

## Sync Check

Inspect production sync status:

```sh
curl https://git.top/api/sync/status
```

Healthy production should show:

- `synced_count` moving toward the seed repository count.
- `health` as `healthy` after a successful sync run.
- `last_failed_sync_at` empty or older than the latest successful run.
- `last_error` empty unless the most recent sync failed.

Trigger a small protected sync when needed:

```sh
curl -X POST https://git.top/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":5}'
```

## Data Quality Check

```sh
curl https://git.top/api/quality
```

Review:

- `metadata.source`
- `coverage.covered_categories`
- `coverage.missing_categories`
- `coverage.low_confidence_classification_rate`
- `coverage.stale_project_rate`

Treat `metadata.source: "seed"` as a degraded data-source mode even if API requests still succeed.

## Rollback Notes

Cloudflare Worker deploys are versioned by Cloudflare. If a deploy breaks smoke checks, roll back to the previous Worker version in the Cloudflare dashboard or redeploy the last known-good commit, then rerun `pnpm smoke:prod`.
