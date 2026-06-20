# Git.Top

Agent-native GitHub knowledge layer.

Git.Top turns unstructured GitHub repository data into structured project knowledge that AI agents can search, compare, recommend, and call through REST APIs or MCP tools.

## Development

```sh
pnpm install
pnpm db:execute
pnpm db:seed
pnpm seed:validate
pnpm check
pnpm quality:check
pnpm dev
```

`/api/health` reports D1 availability and the current project count. Run `pnpm db:execute` and `pnpm db:seed` before local API checks when the D1 state is empty.

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
- `GET /api/alternatives/:owner/:name`
- `POST /api/admin/sync`
- `POST /api/admin/alternatives`

See [git_top_v1.md](./git_top_v1.md) for the V1 development spec.
