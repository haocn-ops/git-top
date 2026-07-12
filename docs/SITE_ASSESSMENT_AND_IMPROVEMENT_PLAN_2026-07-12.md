# Git.Top Site Assessment and Improvement Plan

Date: 2026-07-12

## Executive Summary

Git.Top is a strong agent-native open-source knowledge product with unusually complete REST, MCP, GRP, OpenAPI, Agent Map, LLM discovery, trust, and evidence surfaces. The initial overall product assessment was 7.4/10: the machine-facing foundation was mature, while production data freshness, canonical entity ranking, and human-facing polish limited high-confidence use. The remediation described below is now deployed and the production Trust Gate allows high-confidence use.

The immediate objective is not to add more product surfaces. It is to make the existing selection workflow dependable:

1. restore sustainable D1 writes and sync freshness;
2. protect exact and canonical project intent in search;
3. align recommendation confidence with actual recommendation strength;
4. remove internal enum and generated-template artifacts from human pages;
5. reduce stale data, low-confidence classifications, and missing alternatives.

## Observed Production Baseline

Production checks on 2026-07-12 reported:

| Signal | Observed |
| --- | ---: |
| D1 project count | 899 |
| Release score | 100/100 |
| Data trust score | 74/100 |
| Trust decision | `caution` |
| Production ready | `false` |
| Risk level | `high` |
| Hours since successful sync | 59 |
| Stale projects | 528 (58.7%) |
| Low-confidence classifications | 252 (28%) |
| Quality issues | 746 |
| Recommendation top-1 eval | 92.9% |
| Recommendation top-3 eval | 100% |

The blocking sync error was `D1_ERROR: Exceeded maximum DB size`. The GitHub conditional request cache stored complete response bodies, including potentially large README, commit, release, contributor, and issue payloads. Without size and retention limits, this operational cache can grow until it prevents core project writes.

## Assessment

| Area | Score | Assessment |
| --- | ---: | --- |
| Product positioning | 9.0 | The open-source knowledge graph position is differentiated and coherent. |
| Agent and API surfaces | 9.2 | Discovery, contracts, provenance, evidence, and fail-closed controls are first-class. |
| Search and recommendation | 6.2 | Explanations are strong, but canonical entity authority and confidence semantics need work. |
| Data trust and operations | 5.8 | Production sync is stale and D1 capacity is blocking writes. |
| Human-facing experience | 6.8 | Responsive and functional, but dense navigation and generated prose reduce polish. |
| SEO and security | 8.8 | Canonical URLs, JSON-LD, sitemap, discovery headers, and security headers are mature. |

## Prioritized Implementation

### P0: D1 Capacity and Sync Recovery

Status: completed in code and production.

Changes:

- Reject GitHub cache bodies above 64 KiB instead of persisting unbounded payloads.
- Prune oversized or stale cache rows before scheduled and manual sync work.
- Cap the conditional request cache at 2,500 recently checked entries.
- Retain star snapshots for 45 days, sync runs for 30 days, and governance runs for 180 days.
- Add an idempotent production cleanup migration.

Acceptance criteria:

- The cleanup migration completes on production D1.
- A subsequent scheduled or manual sync can update projects without `maximum DB size` errors.
- `/api/health` reports `sync_freshness=fresh` and `sync_health=healthy` after recovery.
- Cache and operational history remain bounded over a seven-day observation window.

### P0: Canonical Entity Search

Status: implemented.

Changes:

- Give an exact `owner/repository` match the strongest identity boost.
- Give an exact repository-name match a strong boost over substring matches.
- Use project authority only as a tie-breaker inside an exact identity tier.
- Preserve the separate broad `ranking=browse` behavior.

Acceptance criteria:

- `q=openai/codex` ranks `openai/codex` first.
- `q=codex` ranks the exact repository name `openai/codex` above projects that merely contain `codex` in their names or metadata.
- Existing exact-intent and browse-ranking regression cases continue to pass.

### P0: Recommendation Confidence Semantics

Status: implemented.

Changes:

- Recommendation confidence now considers the final fit score, use-case match, and maintenance signal, not only constraint matching.
- Low-scoring candidates with matched filters are described as exploration candidates rather than strong candidates.
- Human pages label the field as recommendation confidence.
- The normalized evidence object uses the recommendation confidence reason rather than the underlying project-only confidence reason.

Acceptance criteria:

- A candidate below 55/100 cannot be labeled high recommendation confidence.
- A high-confidence recommendation has a strong overall score, strong use-case overlap, no unmatched constraints, and a usable maintenance signal.
- API and explanation contract validation continues to pass.

### P1: Human-Facing Product Polish

Status: implemented for the current homepage and decision pages.

Changes in this pass:

- Remove the duplicate `Any` option from Cloudflare readiness filters.
- Render deployment identifiers such as `library_only` as human-readable prose.
- Generate grammatically correct `a`/`an` category summaries.
- Clean existing stored summaries at render time so production pages improve before every project is resynced.
- Reduce the homepage to three primary human tasks: search, recommend, and compare.
- Move Atlas, Graph, Trust, Score, MCP, and other advanced surfaces into secondary navigation.

Future editorial work:

- Replace repeated generated guidance with shorter, project-specific evidence where possible.

Acceptance criteria:

- Human pages do not display `a agent` or `library_only` in prose.
- Cloudflare readiness filters expose one unambiguous Any state.
- The primary workflow is understandable without reading API documentation.

### P1: Corpus Trust Recovery

Status: completed. Trust and freshness targets are met in production.

Targets:

- stale project rate below 10%;
- low-confidence classification rate below 15%;
- data trust score at least 85;
- no high-impact popular project missing alternatives;
- Trust Gate decision `allow` for D1-backed requests.

Actions:

- Resume sync after capacity cleanup.
- Run priority refreshes for popular, stale, and partial-signal projects.
- Refresh derived alternatives after the project sync backlog clears.
- Review the highest-impact classification and collection-semantics queue first.

## Production Rollout

1. Apply `migrations/0008_operational_data_retention.sql` to production D1.
2. Deploy the Worker with bounded cache writes and scheduled pruning.
3. Trigger a small manual lite sync and verify that D1 writes succeed.
4. Run catch-up sync rounds in bounded batches.
5. Refresh derived alternatives.
6. Run `pnpm smoke:prod` and `pnpm quality:check`.
7. Confirm `/api/trust` changes from `caution` to `allow` only after freshness and risk thresholds genuinely recover.

Do not override or weaken the Trust Gate to make the rollout appear healthy. The gate should remain fail-closed until the underlying data recovers.

## Completed Production Result

Production verification after the remediation reported:

| Signal | Final result |
| --- | ---: |
| Deployment status | Production Worker deployed and verified |
| D1 project count | 903 |
| Release score | 100/100 |
| Data trust score | 97/100 |
| Trust decision | `allow` |
| Production ready | `true` |
| Risk level | `medium` |
| Stale projects | 0 (0%) |
| Low-confidence classifications | 0 (0%) |
| Classification review queue | 0 |
| Popular projects missing alternatives | 0 |
| Quality errors / warnings | 0 / 0 |
| Informational observations | 10 |

The remaining medium corpus risk is caused only by 17 of 49 collection repositories being factually stale. Those freshness labels are retained because they are useful evidence, not defects to hide. The 10 remaining quality observations are `score_skew` notices where maintenance and Git Score measure different real signals; they do not reduce the release score.

Additional production work completed:

- reduced D1 from approximately 500 MB to approximately 43 MB;
- refreshed the full curated corpus and removed one confirmed GitHub 404 repository;
- recomputed alternatives for every production project from an exported D1 snapshot;
- added reviewed category and collection policies and cleared the actionable review queue;
- aligned the Trust Gate implementation with its documented `risk_level is not high` requirement;
- changed project persistence from replace semantics to stable UPSERT semantics;
- repaired one stale project timestamp from the authoritative successful sync audit trail.

## Validation

Code and documentation:

```sh
pnpm docs:validate
pnpm core:validate
pnpm api:validate
pnpm mcp:validate
pnpm eval:quality
pnpm eval:ranking
pnpm eval:explanations
pnpm quality:review
pnpm check
```

Production after migration and deployment:

```sh
pnpm smoke:prod
pnpm quality:check
```
