# Git.Top Automated Operations and Agent Friendliness Plan

Date: 2026-07-12

## Objective

Move Git.Top from a healthy, manually supervised Worker into a recoverable operating system for open-source knowledge. Automation must preserve provenance and fail-closed behavior: partial work must never be reported as a complete refresh, and discovered repositories must not enter trusted recommendations without an admission decision.

## Current Baseline

Production currently reports:

- Trust Gate `allow` and `production_ready=true`;
- release score 100 and data trust score 97;
- 903 D1-backed projects;
- zero stale projects, low-confidence classifications, errors, or warnings;
- medium corpus risk caused by 17 factually stale collections;
- 28 ranking cases with 92.9% top-1 and 100% top-3 accuracy.

The product already has strong REST, MCP, GRP, OpenAPI, Agent Map, LLM discovery, evidence, and `require_d1` controls. The remaining gap is operational: recovery tasks, admission decisions, alerts, and data-version semantics still require too much operator knowledge.

## Principles

1. A partial batch is progress, not freshness.
2. Discovery and admission are separate states.
3. Every recurring job has a cursor, retry state, completion watermark, and bounded cost.
4. Trust thresholds are not weakened to manufacture an `allow` decision.
5. Agent-facing responses identify the data snapshot used for a decision.
6. Automation proposes uncertain corrections; reviewed policy remains authoritative.

## Phase 1: Recoverable Operations

Status: implementation in this optimization pass.

### Incremental Alternatives

- Replace weekly and monthly full-corpus Worker calculations with a bounded hourly batch.
- Persist the next offset in `sync_state`.
- Reset the cursor only after the final batch succeeds.
- Record `derived:alternatives` success only when the complete corpus cycle finishes.
- Keep the protected admin endpoint and offline SQLite workflow for operator recovery.

Acceptance criteria:

- no scheduled invocation compares the entire production corpus;
- interrupted batches resume from the persisted cursor;
- `/api/sync/status` remains stale until a full cycle completes;
- governance summary exposes batch progress without claiming full completion.

### Candidate Admission

- Store newly discovered repositories as `quarantined` by default.
- Apply deterministic admission checks for activity, category relevance, repository shape, and minimum authority.
- Promote only admitted candidates to `approved`, then sync them.
- Preserve `quarantined`, `synced`, and `failed` states for audit.

Acceptance criteria:

- GitHub search results cannot enter project recommendations without an admission decision;
- governance summaries expose admitted and quarantined counts plus reasons;
- failed candidates remain auditable and retryable.

### Active Alerts

- Add optional `OPERATIONS_ALERT_WEBHOOK` delivery for failed scheduled governance tasks.
- Emit structured task, status, error, timestamp, and production URL fields.
- Treat alert delivery as best effort so an unavailable alert sink does not hide the original governance result.

### Operational Storage

- Expose cache entry count, cache body bytes, retention limits, and utilization through health output.
- Keep oversized-body and history retention pruning idempotent.
- Add warning thresholds before storage exhaustion blocks project writes.

## Phase 2: Agent Data Semantics

Status: implemented.

### Stable Snapshots

- Add `metadata.snapshot_id`, `metadata.latest_synced_at`, and `metadata.schema_version`.
- Derive D1 snapshot identity from corpus size and the newest project sync timestamp.
- Use a stable bundled-seed snapshot identity during fallback.

### Change Feed

- `GET /api/changes?since=` for additions, removals, classification changes, and material score movement;
- cursor pagination and an explicit retention window;
- event provenance and the snapshot produced by each change;
- deletion tombstones so agents do not retain removed projects indefinitely.

### Efficient Agent Reads

- batch project lookup for up to 20 canonical repository IDs;
- `profile=compact|decision|evidence` response profiles;
- cursor pagination for growing lists;
- MCP capability metadata for batch size, pagination, snapshot semantics, and fail-closed support.

## Phase 3: Delivery and Feedback

Status: delivery, digest, and review-gated feedback implemented; broader task eval expansion remains ongoing.

- PR validation to preview Worker deployment and preview smoke;
- explicit production approval, ordered D1 migrations, canary checks, and rollback ownership;
- structured agent feedback proposals for incorrect classifications or weak alternatives;
- daily operational digest covering discovery, admission, sync, derived cycles, capacity, and Trust Gate movement;
- task-success evaluation across search, evidence inspection, alternatives, compare, and final selection;
- multilingual, typo, rename, deletion, stale-source, and fallback regression cases.

## Service Objectives

| Signal | Target |
| --- | --- |
| Hot project freshness | under 24 hours |
| General project freshness | under 7 days |
| Complete alternatives cycle | under 72 hours |
| Actionable low-confidence queue | below 5% of corpus |
| D1 operational cache utilization | below 70% of configured budget |
| API and MCP server errors | below 0.1% |
| Trust Gate | `allow` for D1-backed production decisions |

## Rollout

1. Deploy Phase 1 code without resetting existing alternatives freshness.
2. Observe incremental cursor movement for at least one complete cycle.
3. Confirm only the completed cycle writes `derived:alternatives` success.
4. Configure and test the operations webhook outside production failure paths.
5. Review quarantined candidate volume and admission reasons for one week.
6. Add the change-event schema only after retention and deletion semantics are agreed.

## Validation

```sh
pnpm validate
pnpm db:integration
pnpm mcp:validate
pnpm eval:ranking
pnpm eval:agent-tasks
pnpm smoke:prod
pnpm quality:check
```

Production acceptance requires D1-backed metadata, fresh sync, a completed alternatives cycle, release score at least 90, data trust score at least 75, and risk below high.

## Implementation Result

Completed in this pass:

- hourly alternatives work is bounded to 15 projects and resumes from `sync_state.alternatives_cursor`;
- partial batches write `derived:alternatives-progress`, while only a complete cycle writes `derived:alternatives` success;
- corrupt or out-of-range alternatives cursors recover to the start of the corpus;
- weekly and monthly governance no longer execute full-corpus alternatives calculations;
- candidate discovery records structured admission decisions and separates `quarantined`, `approved`, `synced`, and `failed` states;
- scheduled governance and incremental alternatives failures support best-effort HTTPS webhook alerts;
- health responses expose operational cache budgets, utilization, and retained history counts;
- routine pruning retains 1,500 cache entries against a 2,500-entry alert budget so healthy operation returns below the 70% warning threshold;
- knowledge metadata exposes `snapshot_id`, `latest_synced_at`, and `schema_version` across REST and MCP responses;
- Agent Map, MCP guidance, OpenAPI, API documentation, and the production runbook describe the new contracts.
- `/api/projects` and MCP `get_projects_batch` fetch up to 20 canonical repositories under one snapshot using `compact`, `decision`, or `evidence` profiles;
- `/api/changes` and MCP `get_project_changes` expose D1 additions, updates, classification changes, material score changes, and deletion tombstones;
- change-feed clients receive an opaque polling cursor even on an empty or final page, plus the actual guaranteed retention lower bound;
- metrics and Agent Card writes use explicit UPSERT semantics so D1 update triggers reliably capture material changes.
- same-repository pull requests can upload an isolated Cloudflare preview version and run the release gate against its preview alias when Actions credentials are configured;
- production delivery requires a protected GitHub `production` Environment approval, accepts only one explicitly named additive migration, and automatically rolls Worker code back when smoke or quality verification fails;
- daily governance can send a structured digest through the optional `OPERATIONS_DIGEST_WEBHOOK` without changing failure-alert delivery;
- REST and MCP validate structured evidence-backed feedback, while `FEEDBACK_SECRET` gates D1 persistence and `SYNC_SECRET` gates administrator review;
- feedback fingerprints deduplicate equivalent corrections, bound request sizes, preserve reviewed records, and never mutate trusted project knowledge automatically.
- REST search, trending, and category lists plus MCP `search_projects` expose opaque cursors bound to the query and `metadata.snapshot_id`;
- stale list cursors fail explicitly instead of silently mixing snapshots, while the first-page exact-intent ranking remains unchanged;
- common Chinese AI-domain terms and a conservative set of high-signal typos are normalized with visible `query_interpretation` evidence;
- existing product aliases preserve renamed-project intent without enabling unrestricted fuzzy matching.
- `eval:agent-tasks` gates eight complete workflows spanning trust, fallback, pagination, evidence, alternatives, comparison, tombstones, feedback, multilingual input, typos, and aliases.

Validation result:

- 36 focused tests passed, including change-feed, profile, batch, pagination, multilingual and typo interpretation, feedback authorization, digest, strict-source, and MCP cases;
- API, MCP, TypeScript, generated knowledge, fixture health, quality, explanation, and documentation validation passed;
- ranking top-1 remained 92.9% and top-3 remained 100%;
- end-to-end Agent task success is 8/8 (100%);
- local D1 integration passed;
- production smoke passed across health, search, GRP, MCP, discovery, trust, quality, operations, and canonical routes.

Production result:

- deployed Worker version: `cc797181-bb0f-4a09-885c-0513d003a60d`;
- 920 D1-backed projects, Trust Gate `allow`, production ready, release score 100, and data trust score 97;
- operational cache pruned to 1,500 entries with 60% entry-budget utilization and healthy status;
- production D1 storage reduced from approximately 43 MB to 26 MB;
- `OPERATIONS_ALERT_WEBHOOK` and `OPERATIONS_DIGEST_WEBHOOK` remain optional and unconfigured until HTTPS destinations are selected;
- D1 migration `0011_project_change_feed.sql` is active with five event triggers and a feed start watermark of `2026-07-12T13:38:34.989Z`;
- D1 migration `0012_feedback_proposals.sql` is active; public validation remains non-persistent until `FEEDBACK_SECRET` is configured;
- production exposes 21 MCP tools, including `get_projects_batch`, `get_project_changes`, and `propose_project_feedback`;
- GitHub `production` Environment requires `haocn-ops` approval and `CLOUDFLARE_ACCOUNT_ID` is configured; `CLOUDFLARE_API_TOKEN` still needs to be added before Actions can upload or deploy.

External configuration still required:

- add `CLOUDFLARE_API_TOKEN` to GitHub Actions before preview upload or approved production delivery can run;
- configure `FEEDBACK_SECRET`, `OPERATIONS_ALERT_WEBHOOK`, and `OPERATIONS_DIGEST_WEBHOOK` when their external destinations and credential ownership are selected.

The code paths fail closed or remain disabled until these external secrets are configured.
