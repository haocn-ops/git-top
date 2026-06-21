# Git.Top

Agent-native GitHub knowledge layer.

Git.Top turns unstructured GitHub repository data into structured project knowledge that AI agents can search, compare, recommend, and call through REST APIs or MCP tools.

## Documentation

- [Next stage plan](./docs/NEXT_STAGE_PLAN.md)
- [Deployment decision](./docs/DEPLOYMENT_DECISION.md)
- [REST API guide](./docs/API.md)
- [MCP guide](./docs/MCP.md)
- [GRP examples](./docs/GRP_EXAMPLES.md)
- [Agent quickstart](./docs/AGENT_QUICKSTART.md)
- [Production runbook](./docs/PRODUCTION_RUNBOOK.md)
- [Data coverage report](./docs/DATA_COVERAGE.md)
- [Seed live check report](./docs/SEED_LIVE_CHECK.md)
- [Eval quality report](./docs/EVAL_QUALITY.md)
- [Local eval report](./docs/EVAL_LOCAL.md)
- [Ranking experiments](./docs/RANKING_EXPERIMENTS.md)

## Development

```sh
pnpm install
pnpm db:execute
pnpm db:seed
pnpm seed:validate
pnpm seed:coverage
pnpm seed:candidates
pnpm seed:live-check -- --limit 20
pnpm seed:live-check -- --offset 20 --limit 20
pnpm knowledge:validate
pnpm db:seed-sql
pnpm db:validate
pnpm db:integration
pnpm core:validate
pnpm api:validate
pnpm mcp:validate
pnpm eval:quality
pnpm eval:local
pnpm eval:ranking
pnpm smoke:prod
pnpm release:check
pnpm check
pnpm validate
pnpm quality:check
pnpm dev
```

`/api/health` reports D1 availability and the current project count. Run `pnpm db:execute` and `pnpm db:seed` before local API checks when the D1 state is empty. `pnpm db:execute` prepares the local D1 schema and backfills optional columns that may be missing from older local databases. `seed.sql` is generated from hand-authored seed knowledge and generated eval fixtures; run `pnpm db:seed-sql` after changing those fixtures. `pnpm db:integration` seeds local D1, starts a temporary local Worker, and validates the D1-backed HTTP API path.

`pnpm eval:quality` is the CI-safe recommendation and classification regression gate. `pnpm eval:local` runs broader generated category and deployment probes across the fixture-backed project set and writes [docs/EVAL_LOCAL.md](./docs/EVAL_LOCAL.md); use it before tuning ranking heuristics, but keep it out of the default validation path. `pnpm eval:ranking` compares offline ranking strategies in [docs/RANKING_EXPERIMENTS.md](./docs/RANKING_EXPERIMENTS.md). Runtime search keeps exact-intent ranking by default; broad scoped discovery can opt into `ranking=browse`.

`pnpm seed:candidates` discovers seed expansion candidates from live GitHub organization metadata and writes [docs/SEED_CANDIDATES.md](./docs/SEED_CANDIDATES.md). Treat it as a review queue, not an automatic append step; candidates still need live-check and category review before entering `data/seed-repositories.json`.

`pnpm smoke:prod` validates the deployed Worker at `https://git.top` and requires D1-backed responses. Use `pnpm smoke:prod -- --base-url http://localhost:8787` for a local or preview Worker, or add `--allow-seed` only when intentionally checking seed fallback behavior.

`pnpm release:check` runs the public V1 release gate: local validation, local D1 integration, and production smoke. Use `pnpm release:check -- --skip-prod-smoke` only when validating a build before the production deployment exists.

When updating an existing D1 database, apply SQL files in [migrations](./migrations) before deploying code that reads the new columns.

The Next.js UI reads bundled seed data by default so static builds work without a Worker. Set `NEXT_PUBLIC_GIT_TOP_API_BASE` to a deployed or local Worker origin, for example `http://localhost:8787`, to load project lists and graph pages from the live API. UI headers show the active data source and fallback reason.

## Sync

Git.Top can sync real repository data from the GitHub API into D1.

Required production secrets:

```sh
wrangler secret put GITHUB_TOKEN
wrangler secret put SYNC_SECRET
```

For local development, copy [.dev.vars.example](./.dev.vars.example) to `.dev.vars` and fill in real values.

Trigger a protected local or production sync:

```sh
curl -X POST http://localhost:8787/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit": 5, "offset": 0}'
```

Use `{"limit":5,"signal_depth":"lite"}` for catch-up syncs that should stay under Worker subrequest limits.

Run repeated production catch-up rounds:

```sh
SYNC_SECRET=... pnpm sync:prod:catchup --rounds 10 --limit 5
```

Omit `offset` to use the stored seed cursor. Cron syncs use this cursor and advance through the seed list in small batches.

## API

- `GET /api/project/:owner/:name`
- `GET /api/health`
- `GET /api/quality`
- `GET /api/sync/status`
- `GET /api/schema/agent-card.v1`
- `GET /api/schema/project-knowledge.v1`
- `GET /api/search`
- `GET /api/trending`
- `GET /api/category/:name`
- `GET /api/recommend`
- `GET /api/compare`
- `GET /api/alternatives/:owner/:name`
- `POST /api/grp/query`
- `POST /api/admin/sync`
- `POST /api/admin/alternatives`

See [git_top_v1.md](./git_top_v1.md) for the V1 development spec and [git_top_grp_v1.md](./git_top_grp_v1.md) for the GRP v1 reasoning protocol implementation spec.
