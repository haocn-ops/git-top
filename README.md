# Git.Top

The Knowledge Graph of Open Source.

GitHub provides code. Git.Top provides knowledge.

Git.Top turns unstructured GitHub repository data into structured project knowledge that humans and AI agents can search, compare, recommend, score, and call through REST APIs or MCP tools.

The Cloudflare Worker is the only product surface. It serves the human HTML pages, REST APIs, MCP endpoint, GitHub sync, and D1-backed knowledge data.

Production: [git.top](https://git.top)

Repository: [github.com/haocn-ops/git-top](https://github.com/haocn-ops/git-top)

## What Git.Top Does

- Discover open-source AI projects by category, deployment target, and use case.
- Compare projects with decision summaries, ranking signals, and tradeoffs.
- Find alternatives with similarity signals and comparison-ready shortlists.
- Explore project relationships across alternatives, related projects, dependencies, deployments, and use cases.
- Explain Git.Top Score, Agent Score, quality signals, risk flags, and evidence.
- Serve agent-native REST, OpenAPI, `llms.txt`, `llms-full.txt`, and MCP surfaces.

## Product Surfaces

- `/discover` - browse AI agents, MCP servers, RAG, browser automation, and AI IDE projects.
- `/recommend` - turn use cases and constraints into explainable project shortlists.
- `/compare` - compare project shortlists.
- `/alternatives` and `/alternatives/:project` - find replacement candidates.
- `/graph/:project` - inspect project knowledge graphs.
- `/score/:project` - explain project score dimensions.
- `/atlas` - explore ecosystem maps.
- `/api/*` - consume structured knowledge.
- `/mcp` - connect agents through MCP.

## Architecture

```text
GitHub API
  -> Git.Top ETL
  -> Cloudflare D1
  -> Worker pages, REST APIs, MCP tools, sync jobs, and quality gates
```

The project intentionally does not ship a separate Next.js app. Keeping Worker-rendered pages, APIs, sync, D1 access, OpenAPI, and MCP in one runtime avoids split product behavior.

## Documentation

- [Git.Top 2.0 product upgrade plan](./docs/GIT_TOP_2_PRODUCT_UPGRADE_PLAN.md)
- [Next stage plan](./docs/NEXT_STAGE_PLAN.md)
- [Deployment decision](./docs/DEPLOYMENT_DECISION.md)
- [REST API guide](./docs/API.md)
- [MCP guide](./docs/MCP.md)
- [GRP examples](./docs/GRP_EXAMPLES.md)
- [Agent quickstart](./docs/AGENT_QUICKSTART.md)
- [MailAgents agent workflow article](./docs/MAILAGENTS_AGENT_WORKFLOW.md)
- [Site assessment 2026-06-21](./docs/SITE_ASSESSMENT_2026-06-21.md)
- [Production runbook](./docs/PRODUCTION_RUNBOOK.md)
- [Operations and data governance plan](./docs/OPERATIONS_DATA_GOVERNANCE_PLAN.md)
- [Data coverage report](./docs/DATA_COVERAGE.md)
- [Seed live check report](./docs/SEED_LIVE_CHECK.md)
- [Eval quality report](./docs/EVAL_QUALITY.md)
- [Local eval report](./docs/EVAL_LOCAL.md)
- [Ranking experiments](./docs/RANKING_EXPERIMENTS.md)
- [Quality hardening plan](./docs/QUALITY_HARDENING_PLAN.md)
- [Post-V1 improvement plan](./docs/POST_V1_IMPROVEMENT_PLAN.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [License](./LICENSE)

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
node scripts/run-governance-task.mjs daily-production-health
pnpm knowledge:validate
pnpm db:seed-sql
pnpm db:validate
pnpm db:integration
pnpm core:validate
pnpm api:validate
pnpm mcp:validate
pnpm eval:quality
pnpm eval:explanations
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

`pnpm eval:quality` is the CI-safe recommendation and classification regression gate. `pnpm eval:explanations` checks that agent-facing responses include source metadata, classification evidence, quality signal confidence, recommendation reasons/tradeoffs, health count semantics, and GRP reasoning. `pnpm eval:local` runs broader generated category and deployment probes across the fixture-backed project set and writes [docs/EVAL_LOCAL.md](./docs/EVAL_LOCAL.md); use it before tuning ranking heuristics, but keep it out of the default validation path. `pnpm eval:ranking` compares offline ranking strategies in [docs/RANKING_EXPERIMENTS.md](./docs/RANKING_EXPERIMENTS.md). Runtime search keeps exact-intent ranking by default; broad scoped discovery can opt into `ranking=browse`.

`pnpm seed:candidates` discovers seed expansion candidates from live GitHub organization metadata and writes [docs/SEED_CANDIDATES.md](./docs/SEED_CANDIDATES.md). Treat it as a review queue, not an automatic append step; candidates still need live-check and category review before entering `data/seed-repositories.json`.

`pnpm smoke:prod` validates the deployed Worker at `https://git.top` and requires D1-backed responses. Use `pnpm smoke:prod -- --base-url http://localhost:8787` for a local or preview Worker, or add `--allow-seed` only when intentionally checking seed fallback behavior.

`pnpm quality:check` validates the production `/api/quality` endpoint at `https://git.top` by default, requires D1-backed metadata, and uses a default minimum score of `90`. Use `--base-url`, `--target`, `--min-score`, or `--allow-seed` for preview and fallback checks.

Operations and data governance are exposed through `/operations`, `/api/governance/summary`, and `/api/governance/runs`. The scheduled GitHub Actions workflow in `.github/workflows/governance.yml` runs daily, weekly, biweekly, and monthly governance tasks and records results through `/api/admin/governance/runs` using `SYNC_SECRET`.

`pnpm release:check` runs the public V1 release gate: local validation, local D1 integration, production quality, and production smoke. Use `pnpm release:check -- --skip-prod-smoke` only when validating a build before the production deployment exists; it skips production-only checks. Use `pnpm release:check -- --base-url <origin>` to run the same gate against a Worker preview or local origin.

When updating an existing D1 database, apply SQL files in [migrations](./migrations) before deploying code that reads the new columns.

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
  -d '{"limit": 40, "offset": 0, "signal_depth": "lite"}'
```

Use `{"limit":40,"signal_depth":"lite"}` for manual catch-up syncs after checking recent `/api/sync/status` runs. Cron uses a smaller lightweight batch size to stay under Worker subrequest limits, while manual catch-up remains capped at 50.

Run repeated production catch-up rounds:

```sh
SYNC_SECRET=... pnpm sync:prod:catchup --rounds 13 --limit 40
```

Omit `offset` to use the stored seed cursor. Cron syncs use this cursor and advance through the seed list in bounded batches.

## API

- `GET /api/project/:owner/:name`
- `GET /api/health`
- `GET /api/quality`
- `GET /api/governance/summary`
- `GET /api/governance/runs`
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
- `POST /api/admin/governance/runs`

See [git_top_v1.md](./git_top_v1.md) for the V1 development spec and [git_top_grp_v1.md](./git_top_grp_v1.md) for the GRP v1 reasoning protocol implementation spec.

## License

MIT
