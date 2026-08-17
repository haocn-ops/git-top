# Production Release Retrospective: Seed Coverage Catch-up

Date: 2026-08-17

Status: complete

Production origin: `https://git.top`

Release commit: `817bf1c9a3aeaed20faa751b8ae0f75cb015885f`

Pull request: `https://github.com/haocn-ops/git-top/pull/5`

Repository state at time of writing: PR #5 remains open, so production contains
the release commit while `main` does not yet contain the same change.

## Summary

The production Worker was healthy, but seed coverage remained at 498 of 500
repositories. A bounded catch-up workflow was added and hardened against Worker
subrequest limits, transient GitHub failures, and transient production-origin
failures. The remaining false gap was caused by renamed repositories: the sync
correctly stored the GitHub canonical repository ID, while coverage continued
to compare only the obsolete seed ID.

The fix records repository aliases when a rename is observed and counts a seed
entry as covered when its canonical target exists in D1. The release was
delivered through the protected GitHub `production` Environment. A final
`production-seed-catchup` Governance run completed a full seed cycle and passed
the production quality and smoke gates.

There was no production outage. The operational risk was incomplete and
misreported seed coverage, plus an initially unusable Cloudflare deployment
credential. Until PR #5 is merged, there is also a branch-drift risk: a later
release from the older `main` could overwrite the production fix.

## Evidence

| Evidence | Result |
| --- | --- |
| PR preview | [Release run 31983321010](https://github.com/haocn-ops/git-top/actions/runs/31983321010), success |
| Initial production attempt | [Release run 31983281987](https://github.com/haocn-ops/git-top/actions/runs/31983281987), failed closed before deploy with Cloudflare API authentication error `10000` |
| Production release | [Release run 31997137289](https://github.com/haocn-ops/git-top/actions/runs/31997137289), success |
| Final data calibration | [Governance run 31997851843](https://github.com/haocn-ops/git-top/actions/runs/31997851843), success |
| Final sync state | `remaining_count=0`, `cycle_complete=true`, no failed repository syncs |
| Final trust state | `productionReady=true`, D1 source, hot and whole-corpus freshness rates `1` |
| Final quality state | `releaseScore=100`, risk `low`, three commands passed and zero failed |

All timestamps below are UTC so they can be compared directly with GitHub
Actions logs.

## Timeline

| Time | Event | Learning or action |
| --- | --- | --- |
| 2026-08-16 23:58 | Added the first bounded seed catch-up task. | A batch of 40 hit the Worker subrequest limit on a high-signal repository. |
| 2026-08-17 00:01 | Changed the task to 500 serialized rounds of one repository. | Small batches are slower but stay within Worker invocation limits and preserve a precise cursor. |
| 2026-08-17 00:10 | Catch-up stopped on a GitHub contributors `504`. | Repository-level retryable failures must retry the same cursor instead of being treated as permanent coverage gaps. |
| 2026-08-17 00:19 | A later catch-up stopped after a production HTTP `503`. | Request retries alone were insufficient; the client also needed bounded origin rotation. |
| 2026-08-17 00:21-00:41 | Origin rotation completed a full catch-up run. | The workflow succeeded, quality passed, and smoke passed, but `remaining_count=2` and `cycle_complete=false` proved the target state was not reached. |
| 2026-08-17 00:50 | Added canonical repository alias accounting in commit `817bf1c`. | A successful sync of a renamed repository must satisfy the original seed entry without retaining obsolete project knowledge. |
| 2026-08-17 04:59 | PR preview upload and preview release gate passed. | Preview validation confirmed the build and preview path, but did not prove every production version-management API call was authorized. |
| 2026-08-17 05:04 | The first protected production attempt failed on `wrangler versions list` with Cloudflare authentication error `10000`. | Stop before deploy, replace or correct the scoped token, update the GitHub secret, and rerun the same validated SHA. |
| 2026-08-17 05:13-05:17 | The protected production Release run passed pre-deploy validation, deploy, smoke, and quality. | The release workflow preserved the previous version and retained automatic rollback coverage after deployment. |
| 2026-08-17 05:25-05:48 | The final Governance run completed. | The release was closed only after coverage, cycle completion, freshness, quality, and smoke all agreed. |

## Root Cause

### Coverage accounting

The seed corpus stores repository identifiers that can become obsolete after a
GitHub owner or repository rename. Sync follows GitHub's canonical repository
identity and retires the obsolete D1 knowledge rows. Before this change,
`countSyncedSeedProjects` counted only exact, case-insensitive seed-to-project
ID matches. A successfully synced canonical repository therefore still appeared
missing under its old seed ID.

The corrected flow is:

1. Sync detects that the requested seed ID differs from the GitHub canonical ID.
2. Obsolete project knowledge is retired.
3. `sync_state` records `repository_alias:<old-id> = <canonical-id>`.
4. Coverage counts the old seed ID when the canonical project exists in D1.
5. Validation covers both the alias-present and canonical-project-missing cases.

### Catch-up reliability

The first catch-up shape concentrated too many GitHub subrequests in one Worker
invocation. Serializing to one repository per round removed that pressure. The
long-running workflow then exposed two independent transient failure modes:
repository-level GitHub `5xx` responses and production-origin `5xx` responses.
The final implementation retries retryable repository failures at the same
cursor, applies bounded HTTP retries, and rotates between the canonical and
workers.dev origins.

Permanent repository errors and exhausted retries still fail closed. The
workflow does not skip a repository merely to make coverage reach 100%.

### Deployment credential

The first production run failed before deployment while listing the previous
Worker version. The Cloudflare token was replaced or corrected, restricted to
the Git.Top account and `git.top` zone, and stored only as the GitHub Actions
secret `CLOUDFLARE_API_TOKEN`. No token value is stored in this repository or in
this retrospective.

The important diagnostic distinction is that a preview upload can succeed while
a production-only version-management call still fails. Production readiness
therefore includes the exact preflight used for rollback: list the current
version before deploying.

## What Worked

- The production Environment approval prevented an unreviewed direct deploy.
- The Release workflow failed before mutation when Cloudflare authentication was
  invalid.
- The workflow captured the previous Worker version and retained automatic
  rollback after the deploy boundary.
- Catch-up kept the cursor on retryable repository failures instead of silently
  advancing.
- Quality and smoke checks ran both after deploy and after data calibration.
- Structured status fields exposed the difference between a successful command
  and a completed operational outcome.

## What To Improve

- Treat `remaining_count` and `cycle_complete` as required catch-up assertions,
  not informational log fields.
- Validate Cloudflare version-list permission before waiting for a production
  approval when the workflow is next revised. Do not expose the token while
  doing so.
- Keep repository alias accounting visible in sync regression tests whenever
  seed coverage or rename cleanup changes.
- Record the deployed SHA, Release run, Governance run, and final structured
  fields in every production change record.
- Prefer releasing merged `main`. When an explicitly approved branch release is
  necessary, merge the exact deployed SHA promptly and verify that `main`
  contains it before the next production release.
- Prefer one complete, bounded calibration run after a data-semantic release;
  routine code-only releases do not need a full seed refresh.

## Reusable Release Procedure

### 1. Establish the release candidate

Use one immutable, reviewed SHA. Confirm the worktree and PR checks before any
production action:

```sh
git status --short --branch
git rev-parse HEAD
gh pr checks <pr-number> --repo haocn-ops/git-top
```

Required evidence:

- The release SHA is the SHA shown by the successful PR preview.
- The release ref normally points to merged `main`; an approved branch release
  has a named owner and immediate merge-back follow-up.
- `pnpm release:check -- --skip-prod-smoke` passed.
- The preview release gate passed with D1-backed responses.
- Any migration is additive and backward compatible.

### 2. Verify credentials without disclosing them

Confirm secret metadata and resource scope, never the value:

```sh
gh secret list --repo haocn-ops/git-top
```

`CLOUDFLARE_API_TOKEN` must support the workflow operations it will execute:
Worker version listing, upload/deploy, and rollback; D1 mutation only when a
selected migration is included; and route changes only for the `git.top` zone.
Limit resources to the Git.Top Cloudflare account and zone.

If the workflow reports Cloudflare authentication error `10000`, do not bypass
the protected path with a local deploy. Correct or rotate the token, update the
GitHub secret, and rerun the same validated SHA.

### 3. Dispatch the protected production release

```sh
gh workflow run Release --repo haocn-ops/git-top --ref <validated-ref>
gh run list --repo haocn-ops/git-top --workflow Release --limit 5
gh run watch <release-run-id> --repo haocn-ops/git-top --exit-status
```

Use the optional `migration_file` input only when the release requires one
reviewed migration. Do not run `pnpm deploy` directly during the normal path.

Release success requires all of the following:

- The run used the intended SHA.
- The protected `production` Environment was approved.
- The pre-deploy gate passed.
- Worker deploy passed.
- `pnpm smoke:prod` passed.
- `pnpm quality:check` passed.

If the release came from a PR branch, do not allow the next release to start
until the deployed SHA is reachable from `main`:

```sh
git fetch origin main
git merge-base --is-ancestor <deployed-sha> origin/main
```

### 4. Run data calibration when required

Run a full seed calibration after changes to sync semantics, seed coverage,
canonical identity, or stored knowledge mapping:

```sh
gh workflow run Governance --repo haocn-ops/git-top \
  --ref <deployed-ref> -f task=production-seed-catchup
gh run list --repo haocn-ops/git-top --workflow Governance --limit 5
gh run watch <governance-run-id> --repo haocn-ops/git-top --exit-status
```

Do not start a second catch-up while the first is active. Governance concurrency
is intentionally serialized and the task can take more than 20 minutes.

### 5. Prove the end state

Workflow success is necessary but not sufficient. Inspect structured output:

```sh
gh run view <governance-run-id> --repo haocn-ops/git-top --log \
  | rg 'remaining_count|cycle_complete|productionReady|hotFreshnessRate|wholeCorpusFreshnessRate|releaseScore|"passed"|"failed"'
```

Close the release only when:

- `remaining_count=0`.
- `cycle_complete=true`.
- The final catch-up contains no failed repositories or exhausted retries.
- `productionReady=true` and the Trust Gate source is D1.
- Hot and whole-corpus freshness rates meet their SLOs.
- The release score meets the configured threshold.
- The post-calibration quality and smoke commands both pass.

If quality and smoke pass but coverage does not, treat the release as deployed
but the data calibration as incomplete. Investigate identity mapping, cursor
state, or a permanent repository error before declaring closure.

## Reuse Checklist

- [ ] Immutable release SHA recorded.
- [ ] PR validation and preview passed.
- [ ] Cloudflare secret metadata and resource restrictions reviewed.
- [ ] Protected production Release run passed.
- [ ] Deployed SHA matches the intended SHA.
- [ ] Deployed SHA is reachable from `main`, or an explicit merge-back owner is recorded.
- [ ] Production smoke passed.
- [ ] Production quality passed.
- [ ] Required migration, if any, was applied exactly once.
- [ ] Data-semantic changes received a bounded Governance calibration run.
- [ ] `remaining_count=0` and `cycle_complete=true` when calibration was required.
- [ ] D1 source, production readiness, freshness, and release score recorded.
- [ ] Release and Governance run URLs added to the change record.

## Related Documentation

- [Production Runbook](./PRODUCTION_RUNBOOK.md)
- [Deployment Decision](./DEPLOYMENT_DECISION.md)
- [Production Freshness Optimization Plan](./PRODUCTION_FRESHNESS_OPTIMIZATION_PLAN_2026-07-14.md)
