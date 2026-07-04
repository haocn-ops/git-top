# Git.Top MCP

Git.Top exposes MCP tools so agents can search, compare, and reason over open-source GitHub project knowledge.

Local endpoint:

```txt
http://localhost:8787/mcp
```

Production endpoint:

```txt
https://git.top/mcp
```

For the fastest agent integration path, start with [Agent Quickstart](./AGENT_QUICKSTART.md). For REST and MCP client snippets in TypeScript and Python, see [SDK-Oriented Examples](./SDK_EXAMPLES.md). For expected MCP result shapes and strict-mode behavior, see [MCP Tool Behavior Examples](./MCP_TOOL_BEHAVIOR_EXAMPLES.md).

For the agent-native product assessment and improvement roadmap, see [Agent-Native Assessment and Optimization Plan](./AGENT_NATIVE_ASSESSMENT_AND_OPTIMIZATION_PLAN.md).

## MCP Contract Rules

MCP clients should:

- Treat `GET /mcp` as discovery and JSON-RPC `tools/list` as the executable tool schema source.
- Parse `tools/call` result `content[].text` blocks as JSON. Git.Top tool payloads are JSON strings inside MCP text content for broad client compatibility.
- Inspect `metadata.source`, trust fields, classification evidence, and `quality_signal_confidence` before presenting high-confidence recommendations.
- Pass `require_d1: true` when fallback seed data should fail closed.
- Prefer `get_agent_workflow` for multi-step decisions and direct tools such as `search_projects`, `get_project`, `recommend_project`, and `compare_projects` for focused retrieval.

When strict source mode fails, Git.Top returns a JSON-RPC error with code `-32003` and a message explaining that D1-backed knowledge is required. Treat that as a fail-closed result, not as an empty recommendation set.

## List Tools

Git.Top supports a simple GET discovery response:

```sh
curl http://localhost:8787/mcp
```

The GET response includes the MCP endpoint, docs URL, project schema URL, health URL, quality URL, agent map URL, quickstart hints, example JSON-RPC payloads, and the tool list. Agents should use it as the discovery entry point before guessing routes. Treat `agent_map.short_path` as the first pass and `agent_map.reference_path` as the expansion path.

The `agent_map` object is the same concept map exposed at `/api/agent-map`: it connects human pages, REST endpoints, MCP tools, output fields, and trust fields for project lookup, recommendations, alternatives, graph, compare, score, Atlas, GRP, and quality surfaces.

The `agent_api.response_contract` object in `GET /mcp` documents how to parse tool calls:

- `tool_content_block`: `content[0].text`
- `tool_content_type`: `application/json`
- `strict_source_argument`: pass `require_d1: true` when seed fallback should fail closed.
- `strict_source_error.code`: `-32003`

JSON-RPC tool listing:

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Search Projects

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_projects","arguments":{"query":"cloudflare agent framework","limit":5}}}'
```

Use `ranking: "browse"` only for broad category/deployment discovery where quality-weighted ordering is more useful than exact phrase intent:

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":21,"method":"tools/call","params":{"name":"search_projects","arguments":{"query":"agent framework","category":"agent_framework","deployment":"cloudflare","ranking":"browse","limit":10}}}'
```

Use `require_d1: true` when an agent must fail closed instead of accepting seed fallback:

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":22,"method":"tools/call","params":{"name":"search_projects","arguments":{"query":"cloudflare agent framework","require_d1":true,"limit":5}}}'
```

## Get Project

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_project","arguments":{"project_id":"cloudflare/agents"}}}'
```

`get_project` also accepts `{"owner":"cloudflare","repo":"agents"}`, `{"repo":"cloudflare/agents"}`, and Git.Top product aliases such as `{"project_id":"claude-code"}` for clients starting from product names instead of canonical GitHub owner/repo identifiers.

The tool result includes a top-level `summary` object with `tl_dr`, `purpose`, `install`, `inputs`, `outputs`, `good_for`, `not_good_for`, `deployment`, and `alternatives`. Use that object for first-pass agent reasoning, then inspect `project.classification`, `project.quality_signal_confidence`, `resolved_from`, and `metadata.source` before making high-confidence claims.

## Recommend Project

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"recommend_project","arguments":{"use_case":"build browser automation agents","constraints":{"deployment":"docker"},"limit":5}}}'
```

## Get Trends

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":41,"method":"tools/call","params":{"name":"get_trends","arguments":{"limit":8}}}'
```

Use `get_trends` before recommendations when an agent needs corpus-level direction across categories, deployment targets, languages, and rising projects.

## Get Agent Workflow

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":42,"method":"tools/call","params":{"name":"get_agent_workflow","arguments":{"intent":"choose a Cloudflare-ready agent framework","constraints":{"deployment":"cloudflare","category":"agent_framework","cloudflare_ready":true},"limit":5}}}'
```

Use `get_agent_workflow` when an agent needs the recommended sequence across health checks, trends, recommendations, graph, alternatives, score, compare, and trust policy before answering a user.

## Get Atlas

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":43,"method":"tools/call","params":{"name":"get_atlas","arguments":{"ecosystem":"cloudflare","limit":5}}}'
```

Use `get_atlas` when an agent wants ecosystem maps, exploration paths, comparison paths, map nodes, edges, representative projects, and Atlas journey links without manually calling REST endpoints first.

## Get Trust Gate

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":44,"method":"tools/call","params":{"name":"get_trust_gate","arguments":{}}}'
```

Use `get_trust_gate` before high-confidence production recommendations. It returns `decision`, `production_ready`, trust checks, agent policy, health, sync, quality, and metadata in one tool result.

## Get Quality Report

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":45,"method":"tools/call","params":{"name":"get_quality_report","arguments":{"require_d1":true}}}'
```

Use `get_quality_report` when an agent needs detailed release score, data trust score, risk level, coverage, issue summary, and review queue size after checking the Trust Gate.

## Get Public Benchmark

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":46,"method":"tools/call","params":{"name":"get_public_benchmark","arguments":{"require_d1":true}}}'
```

Use `get_public_benchmark` when an agent needs citable eval health, explanation coverage, data trust, review queue size, and known limitations before presenting Git.Top as a dependable external source.

## Find Alternatives

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"find_alternatives","arguments":{"project_id":"langchain-ai/langchain","limit":5}}}'
```

## Compare Projects

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"compare_projects","arguments":{"project_ids":["cloudflare/agents","langchain-ai/langchain"],"deployment":"cloudflare"}}}'
```

## GRP Query

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"git_top_grp_query","arguments":{"goal":"compose an autonomous coding stack","mode":"compose","constraints":{"agent_ready":true}}}}'
```

## Agent Guidance

Agents should:

- Prefer `metadata.source === "d1"` when making high-confidence recommendations.
- Use `require_d1: true` for production answers that should fail closed rather than fall back to seed data.
- Treat seed fallback as useful for demos and development, but mention the fallback when presenting results.
- Use `get_trust_gate` before high-confidence recommendations, then use `get_quality_report` for detailed corpus-wide quality or coverage claims.
- Inspect `classification` evidence before asserting category, difficulty, or Cloudflare readiness.
- Inspect `quality_signal_confidence` before treating growth, commit, release, or contributor counts as complete.
- Prefer `git_top_grp_query` for goal-level planning and `search_projects` for direct retrieval.
- Start with `agent_map.short_path`, then read `agent_map.reference_path` when you need the fuller discovery surface.
- Use `ranking: "browse"` for broad scoped discovery, and omit it when the user names a specific project, owner, technology, or package.

When a tool returns text content, parse it as JSON and inspect `metadata` before presenting conclusions. High-confidence production answers should be backed by `metadata.source: "d1"`. If JSON parsing fails, treat the result as a client/tool contract error and retry or fall back to REST.
