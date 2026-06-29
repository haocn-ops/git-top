import { buildAgentMap } from "./agent-map";
import { recommendProjectList, type RecommendationQuery } from "./project-search";
import { buildTrendsView } from "./trends";
import type { ProjectKnowledge } from "./types";

export interface AgentWorkflowInput extends RecommendationQuery {
  projectId?: string;
  intent?: string;
}

export function buildAgentWorkflow(projects: ProjectKnowledge[], input: AgentWorkflowInput = {}) {
  const limit = clampWorkflowLimit(input.limit ?? 5);
  const recommendationQuery: RecommendationQuery = {
    useCase: input.useCase ?? input.intent,
    deployment: input.deployment,
    difficulty: input.difficulty,
    language: input.language,
    category: input.category,
    license: input.license,
    cloudflareReady: input.cloudflareReady,
    limit
  };
  const recommendations = recommendProjectList(projects, recommendationQuery);
  const focusProject = input.projectId ?? recommendations[0]?.project_id;
  const shortlist = recommendations.map((item) => item.project_id).slice(0, Math.min(limit, 5));
  const compareRepos = shortlist.length > 0 ? shortlist.join(",") : focusProject;
  const trendsLimit = Math.max(3, Math.min(limit, 8));
  const trends = buildTrendsView(projects, trendsLimit);

  return {
    name: "Git.Top Agent Selection Workflow",
    positioning: "The Knowledge Graph of Open Source",
    purpose: "Turn an agent's open-source selection goal into a structured path across trends, recommendations, graph, alternatives, score, compare, and trust checks.",
    input: {
      intent: input.intent ?? input.useCase ?? null,
      project_id: input.projectId ?? null,
      constraints: {
        deployment: input.deployment ?? null,
        category: input.category ?? null,
        license: input.license ?? null,
        language: input.language ?? null,
        difficulty: input.difficulty ?? null,
        cloudflare_ready: input.cloudflareReady ?? null
      },
      limit
    },
    summary: workflowSummary(input, recommendations.length, focusProject),
    recommended_sequence: workflowSteps(focusProject, compareRepos, recommendationQuery, limit),
    shortlist: recommendations.map((item) => ({
      project_id: item.project_id,
      score: item.score,
      confidence: item.confidence,
      decision_summary: item.decision_summary,
      next_actions: item.next_actions
    })),
    trend_context: {
      summary: trends.summary,
      stats: trends.stats,
      top_categories: trends.categories.slice(0, 3),
      top_deployments: trends.deployments.slice(0, 3),
      rising_projects: trends.risingProjects.slice(0, 3)
    },
    agent_map: {
      url: "/api/agent-map",
      short_path: buildAgentMap().short_path.map((step) => ({
        step: step.step,
        concept: step.concept,
        rest: step.rest,
        mcp_tools: step.mcpTools,
        inspect: step.inspect,
        trust_fields: step.trustFields,
        use_when: step.useWhen
      })),
      reference_path: buildAgentMap().reference_path.map((step) => ({
        step: step.step,
        concept: step.concept,
        rest: step.rest,
        mcp_tools: step.mcpTools,
        inspect: step.inspect,
        trust_fields: step.trustFields,
        use_when: step.useWhen
      })),
      surfaces: buildAgentMap().surfaces.map((surface) => ({
        concept: surface.concept,
        rest: surface.rest,
        mcp_tools: surface.mcpTools,
        recommended_use: surface.recommendedUse
      }))
    },
    trust_policy: {
      production_check: "/api/health?require_d1=true",
      disclose_when: ["metadata.source=seed", "sync.health is degraded", "recommendation confidence is low", "score_confidence.level is low"],
      cite_fields: ["metadata.source", "metadata.reason", "classification.*.confidence", "quality_signal_confidence", "recommendations[].confidence", "score_confidence.level"]
    }
  };
}

function workflowSteps(focusProject: string | undefined, compareRepos: string | undefined, query: RecommendationQuery, limit: number) {
  const steps = [
    {
      step: 1,
      name: "Check data trust",
      purpose: "Verify that production recommendations can rely on D1-backed knowledge.",
      method: "GET",
      url: "/api/health?require_d1=true",
      mcp_tool: null
    },
    {
      step: 2,
      name: "Read trend context",
      purpose: "Understand corpus-level category, deployment, language, and rising-project signals before picking candidates.",
      method: "GET",
      url: `/api/trends?limit=${Math.max(3, Math.min(limit, 8))}`,
      mcp_tool: "get_trends"
    },
    {
      step: 3,
      name: "Generate shortlist",
      purpose: "Get ranked candidates with fit profile, adoption plan, risk flags, confidence, and next actions.",
      method: "GET",
      url: recommendUrl(query, limit),
      mcp_tool: "recommend_project"
    }
  ];

  if (focusProject) {
    steps.push(
      {
        step: 4,
        name: "Inspect project graph",
        purpose: "Read alternatives, related projects, dependencies, deployment targets, and graph edges for the leading candidate.",
        method: "GET",
        url: `/api/graph/${encodeProjectPath(focusProject)}?limit=24`,
        mcp_tool: "get_project_graph"
      },
      {
        step: 5,
        name: "Find alternatives",
        purpose: "Separate direct substitutes from adjacent options with similarity score, match signals, adoption notes, and replacement risk.",
        method: "GET",
        url: `/api/alternatives/${encodeProjectPath(focusProject)}?limit=${limit}`,
        mcp_tool: "get_alternatives"
      },
      {
        step: 6,
        name: "Explain score",
        purpose: "Inspect Git.Top Score dimensions, score confidence, evidence, risk flags, and adoption guidance.",
        method: "GET",
        url: `/api/score/${encodeProjectPath(focusProject)}`,
        mcp_tool: "get_quality_score"
      }
    );
  }

  steps.push({
    step: steps.length + 1,
    name: "Compare final candidates",
    purpose: "Turn the shortlist into a decision matrix with winner reasoning and tradeoffs.",
    method: "GET",
    url: compareRepos ? `/api/compare?repos=${encodeURIComponent(compareRepos)}` : "/api/compare",
    mcp_tool: "compare_projects"
  });

  return steps;
}

function recommendUrl(query: RecommendationQuery, limit: number): string {
  const params = new URLSearchParams();
  if (query.useCase) params.set("use_case", query.useCase);
  if (query.deployment) params.set("deployment", query.deployment);
  if (query.category) params.set("category", query.category);
  if (query.license) params.set("license", query.license);
  if (query.language) params.set("language", query.language);
  if (query.difficulty) params.set("difficulty", query.difficulty);
  if (typeof query.cloudflareReady === "boolean") params.set("cloudflare_ready", String(query.cloudflareReady));
  params.set("limit", String(limit));
  return `/api/recommend?${params.toString()}`;
}

function workflowSummary(input: AgentWorkflowInput, recommendationCount: number, focusProject?: string): string {
  const intent = input.intent ?? input.useCase;
  const target = focusProject ? ` Focus project: ${focusProject}.` : "";
  const context = intent ? ` for "${intent}"` : "";
  return `Use this workflow to move from trend context to shortlist, graph inspection, alternatives, score explanation, and final comparison${context}. ${recommendationCount} candidate(s) were shortlisted.${target}`;
}

function encodeProjectPath(projectId: string): string {
  return projectId
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function clampWorkflowLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }
  return Math.max(1, Math.min(Math.floor(value), 20));
}
