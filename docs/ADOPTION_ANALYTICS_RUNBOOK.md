# Adoption Analytics Runbook

Git.Top can record optional, privacy-preserving adoption events in the Cloudflare Analytics Engine dataset `git_top_adoption`. The Worker only writes bounded dimensions; it does not query or expose raw analytics publicly.

Production event writes are enabled through the `ADOPTION_ANALYTICS` binding in `wrangler.toml`, which targets the `git_top_adoption` dataset. The Worker still treats the binding as optional so local development and isolated contract tests do not depend on Analytics Engine availability.

## Event Mapping

Analytics Engine points use the following stable layout:

| Point field | Meaning |
| --- | --- |
| `blob1` | Event name, such as `mcp_initialize` or `workflow_completed` |
| `blob2` | MCP profile (`core`/`full`) |
| `blob3` | Normalized client name |
| `blob4` | Sanitized client version |
| `blob5` | Operation or tool name |
| `blob6` | Result class |
| `blob7` | Data source (`d1`/`seed`/`unknown`) |
| `blob8` | Campaign source |
| `blob9` | Response-size bucket |
| `double1` | HTTP or JSON-RPC status |
| `double2` | Bounded duration in milliseconds |

The event writer never includes prompts, arguments, results, repository identifiers, raw IP addresses, authorization headers, cookies, or complete user-agent strings.

## Review Flow

1. Export a bounded time window with the repository helper. The command uses a fixed, read-only projection of the nine blobs and two doubles written by the Worker; it does not accept arbitrary SQL:

```sh
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="read-scoped-token"
pnpm adoption:export -- --hours 24 --limit 10000 --output ./adoption-events.json
```

The token needs Analytics Engine read access only. Keep the export in an access-controlled operator workspace and do not commit it. The default window is 24 hours and the maximum window is 720 hours; the maximum export is 10,000 rows.

2. Run the review command directly; it accepts raw Analytics Engine rows and already-normalized event objects:

```sh
node scripts/summarize-adoption-metrics.mjs ./adoption-events.json
```

For the recurring operator view, generate one bounded report that compares the latest 7 and 30 days:

```sh
pnpm adoption:report -- --output ./adoption-report.json
```

The report performs two fixed-field Analytics Engine queries, defaults to excluding events tagged `source=production-smoke`, and reports the exclusion count for each window. The production smoke client applies the equivalent `x-git-top-source` header to every request. Add other known operator-only campaign sources with `--exclude-source production-smoke,operator-check`. The output includes normalized daily-rate ratios, successful first-value calls, workflow completions, tool success, fallback, strict-source rejection, latency, and the existing bounded client/campaign/operation breakdowns. Treat `possibly_truncated=true` as a signal to shorten the window or add an access-controlled aggregation pipeline; increasing the query beyond 10,000 rows is intentionally unsupported.

The command normalizes raw point fields through `normalizeAnalyticsPoint()` and then reports the discovery-to-first-value call counts, `firstValueCallsPerInitialization`, tool success rate, strict-source rejection rate, seed fallback rate, p50/p95 latency, and bounded client/campaign/operation breakdowns. `firstValueCallsPerInitialization` is an activity ratio and may exceed `1`; it is not an activation conversion rate. The structured `insights` identify the strongest client, campaign source, operation, and primary failure mode only when the corresponding sample contains positive activity; otherwise the field is `null`. Latency percentiles use the nearest-rank method over the exported bounded samples.

The summary deliberately reports calls rather than unique users or sessions. Git.Top has no identity mechanism and must not infer retention, unique-user activation, or returning installs from request metadata.

## First Production Verification

The first bounded production review was completed on 2026-07-31 after enabling Analytics Engine and running the production smoke and Claude Code compatibility flows. The reviewed window contained 60 events:

| Signal | Count |
| --- | ---: |
| Successful outcomes | 57 |
| MCP initialize | 14 |
| MCP tools/list | 14 |
| MCP tool calls | 12 |
| Workflow completions | 4 |
| REST agent calls | 15 |
| Connect page views | 1 |
| Not found outcomes | 2 |
| Client errors | 1 |

Claude was the strongest identified client dimension with 21 events. `compare` was the strongest named operation with 14 events, followed by `get_project` with 4. Successful sampled `get_project` calls reported `source=d1`; not-found calls correctly reported an unknown source because no project payload was produced.

This is an operational verification sample dominated by smoke tests and the dated real-client run, not evidence of organic adoption, unique users, retention, or channel performance. Use a later bounded window that excludes operator validation traffic before making product-prioritization claims.

## Decisions

- Use `successfulFirstValueCalls` and `successfulWorkflows` to prioritize product work; raw request volume is not a success metric.
- Treat a rising `strictSourceRejectionRate` as a trust/onboarding issue, not as a search-quality win.
- Treat a non-zero `fallbackRate` as a freshness or D1 availability signal and review `/api/trust` alongside it.
- Compare p50 and p95 latency by client and profile before changing tool schemas or the core profile.
- Do not publish client or campaign breakdowns when a window is too small to avoid identifying a source indirectly.

Production telemetry review now has a repeatable bounded export path through `pnpm adoption:export`; real-client E2E remains an operational prerequisite. Local tests validate the aggregation contract, while the export command requires explicit operator credentials and never exposes analytics through a public Worker route.
