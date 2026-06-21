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

For the fastest agent integration path, start with [Agent Quickstart](./AGENT_QUICKSTART.md).

## List Tools

Git.Top supports a simple GET discovery response:

```sh
curl http://localhost:8787/mcp
```

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

## Recommend Project

```sh
curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"recommend_project","arguments":{"use_case":"build browser automation agents","constraints":{"deployment":"docker"},"limit":5}}}'
```

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
- Inspect `classification` evidence before asserting category, difficulty, or Cloudflare readiness.
- Inspect `quality_signal_confidence` before treating growth, commit, release, or contributor counts as complete.
- Prefer `git_top_grp_query` for goal-level planning and `search_projects` for direct retrieval.
- Use `ranking: "browse"` for broad scoped discovery, and omit it when the user names a specific project, owner, technology, or package.

When a tool returns text content, parse it as JSON and inspect `metadata` before presenting conclusions. High-confidence production answers should be backed by `metadata.source: "d1"`.
