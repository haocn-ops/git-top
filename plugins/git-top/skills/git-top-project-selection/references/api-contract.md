# Git.Top API Contract

Production base URL: `https://git.top`

Public read-only REST and MCP calls require no login, API key, OAuth flow, or cookie.

## Shortest REST Paths

### Trust preflight

```sh
curl "https://git.top/api/trust"
```

Inspect `decision`, `checks`, `quality`, `sync`, and `metadata.source`.

### Search

```sh
curl "https://git.top/api/search?q=browser%20agent&deployment=docker&limit=5&require_d1=true"
```

Inspect `projects`, `search.query_interpretation`, `page`, and `metadata`.

### Project inspection

```sh
curl "https://git.top/api/project/cloudflare/agents?require_d1=true"
```

Inspect `summary`, `classification`, `quality_signal_confidence`, `evidence`, `caveats`, and `metadata`.

### Recommendation

```sh
curl -X POST "https://git.top/api/recommend?require_d1=true" \
  -H "content-type: application/json" \
  -d '{"use_case":"vector database for Docker","constraints":{"deployment":"docker","category":"vector_database"},"limit":3}'
```

Inspect `decision_summary`, `fit_profile`, `matched_constraints`, `unmatched_constraints`, `risk_flags`, `confidence`, and `caveats`.

### Alternatives

```sh
curl "https://git.top/api/alternatives/langchain?limit=5&require_d1=true"
```

Inspect `alternative_matches`, `fit_summary`, `replacement_risk`, `match_signals`, and `caveats`. Distinguish direct substitutes from adjacent projects.

### Compare

```sh
curl -X POST "https://git.top/api/compare?require_d1=true" \
  -H "content-type: application/json" \
  -d '{"project_ids":["openai/codex","anomalyco/opencode"],"deployment":"local"}'
```

Inspect `decision_matrix`, `winner`, `reasoning`, and `next_actions`. A winner is contextual, not universal.

### Guided workflow

```sh
curl -X POST "https://git.top/api/workflow?require_d1=true" \
  -H "content-type: application/json" \
  -d '{"intent":"choose a Cloudflare-ready agent framework","constraints":{"deployment":"cloudflare","category":"agent_framework","cloudflare_ready":true},"limit":3}'
```

Inspect `recommended_sequence`, `shortlist`, `trend_context`, `trust_policy`, and `metadata`.

## Core MCP

Endpoint: `https://git.top/mcp/core`

Tools:

- `search_projects`
- `get_project`
- `recommend_project`
- `get_agent_workflow`
- `compare_projects`

Full endpoint: `https://git.top/mcp`

MCP tool results return JSON text in `result.content[0].text`. Parse it before inspecting metadata or evidence.

## Errors

- HTTP `503`, code `d1_required`: strict D1 evidence is unavailable.
- HTTP `404`, code ending in `_not_found`: canonicalize the project id or search first.
- MCP `-32003`: strict D1 evidence is unavailable.
- MCP `-32004`: restart without the stale cursor.
- MCP `-32005`: the singular project was not found.
- MCP `-32602`: correct invalid arguments such as an out-of-range limit.

## Evidence Fields

Prefer structured fields over generated prose:

- `metadata.source`, `metadata.reason`, `metadata.snapshot_id`, `metadata.latest_synced_at`
- `evidence`, `source_fields`, `last_verified_at`
- `classification.*.confidence` and `classification.*.evidence`
- `quality_signal_confidence`
- `confidence`, `confidence_reason`, `caveats`, `risk_flags`
- `matched_constraints`, `unmatched_constraints`, `decision_matrix`

Do not claim freshness, maintenance, deployment readiness, or production suitability without checking the corresponding evidence and caveats.
