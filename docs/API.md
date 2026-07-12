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

For a task-oriented walkthrough, start with [Agent Quickstart](./AGENT_QUICKSTART.md). For copyable TypeScript and Python client patterns, see [SDK-Oriented Examples](./SDK_EXAMPLES.md).

For the product assessment and agent-native improvement roadmap, see [Agent-Native Assessment and Optimization Plan](./AGENT_NATIVE_ASSESSMENT_AND_OPTIMIZATION_PLAN.md). Coding agents that modify this repository should start with [../AGENTS.md](../AGENTS.md).

## Agent Contract Rules

Agent-facing clients should treat these fields and behaviors as the stable trust contract:

- Use `metadata.source` to distinguish D1-backed production data from seed fallback.
- Use `metadata.snapshot_id` to keep multi-step project, alternatives, score, and comparison decisions on a consistent corpus snapshot.
- Read `metadata.latest_synced_at` and `metadata.schema_version` before caching or replaying agent decisions.
- Use `require_d1=true` when a workflow should fail closed instead of returning fallback data.
- Read `metadata.reason`, `metadata.warnings`, `metadata.truncated`, and `metadata.loaded_project_limit` before making high-confidence claims.
- Inspect classification evidence and `quality_signal_confidence` before asserting category, deployment, Cloudflare readiness, quality, or activity.
- Use normalized evidence fields where present: `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at`.
- Use `/api/trust` before high-confidence production recommendations.
- Prefer structured fields such as recommendations, decision matrices, score dimensions, risk flags, evidence, and next actions over scraping HTML pages.

Fields such as ranking order, generated summaries, and explanatory prose are advisory. Stable integrations should rely on canonical project ids, metadata, trust fields, scores, evidence, and documented request parameters.

Project, recommendation, score, alternatives, graph, and GRP responses expose normalized evidence fields for agent citation:

- `evidence`: classification, quality signal confidence, source fields, caveats, and verification time.
- `caveats`: concise warnings an agent should disclose or resolve.
- `confidence_reason`: a short explanation of why the response is high, medium, low, or review-worthy.
- `source_fields`: the source record fields used to build the response.
- `last_verified_at`: the best available sync or metric timestamp.

## OpenAPI Examples

`/openapi.json` includes compact canonical response examples for the highest-volume agent flows:

- `GET /api/health`
- `GET /api/trust`
- `GET /api/search`
- `GET /api/project/{owner}/{repo}`
- `POST /api/recommend`
- `GET /api/compare`
- `GET /api/workflow`
- `GET /api/alternatives/{owner}/{repo}`
- `GET /api/graph`
- `GET /api/score/{owner}/{repo}`
- `GET /mcp`

Use these examples as integration fixtures for client parsing and answer formatting. They are intentionally small and contract-focused; live responses may include more fields, more projects, and different ranking order.

## Agent Surface Map

Use the agent map when an agent needs to choose the right Git.Top surface before making a call:

```sh
curl https://git.top/api/agent-map
```

It maps each product concept to the matching human page, REST endpoints, MCP tools, output fields, trust fields, and recommended use. This is the machine-readable bridge between pages such as `/graph/:project` and APIs such as `/api/graph`.
The response also splits discovery into `short_path` and `reference_path`; agents should read `short_path` first and expand only when they need the fuller surface.

## Agent Workflow

Use the workflow endpoint when an agent needs an end-to-end selection path instead of a single result:

```sh
curl "https://git.top/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5"
```

Structured POST body:

```sh
curl -X POST "https://git.top/api/workflow" \
  -H "content-type: application/json" \
  -d '{"intent":"evaluate Claude Code alternatives","project_id":"claude-code","constraints":{"deployment":"local"},"limit":5}'
```

The response includes:

- `recommended_sequence`: direct REST URLs and MCP tools for health, trends, recommendations, graph, alternatives, score, and compare.
- `shortlist`: recommendation summaries with score, confidence, and next actions.
- `trend_context`: compact trends to frame the decision.
- `agent_map`: relevant surfaces an agent can call next.
- `trust_policy`: fields to cite or disclose before presenting a recommendation.

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

Structured POST knowledge endpoints use the same query parameter:

```sh
curl -X POST "http://localhost:8787/api/recommend?require_d1=true" \
  -H "content-type: application/json" \
  -d '{"deployment":"cloudflare","category":"agent_framework","limit":3}'
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
For agent-friendly normalization, prefer `project_id` for the canonical repo id, `git_top_score` for the main knowledge score, `quality_score` for repository activity, and `agent_score` for agent-readiness.

Project records include `project.synced_at`, and metric records include `metrics.calculated_at`. Use these fields with endpoint `metadata.generated_at` and `/api/sync/status` when freshness matters.

## Health

```sh
curl http://localhost:8787/api/health
```

Production health includes D1 availability, project counts, sync cursor, sync health, sync freshness, and the timestamp of the latest successful sync. Use `/api/sync/status` when you also need priority queues, GitHub sync details, and `derived.alternatives` freshness.

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
curl "https://git.top/api/governance/runs?task=derived:alternatives"
```

Cloudflare Worker cron records scheduled governance results directly in D1. External or manual jobs can still record task results through the protected endpoint:

```sh
curl -X POST https://git.top/api/admin/governance/runs \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"task":"daily-production-health","status":"success","trigger":"manual","summary":{"quality_score":100}}'
```

The first Worker-native automated tasks are `daily-production-health`, `weekly-data-governance`, `biweekly-live-check`, and `monthly-corpus-review`.

Derived data refreshes also record governance history. `derived:alternatives` is written by the protected alternatives refresh endpoint and is used by sync status and Trust Gate freshness checks.

## Trust Gate

```sh
curl https://git.top/api/trust
```

Use the Trust Gate before high-confidence production recommendations. It combines health, sync freshness, release score, data trust score, and risk level into one `decision`:

- `allow`: use Git.Top recommendations directly when endpoint responses are D1-backed.
- `caution`: use Git.Top as decision support, but disclose the listed caveats.
- `block`: fail closed for high-confidence recommendations.

Important fields:

- `decision`
- `production_ready`
- `checks[].status`
- `required_for_high_confidence`
- `agent_policy`
- `health`
- `sync`
- `quality`
- `metadata.source`

After the gate:

- Use `decision=allow` for direct production recommendations when the specific endpoint response is also D1-backed.
- Use `decision=caution` with caveats, then inspect `/api/quality` or MCP `get_quality_report` for details.
- Use `decision=block` to fail closed instead of presenting a high-confidence recommendation.

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
- `cursor`: opaque `page.next_cursor` from the previous response.

Example:

```sh
curl "http://localhost:8787/api/search?category=agent_framework&deployment=cloudflare&cloudflare_ready=true&limit=5"
```

Browse ranking example:

```sh
curl "http://localhost:8787/api/search?q=agent%20framework&category=agent_framework&deployment=cloudflare&ranking=browse&limit=10"
```

Search, trending, and category lists return `page.offset`, `page.limit`, `page.has_more`, `page.next_cursor`, and `page.snapshot_id`. Cursors are bound to both the query and `metadata.snapshot_id`; restart without a cursor after `stale_page_cursor` because continuing across corpus snapshots could skip or duplicate projects.

Known high-signal typos and common Chinese AI-domain terms are conservatively normalized before ranking. When normalization occurs, inspect `search.query_interpretation` for the original query, normalized query, and explicit transformations. Git.Top does not apply unrestricted fuzzy matching.

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

The response includes a compact project view, a first-class `summary` object, full `knowledge`, classification evidence, quality signal confidence, related projects, and metadata.

The `summary` object is the shortest agent-readable project contract. It includes:

- `tl_dr`: one-sentence project overview.
- `purpose`: longer agent-facing purpose text.
- `install`: conservative setup hint or `null` when Git.Top cannot infer one.
- `inputs` and `outputs`: category-level operating model.
- `good_for` and `not_good_for`: use cases and caveats merged from Agent Card knowledge and category hints.
- `deployment`: indexed deployment targets.
- `alternatives`: first replacement candidates with reasons.

Use `summary` for first-pass agent reasoning, then inspect `knowledge.agent_card.classification`, `quality_signal_confidence`, and `metadata.source` before making high-confidence production claims.

## Batch Project Lookup

Fetch up to 20 canonical repositories from one corpus snapshot:

```sh
curl -X POST "http://localhost:8787/api/projects?require_d1=true" \
  -H "content-type: application/json" \
  -d '{"project_ids":["cloudflare/agents","openai/codex"],"profile":"decision"}'
```

`profile` accepts `compact`, `decision`, or `evidence`. The response preserves request order, returns unresolved IDs in `missing`, and includes one `metadata.snapshot_id` for the entire batch. A GET form is also available with comma-separated `ids`.

## Project Change Feed

```sh
curl "http://localhost:8787/api/changes?since=2026-07-12T00:00:00Z&limit=50"
```

Use the opaque `page.next_cursor` for the next request, including when `has_more=false`; this makes the endpoint suitable for continuous polling without replaying the last page. Events include `added`, `updated`, `classification_changed`, `score_changed`, and `deleted`; deleted projects carry `tombstone=true`. The feed is D1-only, fails closed when D1 is unavailable, and exposes the actual lower bound in `retention.earliest_guaranteed_at`. Consumers that were last synchronized before that bound must rebuild from a fresh snapshot.

## Agent Feedback Proposals

```sh
curl -X POST "http://localhost:8787/api/feedback/proposals" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","feedback_type":"classification","proposed":{"category":"agent_framework"},"evidence":[{"url":"https://github.com/cloudflare/agents","field":"README"}],"rationale":"The README explicitly describes an agent framework."}'
```

Anonymous requests validate, normalize, and fingerprint a proposal without writing it. Add `Authorization: Bearer $FEEDBACK_SECRET` to persist it for administrator review. Duplicate corrections share a stable fingerprint. Accepted proposals remain review records and never mutate project knowledge, classification overrides, alternatives, or ranking automatically.

Administrators list and review persisted proposals through `GET` and `POST /api/admin/feedback-proposals` with `SYNC_SECRET`.

## Trending

```sh
curl "http://localhost:8787/api/trending?limit=10"
```

Optional category filter:

```sh
curl "http://localhost:8787/api/trending?category=mcp_server&limit=10"
```

## Trends

```sh
curl "http://localhost:8787/api/trends?limit=8"
```

Use trends when you need corpus-level direction before selecting projects. The response includes:

- `summary`
- `stats`
- `trend_signals`
- `categories`, `deployments`, and `languages`
- `rising_projects`
- `agent_briefing`

The same concept is available to MCP clients as `get_trends`.

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
- `fit_profile`: primary fit, deployment fit, maturity, and agent-readiness guidance.
- `adoption_plan`: suggested verification and rollout steps before selecting the project.
- `risk_flags`: indexed risks such as unmatched constraints, weak maintenance, or low confidence.
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
curl http://localhost:8787/api/alternatives/claude-code
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
- `alternative_matches`: enriched alternatives with `similarity_score`, `alternative_reason`, `replacement_type`, and `match_signals`.
- `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at`: normalized citation and uncertainty fields for the overall decision and enriched alternative matches.

The path form accepts either `owner/repo` or a Git.Top alias such as `claude-code`. Alias responses include `resolved_from`.

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
curl http://localhost:8787/api/score/claude-code
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/score" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents"}'
```

Use score explanations when an agent or UI needs to explain why a project has a specific Git.Top Score. The response includes weighted `dimensions`, total `git_top_score`, `strongest_dimension`, `weakest_dimension`, `adoption_guidance`, `risk_flags`, `next_actions`, related quality and agent scores, evidence, and links.

The path form accepts either `owner/repo` or a Git.Top alias such as `claude-code`. Alias responses include `resolved_from` so agents can cite the canonical repository behind the request.

## Graph

```sh
curl "http://localhost:8787/api/graph?repo=cloudflare/agents&limit=24"
curl "http://localhost:8787/api/graph/cloudflare/agents?limit=24"
curl "http://localhost:8787/api/graph/claude-code?limit=24"
```

Structured POST body:

```sh
curl -X POST "http://localhost:8787/api/graph" \
  -H "content-type: application/json" \
  -d '{"project_id":"cloudflare/agents","limit":24}'
```

Use graph responses when you need a project relationship model. Focused responses include `summary`, `graph_stats`, `next_actions`, `relationship_groups`, `nodes`, and `edges` across alternatives, related projects, dependencies, deployment targets, and use cases. They also include normalized `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at` fields so agents can cite graph grounding and disclose weak relationship coverage.

Focused graph requests accept either `repo=owner/repo`, `/api/graph/:owner/:repo`, or `/api/graph/:project` with a Git.Top alias. Alias responses include `resolved_from`.

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

## Public Trust Benchmark

```sh
curl http://localhost:8787/api/benchmark
curl http://localhost:8787/api/benchmark?require_d1=true
```

Use `/benchmark` or `/api/benchmark` when a user or agent needs a public, citable health summary without reading internal planning documents. The response combines current eval baseline metrics, explanation coverage, runtime data coverage, review queue size, known limitations, and links to quality/trust details.

Important benchmark fields:

- `evaluation.top1_hit_rate`
- `evaluation.top3_hit_rate`
- `evaluation.category_accuracy`
- `evaluation.deployment_accuracy`
- `explanations.coverage`
- `data_coverage.release_score`
- `data_coverage.data_trust_score`
- `data_coverage.risk_level`
- `review_queue.review_count`
- `known_limitations`
- `metadata.source`

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

Use `POST /api/grp/query?require_d1=true` when graph reasoning must fail closed unless the knowledge source is D1-backed.

GRP responses include normalized `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at` fields alongside `metadata.data_source`, `nodes`, `edges`, `solution_paths`, and `recommended_stack`.

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
  -d '{"limit":5,"signal_depth":"lite","refresh_derived":false}'
```

Sync a specific set:

```sh
curl -X POST http://localhost:8787/api/admin/sync \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"repositories":["cloudflare/agents","modelcontextprotocol/servers"],"limit":2}'
```

Cron sync uses lightweight collection with a five-repository hourly budget. It runs candidate discovery first for up to five new repositories, then uses any remaining budget to refresh stale priority queues before seed cursor fallback, and skips inline derived alternatives refresh. Admin sync defaults to refreshing derived alternatives for backward compatibility; pass `refresh_derived:false` for catch-up runs that should only update raw GitHub-backed project metadata.

The response includes `github_request_metrics`, per-repository `repository_request_metrics`, and `derived_refresh`. After `migrations/0006_github_request_cache.sql` is applied, repeated syncs can send GitHub validators and reuse cached JSON for `304 Not Modified` responses.

## Admin Candidate Discovery

Candidate discovery requires `SYNC_SECRET`. It supplements the curated seed list by rotating GitHub search queries, storing candidates in `candidate_repositories`, and syncing up to five new repositories per run.

```sh
curl -X POST http://localhost:8787/api/admin/discovery \
  -H "authorization: Bearer $SYNC_SECRET" \
  -H "content-type: application/json" \
  -d '{"max_candidates":5}'
```

Optional request fields:

- `max_candidates`: maximum new candidates to sync, capped at 5.
- `search_index`: deterministic index into the rotating query list.

The response includes `query`, `discovered_count`, `selected`, `synced`, `failed`, and the recorded `candidate-discovery` governance `run`.

## Admin Derived Alternatives

Derived alternatives refresh requires `SYNC_SECRET`.

```sh
curl -X POST http://localhost:8787/api/admin/alternatives \
  -H "authorization: Bearer $SYNC_SECRET"
```

The response includes:

- `updated`: number of projects with refreshed alternatives.
- `updates`: per-project alternative update summaries.
- `metadata`: corpus and generation metadata.
- `run`: the recorded `derived:alternatives` governance run.

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
