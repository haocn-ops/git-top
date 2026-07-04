# Git.Top MCP Tool Behavior Examples

Use this document as a compact compatibility checklist for MCP clients.

## Response Envelope

Git.Top returns JSON-RPC responses. Successful `tools/call` results use MCP text content where the text is JSON:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"metadata\":{\"source\":\"d1\"}}"
      }
    ]
  }
}
```

Client rule:

1. Check `error` first.
2. Find the first `result.content[]` item with `type: "text"`.
3. Parse `text` as JSON.
4. Inspect `metadata.source`, trust fields, evidence fields, and caveats before citing.

## Strict Source Mode

Pass `require_d1: true` when seed fallback should fail closed.

Expected strict-mode failure:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "D1-backed knowledge is required, but current source is seed."
  }
}
```

Treat `-32003` as a source policy failure, not as an empty result set.

## Tool Shape Examples

`search_projects`

- Input: `query`, optional `category`, `deployment`, `ranking: "browse"`, `limit`, `require_d1`.
- Output JSON fields: `projects`, `search`, `metadata`.
- Trust fields: `metadata.source`, `projects[].classification`, `projects[].quality_signal_confidence`.

`get_project`

- Input: `project_id`, or `owner` + `repo`, optional `require_d1`.
- Output JSON fields: `project_id`, `project`, `summary`, `resolved_from`, `metadata`.
- Trust fields: `project.evidence`, `project.caveats`, `project.confidence_reason`, `metadata.source`.

`recommend_project`

- Input: `use_case`, optional `constraints`, `limit`, `require_d1`.
- Output JSON fields: `recommendations`, `metadata`.
- Trust fields: `recommendations[].confidence`, `recommendations[].evidence`, `recommendations[].unmatched_constraints`.

`get_project_graph`

- Input: `project_id`, `limit`, `require_d1`.
- Output JSON fields: `graph`, `resolved_from`, `metadata`.
- Trust fields: `graph.evidence`, `graph.caveats`, `graph.graph_stats`.

`get_quality_report`

- Input: optional `require_d1`.
- Output JSON fields: `release_score`, `data_trust_score`, `risk_level`, `coverage`, `improvement_plan`, `metadata`.
- Trust fields: `risk_summary`, `coverage.low_confidence_classification_rate`, `metadata.source`.

`get_public_benchmark`

- Input: optional `require_d1`.
- Output JSON fields: `evaluation`, `explanations`, `data_coverage`, `review_queue`, `known_limitations`, `metadata`.
- Trust fields: `evaluation.top3_hit_rate`, `explanations.coverage`, `data_coverage.data_trust_score`, `known_limitations`.

`git_top_grp_query`

- Input: `goal`, optional `mode`, `constraints`, `context`, `require_d1`.
- Output JSON fields: `nodes`, `edges`, `solution_paths`, `recommended_stack`, `alternatives`, `evidence`, `metadata`.
- Trust fields: `evidence.source_fields`, `caveats`, `metadata.data_source.source`.

## Minimal Smoke Test

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_public_benchmark","arguments":{"require_d1":true}}}'
```

Expected client behavior:

- If the response has `error.code=-32003`, fail closed and disclose that D1-backed data is unavailable.
- If the response is successful, parse `result.content[0].text` as JSON and inspect `metadata.source`.
