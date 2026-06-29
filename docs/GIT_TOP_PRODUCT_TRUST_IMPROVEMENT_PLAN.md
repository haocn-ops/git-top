# Git.Top Product Trust Improvement Plan

Date: 2026-06-26

## Purpose

Git.Top is already a usable agent-facing GitHub knowledge layer. The next improvement pass should make recommendations easier to trust by separating release health from corpus risk, tightening flagship query behavior, and making project-level evidence more explicit for both humans and agents.

## Current Assessment

Production is healthy: D1 is available, the corpus has about 500 knowledge-ready projects, sync freshness is healthy, and production smoke checks cover REST, MCP, OpenAPI, sitemap, SEO pages, project pages, quality, status, coverage, and review queues.

The strongest product surfaces are REST, MCP, OpenAPI, `/llms.txt`, `/llms-full.txt`, project schemas, and project pages with freshness and classification evidence. Git.Top is differentiated when it stays focused on agent-native project selection rather than a generic GitHub leaderboard.

The largest trust gap is that `/api/quality` can report `score: 100` and `risk_level: high` at the same time. This is operationally explainable because the current score is a release gate while the risk layer measures corpus confidence, but the public API and quality page need to say that directly.

## P0 Changes

### 1. Split Quality Semantics

Add explicit fields to `/api/quality`:

- `release_score`: release gate score reduced by blocking errors and warnings.
- `data_trust_score`: corpus trust score reduced by low-confidence classifications, collection review load, stale project sync, and stale collections.
- `score`: retained as a backward-compatible alias for `release_score`.
- `score_summary`: short explanation of how to read the two scores.

The quality page should show release health and data trust as separate metrics so users do not have to reconcile `100` with `high risk` by inference.

### 2. Fix Flagship Project Semantics

Add a curated classification hint for `cloudflare/agents` so generated knowledge treats it as a high-confidence `agent_framework`. This protects the site's own flagship examples, docs, MCP examples, and search/recommendation workflows.

When applying this to production D1, operators should persist an equivalent classification override with reviewed evidence. The runbook already documents the protected override API.

### 3. Protect Core Query Behavior

Add a regression check for the flagship query:

```sh
GET /api/search?q=cloudflare%20agent%20framework
```

The top results should include `cloudflare/agents`, and exact Cloudflare project intent should not be buried by generic high-score projects. The existing production smoke already checks this at a broad level; keep it explicit in local API validation as well.

## P1 Changes

### 4. Burn Down Review Queue by Impact

Use `/quality/review` as a prioritized operations queue. Start with projects that appear in:

- homepage examples
- docs and MCP examples
- topic landing pages
- top search results for high-intent queries
- projects with high stars or high agent score

Review order should favor user-visible trust gaps over evenly processing the corpus.

### 5. Improve Project Decision Summaries

Project pages should state:

- best use case
- not-good-for caveat
- main deployment fit
- top alternative distinction
- classification confidence summary
- data freshness summary

The existing evidence blocks are useful, but a compact decision summary would make pages more actionable.

### 6. Build a Better Human Selection Surface

The `/projects` page should become a real selection tool with filters for category, deployment, language, Cloudflare readiness, project kind, and minimum confidence. Results should show why each project matched, not only scores.

## Acceptance Criteria

- `/api/quality` exposes `release_score`, `data_trust_score`, `score_summary`, and keeps `score` backward-compatible.
- `/quality` visually separates release health from data trust risk.
- `cloudflare/agents` is high-confidence `agent_framework` in generated knowledge paths.
- Local validation asserts the new quality fields and flagship query behavior.
- `pnpm core:validate`, `pnpm api:validate`, `pnpm eval:quality`, and `pnpm quality:check` continue to pass.

## Operational Notes

Code-level curated hints affect generated knowledge and seed-derived paths. Existing production D1 rows need either re-sync or a protected `/api/admin/classification-overrides` write before the same correction appears in production REST and MCP responses.

