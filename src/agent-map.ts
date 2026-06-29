export interface AgentSurfaceMapEntry {
  concept: string;
  humanPage: string;
  rest: string[];
  mcpTools: string[];
  outputFields: string[];
  trustFields: string[];
  recommendedUse: string;
}

export const agentSurfaceMap: AgentSurfaceMapEntry[] = [
  {
    concept: "Project knowledge",
    humanPage: "/projects/:owner/:repo",
    rest: ["GET /api/project/:owner/:repo", "GET /api/project/:project", "POST /api/project"],
    mcpTools: ["get_project", "get_project_card"],
    outputFields: ["project", "knowledge", "related", "score", "quality_signal_confidence"],
    trustFields: ["metadata.source", "metadata.reason", "classification.*.confidence", "quality_signal_confidence"],
    recommendedUse: "Fetch one repository before making a recommendation or citing project facts."
  },
  {
    concept: "Recommendations",
    humanPage: "/recommend",
    rest: ["GET /api/recommend", "POST /api/recommend"],
    mcpTools: ["recommend_project"],
    outputFields: ["recommendations", "recommendations[].decision_summary", "recommendations[].fit_profile", "recommendations[].adoption_plan", "recommendations[].risk_flags", "recommendations[].ranking_signals", "recommendations[].matched_constraints", "recommendations[].next_actions"],
    trustFields: ["metadata.source", "recommendations[].confidence", "recommendations[].unmatched_constraints", "recommendations[].risk_flags"],
    recommendedUse: "Choose candidates from use case, deployment, category, license, language, and Cloudflare-readiness constraints."
  },
  {
    concept: "Agent workflow",
    humanPage: "/docs",
    rest: ["GET /api/workflow", "POST /api/workflow"],
    mcpTools: ["get_agent_workflow"],
    outputFields: ["summary", "recommended_sequence", "shortlist", "trend_context", "agent_map", "trust_policy"],
    trustFields: ["metadata.source", "shortlist[].confidence", "trust_policy.disclose_when", "trend_context.stats.project_count"],
    recommendedUse: "Start here when an agent needs a guided path from trend context to shortlist, graph, alternatives, score, compare, and trust checks."
  },
  {
    concept: "Alternatives",
    humanPage: "/alternatives/:project",
    rest: ["GET /api/alternatives/:project", "POST /api/alternatives"],
    mcpTools: ["get_alternatives", "find_alternatives"],
    outputFields: ["summary", "stats", "alternative_matches", "alternative_matches[].fit_summary", "alternative_matches[].adoption_notes", "alternative_matches[].replacement_risk", "comparison_links", "next_actions"],
    trustFields: ["metadata.source", "alternative_matches[].similarity_score", "alternative_matches[].match_signals", "alternative_matches[].replacement_risk"],
    recommendedUse: "Find replacement candidates and move into compare, graph, score, or recommendation flows."
  },
  {
    concept: "Project graph",
    humanPage: "/graph/:project",
    rest: ["GET /api/graph/:project", "GET /api/graph?repo=:project", "POST /api/graph"],
    mcpTools: ["get_project_graph"],
    outputFields: ["summary", "graph_stats", "relationship_groups", "nodes", "edges", "next_actions"],
    trustFields: ["metadata.source", "graph_stats.relationship_counts", "relationship_groups"],
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
    outputFields: ["git_top_score", "dimensions", "strongest_dimension", "weakest_dimension", "adoption_guidance", "risk_flags", "score_confidence"],
    trustFields: ["metadata.source", "evidence", "related_scores", "score_confidence.level"],
    recommendedUse: "Explain why a project scores well or poorly across community, maintenance, documentation, stability, adoption, and agent readability."
  },
  {
    concept: "Atlas ecosystem map",
    humanPage: "/atlas",
    rest: ["GET /api/atlas", "GET /api/atlas/:ecosystem"],
    mcpTools: ["get_atlas", "git_top_grp_query"],
    outputFields: ["ecosystems", "stats", "exploration_paths", "map.nodes", "map.edges"],
    trustFields: ["metadata.source", "stats.project_count", "exploration_paths"],
    recommendedUse: "Start from an ecosystem map before choosing a specific repository."
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
    outputFields: ["solution_paths", "recommended_stack", "nodes", "edges", "explanation"],
    trustFields: ["metadata.data_source", "decomposition", "confidence"],
    recommendedUse: "Plan, compose, compare, or find project sets from a higher-level goal."
  },
  {
    concept: "Quality and coverage",
    humanPage: "/quality",
    rest: ["GET /api/quality", "GET /api/quality/review", "GET /api/health", "GET /api/sync/status"],
    mcpTools: ["get_quality_report"],
    outputFields: ["releaseScore", "dataTrustScore", "scoreSummary", "riskLevel", "riskSummary", "coverage", "issues"],
    trustFields: ["metadata.source", "metadata.reason", "coverage.lowConfidenceClassificationRate", "coverage.collectionReviewCount", "coverage.staleProjectRate"],
    recommendedUse: "Check whether recommendations are backed by fresh D1 data and whether corpus risk should be disclosed."
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
    recommended_agent_flow: [
      "GET /api/health and require metadata.source=d1 for high-confidence production recommendations.",
      "Use /api/agent-map or GET /mcp discovery to choose the matching human page, REST endpoint, or MCP tool.",
      "Use /api/workflow or MCP get_agent_workflow when you need an end-to-end project selection path.",
      "Use /api/quality or MCP get_quality_report when you need release score, corpus trust, coverage, and review risk before citing a recommendation.",
      "Fetch project, graph, alternatives, score, and compare data before making a final recommendation.",
      "Cite metadata.source, classification evidence, quality_signal_confidence, and recommendation confidence."
    ],
    surfaces: agentSurfaceMap,
    trust_policy: {
      high_confidence_source: "metadata.source=d1",
      fallback_source: "metadata.source=seed",
      disclose_when: ["metadata.source=seed", "sync.health is degraded", "classification confidence is low", "quality_signal_confidence is partial or unknown"],
      strict_mode: "Use require_d1=true on REST requests or require_d1 in MCP tool arguments to fail closed when D1 is unavailable."
    }
  };
}
