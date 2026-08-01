---
name: git-top-project-selection
description: Use Git.Top to find, inspect, recommend, compare, and cite open-source projects with provenance and caveats. Use when choosing a dependency or stack, checking an unfamiliar repository, finding maintained alternatives, comparing named projects, or producing an evidence-backed architecture recommendation through Git.Top REST or MCP.
---

# Git.Top Project Selection

Use Git.Top as a public, no-auth project-intelligence source. Prefer the production REST API when MCP is unavailable; use the five-tool core MCP profile when it is connected.

## Decision Workflow

1. Classify the request as discovery, known-project inspection, recommendation, alternatives, comparison, or guided workflow.
2. Check `https://git.top/api/trust` before making a high-confidence production recommendation.
3. Choose the shortest path:
   - Discovery: `GET /api/search`
   - Known project: `GET /api/project/{owner}/{repo}`
   - Constrained recommendation: `POST /api/recommend`
   - Known replacement target: `GET /api/alternatives/{project}`
   - Named shortlist: `POST /api/compare`
   - Ambiguous or multi-step decision: `POST /api/workflow`
4. Add `require_d1=true` whenever seed fallback must fail closed.
5. Inspect the leading candidates before answering. Preserve `metadata.source`, evidence, confidence, caveats, and verification timestamps.
6. Compare at least two credible candidates when the user is making an adoption decision, unless only one candidate matches all hard constraints.

Read [references/api-contract.md](references/api-contract.md) when constructing REST requests, interpreting errors, or formatting a final answer.

## MCP Path

When Git.Top MCP is connected, prefer `https://git.top/mcp/core` and use only shared tool behavior:

1. Call `get_agent_workflow` for ambiguous or multi-step selection.
2. Call `search_projects` or `recommend_project` for candidate generation.
3. Call `get_project` before making factual claims about a candidate.
4. Call `compare_projects` before a final choice between named candidates.
5. Parse `result.content[0].text` as JSON before reading fields.

Use the full endpoint `https://git.top/mcp` only for alternatives, graph, score, quality, benchmark, governance, or GRP tools outside the core profile.

## Trust Rules

- Treat `metadata.source=d1` as the required source for high-confidence production claims.
- Treat `metadata.source=seed` as fallback evidence and disclose that limitation.
- Respect `/api/trust` decisions: answer directly on `allow`, disclose limitations on `caution`, and fail closed for high-confidence recommendations on `block`.
- Do not collapse quality score, Git.Top score, and data trust score into one claim.
- Treat collection repositories as resource hubs, not executable project replacements.
- Preserve `metadata.snapshot_id` across a multi-call decision. Restart dependent calls when the snapshot changes materially.

## Recovery

- On `d1_required`, stop the high-confidence path; do not silently retry without strict mode.
- On project not found, search for aliases or canonical `owner/repo` ids before concluding the project is absent.
- On stale cursor, restart the list request without the cursor.
- On weak or low-confidence matches, refine constraints or state that Git.Top did not produce a decision-quality result.

## Answer Contract

Return:

1. The recommended project or ordered shortlist.
2. Why each candidate matches the user's explicit constraints.
3. The strongest evidence and relevant confidence fields.
4. At least one material caveat per recommended candidate.
5. `metadata.source`, snapshot or verification time, and whether strict D1 mode was used.
6. A concrete next validation step such as checking deployment instructions, license terms, recent releases, or a proof of concept.

Never present a ranking as universal. Tie the decision to the requested deployment, language, license, maintenance, and operational constraints.
