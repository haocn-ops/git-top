# Git.Top Deployment Decision

## Decision

Git.Top V1 uses the Cloudflare Worker as the authoritative public runtime.

- Public product surface: `https://git.top`
- REST API surface: `https://git.top/api/*`
- MCP endpoint: `https://git.top/mcp`
- Admin sync endpoint: `POST /api/admin/sync`
- Scheduled sync: Cloudflare Cron trigger in `wrangler.toml`
- Database: Cloudflare D1 binding named `DB`

The Next.js app remains part of the repository as a richer UI and static preview layer. It can render with bundled seed data or read the live Worker API when `NEXT_PUBLIC_GIT_TOP_API_BASE` is set.

## Why This Shape

The core product is an agent-facing knowledge API. The Cloudflare Worker already owns the API, MCP, sync, and D1 data path, so it should be the V1 source of truth.

Keeping the Worker authoritative avoids a split where agents call one surface while the UI tells a different story. The Next.js app can still be useful for browsing and presentation, but it should not define the canonical data behavior.

## Local Development

Run the Worker locally:

```sh
pnpm db:execute
pnpm db:seed
pnpm dev
```

The local Worker is expected at:

```txt
http://localhost:8787
```

Run the Next.js UI locally:

```sh
NEXT_PUBLIC_GIT_TOP_API_BASE=http://localhost:8787 pnpm next:dev
```

If `NEXT_PUBLIC_GIT_TOP_API_BASE` is not set, the Next.js UI uses bundled seed data and displays the fallback reason.

## Production Secrets

Production sync requires:

```sh
wrangler secret put GITHUB_TOKEN
wrangler secret put SYNC_SECRET
```

`GITHUB_TOKEN` is used for GitHub API rate limits and repository access.

`SYNC_SECRET` protects admin sync endpoints.

## Deployment

Deploy the Worker:

```sh
pnpm deploy
```

Before deploying code that reads new columns, apply the SQL migrations in `migrations/` to the target D1 database.

## Public Routes

Primary routes:

- `/`
- `/explorer`
- `/graph`
- `/graph/:project`
- `/projects/:owner/:repo`
- `/api/*`
- `/mcp`

Prototype console pages in the Next.js app, such as users, tenants, settings, and reports, are not part of the primary V1 navigation until backed by real persistence.

## Verification

Before deploy:

```sh
pnpm validate
pnpm quality:check
```

After deploy, verify at minimum:

```sh
pnpm smoke:prod
```

To verify a preview or local Worker instead of production:

```sh
pnpm smoke:prod -- --base-url http://localhost:8787
```

The smoke check covers `/api/health`, `/api/search`, `/api/grp/query`, `/mcp`, and MCP `tools/list`.
