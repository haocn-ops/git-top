# Git.Top AI Agent Adoption and Distribution Plan

Date: 2026-07-31

## Executive Decision

Git.Top has already solved most of the technical problem of being usable by AI agents. The next constraint is adoption, not another round of broad protocol expansion.

The product already exposes REST, MCP, GRP, OpenAPI, `llms.txt`, well-known discovery documents, Agent Map, Trust Gate, normalized evidence, strict D1 mode, and production evaluation gates. Production verification shows that these surfaces are operational. However, external adoption remains near zero, installation still requires manual interpretation, and the product does not yet measure whether an agent discovers Git.Top, completes a first useful call, or returns.

The next product stage should therefore prioritize:

1. A one-minute installation path for major agent clients.
2. A smaller default MCP tool surface with the full surface still available.
3. Distribution through registries, client catalogs, skills, and reference integrations.
4. Privacy-preserving product usage measurement.
5. Real-client compatibility and task-success evaluation.
6. Freshness work driven by project visibility and actual query demand.

The primary outcome is not more endpoints. It is more agents completing useful, trustworthy project-selection workflows.

## Current Baseline

This baseline is a dated snapshot and should not be treated as a permanent product claim.

Observed on 2026-07-31:

| Area | Baseline |
| --- | --- |
| Production corpus | 1,009 D1-backed knowledge-ready projects |
| MCP surface | 21 advertised tools |
| Trust Gate | `allow`, production ready |
| Release score | 100/100 |
| Data trust score | 90/100, medium risk |
| Recommendation evaluation | 92.9% top-1, 100% top-3 |
| Explanation evaluation | 12/12 checks passed |
| Agent task evaluation | 10/10 tasks passed |
| GitHub adoption | 0 stars, 0 forks at the time of review |
| Product usage analytics | No product-level adoption funnel found |
| Client packaging | No prominent tested one-click client configurations found |
| Marketplace distribution | Identified as a future direction, not an active channel |

The production trust response also reported 457 stale projects, or 45.3% of the corpus. Trust is still sufficient for current use because the release gates pass and high-confidence paths disclose provenance, but freshness remains a material retention risk.

## Problem Statement

Git.Top currently optimizes the middle of the adoption funnel while leaving the top and bottom weak.

```text
Discovery
  -> Installation
  -> Successful initialization
  -> First useful project decision
  -> Repeated workflow use
  -> Integration into another product or agent
```

The existing implementation is strongest at the fourth step. An agent that already knows the endpoint and contract can obtain structured, evidence-backed results. The main gaps are:

- Few external surfaces tell agents that Git.Top exists.
- The README and quickstart do not lead with a tested client installation.
- Twenty-one tools create avoidable selection and context overhead for first-time use.
- Contract tests do not prove compatibility with real agent clients.
- There is no reliable adoption funnel or retention signal.
- Corpus synchronization is not yet prioritized by observed product demand.

## Product Positioning

Git.Top should use one concrete job-to-be-done in all distribution material:

> Find, evaluate, compare, and cite open-source projects before adding a dependency or recommending a stack.

The short description should emphasize the decision produced, not the number of protocols or endpoints:

> Git.Top gives AI agents evidence-backed open-source project search, recommendations, alternatives, and comparisons through MCP and REST.

The following claims should remain secondary proof points:

- D1-backed provenance and fail-closed `require_d1` behavior.
- Normalized evidence, caveats, and verification timestamps.
- Public quality and trust benchmarks.
- Change feeds and feedback governance.
- Graph and GRP reasoning.

## Goals

### North Star

Weekly successful high-value agent workflows.

A high-value workflow is one of:

- a successful `get_agent_workflow` call;
- a recommendation followed by project inspection or comparison;
- a project inspection followed by alternatives or comparison;
- a successful GRP plan, compare, find, or compose result.

This metric is preferable to raw request count because health checks, discovery fetches, retries, crawlers, and monitoring traffic do not prove product value.

### Initial 30-Day Targets

Targets should be reset after the first two weeks of real telemetry.

Current stage decision (2026-07-31): treat two dated, production-verified clients as the initial compatibility target. The original five-client target is deferred to a later distribution expansion phase and remains a useful scale goal, not a blocker for this stage.

| Metric | Initial target |
| --- | ---: |
| Successful MCP initializations | 100 |
| First high-value tool calls | 50 |
| Weekly successful high-value workflows | 25 |
| Documented real-client integrations | 2 for the current stage; 5 deferred |
| Initialization-to-first-value conversion | at least 50% |
| High-value tool success rate | at least 98% |
| High-value tool p95 latency | establish baseline, then set SLO |
| Hot-project freshness | at least 95% within the chosen freshness window |

These are learning targets for a zero-adoption baseline, not long-term scale targets.

Initialization-to-first-value conversion remains gated on session-safe correlation. Until that exists, operational summaries may report `firstValueCallsPerInitialization` as a call-volume ratio, but must not label it as conversion or cap it at 100%.

## Product Principles

1. Lead with installation and first value, not architecture.
2. Keep the full expert surface, but make the default surface small.
3. Measure task completion rather than traffic volume.
4. Do not collect prompts, tool arguments, results, raw IP addresses, or repository-selection details for growth analytics.
5. Validate with real clients in addition to mocked protocol tests.
6. Preserve `metadata.source`, `metadata.reason`, `require_d1`, evidence, caveats, and trust fields on every agent-facing path.
7. Use actual demand to prioritize freshness and product work.
8. Keep the Cloudflare Worker as the only runtime surface.

## Workstream 1: One-Minute Connection Path

Priority: P0

### Product Changes

- Add a public `/connect` page as the canonical installation surface.
- Put the production MCP endpoint and no-auth policy in the first README viewport.
- Add tested configuration blocks for the major supported agent clients.
- Add copy controls for endpoint URLs and configuration snippets.
- Show a single verification prompt after installation.
- Link `/connect` from the homepage, `/integrations`, `/mcp`, `/quickstart`, README, `llms.txt`, and well-known discovery documents where appropriate.

The first-time path should fit in three steps:

1. Select an agent client.
2. Add the generated configuration.
3. Ask the agent to find and compare projects for a concrete task.

### Documentation Contract

Every client configuration must state:

- client name and tested version;
- configuration location and transport mode;
- endpoint profile: core or full;
- whether authentication is required;
- the exact verification prompt;
- last verified date;
- known limitations.

Configurations should be copied from current official client documentation and then verified against production. Unverified snippets must not be presented as supported integrations.

### Acceptance Criteria

- A new user can reach a successful Git.Top tool call in under one minute without reading the API guide.
- At least two client integrations pass a documented production smoke test for the current stage. The five-client expansion target is tracked separately.
- README presents installation before the long documentation index.
- Broken configuration examples fail a repeatable validation or review process.

## Workstream 2: Core and Full MCP Profiles

Priority: P0

### Rationale

The complete 21-tool surface is valuable for expert workflows, but it is larger than most agents need for initial project selection. Large tool lists increase schema tokens, tool-selection ambiguity, and compatibility risk.

### Proposed Surface

Keep the current endpoint as the backward-compatible full surface:

```text
https://git.top/mcp
```

Add a smaller default endpoint:

```text
https://git.top/mcp/core
```

The initial core profile should expose only:

- `search_projects`
- `get_project`
- `recommend_project`
- `compare_projects`
- `get_agent_workflow`

The exact set should be confirmed through real-client task evaluation. Alternatives can be added only if testing shows that agents cannot reliably reach them through the workflow tool.

### Contract Rules

- Core and full endpoints must use the same tool implementation and response contracts.
- Core is a discovery filter, not a separate behavior implementation.
- Strict D1 and trust behavior must remain identical.
- Both profiles must be represented in discovery documents and client examples.
- Existing `/mcp` clients must remain compatible.

### Acceptance Criteria

- Core profile tool definitions use substantially fewer schema tokens than the full profile.
- Core passes the existing MCP validation applicable to its advertised tools.
- Real-agent task completion is equal to or better than the full surface for common search and selection tasks.
- No behavior forks are introduced between shared tools.

## Workstream 3: Privacy-Preserving Adoption Analytics

Priority: P0

### Events

Add aggregated product events for:

- `mcp_initialize`
- `mcp_tools_list`
- `mcp_tool_call_completed`
- `rest_agent_call_completed`
- `connect_page_view`
- `connect_config_copy`
- `workflow_completed`

Useful dimensions include:

- UTC day and hour bucket;
- endpoint profile: core or full;
- client name and version from standard protocol metadata when provided;
- tool name;
- result class: success, client error, strict-source rejection, not found, stale cursor, or server error;
- D1 or seed source;
- latency bucket;
- response-size bucket;
- distribution source when an explicit campaign parameter is present.

### Privacy Boundary

Do not record:

- query strings or natural-language goals;
- MCP arguments or result payloads;
- selected repository identifiers;
- raw IP addresses;
- authorization headers;
- cookies;
- full user-agent strings when a normalized client identity is sufficient.

Do not create a fingerprint from IP address, user agent, or Cloudflare request metadata. If per-install retention becomes necessary later, use an explicit optional opaque installation identifier with a documented retention policy.

### Storage

Use an analytics-oriented store for high-volume events. D1 should retain only bounded daily aggregates or governance summaries when required by product reporting. Product request logging must not threaten the knowledge database quota or write path.

### Dashboard Funnel

Report at least:

```text
connect page or registry source
  -> successful MCP initialize
  -> tools/list
  -> first successful high-value call
  -> completed high-value workflow
```

Also report tool error rate, p50/p95 latency, source fallback rate, and client compatibility failures.

### Acceptance Criteria

- The team can answer which clients initialize successfully and which tools produce first value.
- Analytics do not contain prompts, arguments, results, raw IPs, or repository choices.
- Analytics failure cannot break an API or MCP response.
- Event volume cannot exhaust the primary D1 database.

## Workstream 4: External Distribution

Priority: P1

### Channels

Distribute one canonical remote MCP endpoint and one canonical product description through:

- the official MCP registry or current canonical MCP discovery channel;
- maintained third-party MCP catalogs selected for real traffic and update quality;
- supported agent-client integration directories;
- GitHub topics, releases, and repository social preview;
- an installable Agent Skill for agents that can use skills but not remote MCP;
- reference integrations with agent frameworks and developer tools;
- technical examples tied to high-intent user tasks.

Registry submissions must be treated as versioned product artifacts. Each listing should be audited after material tool, endpoint, authentication, or trust-contract changes.

### Distribution Package

Prepare one reusable package containing:

- one-sentence value proposition;
- production endpoint;
- core and full profile explanation;
- authentication policy;
- three example tasks;
- trust and privacy summary;
- client screenshots or terminal proof;
- public benchmark link;
- support and issue links;
- last verified date.

### Reference Integration Strategy

Prioritize integrations that place Git.Top at the dependency-selection moment. Examples:

- a coding agent checks Git.Top before adding an unfamiliar dependency;
- a planning agent compares open-source stack choices before implementation;
- an architecture agent verifies deployment and maintenance caveats;
- a research agent cites alternatives and evidence in a recommendation.

Five working integrations are more valuable than dozens of directory listings with no verified calls.

### Acceptance Criteria

- Git.Top is discoverable from at least three maintained external agent channels.
- Every listing points to the canonical `/connect` page and production endpoint.
- Distribution sources are distinguishable through explicit, privacy-safe campaign metadata.
- At least five external integration examples complete a real high-value workflow.

Implementation status (2026-07-31, updated 2026-08-01): the reusable distribution package, installable Skill, campaign-attributed `/connect` links, and production/real-client evidence are prepared and validated. The package records the Claude Code 2.1.220 and Codex CLI 0.145.0 production E2E results plus the compact GRP proof. The official Registry `distribution/server.json` artifact and an authorization-aware publication runbook are also prepared and validated; the artifact passed the official online validation endpoint with `mcp-publisher` 1.8.0. The current package and two-client compatibility matrix were initially deployed in Worker version `07262755-ac72-40f7-89c6-39278f36b036`; the post-deploy smoke suite passed with five core tools, 21 full tools, D1 provenance, Trust Gate `allow`, and both client rows supported. The authorized publisher then published `io.github.haocn-ops/git-top` version `0.1.0` to the official MCP Registry at `2026-07-31T14:33:59.531212Z`; an independent Registry API read-back confirmed status `active`, `isLatest=true`, and the expected core endpoint, repository, and attributed connection page. Worker version `0333aa8e-666c-4a46-b70b-51f4cfeac593` exposed that audited `active` status in `/distribution.json`, and the final production smoke suite passed. Smithery and Glama were selected as the next two maintained remote-capable channels, with separate attribution links and URL-submission metadata prepared. Smithery was publicly listed at `https://smithery.ai/servers/izhenghaocn/git-top`; its deployment probe returned `SUCCESS`, discovered five tools, and identified `git-top` version `0.1.0`. Glama's initial submission returned `A server with this URL already exists.`, and Safari verification on 2026-08-01 found the public connector at `https://glama.ai/mcp/connectors/io.github.haocn-ops/git-top` plus the server listing at `https://glama.ai/mcp/servers/haocn-ops/git-top`. Glama reported `Healthy`, Streamable HTTP, the expected core endpoint, and five available tools. The distribution state is now `live`: the official Registry, Smithery, and Glama are verified live, while client directories remain `prepared_not_submitted`. Worker version `b9b868d8-86fb-4a79-9ec7-9956940f5e96` exposes the confirmed Glama listing state in production; the production smoke suite passed with D1 provenance, Trust Gate `allow`, five core tools, 21 full tools, and two supported clients. The installable Skill was published to GitHub `main` in commit `0fefc63` and its raw URL returned HTTP 200 on 2026-08-01. The three-maintained-channel acceptance criterion is complete; GitHub Release publication and client-directory submissions remain separate follow-up work.

Analytics follow-up (2026-07-31): the optional Analytics Engine writer now has a fixed-field, bounded SQL export command (`pnpm adoption:export`) that feeds the existing privacy-safe summary script. It requires explicit read-scoped operator credentials, caps the window at 720 hours and the export at 10,000 rows, rejects arbitrary SQL, and does not add a public analytics route.

## Workstream 5: Real-Client Compatibility and Task Evaluation

Priority: P1

### Compatibility Matrix

Create a generated or regularly reviewed compatibility report with one row per supported client:

| Field | Meaning |
| --- | --- |
| Client | Product and version |
| Transport | Actual MCP transport used |
| Initialize | Pass or fail |
| Tool discovery | Core/full tool count and schema result |
| First call | Verification task result |
| Multi-tool workflow | Recommendation to inspection or comparison |
| Error behavior | Strict D1, not found, and invalid input handling |
| Last verified | Verification date |
| Known limitation | Client-specific issue |

### Real-Agent Tasks

At minimum, run these tasks against each supported client:

1. Find three open-source browser-agent projects and explain the evidence.
2. Compare two named projects for a deployment target.
3. Recommend a Cloudflare-ready agent framework with `require_d1` semantics.
4. Inspect one project, find alternatives, and state caveats.
5. Recover cleanly from an unknown project and an invalid limit.

Evaluate whether the agent:

- selected the intended tool;
- parsed JSON-in-text MCP content correctly;
- inspected source and trust metadata;
- avoided presenting seed fallback as production truth;
- preserved evidence and caveats in the final answer;
- completed the task without unnecessary tool loops.

### Acceptance Criteria

- Contract tests and real-client tests are reported separately.
- A client is called supported only after initialize, discovery, first-call, and multi-tool checks pass.
- Core versus full task-success and tool-loop counts are compared.
- Compatibility regressions are visible before registry listings are updated.

Implementation update (2026-07-31): the first real-client core and full runs identified two concrete client-cost issues. The top-level composed schema used by `get_project` was simplified for broad client discovery, and the 21-tool full-profile GRP run exposed a roughly 101 KB JSON-RPC response for the recorded compose task. Git.Top now defaults MCP `git_top_grp_query` to a bounded `compact` response while retaining `profile: "full"`; REST `/api/grp/query` is unchanged. Contract validation caps compact output below 32 KiB and verifies evidence, caveats, confidence, D1 provenance, full-structure opt-in, and `-32602` for an invalid profile.

Production verification completed in Worker version `78773e20-b9f5-4e76-ad07-406264ee0f0b`. The direct compact response was 31,673 JSON-RPC bytes versus the 101,284-byte baseline, preserved D1 provenance and decision fields, and avoided changing the full REST contract. Claude Code 2.1.220 repeated the full-endpoint workflow in 6 turns and 53.615 seconds; the GRP call completed in 854 ms without externalizing the result, compared with a 110.9 KB persisted baseline result and roughly 14.1 seconds of tool dispatch. It correctly handled Trust Gate `allow`, D1 source, `-32005`, and `-32602`. Cost and cache tokens increased in the independent rerun, so no cost or token reduction is claimed; the production-verified gains are bounded response size, removal of result externalization, lower GRP tool dispatch time, and preserved task correctness.

Codex CLI 0.145.0 subsequently completed the production core-profile workflow in one non-interactive turn. It discovered the five core tools, ran `recommend_project` and `compare_projects` with D1 provenance and evidence/caveat fields intact, and recovered from `-32005` and `-32602`. The run established a client-specific setup requirement: non-interactive `codex exec` must use the narrow per-server `default_tools_approval_mode="approve"` setting for the five allow-listed read-only core tools; the default tool-approval behavior cancelled calls before execution. Codex CLI and Claude Code now satisfy the two-client target for this stage; the deferred five-client expansion remains a later distribution milestone.

## Workstream 6: Demand-Driven Freshness

Priority: P1

### Rationale

Freshness is a product retention issue. An agent will not repeatedly use a recommendation source if high-visibility results contain stale repository data, even when the response schema is correct.

### Policy

Create a hot-project sync tier based on privacy-safe aggregate demand:

- frequently returned projects;
- frequently inspected projects, only when repository-level measurement is explicitly approved and documented;
- projects used in public examples and evals;
- projects with high search visibility;
- projects with recent upstream release activity;
- projects involved in stale or low-confidence review items.

If repository-level usage measurement is not approved, prioritize using result rank exposure, public examples, eval membership, and upstream activity rather than user-specific query data.

Suggested service levels:

| Tier | Target |
| --- | --- |
| Hot projects | refreshed within 24 hours |
| Active projects | refreshed within 72 hours |
| Long-tail projects | refreshed within 7 days |
| Archived or unavailable projects | verified through scheduled lifecycle checks |

These windows should be tested against GitHub API budgets and Worker subrequest limits before becoming commitments.

### Acceptance Criteria

- At least 95% of hot projects meet the selected freshness window.
- Trust Gate separately reports hot-project and whole-corpus freshness.
- Demand-driven scheduling cannot starve the long-tail cursor.
- Sync failures remain visible through existing governance and status surfaces.

Implementation status (2026-07-31): implemented and deployed in Worker version `0ec08283-baeb-42a1-8cbc-4be5ae83fa48`. The selected production window remains 48 hours after the earlier capacity review. `/api/sync/status` and the Trust Gate expose a structured 95% hot-project SLO plus whole-corpus tier-policy compliance; scheduled refresh preserves cursor capacity, and failures remain visible in sync and governance history. The post-deploy snapshot reported 117 of 118 hot projects within target (99.2%), 549 of 1,010 whole-corpus projects within their tier target (54.4%), feasible modeled capacity with 173 daily refresh slots of headroom, and Trust Gate `allow`.

## Workstream 7: High-Intent Examples and Content

Priority: P2

Create ten examples that begin with a user decision rather than an endpoint:

- choose an agent framework for Cloudflare Workers;
- compare two coding agents;
- find a maintained alternative to an archived project;
- select a local LLM runtime;
- choose an MCP server for GitHub automation;
- compare vector databases for a constrained deployment;
- assemble a RAG stack with observability;
- identify collection repositories versus executable projects;
- check an unfamiliar dependency before adding it;
- produce a recommendation with citable trust evidence.

Each example should include:

- the user request;
- the shortest REST and MCP path;
- the expected structured fields;
- an example final answer with evidence and caveats;
- the test or production snapshot used for verification;
- a clear next action.

Examples should be reusable in registry listings, client verification prompts, posts, documentation, and evaluation cases.

Implementation status (2026-07-31): implemented and deployed in Worker version `0ec08283-baeb-42a1-8cbc-4be5ae83fa48`. `/api/examples` publishes ten decision-first examples through the shared Worker surface, with matching human-readable content on `/examples`, OpenAPI coverage, Agent Map discovery, local D1 verification snapshots, and production smoke assertions. The examples cover all ten decisions above and remain reusable through `src/decision-examples.ts` rather than duplicated page-only prose.

## 30-Day Execution Plan

### Week 1: Measure and Connect

- Define event names, privacy policy, and analytics storage.
- Implement non-blocking aggregate instrumentation.
- Add `/connect` with the first two verified client configurations.
- Rewrite the README first viewport around installation and first value.
- Define the real-client compatibility template.

Exit criteria:

- Production calls generate privacy-safe aggregate metrics.
- Two clients can reach a verified first useful call from `/connect`.

### Week 2: Reduce First-Use Complexity

- Implement `/mcp/core` as a filtered view over shared tool definitions.
- Add core/full discovery metadata.
- Validate core and full behavior.
- Complete two real-client compatibility checks for the current stage; keep the five-client expansion as a deferred milestone.
- Establish latency and error baselines.

Exit criteria:

- Core completes common tasks with no lower success rate than full.
- Two supported clients have dated evidence.

### Week 3: Distribute

- Prepare the reusable distribution package.
- Submit to the canonical MCP registry and selected maintained catalogs.
- Publish an Agent Skill or equivalent non-MCP integration package.
- Publish the first five high-intent examples.
- Add explicit campaign-source attribution to distribution links.

Exit criteria:

- At least three external discovery channels are live.
- The adoption funnel identifies traffic and successful calls from those channels.

### Week 4: Learn and Correct

- Review activation, error, latency, and high-value workflow metrics.
- Fix the highest-volume client or contract failure.
- Publish the remaining five high-intent examples.
- Start hot-project sync prioritization.
- Revisit 30-day targets using observed data.

Exit criteria:

- The team can identify the strongest source, client, task, and primary failure mode.
- The next month is based on observed adoption rather than assumed feature demand.

## 60- and 90-Day Direction

### Days 31-60

- Convert successful examples into reusable framework integrations.
- Improve onboarding based on measured drop-off.
- Add session-safe workflow measurement if supported without fingerprinting.
- Publish a public compatibility status page.
- Improve top stale projects and measure whether successful workflow use grows.
- Decide whether a small generated TypeScript or Python client materially improves non-MCP adoption.

### Days 61-90

- Choose one product wedge using observed usage: public higher limits, private indexing, team selection reports, or marketplace distribution services.
- Introduce API keys or accounts only if rate control, retention measurement, or a selected paid workflow requires them.
- Establish an external contributor path for corrections and integration examples.
- Set durable SLOs for high-value tools using measured latency and availability.
- Replace launch targets with cohort and retention targets supported by real data.

## Metrics Definitions

| Metric | Definition |
| --- | --- |
| Successful initialization | A valid MCP initialize response completed without a server error |
| First value | The first successful high-value tool call after initialization where a session can be observed safely |
| High-value workflow | A workflow, recommendation-plus-decision, project-plus-alternative/compare, or GRP completion |
| Activation conversion | First-value sessions divided by successful initialization sessions |
| Tool success rate | Successful tool completions divided by all non-cancelled tool calls |
| Strict-source rejection rate | `require_d1` failures divided by strict-source calls |
| Fallback rate | Seed-backed successful calls divided by successful agent calls |
| Client compatibility rate | Supported client/version rows passing all required checks |
| Hot freshness rate | Hot projects inside the target window divided by all hot projects |
| Weekly workflow volume | Successful high-value workflows completed in a UTC week |

Unique-user or returning-install metrics must not be claimed until Git.Top has an explicit, privacy-reviewed identity mechanism. Requests, IP hashes, or user-agent fingerprints are not substitutes for users.

## Risks and Mitigations

### Registry Traffic Without Activation

Risk: directory listings generate visits but no successful calls.

Mitigation: point every listing to `/connect`, provide a verification task, and measure the full funnel.

### Core Profile Behavior Drift

Risk: core and full endpoints diverge.

Mitigation: share implementations and filter only tool discovery. Run the same contract cases for shared tools.

### Analytics Becoming a Privacy or Reliability Risk

Risk: product analytics captures sensitive requests or blocks the main response path.

Mitigation: collect only bounded metadata, use non-blocking writes, aggregate early, and exclude prompts, arguments, results, repositories, and raw network identity.

### Client Documentation Drift

Risk: client configuration formats change.

Mitigation: version the compatibility matrix, record tested client versions, and remove support claims when verification expires.

### Freshness Work Starves Coverage

Risk: demand-driven sync repeatedly refreshes popular projects while the long tail expires.

Mitigation: reserve cursor capacity for long-tail coverage and report both hot and total freshness.

### Premature Monetization

Risk: accounts, quotas, and billing slow adoption before repeated value is proven.

Mitigation: select a commercial wedge only after observing real workflows. Keep public read-only access frictionless during the adoption phase.

## Non-Goals for This Stage

- Adding a separate application runtime.
- Expanding the MCP surface only to increase tool count.
- Replacing existing REST, MCP, GRP, or OpenAPI contracts.
- Adding accounts or billing before a product need is demonstrated.
- Capturing user prompts or tool payloads for growth analytics.
- Treating raw request volume, corpus size, or registry listing count as product success.
- Broad corpus expansion before freshness and demand signals are under control.

## Implementation Map

Likely ownership areas for the first implementation pass:

- `src/index.ts`: `/connect`, `/mcp/core`, discovery routes, and analytics hooks.
- `src/mcp.ts`: shared core/full tool filtering and tool-call outcome classification.
- `src/site.ts`: machine discovery and public policy text.
- `src/integrations-page.ts`: verified client integration entry points.
- `src/agent-map.ts`: core/full profile discovery and trust fields.
- `src/openapi.ts`: only if new REST analytics or connection metadata becomes public.
- `scripts/validate-mcp-tools.mjs`: core/full conformance assertions.
- `scripts/smoke-prod.mjs`: production core-profile and connection-route smoke tests.
- `docs/AGENT_QUICKSTART.md`: installation-first quickstart.
- `docs/MCP.md`: core/full profile contract.
- `README.md`: first-viewport installation and first-value path.

Instrumentation should live in a small dedicated module rather than spreading storage details through route handlers. It must remain optional and non-blocking so analytics availability never changes product correctness.

## Completion Definition

This adoption pass is complete when:

- a new user can connect a supported agent and complete a useful call in under one minute;
- at least two real clients have dated compatibility evidence for the current stage (five remains a deferred expansion target);
- the core MCP profile is available without breaking the full surface;
- at least three maintained external discovery channels are live;
- privacy-safe analytics measure initialization, first value, workflows, errors, and latency;
- high-value workflow volume, not request count, drives product decisions;
- hot-project freshness has a measurable service level;
- the next roadmap is based on observed client, channel, and task behavior.
