# Git.Top Agent Friendliness Optimization Plan

Date: 2026-06-29

## Goal

Make Git.Top easier for agents to discover, trust, and consume as structured project knowledge.

## What is already in place

Git.Top already has the core surfaces this direction needs:

- `GET /api/health`
- `GET /api/trust`
- `GET /api/agent-map`
- `GET /api/quickstart`
- `GET /mcp`
- `GET /openapi.json`
- `GET /llms.txt`
- `GET /llms-full.txt`
- project lookup, recommendation, compare, alternatives, graph, workflow, Atlas, quality, and GRP endpoints

The main gap is not a missing platform. The gap is that the current knowledge contract is still more convenient for humans than for agents.

## Product decision

Keep Git.Top as a single Worker-backed product surface, but make the project knowledge contract more agent-native.

The next step is not "more pages". It is:

1. A compact project summary that agents can consume directly.
2. Stable summary fields that sit on top of existing Agent Card and project knowledge data.
3. Trust-first guidance that keeps D1-backed data and confidence visible.

## Priority 1

### Add a project summary layer

Expose a structured summary on top of the existing project lookup response and MCP `get_project` output.

Recommended fields:

- `purpose`
- `install`
- `inputs`
- `outputs`
- `good_for`
- `not_good_for`
- `alternatives`
- `deployment`
- `tl_dr`

The important constraint: derive these fields from existing knowledge whenever possible. Do not invent new extraction systems before the current contract proves useful.

### Why this matters

Agents should be able to answer:

- What does this project do?
- How do I install or start it?
- What does it take in and produce?
- When should I use it?
- What should I avoid it for?

without reading a README first.

## Priority 2

### Make trust obvious

Keep trust and freshness visible near the first call path.

Current signals already exist:

- `/api/health`
- `/api/trust`
- `metadata.source`
- `require_d1=true`
- `quality_signal_confidence`

The improvement is to keep those signals attached to the summary path so agents do not have to hunt for them.

## Priority 3

### Normalize the contract

Use one canonical shape across REST and MCP where practical:

- `project_id`
- `summary`
- `quality_score`
- `agent_score`
- `metadata.source`
- `require_d1`

Keep compatibility aliases, but prefer one obvious field name for each concept.

## Priority 4

### Keep the broader roadmap later

Alternative graphs, dependency graphs, deployment recipes, MCP registries, and tool schema indexes are useful, but they should come after the summary contract is stable.

## Implementation order

1. Add `summary` to project lookup responses.
2. Add the same summary to MCP `get_project`.
3. Keep trust metadata attached to the summary payload.
4. Validate the response shape in focused API and MCP checks.

## Success criteria

- Agents can consume project intent without parsing the README.
- `GET /api/project/...` returns a stable summary object.
- `get_project` returns the same summary shape.
- Existing trust and confidence signals remain visible.

## Current implementation status

Status: completed for the summary contract pass.

Implemented:

- REST project lookup responses now include `summary`.
- MCP `get_project` now returns the same top-level `summary`.
- API, MCP, OpenAPI, quickstart, and README docs describe the contract.
- API and MCP validation cover the summary response shape.

Next iteration:

- Replace conservative install hints with source-backed package extraction once Git.Top stores package registry evidence.
- Add tool schema extraction only after the project summary contract remains stable in production.
