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

## Agent Surface Map

Use the agent map when an agent needs to choose the right Git.Top surface before making a call:

```sh
curl https://git.top/api/agent-map
```

It maps each product concept to the matching human page, REST endpoints, MCP tools, output fields, trust fields, and recommended use. This is the machine-readable bridge between pages such as `/graph/:project` and APIs such as `/api/graph`.

## Response Metadata

Most knowledge endpoints include `metadata`.

Important fields:

- `source`: `d1` or `seed`
- `reason`: why that source was used
- `project_count`: number of projects in the loaded knowledge set
- `generated_at`: response metadata timestamp
- `loaded_project_limit`: maximum D1 knowledge rows loaded into the in-memory ranking set, present for D1-backed knowledge responses
- `truncated`: whether D1-backed knowledge reached that load limit and may omit additional indexed rows
- `warnings`: present when seed fallback or another caution applies

Agents should surface or account for this metadata when making recommendations.

Production agents should require `metadata.source` to be `d1` for high-confidence recommendations. If an endpoint returns `seed`, present the result as fallback-backed.

For fail-closed production reads, add `require_d1=true` to knowledge endpoints. When D1 is missing, empty, or failing, Git.Top returns `503` with error code `d1_required` instead of seed-backed results:

```sh
curl "http://localhost:8787/api/search?q=cloudflare%20agent%20framework&require_d1=true"
```

## Scoring Methodology

Git.Top exposes two separate scores because project popularity and agent usefulness are related but not identical.

`git_top_score` is the main open-source knowledge score. It is calculated from:

- 16% community
- 20% maintenance
- 16% documentation
- 16% stability
- 16% adoption
- 16% agent readability

`quality_score` is the repository activity score. It is calculated from:

- 40% 30-day star movement
- 20% 30-day commits
- 15% 180-day releases
- 15% 90-day contributors
- 10% issue first-response speed

`agent_score` is the agent-readiness score. It is calculated from:

- 22% documentation strength
- 24% maintenance score
- 20% deployment fit
- 18% popularity
- 16% community activity

Agents should inspect `quality_signal_confidence` before treating score inputs as complete. Star movement may be snapshot-backed or estimated; commit, release, and contributor counts may be complete, partial, or unknown depending on GitHub API collection depth.

Project lookup responses also expose `score` as a backwards-compatible alias for `git_top_score`.

Project records include `project.synced_at`, and metric records include `metrics.calculated_at`. Use these fields with endpoint `metadata.generated_at` and `/api/sync/status` when freshness matters.

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

If D1-backed `metadata.truncated` is `true`, the endpoint used a bounded in-memory ranking set and may not include every indexed project. Treat this as a scaling warning and inspect `metadata.loaded_project_limit`.

Use this before relying on live data. If D1 is unavailable or empty, Git.Top may return seed-backed knowledge with warnings.

## Operations Governance

The public operations dashboard is available at:

```txt
https://git.top/operations
```

Governance read endpoints expose recent automation history and are safe for dashboards:

```sh
curl https://git.top/api/governance/summary
curl "https://git.top/api/governance/runs?limit=20"
curl "https://git.top/api/governance/runs?task=daily-production-health"
```

Scheduled GitHub Actions jobs record task results through the protected endpoint:

```sh
curl -X POST https://git.top/api/admin/governance/runs \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"task":"daily-production-health","status":"success","trigger":"github_actions","summary":{"quality_score":100}}'
```

The first automated tasks are `daily-production-health`, `weekly-data-governance`, `biweekly-live-check`, and `monthly-corpus-review`.

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
- `project_kind`: `project` or `collection`
- `min_confidence`: `low`, `medium`, or `high`; requires all recorded classification signals to meet the threshold
- `cloudflare_ready`
- `ranking`: optional. Use `browse` for broad category/deployment discovery with larger result limits. Omit it for default exact-intent search ranking.
- `require_d1`: optional boolean. Use `true` when seed fallback must fail closed.
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

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/project" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","related_limit":8}'
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

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/recommend" \
  -H "content-type: application/json" \
  -d '{"use_case":"build Cloudflare-ready agent workflows","constraints":{"deployment":"cloudflare","category":"agent_framework","license":"MIT","cloudflare_ready":true},"limit":5}'
```

Useful filters:

- `use_case`
- `deployment`
- `category`
- `license`
- `difficulty`
- `language`
- `cloudflare_ready`
- `limit`

Recommendation items include both human and machine-readable explanation fields:

- `reason`: backward-compatible one-line explanation.
- `reasons`: ranked explanation sentences.
- `decision_summary`: short adoption-oriented summary for the candidate.
- `matched_constraints`
- `unmatched_constraints`
- `ranking_signals`: use-case, community, maintenance, readiness, and license-fit signals.
- `confidence`: `high`, `medium`, or `low`.
- `tradeoffs`
- `next_actions`: project, graph, alternatives, score, and compare links for follow-up decisions.

## Compare

```sh
curl "http://localhost:8787/api/compare?repos=langchain-ai/langchain,run-llama/llama_index,cloudflare/agents"
```

With deployment preference:

```sh
curl "http://localhost:8787/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare"
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/compare" \
  -H "content-type: application/json" \
  -d '{"project_ids":["cloudflare/agents","langchain-ai/langchain"],"deployment":"cloudflare"}'
```

Compare responses include `summary`, `stats`, `decision_matrix`, `next_actions`, ordered `projects`, `winner`, `reasoning`, and source metadata. Use them when an agent needs to justify why one candidate leads a shortlist.

## Alternatives

```sh
curl http://localhost:8787/api/alternatives/langchain-ai/langchain
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/alternatives" \
  -H "content-type: application/json" \
  -d '{"project_id":"langchain-ai/langchain","limit":12}'
```

Use alternatives when you need replacement candidates for the same job. The response includes:

- `project`: source project view.
- `summary`: short decision summary for the alternatives set.
- `stats`: candidate count, explicit match count, Cloudflare-ready count, average similarity, and top candidate.
- `next_actions`: compare, graph, score, project, and recommendation follow-up links.
- `comparison_links`: direct compare, graph, project, and score links for the source project.
- `alternatives`: backward-compatible project list.
- `alternative_matches`: enriched alternatives with `similarity_score`, `alternative_reason`, and `match_signals`.

## Related Projects

```sh
curl http://localhost:8787/api/related/cloudflare/agents
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/related" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","limit":8}'
```

Use related projects when you need adjacent ecosystem context: shared category, deployment target, dependency context, topics, or use cases. Project lookup responses also include a compact `related` array.

## Project Score

```sh
curl http://localhost:8787/api/score/cloudflare/agents
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/score" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents"}'
```

Use score explanations when an agent or UI needs to explain why a project has a specific Git.Top Score. The response includes weighted `dimensions`, total `git_top_score`, `strongest_dimension`, `weakest_dimension`, `adoption_guidance`, `risk_flags`, `next_actions`, related quality and agent scores, evidence, and links.

## Graph

```sh
curl "http://localhost:8787/api/graph?repo=cloudflare/agents&limit=24"
curl "http://localhost:8787/api/graph/cloudflare/agents?limit=24"
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/graph" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","limit":24}'
```

Use graph responses when you need a project relationship model. Focused responses include `summary`, `graph_stats`, `next_actions`, `relationship_groups`, `nodes`, and `edges` across alternatives, related projects, dependencies, deployment targets, and use cases.

## Atlas

```sh
curl "http://localhost:8787/api/atlas?limit=6"
curl "http://localhost:8787/api/atlas/cloudflare?limit=8"
```

Use Atlas when you need an ecosystem-level map before choosing a project. The response groups representative projects with `stats`, `exploration_paths`, ecosystem `map.nodes`, `map.edges`, curated concept nodes, and direct links to the page, search API, recommendation API, and graph API.

## Quality

```sh
curl http://localhost:8787/api/quality
```

Use this endpoint to inspect data quality before treating recommendations as high-confidence.

Important quality fields:

- `score`: backward-compatible alias for `release_score`.
- `release_score`: release-gate score based on errors and warnings. Info observations do not reduce it.
- `data_trust_score`: corpus trust score based on low-confidence classification, collection review load, stale sync, and stale collection metadata.
- `score_summary`: machine-readable explanation of how to read `release_score`, `data_trust_score`, and `risk_level` together.
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

Collection coverage is reported separately from the release score. A response can have a high `release_score` and a lower `data_trust_score` when the deployable API surface is healthy but the corpus still has review backlog. Use these fields to review resource hubs, awesome lists, cookbooks, and starter collections for scope and freshness without penalizing executable-project release health.

### Quality Review Queue

```sh
curl http://localhost:8787/api/quality/review
```

Use this endpoint to inspect the low-confidence classification and collection review backlog behind the public `/quality/review` page.

Important review fields:

- `project_count`: total projects in the active knowledge source.
- `review_count`: total items currently queued for review.
- `low_signal_count`: projects with weak classification evidence.
- `medium_signal_count`: projects with partial but not fully trusted classification evidence.
- `category_counts`: review backlog grouped by current category.
- `items[].project_id`
- `items[].classification_signals`
- `items[].reasons`
- `items[].suggested_action`
- `metadata.source`

Use `?require_d1=true` when an integration must fail closed instead of falling back to the bundled seed data.

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
