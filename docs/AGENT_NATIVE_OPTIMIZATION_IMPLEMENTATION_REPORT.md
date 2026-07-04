# Git.Top Agent-Native Optimization Implementation Report

Date: 2026-07-04

## Summary

This report records the completed implementation pass based on the agent-native assessment in `docs/AGENT_NATIVE_ASSESSMENT_AND_OPTIMIZATION_PLAN.md`.

The work moved Git.Top from a strong agent-native baseline to a more dependable external tool surface for coding agents, MCP clients, and automated project-selection workflows. The biggest improvements are stronger machine contracts, more uniform evidence fields, public benchmark visibility, and clearer maintenance-agent onboarding.

Resulting agent-native score: 9.1/10.

## Completed Improvements

### 1. Maintenance Agent Entry

Added root `AGENTS.md` as the short safe entry point for coding agents. It documents:

- Worker-only runtime shape.
- Core data flow from GitHub sync to D1 to Worker pages, REST, MCP, GRP, trust, and quality gates.
- Key files and high-risk areas.
- Edit rules for trust fields, generated artifacts, fallback behavior, and existing user work.
- Validation tiers for docs, API/MCP contracts, ranking, D1, release, and production checks.

README, REST API docs, and MCP docs now point maintainers to the guide and the agent-native assessment plan.

### 2. Stronger API Contracts

Expanded `/openapi.json` with shared response schemas and examples for the public agent-facing surface. The documented contracts now cover:

- Health, Trust Gate, search, project lookup, recommendations, compare, quality, quality review, sync status, governance summary, and governance runs.
- Workflow, alternatives, related projects, graph, score, Atlas, Atlas journeys, Agent Map, GRP, roadmap, quickstart, recipes, examples, trending, trends, MCP discovery, and benchmark responses.
- Shared metadata, error envelopes, project cards, quality confidence, recommendations, Trust Gate checks, and next actions.

Validation now asserts that public `GET` endpoints expose response schemas and that key examples remain present. Public `POST` agent surfaces are also checked for shared JSON request schemas and shared 200 response schemas. `POST /api/grp/query` now documents the GRP request body, and `POST /mcp` has JSON-RPC request, success response, and error response schemas so MCP clients can infer `tools/list`, `tools/call`, `result.content[0].text`, and strict D1 error handling from OpenAPI.

### 3. Normalized Evidence Fields

Core decision surfaces now expose a more predictable evidence package for agents:

- `evidence`
- `caveats`
- `confidence_reason`
- `source_fields`
- `last_verified_at`

This was added across project lookup, recommendations, score explanations, alternatives, graph responses, and GRP responses. Explanation evals and API validation protect the normalized evidence contract.

### 4. Public Trust Benchmark

Added public benchmark surfaces:

- `/benchmark`
- `/api/benchmark`
- MCP tool `get_public_benchmark`

The benchmark summarizes recommendation evaluation health, explanation coverage, data coverage, review queue size, known limitations, and source links. It is linked from trust, quality, docs, README, sitemap, Agent Map, OpenAPI, `llms-full.txt`, and MCP discovery.

`scripts/validate-doc-baselines.mjs` now checks that public benchmark constants stay aligned with generated eval reports.

### 5. Agent Integration Hardening

Added integration-oriented documentation:

- `docs/SDK_EXAMPLES.md`
- `docs/MCP_TOOL_BEHAVIOR_EXAMPLES.md`

The MCP discovery response now includes `agent_api.response_contract`, including the rule that JSON-RPC `tools/call` content is returned as JSON text in `result.content[0].text`.

OpenAPI now documents the matching `POST /mcp` JSON-RPC contract with examples for `tools/list`, `tools/call`, success content blocks, and `-32003` strict D1 errors.

REST and MCP validation now cover fail-closed `require_d1` behavior across search, project lookup, recommendations, quality, benchmark, graph, and GRP flows.

API validation now also guards public `POST` contract completeness so future agent-facing structured endpoints do not ship without JSON request schemas or shared response schemas.

Post-review contract fixes:

- `POST /mcp` OpenAPI now includes `initialize`, `notifications/initialized`, and the notification `202` response.
- GRP OpenAPI response schema now matches runtime by documenting `explanation` as a string array.
- MCP discovery now separates structured `POST` endpoints from read-only `GET` endpoints and includes `/api/grp/query` in the structured POST list.
- API and MCP validation now guard those contract boundaries.

## Validation

The full local validation suite completed successfully after the implementation pass:

```sh
pnpm validate
```

Focused checks also passed during the implementation:

```sh
pnpm check
pnpm api:validate
pnpm mcp:validate
pnpm docs:validate
pnpm test:focused
```

## Notes For Review

Some generated files were updated by validation commands, including eval reports and `seed.sql`. These should be reviewed as generated artifacts rather than hand-authored product changes.

There were pre-existing governance and scheduled-governance changes in the working tree before this optimization pass. They were left in place and not reverted.

## Remaining Future Work

- Add generated SDK validation once Git.Top publishes or commits generated SDKs.
- Extend contract coverage to any future admin-only or POST-heavy surfaces that become public integration points.
- Keep improving corpus trust through deeper sync coverage, lower review queue load, and fresher D1-backed evidence.
- Consider adding a release note or PR description that groups the changes by maintenance onboarding, API contract, evidence normalization, benchmark, and MCP integration.
