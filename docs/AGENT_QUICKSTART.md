# Git.Top Agent Quickstart

This quickstart is for agents and agent developers that want useful results from Git.Top in a few minutes.

Production endpoints:

```txt
REST: https://git.top/api/*
MCP:  https://git.top/mcp
GRP:  https://git.top/api/grp/query
```

## 1. Check Data Source

Start with health and require D1-backed metadata for production recommendations:

```sh
curl https://git.top/api/health
```

Trust the response as production data when:

- `db` is `available`.
- `metadata.source` is `d1`.
- `metadata.reason` is `d1_query`.

Treat `metadata.source: "seed"` as a fallback mode. Seed data is useful for demos, but agents should mention the fallback before making a strong recommendation.

## 2. Choose a Workflow

When an agent needs a guided path across trends, recommendations, graph, alternatives, score, compare, and trust checks, fetch the agent workflow:

```sh
curl "https://git.top/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5"
```

Use the same path in MCP:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_agent_workflow","arguments":{"intent":"choose a Cloudflare-ready agent framework","constraints":{"deployment":"cloudflare","category":"agent_framework","cloudflare_ready":true},"limit":5}}}'
```

The response gives a recommended sequence, shortlist, trend context, agent map hints, and trust policy.

When you need corpus-wide quality or coverage before a recommendation, call `get_quality_report`:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_quality_report","arguments":{"require_d1":true}}}'
```

Use it to inspect release score, data trust score, risk level, coverage, issue summary, and review queue size.

## 3. Explore Atlas

When an agent needs an ecosystem map before choosing a repository, fetch Atlas:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_atlas","arguments":{"ecosystem":"cloudflare","limit":5}}}'
```

Use Atlas to move from ecosystem discovery into search, graph, alternatives, score, and compare flows.

## 4. Search Projects

When an agent needs to choose the right surface first, fetch the machine-readable surface map:

```sh
curl https://git.top/api/agent-map
```

Use it to map product concepts to human pages, REST endpoints, MCP tools, output fields, and trust fields.

Use search for direct retrieval:

```sh
curl "https://git.top/api/search?q=cloudflare%20agent%20framework&limit=5"
```

Use scoped discovery when the user asks for a category rather than a named technology:

```sh
curl "https://git.top/api/search?category=agent_framework&deployment=cloudflare&ranking=browse&limit=10"
```

Read these fields before presenting results:

- `projects[].repo` for the GitHub repository.
- `projects[].project_kind` to distinguish normal projects from resource collections.
- `projects[].collection_metadata` when `project_kind` is `collection`.
- `metadata.source` and `metadata.project_count` for data-source confidence.

## 5. Inspect One Project

Fetch the full project view before making a recommendation:

```sh
curl https://git.top/api/project/cloudflare/agents
curl https://git.top/api/project/claude-code
```

Use:

- `knowledge.agent_card.classification` to explain category, deployment, difficulty, and Cloudflare readiness.
- `quality_signal_confidence` to avoid overclaiming partial GitHub metrics.
- `knowledge.agent_card.cloudflare_ready` and `knowledge.agent_card.classification.cloudflare_ready.evidence` before saying a project is Cloudflare-ready.

## 6. Ask for a Recommendation

Use `/api/recommend` for a concrete use case:

```sh
curl "https://git.top/api/recommend?use_case=build%20a%20browser%20automation%20agent&deployment=docker&limit=5"
```

When presenting the answer, include:

- The top project and one alternative.
- Any deployment caveat from classification evidence.
- The response `metadata.source`.

## 7. Compare Candidates

Use comparison when the user already has candidate projects:

```sh
curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain,run-llama/llama_index&deployment=cloudflare"
```

Prefer comparison output over raw star counts when the task is a product decision.

## 8. Use MCP

List tools:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Call search:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_projects","arguments":{"query":"mcp observability","limit":5}}}'
```

Call project lookup with split GitHub fields:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_project","arguments":{"owner":"cloudflare","repo":"agents","require_d1":true}}}'
```

Call GRP through MCP for goal-level planning:

```sh
curl -X POST https://git.top/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"git_top_grp_query","arguments":{"goal":"compose an autonomous coding stack with MCP tools","mode":"compose","constraints":{"agent_ready":true}}}}'
```

## 9. Use GRP Directly

GRP is best when the user asks for a plan, comparison, project set, or stack:

```sh
curl -X POST https://git.top/api/grp/query \
  -H "content-type: application/json" \
  -d '{"goal":"build a Cloudflare-ready coding agent stack","mode":"plan","constraints":{"deploy":["cloudflare"],"agent_ready":true}}'
```

Read:

- `solution_paths` for plan mode.
- `recommended_stack` for compose mode.
- `nodes` for candidate projects.
- `metadata.data_source` for D1 or seed provenance.

## Agent Output Pattern

A good agent answer should name:

- Recommended repository.
- Why it matches the task.
- Deployment or runtime caveats.
- One alternative.
- Data source and confidence evidence.

Example:

```txt
Use cloudflare/agents for a Cloudflare Workers-native agent runtime. Git.Top returned D1-backed data and classification evidence for Cloudflare deployment. If you need a broader Python ecosystem, compare against langchain-ai/langchain, but check runtime blockers before assuming direct Workers compatibility.
```
