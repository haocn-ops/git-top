# Git.Top Deployment Decision

## Decision

Git.Top V1 uses the Cloudflare Worker as the authoritative public runtime.

- Public product surface: `https://git.top`
- REST API surface: `https://git.top/api/*`
- MCP endpoint: `https://git.top/mcp`
- Admin sync endpoint: `POST /api/admin/sync`
- Scheduled sync: Cloudflare Cron trigger in `wrangler.toml`
- Database: Cloudflare D1 binding named `DB`

The repository is Worker-only. The previous Next.js preview layer was removed to prevent split UI ownership and route drift.

## Why This Shape

The core product is an agent-facing knowledge API. The Cloudflare Worker already owns the API, MCP, sync, and D1 data path, so it should be the V1 source of truth.

Keeping the Worker as the single product surface avoids a split where agents call one surface while the UI tells a different story. Human pages, REST APIs, MCP tools, sync, and D1-backed knowledge data now share the same runtime.

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
- `/atlas`
- `/alternatives/:project`
- `/score/:project`
- `/projects/:owner/:repo`
- `/api/*`
- `/mcp`

Legacy console prototype routes such as users, tenants, settings, register, and reports redirect to supported Worker pages.

## Verification

Before deploy:

```sh
pnpm release:check -- --skip-prod-smoke
```

After deploy, run the full release gate. It includes production quality and production smoke checks:

```sh
pnpm release:check
```

After deploy, verify at minimum:

```sh
pnpm smoke:prod
```

To verify a preview or local Worker instead of production:

```sh
pnpm release:check -- --base-url http://localhost:8787
```

This runs the local gate and then checks quality and smoke against the provided origin. Use `pnpm smoke:prod -- --base-url <origin>` only when the local gate has already passed and you only need a read-only origin check. Both commands require D1-backed responses by default; add `--allow-seed` only when intentionally verifying seed fallback behavior.

The smoke check covers `/api/health`, `/api/search`, `/api/grp/query`, `/mcp`, and MCP `tools/list`.
