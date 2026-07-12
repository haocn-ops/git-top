export interface AgentSurfaceMapEntry {
  concept: string;
  humanPage: string;
  rest: string[];
  mcpTools: string[];
  outputFields: string[];
  trustFields: string[];
  recommendedUse: string;
}

export interface AgentCoreSurface {
  concept: string;
  rest: string[];
  mcpTools: string[];
  inspect: string[];
  trustFields: string[];
  nextUse: string;
}

export interface AgentPathSurface {
  step: number;
  concept: string;
  rest: string[];
  mcpTools: string[];
  inspect: string[];
  trustFields: string[];
  useWhen: string;
}

export const agentSurfaceMap: AgentSurfaceMapEntry[] = [
  {
    concept: "Project knowledge",
    humanPage: "/projects/:owner/:repo",
    rest: ["GET /api/project/:owner/:repo", "GET /api/project/:project", "POST /api/project", "GET /api/projects", "POST /api/projects"],
    mcpTools: ["get_project", "get_project_card", "get_projects_batch"],
    outputFields: ["project", "knowledge", "related", "score", "quality_signal_confidence", "evidence", "caveats", "confidence_reason", "source_fields", "last_verified_at"],
    trustFields: ["metadata.source", "metadata.reason", "classification.*.confidence", "quality_signal_confidence", "evidence.source_fields", "caveats"],
    recommendedUse: "Fetch one repository before making a recommendation or citing project facts."
  },
  {
    concept: "Project change feed",
    humanPage: "/status",
    rest: ["GET /api/changes"],
    mcpTools: ["get_project_changes"],
    outputFields: ["changes", "changes[].cursor", "changes[].project_id", "changes[].change_type", "changes[].changed_fields", "changes[].tombstone", "page.next_cursor", "retention"],
    trustFields: ["metadata.source", "metadata.snapshot_id", "changes[].occurred_at", "retention.earliest_guaranteed_at"],
    recommendedUse: "Incrementally update an agent cache and remove deleted projects using explicit tombstones instead of re-fetching the whole corpus."
  },
  {
    concept: "Agent feedback proposals",
    humanPage: "/quality/review",
    rest: ["POST /api/feedback/proposals"],
    mcpTools: ["propose_project_feedback"],
    outputFields: ["proposal", "proposal.fingerprint", "persisted", "review_required", "mutation_policy"],
    trustFields: ["proposal.evidence", "proposal.source_agent", "proposal.source_url", "persisted", "review_required"],
    recommendedUse: "Submit evidence-backed corrections for review without allowing external agents to mutate trusted knowledge directly."
  },
  {
    concept: "Recommendations",
    humanPage: "/recommend",
    rest: ["GET /api/recommend", "POST /api/recommend"],
    mcpTools: ["recommend_project"],
    outputFields: ["recommendations", "recommendations[].decision_summary", "recommendations[].fit_profile", "recommendations[].adoption_plan", "recommendations[].risk_flags", "recommendations[].ranking_signals", "recommendations[].matched_constraints", "recommendations[].evidence", "recommendations[].caveats", "recommendations[].confidence_reason", "recommendations[].next_actions"],
    trustFields: ["metadata.source", "recommendations[].confidence", "recommendations[].confidence_reason", "recommendations[].unmatched_constraints", "recommendations[].risk_flags", "recommendations[].evidence.source_fields"],
    recommendedUse: "Choose candidates from use case, deployment, category, license, language, and Cloudflare-readiness constraints."
  },
  {
    concept: "Agent workflow",
    humanPage: "/workflow",
    rest: ["GET /api/workflow", "POST /api/workflow"],
    mcpTools: ["get_agent_workflow"],
    outputFields: ["summary", "recommended_sequence", "shortlist", "trend_context", "agent_map", "trust_policy"],
    trustFields: ["metadata.source", "shortlist[].confidence", "trust_policy.disclose_when", "trend_context.stats.project_count"],
    recommendedUse: "Start here when an agent needs a guided path from trend context to shortlist, graph, alternatives, score, compare, and trust checks."
  },
  {
    concept: "Agent quickstart",
    humanPage: "/quickstart",
    rest: ["GET /api/quickstart"],
    mcpTools: [],
    outputFields: ["production_endpoints", "steps", "steps[].command", "steps[].inspect", "output_pattern", "trust_policy"],
    trustFields: ["trust_policy", "steps[].inspect", "production_endpoints"],
    recommendedUse: "Use this as the shortest integration path from health checks to workflow, Atlas journeys, project lookup, recommendations, comparison, MCP, GRP, and trust checks."
  },
  {
    concept: "Agent recipes",
    humanPage: "/recipes",
    rest: ["GET /api/recipes"],
    mcpTools: [],
    outputFields: ["recipes", "recipes[].steps", "recipes[].steps[].command", "recipes[].trust_checks", "recipes[].outcome"],
    trustFields: ["recipes[].trust_checks", "recipes[].steps[].inspect"],
    recommendedUse: "Use recipes when an agent needs a repeatable workflow for choosing projects, finding alternatives, comparing shortlists, exploring ecosystems, mapping Atlas journeys to comparison paths, checking trust, or planning with GRP."
  },
  {
    concept: "API examples",
    humanPage: "/examples",
    rest: ["GET /api/examples"],
    mcpTools: [],
    outputFields: ["examples", "examples[].command", "examples[].inspect", "examples[].trust_checks", "trust_policy"],
    trustFields: ["examples[].trust_checks", "trust_policy", "examples[].inspect"],
    recommendedUse: "Use examples when an agent developer needs copyable REST, MCP, and GRP calls with the fields to inspect before citing results."
  },
  {
    concept: "API and MCP discovery",
    humanPage: "/topics/open-source-knowledge-graph-api",
    rest: ["GET /api/agent-map", "GET /openapi.json", "GET /mcp", "GET /llms.txt", "GET /llms-full.txt"],
    mcpTools: [],
    outputFields: ["surfaces", "openapi_url", "schema_url", "llms_url", "recommended_agent_flow", "trust_policy"],
    trustFields: ["trust_policy.high_confidence_source", "trust_policy.strict_mode", "surfaces[].trust_fields"],
    recommendedUse: "Use this discovery path before guessing routes or tool names; it links REST, MCP, OpenAPI, LLM discovery, output fields, and trust policy."
  },
  {
    concept: "Alternatives",
    humanPage: "/alternatives/:project",
    rest: ["GET /api/alternatives/:project", "POST /api/alternatives"],
    mcpTools: ["get_alternatives", "find_alternatives"],
    outputFields: ["summary", "stats", "alternative_matches", "alternative_matches[].fit_summary", "alternative_matches[].adoption_notes", "alternative_matches[].replacement_risk", "evidence", "caveats", "confidence_reason", "comparison_links", "next_actions"],
    trustFields: ["metadata.source", "evidence.source_fields", "caveats", "alternative_matches[].similarity_score", "alternative_matches[].match_signals", "alternative_matches[].evidence.source_fields", "alternative_matches[].replacement_risk"],
    recommendedUse: "Find replacement candidates and move into compare, graph, score, or recommendation flows."
  },
  {
    concept: "Project graph",
    humanPage: "/graph/:project",
    rest: ["GET /api/graph/:project", "GET /api/graph?repo=:project", "POST /api/graph"],
    mcpTools: ["get_project_graph"],
    outputFields: ["summary", "graph_stats", "relationship_groups", "nodes", "edges", "evidence", "caveats", "confidence_reason", "next_actions"],
    trustFields: ["metadata.source", "evidence.source_fields", "caveats", "graph_stats.relationship_counts", "relationship_groups"],
    recommendedUse: "Inspect related projects, alternatives, dependencies, deployment targets, and use cases as first-class graph edges."
  },
  {
    concept: "Comparison",
    humanPage: "/compare",
    rest: ["GET /api/compare", "POST /api/compare"],
    mcpTools: ["compare_projects"],
    outputFields: ["summary", "stats", "decision_matrix", "winner", "reasoning", "next_actions"],
    trustFields: ["metadata.source", "context.deployment", "decision_matrix[].tradeoffs"],
    recommendedUse: "Turn a shortlist into a decision matrix instead of ranking only by GitHub stars."
  },
  {
    concept: "Score explanation",
    humanPage: "/score/:project",
    rest: ["GET /api/score/:project", "POST /api/score"],
    mcpTools: ["get_quality_score"],
    outputFields: ["git_top_score", "dimensions", "strongest_dimension", "weakest_dimension", "adoption_guidance", "risk_flags", "score_confidence", "evidence", "caveats", "confidence_reason"],
    trustFields: ["metadata.source", "evidence", "evidence.source_fields", "related_scores", "score_confidence.level", "caveats"],
    recommendedUse: "Explain why a project scores well or poorly across community, maintenance, documentation, stability, adoption, and agent readability."
  },
  {
    concept: "Atlas ecosystem map",
    humanPage: "/atlas",
    rest: ["GET /api/atlas", "GET /api/atlas/:ecosystem"],
    mcpTools: ["get_atlas", "git_top_grp_query"],
    outputFields: ["ecosystems", "stats", "exploration_paths", "exploration_journeys", "comparison_paths", "map.nodes", "map.edges"],
    trustFields: ["metadata.source", "stats.project_count", "exploration_paths", "exploration_journeys", "comparison_paths"],
    recommendedUse: "Start from an ecosystem map before choosing a specific repository."
  },
  {
    concept: "Atlas journeys",
    humanPage: "/journeys",
    rest: ["GET /api/journeys"],
    mcpTools: ["get_atlas", "git_top_grp_query"],
    outputFields: ["journeys", "journeys[].steps", "comparison_paths", "stats", "metadata"],
    trustFields: ["metadata.source", "stats.ecosystem_count", "journeys[].ecosystem_id", "comparison_paths[].context"],
    recommendedUse: "Use this when an agent needs ordered ecosystem routes into recommendations, graph, alternatives, compare, score, and Agent Map surfaces."
  },
  {
    concept: "Open source trends",
    humanPage: "/trends",
    rest: ["GET /api/trends", "GET /api/trending"],
    mcpTools: ["get_trends"],
    outputFields: ["summary", "stats", "trend_signals", "categories", "deployments", "languages", "rising_projects", "agent_briefing"],
    trustFields: ["metadata.source", "stats.project_count", "rising_projects[].quality_signal_confidence"],
    recommendedUse: "Understand current corpus-level trends before choosing categories, deployment targets, or rising projects."
  },
  {
    concept: "Graph reasoning",
    humanPage: "/integrations",
    rest: ["POST /api/grp/query"],
    mcpTools: ["git_top_grp_query"],
    outputFields: ["solution_paths", "recommended_stack", "nodes", "edges", "explanation", "evidence", "caveats", "confidence_reason"],
    trustFields: ["metadata.data_source", "evidence.source_fields", "caveats", "source_fields"],
    recommendedUse: "Plan, compose, compare, or find project sets from a higher-level goal."
  },
  {
    concept: "Quality and coverage",
    humanPage: "/trust",
    rest: ["GET /api/trust", "GET /api/benchmark", "GET /api/quality", "GET /api/quality/review", "GET /api/health", "GET /api/sync/status"],
    mcpTools: ["get_trust_gate", "get_quality_report"],
    outputFields: ["decision", "production_ready", "checks", "agent_policy", "evaluation", "explanations", "releaseScore", "dataTrustScore", "riskLevel", "coverage", "issues"],
    trustFields: ["decision", "production_ready", "checks[].status", "evaluation.top3_hit_rate", "explanations.coverage", "metadata.source", "metadata.reason", "sync.freshness", "quality.risk_level"],
    recommendedUse: "Use the Trust Gate and public benchmark before high-confidence recommendations; they combine source, sync freshness, eval health, explanation coverage, release health, data trust, and risk."
  },
  {
    concept: "Product roadmap",
    humanPage: "/roadmap",
    rest: ["GET /api/roadmap"],
    mcpTools: [],
    outputFields: ["completion", "current_focus", "phases", "phases[].shipped", "phases[].next", "agent_use"],
    trustFields: ["phases[].status", "phases[].progress", "phases[].api_endpoints", "phases[].mcp_tools"],
    recommendedUse: "Understand which Git.Top 2.0 surfaces are implemented, active, or still being deepened before choosing an integration path."
  }
];

export const agentCoreSurfaces: AgentCoreSurface[] = [
  {
    concept: "Trust preflight",
    rest: ["GET /api/health", "GET /api/trust"],
    mcpTools: ["get_trust_gate", "get_quality_report"],
    inspect: ["db=available", "metadata.source=d1", "sync_freshness", "decision", "production_ready"],
    trustFields: ["metadata.source", "metadata.reason", "sync.freshness", "quality.risk_level"],
    nextUse: "Check this first before making a high-confidence production recommendation."
  },
  {
    concept: "Discovery and selection",
    rest: ["GET /api/agent-map", "GET /api/quickstart", "GET /api/workflow"],
    mcpTools: ["get_agent_workflow", "get_atlas"],
    inspect: ["surfaces[].concept", "recommended_sequence", "shortlist", "trend_context"],
    trustFields: ["trust_policy.strict_mode", "trust_policy.disclose_when", "shortlist[].confidence"],
    nextUse: "Use this to choose the shortest path to search, lookup, alternatives, compare, graph, or Atlas."
  },
  {
    concept: "Project actions",
    rest: ["GET /api/search", "GET /api/project/:owner/:repo", "GET /api/alternatives/:project", "GET /api/compare", "GET /api/graph?repo=:project", "GET /api/score/:project"],
    mcpTools: ["search_projects", "get_project", "get_alternatives", "compare_projects", "get_project_graph", "get_quality_score"],
    inspect: ["projects[].repo", "knowledge", "related", "alternative_matches", "decision_matrix", "graph_stats", "git_top_score"],
    trustFields: ["metadata.source", "quality_signal_confidence", "classification.*.confidence"],
    nextUse: "Use this after trust and discovery when you need the actual project answer."
  }
];

export const agentShortPath: AgentPathSurface[] = [
  {
    step: 1,
    concept: "Trust preflight",
    rest: ["GET /api/health", "GET /api/trust"],
    mcpTools: ["get_trust_gate"],
    inspect: ["db=available", "metadata.source=d1", "decision", "production_ready"],
    trustFields: ["metadata.source", "metadata.reason", "sync.freshness", "quality.risk_level"],
    useWhen: "Start here before any high-confidence production answer."
  },
  {
    step: 2,
    concept: "Discovery",
    rest: ["GET /api/agent-map", "GET /api/quickstart", "GET /api/workflow"],
    mcpTools: ["get_agent_workflow", "get_atlas"],
    inspect: ["core_surfaces", "recommended_agent_flow", "recommended_sequence", "shortlist"],
    trustFields: ["trust_policy.strict_mode", "trust_policy.disclose_when"],
    useWhen: "Use this to choose the shortest route into search, lookup, alternatives, compare, graph, or Atlas."
  },
  {
    step: 3,
    concept: "Project action",
    rest: ["GET /api/search", "GET /api/project/:owner/:repo", "GET /api/recommend", "GET /api/compare"],
    mcpTools: ["search_projects", "get_project", "recommend_project", "compare_projects"],
    inspect: ["projects[].repo", "knowledge", "recommendations", "decision_matrix"],
    trustFields: ["metadata.source", "quality_signal_confidence", "classification.*.confidence"],
    useWhen: "Use this once trust and discovery are settled and you need the actual answer."
  }
];

export const agentReferencePath: AgentPathSurface[] = [
  {
    step: 1,
    concept: "Trust and freshness",
    rest: ["GET /api/health", "GET /api/trust", "GET /api/quality", "GET /api/sync/status"],
    mcpTools: ["get_trust_gate", "get_quality_report"],
    inspect: ["db=available", "sync_freshness", "release_score", "data_trust_score", "risk_level"],
    trustFields: ["metadata.source", "metadata.reason", "sync.freshness", "quality.risk_level"],
    useWhen: "Use when the answer must explain source quality or freshness in detail."
  },
  {
    step: 2,
    concept: "Discovery and planning",
    rest: ["GET /api/agent-map", "GET /api/quickstart", "GET /api/workflow", "GET /api/journeys", "GET /api/atlas"],
    mcpTools: ["get_agent_workflow", "get_atlas", "get_trends"],
    inspect: ["surfaces", "core_surfaces", "recommended_agent_flow", "recommended_sequence", "comparison_paths"],
    trustFields: ["trust_policy.strict_mode", "trust_policy.disclose_when", "trend_context.stats.project_count"],
    useWhen: "Use when you need the broader discovery layer, not just the first action."
  },
  {
    step: 3,
    concept: "Project analysis",
    rest: ["GET /api/search", "GET /api/project/:owner/:repo", "GET /api/alternatives/:project", "GET /api/graph?repo=:project", "GET /api/score/:project", "GET /api/compare"],
    mcpTools: ["search_projects", "get_project", "get_alternatives", "get_project_graph", "get_quality_score", "compare_projects"],
    inspect: ["projects[].repo", "knowledge", "related", "alternative_matches", "graph_stats", "score_confidence", "decision_matrix"],
    trustFields: ["metadata.source", "quality_signal_confidence", "classification.*.confidence"],
    useWhen: "Use this when you are explaining or comparing concrete projects."
  }
];

export function buildAgentMap() {
  return {
    name: "Git.Top Agent Surface Map",
    positioning: "The Knowledge Graph of Open Source",
    purpose: "Map human pages to REST endpoints, MCP tools, output fields, and trust fields so agents can choose the right Git.Top surface.",
    production_base_url: "https://git.top",
    rest_base_url: "https://git.top/api",
    mcp_endpoint: "https://git.top/mcp",
    openapi_url: "https://git.top/openapi.json",
    schema_url: "https://git.top/api/schema/project.v2",
    llms_url: "https://git.top/llms.txt",
    llms_full_url: "https://git.top/llms-full.txt",
    roadmap_url: "https://git.top/roadmap",
    short_path: agentShortPath,
    reference_path: agentReferencePath,
    core_surfaces: agentCoreSurfaces,
    recommended_agent_flow: [
      "Trust first: GET /api/health and GET /api/trust before high-confidence production recommendations.",
      "Use /api/agent-map or GET /mcp discovery to read short_path first, then reference_path when you need the fuller discovery surface.",
      "GET /api/health and require metadata.source=d1 for high-confidence production recommendations.",
      "Keep metadata.snapshot_id consistent across multi-step decisions and restart the workflow when the snapshot changes materially.",
      "Use /api/changes or MCP get_project_changes to update persistent agent caches and honor deletion tombstones.",
      "Use MCP propose_project_feedback to validate corrections; persistence requires FEEDBACK_SECRET and every proposal remains review-gated.",
      "Use /api/workflow or MCP get_agent_workflow when you need an end-to-end project selection path.",
      "Use /api/quality or MCP get_quality_report when you need release score, corpus trust, coverage, and review risk before citing a recommendation.",
      "Fetch project, graph, alternatives, score, and compare data before making a final recommendation.",
      "Cite metadata.source, metadata.snapshot_id, classification evidence, quality_signal_confidence, and recommendation confidence."
    ],
    surfaces: agentSurfaceMap,
    trust_policy: {
      high_confidence_source: "metadata.source=d1",
      fallback_source: "metadata.source=seed",
      snapshot_consistency: "Use metadata.snapshot_id to detect corpus changes across multi-step decisions.",
      disclose_when: ["metadata.source=seed", "sync.health is degraded", "classification confidence is low", "quality_signal_confidence is partial or unknown"],
      strict_mode: "Use require_d1=true on REST requests or require_d1 in MCP tool arguments to fail closed when D1 is unavailable."
    }
  };
}
