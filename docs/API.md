# Git.Top REST API

Git.Top exposes structured GitHub project knowledge for agents and developer tools.

Local base URL:

```txt
http://localhost:8787
```

Production base URL:

```txt
https://git.top
```

For a task-oriented walkthrough, start with [Agent Quickstart](./AGENT_QUICKSTART.md).

## Response Metadata

Most knowledge endpoints include `metadata`.

Important fields:

- `source`: `d1` or `seed`
- `reason`: why that source was used
- `project_count`: number of projects in the loaded knowledge set
- `generated_at`: response metadata timestamp
- `warnings`: present when seed fallback or another caution applies

Agents should surface or account for this metadata when making recommendations.

Production agents should require `metadata.source` to be `d1` for high-confidence recommendations. If an endpoint returns `seed`, present the result as fallback-backed.

## Health

```sh
curl http://localhost:8787/api/health
```

Production health includes D1 availability, project counts, sync cursor, sync health, sync freshness, and the timestamp of the latest successful sync.

Project count fields:

- `project_count`: knowledge-ready projects with complete project, Agent Card, and metric rows. This is the count used by search, quality, and MCP tools.
- `raw_project_count`: physical rows in the `projects` table.
- `knowledge_ready_project_count`: explicit alias for the knowledge-ready count.

If `raw_project_count` is higher than `knowledge_ready_project_count`, `metadata.warnings` explains how many rows are not yet usable as complete project knowledge.

Use this before relying on live data. If D1 is unavailable or empty, Git.Top may return seed-backed knowledge with warnings.

## Search

```sh
curl "http://localhost:8787/api/search?q=cloudflare%20agent%20framework&limit=5"
```

Supported filters:

- `q`
- `category`
- `deployment`
- `difficulty`
- `language`
- `cloudflare_ready`
- `ranking`: optional. Use `browse` for broad category/deployment discovery with larger result limits. Omit it for default exact-intent search ranking.
- `limit`

Example:

```sh
curl "http://localhost:8787/api/search?category=agent_framework&deployment=cloudflare&cloudflare_ready=true&limit=5"
```

Browse ranking example:

```sh
curl "http://localhost:8787/api/search?q=agent%20framework&category=agent_framework&deployment=cloudflare&ranking=browse&limit=10"
```

## Project Lookup

```sh
curl http://localhost:8787/api/project/cloudflare/agents
```

The response includes a compact project view, full `knowledge`, classification evidence, quality signal confidence, and metadata.

## Trending

```sh
curl "http://localhost:8787/api/trending?limit=10"
```

Optional category filter:

```sh
curl "http://localhost:8787/api/trending?category=mcp_server&limit=10"
```

## Recommendation

```sh
curl "http://localhost:8787/api/recommend?use_case=build%20a%20browser%20automation%20agent&deployment=docker&limit=5"
```

Useful filters:

- `use_case`
- `deployment`
- `difficulty`
- `language`
- `cloudflare_ready`
- `limit`

## Compare

```sh
curl "http://localhost:8787/api/compare?repos=langchain-ai/langchain,run-llama/llama_index,cloudflare/agents"
```

With deployment preference:

```sh
curl "http://localhost:8787/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare"
```

## Alternatives

```sh
curl http://localhost:8787/api/alternatives/langchain-ai/langchain
```

## Graph

```sh
curl "http://localhost:8787/api/graph?repo=cloudflare/agents&limit=24"
```

## Quality

```sh
curl http://localhost:8787/api/quality
```

Use this endpoint to inspect data quality before treating recommendations as high-confidence.

Important quality fields:

- `score`: backward-compatible release-gate score based on errors and warnings.
- `risk_level`: `low`, `medium`, or `high` data-quality risk based on confidence, collection review load, and stale data.
- `risk_summary`: machine-readable reasons and rates behind `risk_level`.
- `coverage.covered_categories`
- `coverage.missing_categories`
- `coverage.low_confidence_classification_rate`
- `coverage.stale_project_rate`
- `coverage.collection_count`
- `coverage.collection_scope_counts`
- `coverage.collection_freshness_counts`
- `coverage.stale_collection_count`
- `coverage.collection_review_count`
- `metadata.source`

Collection coverage is reported separately from the release quality score. Use these fields to review resource hubs, awesome lists, cookbooks, and starter collections for scope and freshness without penalizing executable-project quality.

## Schemas

```sh
curl http://localhost:8787/api/schema/agent-card.v1
curl http://localhost:8787/api/schema/project-knowledge.v1
curl http://localhost:8787/api/schema/project.v2
```

## GRP Query

GRP turns a natural-language goal into a graph-grounded plan, project set, comparison, or stack.

```sh
curl -X POST http://localhost:8787/api/grp/query \
  -H "content-type: application/json" \
  -d '{"goal":"compose a Cloudflare-ready coding agent stack","mode":"compose","constraints":{"deploy":["cloudflare"],"agent_ready":true}}'
```

See `docs/GRP_EXAMPLES.md` for more examples.

## Admin Sync

Admin sync requires `SYNC_SECRET`.

```sh
curl -X POST http://localhost:8787/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":5,"offset":0}'
```

Use lightweight signal collection for catch-up syncs that need to stay under Worker subrequest limits:

```sh
curl -X POST http://localhost:8787/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":5,"signal_depth":"lite"}'
```

Sync a specific set:

```sh
curl -X POST http://localhost:8787/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"repositories":["cloudflare/agents","modelcontextprotocol/servers"],"limit":2}'
```

## Admin Classification Overrides

Classification overrides require `SYNC_SECRET`. They provide a reviewed correction ledger for low-confidence or ambiguous classifications.

List overrides:

```sh
curl https://git.top/api/admin/classification-overrides \
  -H "authorization: Bearer $SYNC_SECRET"
```

Create or update an override:

```sh
curl -X POST https://git.top/api/admin/classification-overrides \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{
    "project_id": "cloudflare/agents",
    "category": "agent_framework",
    "difficulty": "beginner",
    "deployment": ["cloudflare", "serverless", "local"],
    "cloudflare_ready": true,
    "notes": "Manual review confirmed Workers-native deployment.",
    "reviewed_by": "operator"
  }'
```

Overrides are persisted separately from generated Agent Cards so review decisions can be audited before they are applied to runtime classification behavior.

## Sync Status

```sh
curl http://localhost:8787/api/sync/status
```

Use this to inspect cursor progress, recent sync runs, last error, and sync health.

Important sync status fields:

- `health`: latest run health, based on success or failure.
- `freshness`: `fresh` when a successful sync completed within the last 24 hours, `stale` after that, or `unknown` when no successful run is recorded.
- `hours_since_successful_sync`
- `cycle_complete`
- `next_batch_wraps`
- `last_failed_sync_at`
- `last_error`
