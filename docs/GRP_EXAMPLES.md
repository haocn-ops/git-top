# Git.Top GRP Examples

GRP, the Graph Reasoning Protocol, turns a user goal into graph-grounded project recommendations, stack roles, alternatives, and explanations.

Endpoint:

```txt
POST /api/grp/query
```

Production endpoint:

```txt
https://git.top/api/grp/query
```

For REST and MCP examples around the same workflow, see [Agent Quickstart](./AGENT_QUICKSTART.md).

Modes:

- `plan`: produce solution paths and a recommended stack.
- `find`: retrieve graph-matched projects.
- `compare`: compare projects mentioned in the goal or request.
- `compose`: produce a system stack.

## Plan: Cloudflare-Ready Coding Agent

```sh
curl -X POST "http://localhost:8787/api/grp/query?require_d1=true" \
  -H "content-type: application/json" \
  -d '{
    "goal": "build a Cloudflare-ready coding agent",
    "mode": "plan",
    "constraints": {
      "deploy": ["cloudflare"],
      "agent_ready": true,
      "complexity": "medium"
    }
  }'
```

Use this when the agent needs a path rather than a single repository.

## Find: MCP Servers for Browser Automation

```sh
curl -X POST "http://localhost:8787/api/grp/query?require_d1=true" \
  -H "content-type: application/json" \
  -d '{
    "goal": "find MCP servers for browser automation",
    "mode": "find",
    "constraints": {
      "category": "mcp_server"
    }
  }'
```

Use this when the agent is gathering candidate projects for a narrow capability.

## Compare: Open Source Agent Frameworks

```sh
curl -X POST "http://localhost:8787/api/grp/query?require_d1=true" \
  -H "content-type: application/json" \
  -d '{
    "goal": "compare Cloudflare Agents, LangChain, and LlamaIndex for agent development",
    "mode": "compare",
    "constraints": {
      "deploy": ["cloudflare"]
    }
  }'
```

Use this when the agent needs tradeoffs and a winner rather than only ranked search results.

## Compose: Autonomous Coding Stack

```sh
curl -X POST "http://localhost:8787/api/grp/query?require_d1=true" \
  -H "content-type: application/json" \
  -d '{
    "goal": "compose an autonomous coding stack with tool calling, browser use, and LLM access",
    "mode": "compose",
    "context": {
      "current_stack": ["Cloudflare Workers", "MCP"]
    },
    "constraints": {
      "agent_ready": true,
      "complexity": "medium"
    }
  }'
```

Use this when the output should be a stack with roles such as runtime, protocol, agent core, tool execution, and LLM access.

## How Agents Should Use GRP Output

Agents should read:

- `intent` for the normalized user goal.
- `sub_goals` for the decomposed task.
- `nodes` for candidate projects and capability nodes.
- `edges` for graph relationships and compatibility.
- `solution_paths` for plan mode.
- `recommended_stack` for compose mode.
- `alternatives` for fallback choices.
- `metadata` for version, generation time, candidate count, and depth.

When presenting a recommendation, cite the relevant `explanation`, `tradeoffs`, metadata source, and confidence evidence from the project knowledge where available.

## Minimal Response Shape

A useful GRP answer should include:

- The selected mode and normalized intent.
- The first recommended path or stack.
- Alternatives when the first path has deployment or maturity caveats.
- `metadata.data_source.source` so the caller can tell whether the result came from D1 or seed fallback.
