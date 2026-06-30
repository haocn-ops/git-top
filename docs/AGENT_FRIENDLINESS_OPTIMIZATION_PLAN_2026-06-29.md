# Git.Top Agent Friendliness Optimization Plan

Date: 2026-06-29

## Goal

Make Git.Top easier for agents to enter, browse, trust, and consume as structured project knowledge.

## What is already done

Git.Top already has the core machine surfaces this direction needs:

- `GET /api/health`
- `GET /api/trust`
- `GET /api/agent-map`
- `GET /api/quickstart`
- `GET /mcp`
- `GET /openapi.json`
- `GET /llms.txt`
- `GET /llms-full.txt`
- project lookup, recommendation, compare, alternatives, graph, workflow, Atlas, quality, and GRP endpoints
- a stable `summary` contract on project lookup and MCP `get_project`

The remaining gap is not missing backend capability. The gap is browse ergonomics: the public entry surfaces still bias humans toward scores and broad navigation before giving agents the shortest path to trust, summary, and decision signals.

## Agent-entry test results

I walked the live site as a first-time agent and checked:

- `/`
- `/projects`
- `/api/agent-map`
- `/api/quickstart`
- `/api/health`
- `/api/trust`
- `/api/search`
- `/api/recommend`
- `/api/compare`
- `/api/alternatives`
- `/api/graph`
- `/mcp`
- `/llms.txt`

What worked well:

- `health` is D1-backed and fresh.
- `trust` explains when to disclose caveats.
- `agent-map` is the best machine-readable route map.
- `quickstart` already gives a short path from trust to workflow, search, project lookup, recommendation, comparison, MCP, and GRP.
- project lookup responses now expose a compact `summary` contract.

What still needs tightening:

- The homepage still reads a little like a broad sitemap.
- `/projects` still looks too much like a ranked list unless the Agent already knows what to search for.
- Search result cards still put score before meaning.
- Some recommendation and alternative paths are strong structurally, but browse users need earlier summary and trust cues.

## Product decision

Keep Git.Top as a single Worker-backed product surface, but make the public browse path more agent-native.

The next step is not more endpoints. It is:

1. Put trust, summary, and source earlier in the browse flow.
2. Make `/projects` the default browse entry for agents.
3. Reduce the amount of inferencing an agent must do before it can decide whether to click through.

## Priority 1

### Make `/projects` an actual agent browse surface

Required changes:

- Show `summary.tl_dr` at the top of each project card.
- Show `summary.install` or an equivalent install hint early.
- Show `summary.good_for` and `summary.not_good_for` before quality scores.
- Show source and trust cues near the search status line.
- Keep the current score fields, but move them lower in the card.

Why this matters:

- Agents should learn the project meaning before reading a score.
- Agents should know whether the result is D1-backed before they decide to trust the card.
- Agents should see where to go next without opening the project page.

## Priority 2

### Make homepage entry more agent-directed

Required changes:

- Add a compact agent-entry rail for `Quickstart`, `Agent Map`, and `Trust`.
- Keep the main hero readable, but reduce dependence on generic discovery copy.
- Make the knowledge preview explicitly show source and trust instead of only project meaning and relation hints.

Why this matters:

- The first viewport should tell an agent where to go first.
- The homepage should point to the shortest trust-first path instead of acting like a marketing landing page.

## Priority 3

### Surface summary on project detail pages earlier

Required changes:

- Add a visible summary block near the top of `/projects/:repo`.
- Put `tl_dr`, `install`, `good_for`, and `not_good_for` before the deeper evidence sections.
- Keep classification evidence, scores, and graph data available, but after the summary.

Why this matters:

- Project pages are the natural place to confirm a shortlist decision.
- The summary block turns the page into a decision surface instead of only a fact sheet.

## Priority 4

### Improve browse ranking and alternative quality later

Required changes:

- Add stronger intent weighting for broad browse queries.
- Distinguish same-use-case alternatives from same-deployment alternatives.
- Make replacement candidates easier to explain when semantic intent and deployment overlap diverge.

Why this matters:

- Some browse queries are still too generic and surface quality-heavy but semantically loose results.
- Alternatives should reflect why a project is a replacement, not just why it is nearby in the graph.

## Implementation order

1. Add `summary` to project view objects so all browse surfaces can read it consistently.
2. Update `/projects` cards to show summary, install, source, and trust before scores.
3. Add an agent-entry rail and trust cues to the homepage.
4. Add a project summary block to the project detail page.
5. Verify that search, recommendation, compare, and alternatives still render cleanly after the UI changes.

## Success criteria

- Agents can enter from `/`, `/projects`, `/mcp`, or `/api/agent-map` and immediately find the shortest path.
- Search results show meaning before score.
- Project detail pages show a summary before evidence.
- Trust and source are visible before high-confidence recommendations.
- The site remains responsive and readable on narrow screens.

## Current implementation status

Status: completed for this plan.

Implemented in this pass:

- `ProjectKnowledgeView` now carries a structured `summary`.
- `/projects` cards now show summary, install, source, and trust cues before the score block.
- The homepage now includes a compact agent-entry rail and a more explicit agent knowledge preview.
- Project detail pages now show a summary block above scores and evidence.
- Browse search now gives higher weight to identity, topic, use-case, summary, and description matches before quality score.
- Alternative matches now expose `replacement_type` and score same-use-case / intent overlap ahead of deployment-only adjacency.

Next iteration:

- Add source-backed package extraction for better install commands.
- Consider carrying the summary block into the recommendation and compare views if browse feedback still feels too score-centric.
- Expand replacement-type evaluation fixtures as the corpus grows beyond the current AI project set.

## Production agent-entry verification

Status: passed on production after deployment.

Deployment:

- Worker version: `889d4f84-750f-4b45-ae25-4df07e48144c`
- Production domain: `https://git.top`
- Data source: D1

Checked entry paths:

- `/` exposes the agent-entry rail for `Quickstart`, `Agent Map`, and `Trust`.
- `/projects` exposes summary, install, trust, and good-for / not-good-for fields before score details.
- `/projects/cloudflare/agents` exposes an `Agent summary` block before evidence and score sections.
- `/api/project/cloudflare/agents` returns `summary` with `tl_dr`, `purpose`, `install`, `inputs`, `outputs`, `good_for`, `not_good_for`, `deployment`, and `alternatives`.
- `/api/search?q=memory&ranking=browse&limit=3` returns D1-backed summary-first project records.
- `/api/alternatives/mem0ai/mem0` returns enriched matches with `replacement_type` and `match_signals.intent_overlap`.
- `/api/trust`, `/quickstart`, `/recipes`, `/examples`, `/journeys`, MCP discovery, MCP `get_project`, canonical redirects, and SEO checks pass through the production smoke suite.

Observed production status:

- `health`: D1 available, 501 raw projects, 501 knowledge-ready projects.
- `sync_health`: healthy.
- `sync_freshness`: fresh.
- `trust_page`: decision is currently `caution`; production-ready is false because trust checks still report residual quality/governance risk.
- `smoke:prod`: passed.

Agent-facing optimization suggestions:

- Promote `/api/quickstart`, `/api/agent-map`, `/api/trust`, and `/api/schema/project.v2` together as the canonical first-call sequence for agents.
- Add source-backed install extraction from package registries so `summary.install` can move beyond conservative repository-instruction hints.
- Add the same summary-first block to recommendation and compare pages if agent browse feedback remains too score-centric.
- Add evaluation fixtures for `replacement_type` so same-use-case alternatives stay ahead of ecosystem-adjacent matches as the corpus grows.
- Keep tuning only the two residual top-1 search misses (`search-prompt-tooling`, `search-coding-agent`) if exact first-result precision becomes more important than current top-3 coverage.
