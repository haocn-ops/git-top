# Git.Top Coding Agent Guide

This guide is the shortest safe entry point for coding agents that need to modify Git.Top.

## Product Shape

Git.Top is a Cloudflare Worker knowledge product. The Worker is the only runtime surface: it serves human HTML pages, REST APIs, MCP tools, GRP, GitHub sync, governance jobs, D1-backed data, OpenAPI, and LLM discovery files.

Core flow:

```text
GitHub API
  -> sync and derived data
  -> Cloudflare D1
  -> Worker pages, REST APIs, MCP tools, GRP, trust, quality, and eval gates
```

## Key Files

- `src/index.ts`: Worker routing for pages, API, MCP, static discovery files, scheduled tasks, and admin routes.
- `src/api.ts`: REST API handlers and request parsing.
- `src/mcp.ts`: MCP discovery, tool schemas, and tool calls.
- `src/openapi.ts`: OpenAPI document exposed as `/openapi.json` and `/api/openapi.json`.
- `src/agent-map.ts`: machine-readable map from concepts to pages, REST endpoints, MCP tools, output fields, and trust fields.
- `src/project-search.ts`: search, recommendation, project lookup, alternatives, and related project helpers.
- `src/quality.ts`, `src/trust-gate.ts`, `src/sync-status.ts`: trust, quality, and freshness surfaces.
- `src/db.ts`, `src/db-*-store.ts`, `src/db-mapping.ts`: D1 schema access and mapping.
- `data/seed-repositories.json`: curated source corpus.
- `scripts/*.mjs`: validation, eval, seeding, smoke, governance, and release automation.
- `docs/API.md`, `docs/MCP.md`, `docs/AGENT_QUICKSTART.md`: primary agent integration docs.
- `docs/AGENT_NATIVE_ASSESSMENT_AND_OPTIMIZATION_PLAN.md`: current agent-native product assessment and roadmap.
- `docs/AGENT_NATIVE_OPTIMIZATION_IMPLEMENTATION_REPORT.md`: completed implementation record for the agent-native optimization pass.
- `docs/AGENT_NATIVE_OPTIMIZATION_PR_SUMMARY.md`: review-ready summary of the optimization changes.

## Edit Rules

- Keep the Worker as the source of truth. Do not add a separate app runtime unless the product direction explicitly changes.
- Preserve `metadata.source`, `metadata.reason`, `require_d1`, and trust fields on agent-facing responses.
- Prefer adding structured fields over prose-only changes when agents need to consume a result.
- Keep exact-intent search behavior distinct from broad `ranking=browse` discovery.
- Do not silently change generated artifacts. If changing source data or eval fixtures, regenerate and validate the derived files.
- Treat existing uncommitted changes as user work. Read before editing and avoid unrelated rewrites.

## Validation Tiers

Use the smallest tier that matches the change.

Fast TypeScript and docs:

```sh
pnpm docs:validate
pnpm check
```

API, MCP, and agent contract changes:

```sh
pnpm api:validate
pnpm mcp:validate
pnpm eval:explanations
pnpm check
```

Search, recommendation, classification, or ranking changes:

```sh
pnpm eval:quality
pnpm eval:ranking
pnpm quality:review
pnpm check
```

D1 or local Worker behavior:

```sh
pnpm db:execute
pnpm db:seed
pnpm db:integration
```

Release readiness:

```sh
pnpm validate
pnpm db:integration
pnpm release:check
```

Production checks:

```sh
pnpm smoke:prod
pnpm quality:check
```

## Agent-Facing Contract Checklist

When adding or changing an endpoint or MCP tool, check:

- Does it expose `metadata.source` and enough provenance to distinguish D1 from seed fallback?
- Does `require_d1=true` or `require_d1` fail closed when high-confidence data is unavailable?
- Are trust fields listed in `src/agent-map.ts`?
- Is it discoverable through `/api/agent-map`, `/mcp`, `/openapi.json`, docs, and LLM discovery when appropriate?
- Does it return structured evidence or caveats instead of only prose?
- Is the behavior covered by `api:validate`, `mcp:validate`, `eval:quality`, or `eval:explanations`?

## High-Risk Areas

- Ranking and recommendation changes can regress exact project intent even when broad discovery looks better.
- D1 fallback behavior can make local demos pass while production high-confidence paths should fail closed.
- Quality score and data trust score mean different things; avoid merging them into one ambiguous claim.
- Collection-style repositories need different treatment from executable projects.
- OpenAPI and docs can drift from runtime routes if route changes are not mirrored.

## Local Development

Prepare local D1 before local API checks when the database is empty:

```sh
pnpm db:execute
pnpm db:seed
pnpm dev
```

The local Worker defaults to:

```txt
http://localhost:8787
```
