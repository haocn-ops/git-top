# Git.Top Agent-Native Assessment and Optimization Plan

Date: 2026-07-04

Implementation report: `docs/AGENT_NATIVE_OPTIMIZATION_IMPLEMENTATION_REPORT.md`

## Executive Assessment

Git.Top is already an agent-native knowledge product, not just a human-facing open-source directory with an API attached. The strongest surfaces are REST, MCP, GRP, OpenAPI, `llms.txt`, `llms-full.txt`, Agent Map, Trust Gate, and quality reports. Together they give agents a discoverable path from trust preflight to search, project lookup, recommendation, graph reasoning, alternatives, comparison, score explanation, and answer citation.

Original agent-native score: 8.3/10.

Post-optimization agent-native score: 9.1/10.

The original score was high because Git.Top already exposed structured machine surfaces and made data provenance explicit. After the optimization pass, the main gains are stronger API contracts, normalized evidence fields, a public trust benchmark, MCP behavior examples, and a root coding-agent guide. The remaining ceiling is mostly corpus trust, live sync depth, and future generated SDK validation.

## What Works Well

1. Agent discovery is first-class.
   `/api/agent-map`, `/mcp` discovery, `/openapi.json`, `/llms.txt`, `/llms-full.txt`, `/api/quickstart`, and `/api/recipes` let agents inspect the product before guessing routes or fields.

2. Trust boundaries are explicit.
   `metadata.source`, `require_d1=true`, `/api/trust`, `/api/quality`, `/api/sync/status`, `quality_signal_confidence`, and classification evidence help agents avoid overclaiming stale or fallback-backed data.

3. The product exposes workflows instead of isolated endpoints.
   `/api/workflow`, MCP `get_agent_workflow`, Atlas, GRP, recommendations, graph, alternatives, score, and compare endpoints match how an agent makes a decision.

4. The repository already has evaluation gates.
   `pnpm eval:quality`, `pnpm eval:explanations`, `pnpm eval:ranking`, local D1 integration, MCP validation, API validation, production smoke, and release checks reduce the chance that agent-facing behavior regresses silently.

5. The runtime shape is simple.
   The Cloudflare Worker is the only product surface. Pages, APIs, MCP tools, sync jobs, D1 access, and quality gates live in one runtime, which is easier for agents to reason about than a split frontend/backend deployment.

## Main Gaps

1. OpenAPI is broad but not yet strongly contractual.
   Many endpoints have useful summaries, request schemas, and descriptions, but agents and SDK generators would benefit from stronger shared response schemas, stable error envelopes, examples, and explicit trust-field contracts.

2. Corpus trust is still the product ceiling.
   The API can explain source and risk, but high-confidence recommendations depend on D1 freshness, GitHub sync depth, classification confidence, low-confidence review load, and evidence completeness.

3. Coding-agent onboarding needs a shorter root-level entry point.
   The README is thorough, but a maintenance agent needs a very compact map of architecture, generated files, validation tiers, and high-risk areas before editing.

4. Evidence fields need to become more uniform.
   Recommendations, classification, score, quality, and graph outputs expose evidence in different shapes. Agents need predictable fields such as `evidence`, `confidence_reason`, `last_verified_at`, and `source_fields` where possible.

5. Public benchmarks are mostly internal documents.
   Eval reports exist, but a public-facing benchmark summary would make the trust story easier for users and agents to cite.

## Optimization Principles

- Keep Trust Gate first. Every high-confidence agent path should start with health, source, sync, quality, and risk checks.
- Prefer stable machine contracts over prose-only documentation.
- Make fallback behavior explicit and easy to fail closed.
- Keep broad discovery separate from exact-intent search.
- Treat generated or derived data as auditable, not magical.
- Optimize for maintenance agents as well as consuming agents.

## Prioritized Roadmap

### Phase 1: Maintenance Agent Entry

Status: completed.

Goal: let a coding agent safely understand and edit the repository in a few minutes.

Tasks:

- Add root `AGENTS.md` with architecture, edit rules, validation tiers, data flow, and high-risk areas.
- Link `AGENTS.md` and this plan from README.
- Split README development commands into fast path, data path, release path, and production path.

Acceptance criteria:

- A coding agent can identify the product runtime, key files, generated artifacts, and correct validation command without reading every planning document.
- README still works for humans, but points agents to the shorter maintenance guide.

Completion notes:

- Added root `AGENTS.md` with product shape, key files, edit rules, validation tiers, contract checklist, high-risk areas, and local development notes.
- Linked the guide and this plan from README, REST API docs, and MCP docs.
- Split development commands into fast checks, agent surface checks, data/local D1 checks, and release checks.

### Phase 2: Stronger API Contracts

Status: completed for the current public REST contract surface. Response schemas for the primary and extended agent flows are documented and validated.

Goal: make OpenAPI useful for SDK generation and automated agent clients.

Tasks:

- Add shared response schemas for metadata, error envelopes, project lookup, search, recommendations, compare, alternatives, graph, score, trust, quality, and MCP discovery.
- Add canonical examples for the top five agent flows: trust preflight, search, get project, recommend, compare.
- Document stable fields versus advisory fields.
- Add a contract checklist to API and MCP docs.

Acceptance criteria:

- `/openapi.json` describes the important response fields agents must inspect before citing results.
- API docs clearly distinguish stable response fields from best-effort ranking and evidence fields.

Completion notes:

- Added OpenAPI response schemas for health, trust, search, project lookup, recommendations, compare, and quality.
- Added shared schema components for metadata, common errors, project cards, quality signal confidence, recommendations, next actions, Trust Gate checks, and quality reports.
- Added API validation assertions so core response schema references and trust-contract fields cannot drift silently.
- Added extended response schemas for workflow, alternatives, related projects, graph, score, Atlas, Atlas journeys, Agent Map, GRP, and MCP discovery.
- Added shared response schemas for roadmap, quickstart, recipes, examples, trending, trends, quality review, sync status, governance summary, and governance runs.
- Added compact canonical OpenAPI response examples for the highest-volume agent flows.
- Added SDK-oriented examples for TypeScript and Python clients.
- Future work: expand generated SDK validation once a published SDK surface exists.

### Phase 3: Evidence Normalization

Status: completed for core agent decision surfaces. Project, recommendation, score, alternatives, graph, and GRP responses now expose normalized evidence fields.

Goal: make recommendation and classification evidence predictable across endpoints.

Tasks:

- Normalize project-level evidence fields where possible: `evidence`, `confidence_reason`, `last_verified_at`, `source_fields`, and `caveats`.
- Ensure recommendations expose both positive reasons and unmatched constraints.
- Ensure score and quality outputs explain partial or unknown metrics in a machine-readable way.
- Add explanation eval cases for normalized evidence fields.

Acceptance criteria:

- Agent-facing endpoints expose enough evidence for an agent to quote why it recommended a project and what it is uncertain about.
- `pnpm eval:explanations` checks the normalized evidence contract.

Completion notes:

- Added normalized `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at` fields to project views.
- Added normalized recommendation evidence, including recommendation reasons, ranking signals, matched constraints, unmatched constraints, caveats, source fields, confidence reason, and verification time.
- Added normalized score evidence fields and top-level caveats/confidence metadata.
- Added normalized alternatives evidence for overall alternative decisions and enriched alternative matches.
- Added normalized graph and GRP evidence so agents can cite graph/source grounding and caveats consistently.
- Extended API validation and explanation eval to protect the normalized evidence contract.

### Phase 4: Public Trust Benchmark

Status: completed.

Goal: make quality and evaluation status externally legible.

Tasks:

- Add a public benchmark or trust report page backed by existing eval reports.
- Summarize top-1/top-3 recommendation health, explanation coverage, data coverage, review queue size, and known limitations.
- Link the report from `/trust`, `/quality`, `/docs`, `/llms-full.txt`, and README.

Acceptance criteria:

- A user or agent can cite current evaluation health without reading internal planning documents.
- Known limitations are visible next to the success metrics.

Completion notes:

- Added `/benchmark` and `/api/benchmark` as the public trust benchmark surfaces.
- Summarized top-1/top-3 eval health, classification/deployment accuracy, explanation coverage, data trust, release score, review queue size, and known limitations.
- Linked the benchmark from `/trust`, `/quality`, `/docs`, `/llms-full.txt`, sitemap, Agent Map, OpenAPI, API docs, and README.
- Added route and OpenAPI validation for the benchmark contract.

### Phase 5: Agent Integration Hardening

Status: completed for the current public REST/MCP integration surface.

Goal: make Git.Top easier to adopt as a dependable external tool.

Tasks:

- Add SDK-oriented examples for TypeScript and Python consumers.
- Publish MCP tool behavior examples with expected result shapes.
- Add stricter validation for `require_d1` behavior across REST and MCP.
- Add compatibility notes for clients that parse MCP text content as JSON.

Acceptance criteria:

- External agent builders can integrate Git.Top with minimal route guessing.
- Contract and fallback behavior are validated by tests or scripted checks.

Completion notes:

- Added `get_public_benchmark` to MCP so agents can fetch public eval health, explanation coverage, data trust, review queue size, and known limitations without switching to REST.
- Added `agent_api.response_contract` to `GET /mcp` discovery so clients know that `tools/call` text content should be parsed as JSON.
- Expanded REST and MCP validation for `require_d1` fail-closed behavior across search, project, recommendation, quality, benchmark, graph, and GRP flows.
- Added `docs/MCP_TOOL_BEHAVIOR_EXAMPLES.md` with expected result shapes, trust fields, and strict-mode error behavior.
- Updated SDK examples to handle JSON-RPC errors and non-JSON MCP text content explicitly.

## Immediate Implementation Checklist

- [x] Create this assessment and optimization plan.
- [x] Add root `AGENTS.md`.
- [x] Link the new maintenance and optimization docs from README.
- [x] Add API contract guidance to REST and MCP docs.
- [x] Strengthen OpenAPI metadata descriptions for agent trust fields.
- [x] Add full shared response schemas to OpenAPI.
- [x] Add core response schemas to OpenAPI for health, trust, search, project, recommend, compare, and quality.
- [x] Add extended response schemas to OpenAPI for workflow, alternatives, related, graph, score, Atlas, GRP, and MCP discovery.
- [x] Add canonical OpenAPI response examples for the highest-volume agent flows.
- [x] Add SDK-oriented examples for TypeScript and Python clients.
- [x] Normalize evidence fields across core project, recommendation, score, alternatives, graph, and GRP outputs.
- [x] Normalize project, recommendation, and score evidence fields.
- [x] Normalize alternatives, graph, and GRP evidence fields.
- [x] Publish a public benchmark summary page.
- [x] Publish MCP tool behavior examples with expected result shapes.
- [x] Add stricter validation for `require_d1` behavior across REST and MCP.
- [x] Add compatibility notes for clients that parse MCP text content as JSON.

## Recommended Validation

For documentation-only changes:

```sh
pnpm docs:validate
pnpm check
```

For agent surface contract changes:

```sh
pnpm api:validate
pnpm mcp:validate
pnpm eval:explanations
pnpm check
```

For ranking, recommendation, or classification changes:

```sh
pnpm eval:quality
pnpm eval:ranking
pnpm quality:review
pnpm check
```

For release readiness:

```sh
pnpm validate
pnpm db:integration
pnpm release:check
```
