# Git.Top 2.0 Product Upgrade Plan

## Positioning

Git.Top should evolve from a GitHub project navigation site into:

**The Knowledge Graph of Open Source**

GitHub provides code. Git.Top provides knowledge.

Users go to GitHub to inspect code, star repositories, and fork projects. Users should go to Git.Top to understand projects, find alternatives, compare options, analyze ecosystems, inspect dependencies, and discover technical trends. Agents should use Git.Top to retrieve structured project knowledge, project relationships, scores, and recommendations.

## Product Principles

- Lead with understanding, not repository lists.
- Treat relationships as first-class product data.
- Prefer structured, agent-readable outputs over decorative UI.
- Rank projects by fit, quality, maintainability, deployability, and agent readability, not stars alone.
- Make every public page useful to both humans and agents through clear HTML and matching JSON/API entry points.

## Phase 1: Homepage And Entry Points

Goal: A first-time visitor should understand Git.Top's value within one screen.

Homepage entry modules:

- Discover: hot project categories such as AI Agents, MCP Servers, RAG, Browser Automation, and AI IDE.
- Compare: project comparisons such as LangChain vs LlamaIndex, Browser Use vs Playwright, Dify vs Langflow, and OpenAI Agents SDK vs Vercel AI SDK.
- Alternatives: replacement discovery such as Claude Code Alternatives, Cursor Alternatives, Dify Alternatives, LangChain Alternatives, and OpenAI Alternatives.
- Ecosystems: ecosystem exploration such as Cloudflare, AI Agent, MCP, RAG, and Browser AI.

Acceptance criteria:

- The hero states "The Knowledge Graph of Open Source".
- The homepage exposes Discover, Compare, Alternatives, and Ecosystems as primary action modules.
- Every entry either links to an HTML page or a useful JSON/API result.
- The homepage explains that Git.Top provides project meaning, alternatives, dependencies, ecosystems, scores, and agent-readable recommendations.

Status:

- Initial homepage restructuring is implemented in the Worker home surface.
- Homepage primary modules are implemented for Discover, Compare, Alternatives, and Ecosystems.
- Browser Automation and AI IDE discovery now have SEO-friendly topic pages instead of API-only homepage links.
- Trends is implemented at `/trends` and `/api/trends` to expose corpus-level category, deployment, language, and rising-project signals.
- Compare pages and APIs include summary, stats, decision matrix, winner reasoning, and next-action links for shortlist decisions.
- Remaining work: continue adding topic pages when new high-value discovery intents emerge.

## Phase 2: Project Knowledge Graph

Goal: Make project relationship pages the core Git.Top moat.

URL pattern:

- `/graph/:project`
- Examples: `/graph/cloudflare-agents`, `/graph/cloudflare/agents`

Page sections:

- Project overview: description, maintainer, license, language, recent activity.
- Alternatives: comparable projects.
- Related projects: adjacent projects in the same category, use case, or ecosystem.
- Dependencies: inferred dependencies and protocols.
- Deployment targets: Cloudflare Workers, Vercel, Railway, Fly.io, Kubernetes, local, Docker, and other supported targets.
- Graph visualization: Project -> Related -> Alternatives -> Dependencies.

Implementation guidance:

- Current graph pages can continue with lightweight HTML/SVG-style visualization.
- Use React Flow or Cytoscape once the graph interaction model becomes dense enough to justify a client-side graph library.

Acceptance criteria:

- A project graph page has project context and at least three relationship groups.
- Graph JSON and HTML page describe the same underlying relationship model.
- The page links back to project detail, alternatives, and compare views.

Status:

- Project graph pages are implemented on the Worker surface at `/graph/:project` with project context, deployment targets, dependencies, related projects, alternatives, and a lightweight graph visualization.
- Graph APIs expose `summary`, `graph_stats`, `next_actions`, `relationship_groups`, `nodes`, and `edges` so agents can consume the same relationship model as the HTML page.
- Graph pages now expose relationship filters, a relationship legend, and recommended exploration paths into Recommendations, Atlas, Compare, Score, and Graph JSON.
- Remaining work: introduce a client-side graph library only when relationship density requires richer interaction.

## Phase 3: Alternatives Engine

Goal: Build the strongest SEO and decision-support entry point.

URL pattern:

- `/alternatives/:project`
- Examples: `/alternatives/claude-code`, `/alternatives/langchain-ai/langchain`

Page sections:

- Source project overview.
- Alternatives list.
- Comparison table with project, stars, language, deployment, quality score, and agent score.
- Use cases: best-fit and poor-fit contexts.
- API link for agent consumption.

Generation signals:

- Explicit alternatives from Agent Cards.
- GitHub topics.
- README and description text.
- Inferred dependencies.
- Deployment overlap.
- AI embedding similarity when vector infrastructure is available.

Acceptance criteria:

- `/alternatives/:project` resolves both owner/repo and short slug forms where possible.
- The page produces a useful result even when explicit alternatives are missing by falling back to similarity-based alternatives.
- The sitemap includes high-value alternatives pages.
- Alternatives pages link to JSON and compare endpoints.

Status:

- Alternatives pages are implemented at `/alternatives` and `/alternatives/:project` with source context, comparison table, best-fit guidance, not-best-for guidance, and match cards.
- Alternatives APIs expose `summary`, `stats`, `next_actions`, `comparison_links`, `alternatives`, and `alternative_matches` so agents can move from replacement discovery into compare, graph, score, and recommendation flows.
- Alternatives matching uses explicit alternatives, category overlap, deployment overlap, use-case overlap, topic overlap, inferred dependency overlap, language fit, maintenance signals, and Cloudflare readiness.
- Alternative matches now include `fit_summary`, `adoption_notes`, and `replacement_risk` so users and agents can distinguish direct substitutes from adjacent options.

## Phase 4: Git.Top Score

Goal: Stop relying on GitHub stars as the primary quality proxy.

Score range:

- `0-100`

Score dimensions:

- Community: contributor activity and project attention.
- Maintenance: recent commits, releases, issue response, and recent push activity.
- Documentation: README and agent-card clarity.
- Stability: release cadence, issue load, and maturity signals.
- Adoption: ecosystem usage, stars, forks, and integrations.
- Agent Readability: structured summaries, use cases, not-good-for notes, dependencies, and deployment clarity.

Acceptance criteria:

- Project pages show a score and explain why that score exists.
- Score pages or sections break down dimensions rather than showing a black-box number.
- API responses expose the total score and score components.

Status:

- Project pages and score pages expose Git.Top Score, Agent Score, Quality Score, and weighted dimension breakdowns.
- Score APIs expose `dimensions`, `strongest_dimension`, `weakest_dimension`, `adoption_guidance`, `risk_flags`, `next_actions`, related scores, evidence, and links.
- Score APIs and pages now include `score_confidence`, an evidence checklist that tells agents whether the score is high-, medium-, or low-confidence for citation.
- Scores are positioned as decision support rather than a replacement for checking source metadata, confidence, license, and deployment fit.

## Phase 5: Atlas

Goal: Create an exploratory map for open-source ecosystems.

URL pattern:

- `/atlas`

Concept:

Atlas is like Google Maps for open-source projects.

Example ecosystems:

- Cloudflare: Agents, Workers, D1, R2, Durable Objects, AI Gateway.
- Agents: LangGraph, CrewAI, AutoGen, Mastra, OpenAI Agents SDK.
- RAG: LangChain, LlamaIndex, vector databases, document loaders, evaluation tools.

Acceptance criteria:

- Atlas starts with curated ecosystem maps before requiring a full graph database.
- Users can move from ecosystem to project page to graph page to alternatives page.
- The Atlas UI rewards exploration and increases session depth.

Status:

- Atlas Alpha is implemented with curated Cloudflare, AI Agent, MCP, RAG, and Browser AI ecosystems.
- Atlas Beta foundation is implemented with ecosystem stats, exploration paths, concept/project map nodes, and API responses that expose `stats`, `exploration_paths`, `map.nodes`, and `map.edges`.
- Atlas now exposes `exploration_journeys`, multi-step routes that move users and agents from discovery into recommendation, graph, alternatives, compare, score, and Agent Map surfaces.
- Atlas now exposes `comparison_paths`, ecosystem-specific candidate sets that link maps directly to Compare pages and `/api/compare` decision matrices.
- MCP `get_atlas` now exposes the same curated Atlas maps to agents, including ecosystem stats, map nodes, edges, representative projects, exploration paths, and journeys.
- Remaining work: add richer interactive graph controls once the Worker-only UI needs dense client-side exploration.

## Phase 6: Agent API

Goal: Make Git.Top a default structured knowledge source for agents.

Core endpoints:

- `GET /api/project/:name`
- `GET /api/recommend`
- `GET /api/workflow`
- `GET /api/alternatives/:project`
- `GET /api/graph/:project`
- `GET /api/compare`

Example project response:

```json
{
  "name": "cloudflare/agents",
  "description": "Build and deploy AI agents on Cloudflare",
  "alternatives": [],
  "dependencies": [],
  "related": [],
  "score": 82
}
```

Recommendation parameters:

- `deployment`
- `category`
- `license`
- `language`
- `cloudflare_ready`

Acceptance criteria:

- API docs explain the human page and agent endpoint pairs.
- MCP tools map cleanly to the same concepts.
- Responses include metadata, confidence, and data source information.

Status:

- Structured POST endpoints are implemented for project lookup, recommendation, compare, alternatives, related projects, score explanations, and graph retrieval.
- Recommendation Engine responses include confidence, constraints, ranking signals, tradeoffs, decision summaries, and next-action links into project, graph, alternatives, score, and compare flows.
- Recommendation results now include `fit_profile`, `adoption_plan`, and `risk_flags` so agents can turn ranked candidates into an actionable selection workflow.
- `/api/workflow` and MCP `get_agent_workflow` now expose an end-to-end agent selection path across health, trends, recommendations, graph, alternatives, score, compare, Agent Map, and trust policy.
- `/workflow` now gives the same workflow a human-readable Worker page with editable intent and constraint controls, visible recommended steps, shortlist, trend context, and trust policy.
- MCP discovery and tools expose the same concepts as REST, including trends via `get_trends`, with D1-required fail-closed options for production agents.
- `/api/agent-map` now exposes a machine-readable map from product concepts to human pages, REST endpoints, MCP tools, output fields, trust fields, and recommended use.
- `/topics/open-source-knowledge-graph-api` and `/topics/mcp-integration-guide` now explain the REST, MCP, OpenAPI, LLM discovery, output-field, and trust-field pairs for agent developers.

## Technical Architecture

Initial architecture:

```text
GitHub API
  -> ETL
  -> D1
  -> Graph Builder
  -> Knowledge Graph APIs and pages
```

Embedding inputs:

- README
- Repository description
- Topics
- Documentation
- Agent Card summaries

Graph storage:

- Initial: D1 relational tables and generated graph edges.
- Later: Neo4j or Kuzu if traversal complexity exceeds D1's practical shape.

## Three-Month Roadmap

Month 1:

- Homepage restructure.
- Alternatives pages.
- Compare pages.
- Project Score explanation.

Month 2:

- Graph visualization.
- Related projects.
- Dependency network.
- Atlas Alpha.

Month 3:

- Agent API refinement.
- Recommendation engine.
- Atlas Beta.
- MCP integration hardening.

## North Star

GitHub is the code layer.

Git.Top is the knowledge layer.

Agents should not need to understand millions of repositories directly. They should use Git.Top to retrieve project knowledge, relationships, recommendations, and scores.

**Git.Top = Open Source Knowledge Graph**
