# Git.Top Agent Friendliness Optimization Plan - 2026-06-29

## Goal

Make Git.Top easier for agents to discover, call, and trust without changing the core product shape.

## Current State

Git.Top already exposes strong agent surfaces:

- `GET /api/health`
- `GET /api/trust`
- `GET /api/agent-map`
- `GET /api/quickstart`
- `GET /mcp`
- `GET /openapi.json`
- `GET /llms.txt`
- `GET /llms-full.txt`
- project, recommendation, compare, alternatives, graph, workflow, Atlas, quality, and GRP endpoints

The main gaps are not correctness gaps. They are discoverability and contract-shape gaps:

1. The discovery story is spread across too many parallel entry points.
2. Some agent-facing payloads are rich but verbose.
3. Field names are not always normalized across REST, MCP, and docs.
4. Trust and D1 requirements are present, but not always the first thing an agent sees.

## Status

The plan has been implemented in the codebase and validated with the focused API, MCP, and test suites. The remaining work is documentation upkeep and future iteration, not core implementation.

## Problems To Solve

### P0: Put Trust First

Agents should hit a small, obvious trust gate before they rely on recommendations.

Risk if unfixed: agents may call into rich endpoints before checking source quality or sync state.

### P0: Shorten the Discovery Path

Agents should be able to move from one compact discovery surface to the right endpoint or tool without reading three different pages.

Risk if unfixed: tool selection becomes fragile and more prompt-dependent.

### P1: Normalize Contract Shapes

Agent-facing JSON should prefer stable, consistent field names and should not require mental translation between similar surfaces.

Risk if unfixed: downstream prompts need extra glue logic.

### P1: Reduce Verbosity

Long discovery payloads are useful for humans, but agents benefit from a smaller “core path” and a more detailed “reference path.”

Risk if unfixed: token cost rises and the right fields are harder to find.

### P2: Make D1 Requirement Explicit

The `require_d1` pattern is already present, but it should be easier to notice and reuse.

Risk if unfixed: agents may accidentally accept seed fallback when they wanted production-only answers.

## Optimization Phases

### Phase 1: Agent Trust Gate

Implement first.

- Make `/api/trust` the primary recommended preflight for high-confidence agent use.
- Put the trust gate ahead of recommendations in quickstart and discovery text.
- Make `require_d1=true` visible in the shortest integration path.

Acceptance:

- `llms.txt`, `llms-full.txt`, `/api/quickstart`, and `/mcp` all point agents to trust preflight first.
- Trust-first guidance appears before recommendation or graph guidance.

Status: completed.

### Phase 2: Compact Discovery Surface

Implement next.

- Add a small “core agent surfaces” block to `/api/agent-map`.
- Keep the current detailed map, but add a shorter list of the first calls an agent should make.
- Keep `GET /mcp` aligned with the same order.

Acceptance:

- An agent can decide between trust, workflow, search, project lookup, alternatives, compare, graph, and quality from one compact section.

Status: completed.

### Phase 3: Contract Normalization

Implement after the discovery layer is stable.

- Align naming across REST and MCP where practical.
- Prefer one canonical label for the same concept:
  - `project_id`
  - `quality_score`
  - `agent_score`
  - `metadata.source`
  - `quality_signal_confidence`
  - `require_d1`
- Keep compatibility aliases where needed.

Acceptance:

- Fewer duplicate concepts appear in docs and payload examples.
- Agents do not need to translate between several names for the same thing.

Status: completed.

### Phase 4: Split Short Path From Reference Path

Implement last.

- Keep full discovery docs for humans and tool builders.
- Add a compact agent-first path that includes only the minimum preflight and action steps.

Acceptance:

- The short path is enough for a capable agent to start without reading the full guide.

Status: completed.

## Implementation Order

1. Update quickstart and discovery text to lead with trust.
2. Add a compact core surface summary to `/api/agent-map`.
3. Keep `/mcp` and `llms.txt` aligned with that order.
4. Reduce naming drift in examples and inspect fields.
5. Re-validate agent smoke checks.

Result: all five steps are complete.

## Verification

Run:

```sh
pnpm core:validate
pnpm api:validate
pnpm mcp:validate
pnpm test:focused
```

Then smoke:

```sh
curl https://git.top/api/trust
curl https://git.top/api/agent-map
curl https://git.top/api/quickstart
curl https://git.top/mcp
curl https://git.top/llms.txt
```

Validation status: passed.
