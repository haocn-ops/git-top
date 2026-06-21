# Git.Top Quality Hardening Plan

## Purpose

Git.Top is already a working public V1 baseline, but the release gate and production data quality gate need to say the same thing. The current local validation suite can pass while the production quality endpoint still reports a score below the release threshold.

This plan turns quality from an advisory report into an explicit release and operations loop.

## Current Production State

- Core local checks pass: TypeScript, focused tests, API validation, MCP validation, seed validation, eval quality, Next build, and Next smoke.
- The production quality check now passes the configured threshold: score `100`, minimum `90`.
- The production quality endpoint reports `0` errors, `0` warnings, and `3` info-only `score_skew` observations.
- The public V1 release gate now includes production quality before production smoke.
- `pnpm quality:check` defaults to the documented public origin `https://git.top`.
- Production quality is D1-backed and fails closed unless seed-backed checks are explicitly allowed with `--allow-seed`.

## Target State

- `pnpm quality:check` checks the documented public origin by default.
- Production quality checks require D1-backed metadata unless `--allow-seed` is explicitly passed.
- `pnpm release:check` includes production quality before production smoke.
- `pnpm release:check -- --skip-prod-smoke` stays suitable for PRs and local pre-production validation by skipping production-only checks.
- Quality failures are treated as release blockers, while the low-confidence review remains the curation work queue.
- Collection/resource-hub quality is reported as separate coverage guidance and does not reduce the executable-project release score.

## Workstreams

### 1. Release Gate Alignment

Status: implemented.

Tasks:

- Point `quality:check` at `https://git.top/api/quality` by default.
- Add CLI support for `--base-url`, `--target`, `--min-score`, and `--allow-seed`.
- Fail quality checks when metadata is missing or unexpectedly seed-backed.
- Include quality checks in the production portion of `pnpm release:check`.
- Document that `--skip-prod-smoke` skips production quality and production smoke together.

Acceptance criteria:

- `pnpm quality:check` clearly reports target, score, data source, issue counts, and top issues.
- `pnpm release:check` cannot pass the production gate when quality is below threshold.
- CI can still run `pnpm release:check -- --skip-prod-smoke` without depending on production state.

### 2. Quality Issue Burn-Down

Status: implemented and production verified.

Tasks:

- Completed: ran `pnpm quality:check` against production and triaged the top issues.
- Completed: shared curated category hints now feed runtime Agent Card classification for the current `category_other` production issue set.
- Completed: generated knowledge validation now asserts the quality burn-down projects do not regress to `other`.
- Completed: `/api/quality` now checks same-category alternatives by resolving alternative project IDs instead of parsing reason text.
- Completed: `classification_overrides` are applied when D1 knowledge rows are read, so reviewed overrides can affect REST, MCP, GRP, and quality responses without waiting for a repository re-sync.
- Completed: deployed the quality code changes to production.
- Completed: applied 18 reviewed `classification_overrides` rows to production D1 for the `category_other` burn-down set.
- Completed: applied 4 reviewed `agent_cards.alternatives_json` updates to production D1.
- Completed: re-ran `pnpm quality:check` and confirmed the production score is above the release threshold.

Acceptance criteria:

- Production quality score reaches at least `90`: met, current score `100`.
- Error count remains `0`: met.
- Warning count trends downward after each curation pass: met, current warning count `0`.
- Every remaining warning has an owner decision: met, no warnings remain.
- Remaining info-only `score_skew` observations are tracked as useful review signals, not release blockers.

### 3. Evaluation Hardening

Status: implemented.

Tasks:

- Completed: quality burn-down category regressions are covered by `pnpm knowledge:validate`.
- Completed: added hard-negative eval coverage for browser research agents, RAG resource collections, and MCP resource collections.
- Completed: added collection/resource-hub scoring so explicit resource-list queries can rank curated collections ahead of executable frameworks.
- Completed: removed generated fixture wording that polluted category classification with false `evaluation` signals.
- Completed: Cloudflare-mentioned-but-not-ready coverage remains in `pnpm eval:quality` and the production release gate.
- Keep `pnpm eval:quality` as the CI-safe regression gate and use `pnpm eval:local` for broader ranking review.

Acceptance criteria:

- Quality score improvement does not reduce CI-safe eval metrics: met, `pnpm eval:quality` is `24/24` with top-1/top-3/category/deployment/Cloudflare readiness all at `1`.
- Local eval review focus shrinks or has documented accepted misses.

### 4. Operations Rhythm

Status: active.

Weekly:

- Run `pnpm quality:check`.
- Run `pnpm quality:review`.
- Review `docs/LOW_CONFIDENCE_REVIEW.md`.
- Apply approved classification overrides.
- Run targeted syncs for stale or low-confidence projects.

Before release:

- Run `pnpm release:check`.
- Keep the default production quality threshold at `90`; use `--min-score` or `MIN_QUALITY_SCORE` only for explicit emergency or preview overrides.
- Do not deploy if production quality remains below threshold unless the release is explicitly an emergency fix.

After release:

- Run `pnpm release:check` again without `--skip-prod-smoke`.
- Confirm `/api/quality`, `/api/sync/status`, REST, MCP, and GRP are D1-backed and healthy.

### 5. Collection Coverage

Status: implemented.

Decision:

- Do not mix collection/resource-hub freshness into the primary release quality score.
- Keep collections in the low-confidence review queue when scope, curation, estimated item count, or freshness need human confirmation.
- Expose collection coverage through `/api/quality` response `coverage` fields so operators can review resource hubs separately from executable projects.

Reported fields:

- `collection_count`
- `collection_rate`
- `collection_scope_counts`
- `collection_freshness_counts`
- `stale_collection_count`
- `collection_review_count`

## Local Eval Review

Latest reviewed local eval:

- Command: `pnpm eval:local`
- Evaluated cases: `23`
- Top-1 hit rate: `0.739`
- Top-3 hit rate: `0.783`
- Category accuracy: `1`
- Deployment accuracy: `1`
- Cloudflare readiness accuracy: `1`
- Unacceptable hit count: `0`

Accepted review-focus observations:

- `local-category-agent_framework` and `local-category-rag_framework` miss canonical top candidates on broad category probes, but all returned projects are in the requested category and no unacceptable projects appear.
- `local-deployment-docker`, `local-deployment-local`, and `local-deployment-library_only` favor exact deployment/runtime keyword matches over older canonical broad projects; this is acceptable for local review until a category-specific canonical-prior model is added.
- `local-deployment-serverless` misses top-1 but hits top-3 and keeps deployment/category constraints intact.
- `local-target-github-mcp-broad-query` protects GitHub MCP repository-automation intent from broad quality boosts.

Decision:

- Do not tune global ranking weights solely to satisfy broad local probes.
- Keep `pnpm eval:quality` as the strict CI gate.
- Use `pnpm eval:local` as a review queue for future category-specific ranking priors.
- Use `pnpm eval:ranking` before runtime scoring changes; the current best candidate is `intent_aware_browse`, preserving CI top-1/top-3 at `1.0` while improving local top-1/top-3 to `0.913`.

## Production Audit

Latest verified Worker version:

- `aee4ec2a-2aff-4009-a7fd-d40ebb7a6bb3`

Manual production D1 actions:

- Applied 18 reviewed rows to `classification_overrides` for the current `category_other` burn-down projects.
- Applied 4 reviewed `agent_cards.alternatives_json` updates for weak popular-project alternatives.
- Replay/audit SQL is stored in `docs/PRODUCTION_QUALITY_PATCH_2026-06-21.sql`.
- Classification override bookmark: `00000084-0000000c-00005091-b2a9dffec044821ed4b1cac9c83e1ff7`.
- Alternatives update bookmark: `00000085-00000006-00005091-e114cc611851bc9de5958fce62ff0298`.

Final production quality snapshot:

- `score`: `100`
- `project_count`: `500`
- `issue_count`: `3`
- `error_count`: `0`
- `warning_count`: `0`
- `source`: `d1`
- `reason`: `d1_query`

Collection coverage snapshot:

- `collection_count`: `213`
- `collection_rate`: `0.426`
- `stale_collection_count`: `65`
- `collection_review_count`: `84`
- `collection_scope_counts`: awesome list `28`, cookbook `52`, starter collection `35`, integration collection `98`, resource hub `0`
- `collection_freshness_counts`: active `129`, stale `65`, unknown `19`

Sync observability snapshot:

- `sync_health`: `healthy`
- `sync_freshness`: `fresh`
- `last_successful_sync_at`: `2026-06-21T03:32:13.028Z`
- `hours_since_successful_sync`: `3`
- `cycle_complete`: `true`
- `next_batch_wraps`: `false`

Remaining info-only observations:

- `camunda/camunda`: `score_skew`
- `wandb/weave`: `score_skew`
- `langchain-ai/langsmith-sdk`: `score_skew`

## Open Decisions

- Resolved: the default production quality threshold is ratcheted from `60` to `90` after the first burn-down; `--min-score` and `MIN_QUALITY_SCORE` remain available for explicit emergency or preview overrides.
- Resolved: `info` issues remain visible in `issue_count` and the issue list, but no longer reduce the release quality score. Errors and warnings remain score-affecting release signals.
- Resolved: collection/resource-hub projects use a separate public coverage rubric in `/api/quality` coverage fields; this is review guidance and does not reduce the executable-project release score.
