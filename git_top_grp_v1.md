# Git.Top GRP v1 - Graph Reasoning Protocol Implementation Spec

## 1. Positioning

GRP, Graph Reasoning Protocol, is the reasoning layer above Git.Top's project knowledge graph.

It is not a replacement for search, recommendation, compare, or the existing graph API. It composes those capabilities into an agent-native protocol that turns a user goal into:

- a normalized intent
- a decomposed task plan
- a graph-backed project set
- one or more solution paths
- a recommended open-source stack
- alternatives and tradeoffs
- an explanation that an AI agent can cite or continue from

The core product shift is:

```txt
User Goal -> Graph Reasoning -> Project Set + Path + Explanation
```

## 2. Design Goal

GRP v1 should let an AI agent reason over Git.Top's knowledge graph instead of only querying it.

The first version should answer questions such as:

- "I want to build a Cursor-like AI coding agent."
- "Find MCP servers that can be deployed on Cloudflare."
- "What are open-source alternatives to OpenDevin?"
- "Compose an autonomous coding stack."
- "Compare OpenHands and Claude Code for deployability."

The successful v1 behavior is not perfect intelligence. The successful behavior is that Git.Top returns a graph-grounded path that is more useful than a ranked repository list.

## 3. Non-Goals

GRP v1 does not need to solve:

- full natural-language planning across arbitrary domains
- deep code analysis of every repository
- real-time web-scale GitHub crawling
- perfect dependency resolution
- multi-user workspace memory
- a new UI experience before the API is useful
- a separate graph database migration before the in-memory path engine works

The v1 implementation should reuse the existing Project Knowledge Layer, Agent Cards, alternatives, graph builder, scoring, and D1-backed data access.

## 4. API Contract

### 4.1 Endpoint

```txt
POST /api/grp/query
```

The endpoint accepts JSON and returns a `GrpResponse`.

For v1, only `POST` is supported. Invalid JSON returns `400`. Unsupported modes return `400`. Internal failures return a structured error JSON using the existing API error style.

### 4.2 Request

```json
{
  "goal": "build cloudflare coding agent",
  "constraints": {
    "deploy": ["cloudflare", "docker"],
    "license": "mit",
    "complexity": "medium",
    "agent_ready": true
  },
  "context": {
    "previous_selected_projects": [],
    "current_stack": []
  },
  "mode": "plan"
}
```

### 4.3 Request Fields

`goal` is required.

It is the natural-language user objective. Empty goals should return `400`.

`mode` is optional and defaults to `plan`.

Allowed values:

- `plan`: produce solution paths and a recommended stack
- `compare`: compare projects, categories, or approaches mentioned in the goal
- `find`: retrieve graph-matched projects and explain why they match
- `compose`: produce a system stack rather than a single project recommendation

`constraints` is optional.

Supported v1 fields:

- `deploy`: deployment targets, such as `cloudflare`, `docker`, `local`, `serverless`
- `license`: preferred license, normalized to lowercase
- `complexity`: `low`, `medium`, or `high`
- `agent_ready`: boolean preference for projects with strong agent suitability
- `language`: preferred implementation language
- `category`: preferred Git.Top category

`context` is optional.

Supported v1 fields:

- `previous_selected_projects`: project IDs the user already selected
- `current_stack`: current technologies already in use

### 4.4 Response

```json
{
  "intent": "build_cloudflare_coding_agent",
  "mode": "plan",
  "result_type": "plan",
  "sub_goals": [
    "agent runtime",
    "code execution environment",
    "tool protocol",
    "browser/tool use",
    "LLM integration"
  ],
  "nodes": [],
  "edges": [],
  "solution_paths": [],
  "recommended_stack": [],
  "alternatives": [],
  "explanation": [],
  "metadata": {
    "version": "grp.v1",
    "generated_at": "2026-06-20T00:00:00.000Z",
    "candidate_count": 0,
    "max_depth": 2
  }
}
```

## 5. TypeScript Types

Add the protocol types near the existing shared types. A future implementation can put these in `src/grp.ts` or `src/types.ts`; prefer `src/grp.ts` once behavior is added.

```ts
export type GrpMode = "plan" | "compare" | "find" | "compose";
export type GrpResultType = "plan" | "comparison" | "project_set" | "composition";
export type GrpComplexity = "low" | "medium" | "high";

export interface GrpRequest {
  goal: string;
  mode?: GrpMode;
  constraints?: GrpConstraints;
  context?: GrpContext;
}

export interface GrpConstraints {
  deploy?: string[];
  license?: string;
  complexity?: GrpComplexity;
  agent_ready?: boolean;
  language?: string;
  category?: string;
}

export interface GrpContext {
  previous_selected_projects?: string[];
  current_stack?: string[];
}

export interface GrpScore {
  relevance_score: number;
  agent_score: number;
  deploy_score: number;
  stability_score: number;
  constraint_score: number;
  final_score: number;
}

export interface GrpNode {
  id: string;
  label: string;
  kind: "project" | "category" | "deployment" | "use_case" | "dependency" | "capability" | "runtime" | "protocol" | "llm";
  repo?: string;
  category?: string;
  deployment?: string[];
  score: GrpScore;
  reasons: string[];
}

export interface GrpEdge {
  source: string;
  target: string;
  kind: "alternative" | "category" | "deployment" | "use_case" | "dependency" | "compatible_with" | "requires" | "implements";
  weight: number;
  reason: string;
}

export interface SolutionPath {
  id: string;
  path: string[];
  nodes: GrpNode[];
  edges: GrpEdge[];
  score: number;
  stack_roles: StackRole[];
  explanation: string[];
  tradeoffs: string[];
}

export interface StackRole {
  role: "runtime" | "protocol" | "agent_core" | "tool_execution" | "llm_access" | "memory" | "storage" | "observability" | "template";
  node_id: string;
  label: string;
  required: boolean;
}

export interface GrpAlternative {
  source: string;
  alternatives: Array<{
    project_id: string;
    reason: string;
    score?: number;
  }>;
}

export interface GrpResponse {
  intent: string;
  mode: GrpMode;
  result_type: GrpResultType;
  sub_goals: string[];
  nodes: GrpNode[];
  edges: GrpEdge[];
  solution_paths: SolutionPath[];
  recommended_stack: StackRole[];
  alternatives: GrpAlternative[];
  explanation: string[];
  metadata: {
    version: "grp.v1";
    generated_at: string;
    candidate_count: number;
    max_depth: number;
  };
}
```

## 6. Engine Pipeline

GRP v1 should run the following pipeline:

```txt
Request
  -> validate request
  -> decompose goal
  -> retrieve seed nodes
  -> expand graph
  -> score nodes and edges
  -> find solution paths
  -> compose stack
  -> generate alternatives
  -> explain result
  -> response
```

Recommended module:

```txt
src/grp.ts
```

Recommended exported function:

```ts
export function runGrpQuery(projects: ProjectKnowledge[], request: GrpRequest): GrpResponse
```

The API handler should only parse the HTTP request, call `listProjectKnowledge(env)`, pass data into `runGrpQuery`, and return JSON.

## 7. Goal Decomposition

Goal decomposition converts free text into an intent and sub-goals.

### 7.1 MVP Implementation

Use deterministic rules first. Do not require an LLM for v1.

Inputs:

- lowercased goal text
- constraints
- current stack

Outputs:

- `intent`
- `sub_goals`
- `required_capabilities`

Examples:

```txt
"build cloudflare coding agent"
```

Should produce:

```json
{
  "intent": "build_cloudflare_coding_agent",
  "sub_goals": [
    "edge/serverless runtime",
    "coding agent core",
    "tool protocol",
    "browser/tool use",
    "LLM integration"
  ],
  "required_capabilities": [
    "cloudflare",
    "coding_agent",
    "mcp",
    "browser_agent",
    "llm_gateway"
  ]
}
```

### 7.2 Rule Hints

Useful keyword mappings:

- `cursor`, `coding agent`, `code agent`, `opendevin`, `openhands` -> `coding_agent`
- `cloudflare`, `worker`, `edge`, `d1`, `r2`, `durable object` -> `cloudflare` and `serverless`
- `mcp`, `tool protocol`, `tool calling` -> `mcp_server` and `protocol`
- `browser`, `web automation`, `browser use` -> `browser_agent`
- `rag`, `retrieval`, `knowledge base` -> `rag_framework` and `vector_database`
- `gateway`, `openrouter`, `litellm`, `llm api` -> `llm_gateway`
- `local`, `ollama`, `llama.cpp` -> `local_llm_runtime`

## 8. Graph Retrieval

Graph retrieval finds seed projects and concept nodes that can satisfy the goal.

V1 should combine:

- exact project alias match
- category match
- deployment match
- topic and description keyword match
- Agent Card use-case match
- summary-for-agent keyword match
- existing recommendation score where useful

The retrieval output should be the top 12-30 candidate projects before expansion.

Suggested function:

```ts
function retrieveGrpSeeds(projects: ProjectKnowledge[], decomposition: GoalDecomposition, request: GrpRequest): GrpNode[]
```

Do not call this search in code comments or API names. It is graph seed retrieval.

## 9. Graph Expansion

Expansion turns seed nodes into a small reasoning graph.

Use existing relationships from:

- `agentCard.category`
- `agentCard.deployment`
- `agentCard.useCases`
- `agentCard.alternatives`
- extracted dependencies from `toProjectKnowledgeView(item).dependencies`
- generated alternatives from `generateAlternatives`

V1 limits:

- default max depth: `2`
- max nodes: `80`
- max edges: `200`
- max alternatives per project: `4`
- max use cases per project: `3`
- max dependencies per project: `4`

Expansion should add useful concept nodes, not only project nodes. Examples:

- `deployment:cloudflare`
- `category:coding_agent`
- `protocol:mcp`
- `runtime:cloudflare_workers`
- `llm:openrouter`

## 10. Scoring

Each GRP node should receive a normalized score.

```json
{
  "relevance_score": 0,
  "agent_score": 0,
  "deploy_score": 0,
  "stability_score": 0,
  "constraint_score": 0,
  "final_score": 0
}
```

### 10.1 Score Inputs

`relevance_score`:

- goal keyword match
- sub-goal match
- category match
- use-case match
- summary match

`agent_score`:

- existing `calculateAgentScore(item)`
- boost for agent-related categories
- boost for strong `summaryForAgent`

`deploy_score`:

- exact deployment target match
- `cloudflareReady` when `deploy` includes `cloudflare`
- partial boost for compatible cloud/serverless deployment

`stability_score`:

- `maintenanceScore`
- `gitScore`
- recent push days where available

`constraint_score`:

- license match
- language match
- category match
- complexity/difficulty compatibility
- existing stack compatibility

### 10.2 Final Score Formula

Use a simple weighted formula in v1:

```txt
final_score =
  relevance_score * 0.35 +
  agent_score * 0.25 +
  deploy_score * 0.20 +
  stability_score * 0.15 +
  constraint_score * 0.05
```

For `compose` mode, increase `deploy_score` to `0.25` and reduce `agent_score` to `0.20`.

For `find` mode, increase `relevance_score` to `0.45`.

For `compare` mode, score projects independently and report differences instead of forcing one stack.

## 11. Path Finding Engine

Path finding is the core GRP feature.

The engine should find useful routes from a user goal to a solution stack.

Example:

```txt
Goal: build cloudflare coding agent

Path:
Cloudflare Workers
  -> MCP
  -> OpenHands
  -> Browser Use
  -> LLM Gateway
```

### 11.1 MVP Algorithm

Use weighted BFS or Dijkstra-like traversal over the expanded graph.

The graph is small after expansion, so correctness and explainability matter more than algorithmic cleverness.

Recommended approach:

1. Create virtual start node: `goal:{intent}`.
2. Connect start node to seed nodes and required capability nodes.
3. Traverse edges up to max depth 3 for path search, even if expansion depth is 2.
4. Score each path by average node final score plus edge weights.
5. Penalize paths that miss required capabilities.
6. Reward paths that cover multiple stack roles.
7. Return top 3 paths.

### 11.2 Path Score

```txt
path_score =
  average(node.final_score) * 0.60 +
  average(edge.weight) * 0.20 +
  role_coverage_score * 0.15 +
  constraint_coverage_score * 0.05
```

Clamp to `0-100`.

### 11.3 Role Coverage

A solution path is stronger when it covers several roles:

- runtime
- protocol
- agent core
- tool execution
- LLM access
- memory/storage
- observability

The engine should not require every role. It should identify missing roles in `tradeoffs`.

## 12. Solution Composer

The composer turns graph paths into a stack.

It should assign each selected node to a role:

```json
{
  "role": "agent_core",
  "node_id": "All-Hands-AI/OpenHands",
  "label": "OpenHands",
  "required": true
}
```

Suggested role mapping:

- `cloudflare`, `workers`, `pages`, `serverless` -> `runtime`
- `mcp`, `model context protocol` -> `protocol`
- `coding_agent`, `openhands`, `aider`, `opendevin` -> `agent_core`
- `browser`, `tool use`, `automation` -> `tool_execution`
- `openrouter`, `litellm`, `llm gateway`, `workers ai` -> `llm_access`
- `vector`, `rag`, `memory` -> `memory`
- `d1`, `r2`, `postgres`, `sqlite` -> `storage`
- `observability`, `eval`, `tracing` -> `observability`

The response can include both project nodes and concept nodes in the stack. If no project exists for a required concept, use a concept node and explain the gap.

## 13. Modes

### 13.1 Plan Mode

Default mode.

Returns:

- intent
- sub-goals
- top solution paths
- recommended stack
- alternatives
- explanation

Use when the user wants to build, deploy, integrate, or choose a technical approach.

### 13.2 Find Mode

Returns:

- relevant project nodes
- graph relationships
- explanation per project

Path finding can be shallow in this mode. The response should still explain why a project was selected.

### 13.3 Compose Mode

Returns:

- stack roles first
- solution paths second
- alternatives per role
- missing role tradeoffs

This is the most important product mode for the "open-source cognitive layer" direction.

### 13.4 Compare Mode

Returns:

- compared nodes
- capability overlap
- graph differences
- deployment differences
- replacement suitability
- winner only when the goal clearly asks for a recommendation

The mode can reuse `compareProjectKnowledge` but should enrich the output with graph context and role fit.

## 14. API Examples

### 14.1 Plan

Request:

```json
{
  "goal": "build cloudflare coding agent",
  "mode": "plan"
}
```

Response shape:

```json
{
  "intent": "build_cloudflare_coding_agent",
  "mode": "plan",
  "result_type": "plan",
  "sub_goals": [
    "edge/serverless runtime",
    "coding agent core",
    "tool protocol",
    "browser/tool use",
    "LLM integration"
  ],
  "solution_paths": [
    {
      "id": "path_1",
      "path": [
        "deployment:cloudflare",
        "protocol:mcp",
        "All-Hands-AI/OpenHands",
        "browser-use/browser-use",
        "llm_gateway"
      ],
      "score": 92,
      "stack_roles": []
    }
  ],
  "recommended_stack": [],
  "alternatives": [],
  "explanation": [
    "Cloudflare fits the requested deployment target.",
    "MCP standardizes tool access for agent runtimes.",
    "OpenHands provides the strongest coding-agent core among the retrieved candidates."
  ]
}
```

### 14.2 Compose

Request:

```json
{
  "goal": "compose autonomous coding stack",
  "mode": "compose",
  "constraints": {
    "deploy": ["docker"],
    "agent_ready": true
  }
}
```

Expected behavior:

- prioritize agent core, tool execution, LLM access, and runtime roles
- return one recommended stack
- include alternatives per major role
- explain missing memory or observability if no strong candidate appears

### 14.3 Compare

Request:

```json
{
  "goal": "OpenHands vs Claude Code for self-hosted deployment",
  "mode": "compare",
  "constraints": {
    "deploy": ["docker"]
  }
}
```

Expected behavior:

- identify OpenHands as a project node if available
- identify Claude Code as an external/proprietary concept node if not in Git.Top
- compare deployment fit, openness, agent core capability, and graph alternatives
- avoid pretending unavailable proprietary metadata is present

## 15. Implementation Plan

### Phase 1: Protocol and Endpoint

Files:

- `src/grp.ts`
- `src/api.ts`
- `src/types.ts` if shared types are needed
- `README.md`

Tasks:

- add request validation
- add `POST /api/grp/query`
- add `runGrpQuery`
- return a deterministic response using seed retrieval and scoring
- add README API entry

Acceptance criteria:

- invalid method returns `405`
- empty goal returns `400`
- valid request returns `metadata.version = "grp.v1"`
- `pnpm check` passes

### Phase 2: Goal Decomposition and Retrieval

Tasks:

- implement keyword-to-capability rules
- normalize intent slugs
- retrieve candidate projects from Project Knowledge
- score nodes with explainable reasons

Acceptance criteria:

- "build cloudflare coding agent" returns coding-agent and Cloudflare-related nodes
- "find mcp server deployable on cloudflare" prioritizes MCP and Cloudflare-ready projects
- retrieved nodes include reasons

### Phase 3: Expansion and Path Finding

Tasks:

- build expanded GRP graph from candidates
- add concept nodes
- connect compatible roles
- implement top 3 path search
- compute path score

Acceptance criteria:

- response includes `nodes`, `edges`, and non-empty `solution_paths`
- solution paths include score and explanation
- max node and edge limits are enforced

### Phase 4: Composer and Alternatives

Tasks:

- map nodes to stack roles
- generate role-level alternatives
- identify missing roles and tradeoffs
- improve compose mode output

Acceptance criteria:

- compose mode returns a useful `recommended_stack`
- alternatives are grouped by source or role
- tradeoffs are explicit

### Phase 5: Compare Mode

Tasks:

- parse compared project names from goal
- reuse `compareProjectKnowledge`
- add graph diff and replacement notes
- handle external concepts gracefully

Acceptance criteria:

- "OpenHands vs Claude Code" returns a comparison even if Claude Code is not an indexed open-source project
- result does not invent unavailable repository facts
- deployment differences are explained

## 16. Test Matrix

Add focused tests or script-level checks for these prompts:

```txt
build cloudflare coding agent
find mcp server deployable on cloudflare
compose autonomous coding stack
alternative to OpenDevin
OpenHands vs Claude Code
best local RAG stack
serverless LLM gateway for Cloudflare
```

Minimum assertions:

- response mode matches request mode
- intent is non-empty
- sub_goals is non-empty for plan and compose
- nodes are bounded and scored
- paths are bounded and scored for plan and compose
- explanations are non-empty
- constraints affect ranking

## 17. Data Model Notes

GRP v1 can run without new database tables.

Use existing data:

- `projects`
- `agent_cards`
- `project_metrics`
- generated alternatives
- existing graph relationships

Possible future tables:

- `graph_nodes`
- `graph_edges`
- `capability_aliases`
- `grp_query_logs`
- `grp_feedback`

Do not block v1 on those tables.

## 18. MCP Exposure

After `POST /api/grp/query` works, expose GRP through MCP.

Suggested tool:

```txt
git_top_grp_query
```

Tool input should mirror `GrpRequest`.

Tool output should mirror `GrpResponse`, with no UI-specific formatting.

This turns Git.Top from a repository lookup service into a reasoning tool that external agents can call directly.

## 19. UI Notes

Do not start GRP with a new homepage.

The first useful UI is likely:

- a goal input
- mode selector
- solution path visualization
- stack role table
- explanation panel
- alternatives per role

The API should be built first. UI should follow only after the path output is stable.

## 20. Definition of Done

GRP v1 is done when:

- `POST /api/grp/query` exists
- four modes are accepted
- plan and compose produce useful solution paths
- find produces graph-backed project sets
- compare produces graph-backed differences
- scoring is deterministic and explained
- output is stable enough for MCP agents
- README documents the endpoint
- quality and type checks pass

## 21. One-Sentence Product Definition

GRP is a reasoning layer over the open-source knowledge graph.

It lets Git.Top answer not only "which repo matches this query?" but "which open-source path should an agent take to accomplish this goal?"
