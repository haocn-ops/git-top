import type { Category, ProjectKnowledge } from "./types";

export interface ProjectSummary {
  tl_dr: string;
  purpose: string;
  install: string | null;
  inputs: string[];
  outputs: string[];
  good_for: string[];
  not_good_for: string[];
  deployment: string[];
  alternatives: Array<{ repo: string; reason: string }>;
}

interface ProjectSummarySource {
  projectKind: ProjectKnowledge["agentCard"]["projectKind"];
  category: string[];
  overview: string;
  useCases: string[];
  notGoodFor: string[];
  deployments: string[];
  alternatives: Array<{ repo: string; reason: string }>;
}

export interface ProjectKnowledgeView {
  projectId: string;
  repo: string;
  name: string;
  githubUrl: string;
  homepageUrl: string | null;
  language: string | null;
  license: string | null;
  projectKind: NonNullable<ProjectKnowledge["agentCard"]["projectKind"]>;
  collectionMetadata?: ProjectKnowledge["agentCard"]["collectionMetadata"];
  category: string[];
  tags: string[];
  description: string;
  overview: string;
  alternatives: Array<{ repo: string; reason: string }>;
  related: Array<{ repo: string; reason: string }>;
  dependencies: string[];
  deployments: string[];
  difficulty: string;
  cloudflareReady: boolean;
  useCases: string[];
  notGoodFor: string[];
  summary: ProjectSummary;
  classification?: ProjectKnowledge["agentCard"]["classification"];
  qualitySignals: {
    stars: number;
    recentCommits: number;
    contributors: number;
    issueResponseTimeHours: number | null;
    releaseFrequency180d: number;
  };
  qualitySignalConfidence?: {
    stars30dDelta?: "snapshot" | "estimated";
    stars30dWindowDays?: number;
    commits30d?: "complete" | "partial" | "unknown";
    releases180d?: "complete" | "partial" | "unknown";
    contributors90d?: "complete" | "partial" | "unknown";
  };
  qualityScore: number;
  agentScore: number;
  score: number;
  agentScoreBreakdown: {
    documentation: number;
    maintenance: number;
    deployment: number;
    popularity: number;
    community: number;
  };
  gitTopScore: number;
  gitTopScoreBreakdown: {
    community: number;
    maintenance: number;
    documentation: number;
    stability: number;
    adoption: number;
    agentReadability: number;
  };
}

const categorySummaryHints: Record<
  Category,
  {
    inputs: string[];
    outputs: string[];
    goodFor: string[];
    notGoodFor: string[];
    install: string | null;
  }
> = {
  agent_framework: {
    inputs: ["task prompt", "tools", "context", "memory/state"],
    outputs: ["agent runs", "tool calls", "workflow state"],
    goodFor: ["stateful agents", "tool-using assistants", "workflow orchestration"],
    notGoodFor: ["simple prompt-only apps", "one-shot chat wrappers"],
    install: "Run the framework according to the repository README or package registry instructions."
  },
  coding_agent: {
    inputs: ["coding task", "repo context", "tool permissions"],
    outputs: ["code changes", "patches", "developer assistant actions"],
    goodFor: ["software engineering tasks", "code editing", "repo automation"],
    notGoodFor: ["static documentation sites", "non-code workflows"],
    install: "Use the repository's CLI, package, or agent runtime instructions."
  },
  browser_agent: {
    inputs: ["URL or page task", "browser session", "navigation constraints"],
    outputs: ["browser actions", "page state", "extracted data"],
    goodFor: ["web automation", "browser tasks", "UI-driven workflows"],
    notGoodFor: ["backend-only jobs", "offline batch processing"],
    install: "Run the browser agent with the setup described in the repository README."
  },
  rag_framework: {
    inputs: ["documents", "queries", "embedding store"],
    outputs: ["retrieval results", "grounded answers", "indexes"],
    goodFor: ["retrieval augmented generation", "document search", "knowledge grounding"],
    notGoodFor: ["simple prompt apps", "tasks without external knowledge"],
    install: "Follow the repository's package or service setup instructions."
  },
  vector_database: {
    inputs: ["embeddings", "records", "similarity queries"],
    outputs: ["nearest neighbors", "vector search results", "filtered matches"],
    goodFor: ["embedding search", "semantic retrieval", "similarity indexing"],
    notGoodFor: ["plain key-value storage", "prompt-only apps"],
    install: "Deploy according to the project's database or service instructions."
  },
  llm_gateway: {
    inputs: ["model requests", "routing config", "provider credentials"],
    outputs: ["proxied completions", "routed responses", "usage metrics"],
    goodFor: ["model routing", "provider abstraction", "LLM proxying"],
    notGoodFor: ["local-only inference", "non-LLM services"],
    install: "Use the gateway deployment instructions in the repository README."
  },
  llm_eval: {
    inputs: ["prompts", "model outputs", "test cases"],
    outputs: ["scores", "benchmarks", "eval reports"],
    goodFor: ["model evaluation", "benchmarking", "regression testing"],
    notGoodFor: ["production inference serving", "end-user chat apps"],
    install: "Install and run the evaluation harness as documented by the repository."
  },
  prompt_tooling: {
    inputs: ["prompt templates", "schemas", "constraints"],
    outputs: ["structured prompts", "validated generations", "prompt tooling artifacts"],
    goodFor: ["structured output", "prompt engineering", "format enforcement"],
    notGoodFor: ["raw inference serving", "database workloads"],
    install: "Follow the repository's library or CLI setup instructions."
  },
  workflow_automation: {
    inputs: ["triggers", "jobs", "state"],
    outputs: ["automation runs", "orchestrated steps", "workflow events"],
    goodFor: ["scheduled jobs", "durable workflows", "service orchestration"],
    notGoodFor: ["single-step utilities", "stateless examples"],
    install: "Use the workflow engine or automation deployment instructions in the README."
  },
  local_llm_runtime: {
    inputs: ["model weights", "hardware/runtime config"],
    outputs: ["local inference", "served endpoints", "runtime logs"],
    goodFor: ["private inference", "local model serving", "self-hosted runtimes"],
    notGoodFor: ["hosted SaaS deployment only", "non-ML projects"],
    install: "Follow the local runtime setup instructions in the repository."
  },
  ai_app_template: {
    inputs: ["starter config", "app requirements"],
    outputs: ["project scaffold", "starter app", "template structure"],
    goodFor: ["new AI applications", "starter projects", "reference implementations"],
    notGoodFor: ["drop-in libraries", "runtime infrastructure"],
    install: "Use the template bootstrap instructions from the repository."
  },
  mcp_server: {
    inputs: ["tool definitions", "resource config", "transport settings"],
    outputs: ["MCP tools", "JSON-RPC responses", "server capabilities"],
    goodFor: ["agent tool exposure", "MCP integrations", "tool servers"],
    notGoodFor: ["front-end apps", "non-tooling backends"],
    install: "Run the MCP server following the repository's transport instructions."
  },
  ai_observability: {
    inputs: ["traces", "events", "metrics"],
    outputs: ["dashboards", "alerts", "trace views"],
    goodFor: ["monitoring AI systems", "debugging agent behavior", "instrumentation"],
    notGoodFor: ["model serving by itself", "UI-only projects"],
    install: "Deploy the observability stack using the repository guidance."
  },
  other: {
    inputs: ["project context"],
    outputs: ["project knowledge"],
    goodFor: ["discovery", "review", "further inspection"],
    notGoodFor: ["high-confidence production decisions without review"],
    install: "See the repository README for setup instructions."
  }
};

export function toProjectKnowledgeView(item: ProjectKnowledge): ProjectKnowledgeView {
  const qualityScore = item.metrics.gitScore;
  const agentScore = calculateAgentScore(item);
  const gitTopScoreBreakdown = getGitTopScoreParts(item);
  const gitTopScore = calculateGitTopScoreFromParts(gitTopScoreBreakdown);

  const view = {
    projectId: item.project.fullName,
    repo: item.project.fullName,
    name: item.project.name,
    githubUrl: item.project.githubUrl,
    homepageUrl: item.project.homepageUrl,
    language: item.project.language,
    license: item.project.license,
    projectKind: item.agentCard.projectKind ?? "project",
    collectionMetadata: item.agentCard.collectionMetadata,
    category: [item.agentCard.category],
    tags: item.project.topics,
    description: item.project.description ?? item.agentCard.summaryForAgent,
    overview: item.agentCard.summaryForAgent,
    alternatives: item.agentCard.alternatives.map((alternative) => ({
      repo: alternative.project_id,
      reason: alternative.reason
    })),
    related: [],
    dependencies: inferDependencies(item),
    deployments: item.agentCard.deployment,
    difficulty: item.agentCard.difficulty,
    cloudflareReady: item.agentCard.cloudflareReady,
    useCases: item.agentCard.useCases,
    notGoodFor: item.agentCard.notGoodFor,
    classification: withDefaultClassification(item.agentCard.classification),
    qualitySignals: {
      stars: item.project.stars,
      recentCommits: item.metrics.commits30d,
      contributors: item.metrics.contributors90d,
      issueResponseTimeHours: item.metrics.issueFirstResponseMedianHours,
      releaseFrequency180d: item.metrics.releases180d
    },
    qualitySignalConfidence: withDefaultConfidence(item.metrics.signalConfidence),
    qualityScore,
    agentScore,
    score: gitTopScore,
    agentScoreBreakdown: getAgentScoreParts(item),
    gitTopScore,
    gitTopScoreBreakdown
  } satisfies Omit<ProjectKnowledgeView, "summary">;

  return {
    ...view,
    summary: buildProjectSummary(view)
  };
}

export function withRelatedProjects(
  view: ProjectKnowledgeView,
  related: ProjectKnowledge[],
  sourceRepo = view.repo
): ProjectKnowledgeView {
  return {
    ...view,
    related: related.map((item) => ({
      repo: item.project.id,
      reason: relatedReason(view, toProjectKnowledgeView(item), sourceRepo)
    }))
  };
}

export function buildProjectSummary(view: ProjectSummarySource): ProjectSummary {
  const hints = categorySummaryHints[(view.category[0] as Category | undefined) ?? "other"] ?? categorySummaryHints.other;
  return {
    tl_dr: firstSentence(view.overview),
    purpose: view.overview,
    install: installationHint(view, hints.install),
    inputs: hints.inputs,
    outputs: hints.outputs,
    good_for: uniqueStrings([...view.useCases, ...hints.goodFor]),
    not_good_for: uniqueStrings([...view.notGoodFor, ...hints.notGoodFor]),
    deployment: view.deployments,
    alternatives: view.alternatives.slice(0, 5)
  };
}

function relatedReason(source: ProjectKnowledgeView, target: ProjectKnowledgeView, sourceRepo: string): string {
  const sharedCategory = source.category.find((category) => target.category.includes(category));
  const sharedDeployment = source.deployments.find((deployment) => target.deployments.includes(deployment));
  const sharedDependency = source.dependencies.find((dependency) => target.dependencies.includes(dependency));
  if (sharedCategory && sharedDeployment) {
    return `Related to ${sourceRepo} through ${sharedCategory.replaceAll("_", " ")} category and ${sharedDeployment} deployment.`;
  }
  if (sharedDependency) {
    return `Related to ${sourceRepo} through shared ${sharedDependency} dependency context.`;
  }
  if (sharedCategory) {
    return `Related to ${sourceRepo} through the ${sharedCategory.replaceAll("_", " ")} ecosystem.`;
  }
  if (sharedDeployment) {
    return `Related to ${sourceRepo} through ${sharedDeployment} deployment fit.`;
  }
  return `Related to ${sourceRepo} through overlapping topics, use cases, or project signals.`;
}

function withDefaultClassification(
  classification: ProjectKnowledge["agentCard"]["classification"]
): NonNullable<ProjectKnowledgeView["classification"]> {
  return {
    category: classification?.category ?? { confidence: "low", evidence: [] },
    deployment: classification?.deployment ?? { confidence: "low", evidence: [] },
    difficulty: classification?.difficulty ?? { confidence: "low", evidence: [] },
    cloudflareReady: classification?.cloudflareReady ?? { confidence: "low", evidence: [] }
  };
}

function withDefaultConfidence(confidence: ProjectKnowledge["metrics"]["signalConfidence"]): NonNullable<ProjectKnowledgeView["qualitySignalConfidence"]> {
  return {
    stars30dDelta: confidence?.stars30dDelta ?? "estimated",
    ...(confidence?.stars30dWindowDays !== undefined ? { stars30dWindowDays: confidence.stars30dWindowDays } : {}),
    commits30d: confidence?.commits30d ?? "unknown",
    releases180d: confidence?.releases180d ?? "unknown",
    contributors90d: confidence?.contributors90d ?? "unknown"
  };
}

export function calculateAgentScore(item: ProjectKnowledge): number {
  const parts = getAgentScoreParts(item);
  return Math.round(parts.documentation * 0.22 + parts.maintenance * 0.24 + parts.deployment * 0.2 + parts.popularity * 0.18 + parts.community * 0.16);
}

export function calculateGitTopScore(item: ProjectKnowledge): number {
  return calculateGitTopScoreFromParts(getGitTopScoreParts(item));
}

function calculateGitTopScoreFromParts(parts: ProjectKnowledgeView["gitTopScoreBreakdown"]): number {
  return Math.round(
    parts.community * 0.16 +
      parts.maintenance * 0.2 +
      parts.documentation * 0.16 +
      parts.stability * 0.16 +
      parts.adoption * 0.16 +
      parts.agentReadability * 0.16
  );
}

function getAgentScoreParts(item: ProjectKnowledge): ProjectKnowledgeView["agentScoreBreakdown"] {
  const documentation = item.agentCard.summaryForAgent.length > 80 ? 90 : 72;
  const maintenance = item.metrics.maintenanceScore;
  const deployment = Math.min(100, 50 + item.agentCard.deployment.length * 10 + (item.agentCard.cloudflareReady ? 20 : 0));
  const popularity = Math.min(100, Math.round(Math.log10(Math.max(item.project.stars, 1)) * 20));
  const community = Math.min(100, 45 + item.metrics.contributors90d);

  return {
    documentation,
    maintenance,
    deployment,
    popularity,
    community
  };
}

function getGitTopScoreParts(item: ProjectKnowledge): ProjectKnowledgeView["gitTopScoreBreakdown"] {
  const documentation = item.agentCard.summaryForAgent.length > 120 ? 92 : item.agentCard.summaryForAgent.length > 80 ? 84 : 68;
  const maintenance = Math.round(item.metrics.maintenanceScore * 0.68 + Math.min(100, item.metrics.commits30d * 4) * 0.2 + Math.min(100, item.metrics.releases180d * 16) * 0.12);
  const community = Math.min(100, Math.round(42 + item.metrics.contributors90d * 3 + Math.log10(Math.max(item.project.stars, 1)) * 10));
  const stability = Math.min(
    100,
    Math.round(
      45 +
        Math.min(30, item.metrics.releases180d * 8) +
        (item.metrics.recentPushDays !== null && item.metrics.recentPushDays <= 30 ? 15 : 0) +
        (item.project.openIssues < 100 ? 10 : 0)
    )
  );
  const adoption = Math.min(100, Math.round(Math.log10(Math.max(item.project.stars, 1)) * 22 + Math.log10(Math.max(item.project.forks, 1)) * 10));
  const agentReadability = Math.min(
    100,
    48 +
      (item.agentCard.useCases.length > 0 ? 12 : 0) +
      (item.agentCard.notGoodFor.length > 0 ? 10 : 0) +
      (item.agentCard.deployment.length > 0 ? 10 : 0) +
      (inferDependencies(item).length > 0 ? 10 : 0) +
      (item.agentCard.alternatives.length > 0 ? 10 : 0)
  );

  return {
    community,
    maintenance: clampScore(maintenance),
    documentation: clampScore(documentation),
    stability: clampScore(stability),
    adoption: clampScore(adoption),
    agentReadability: clampScore(agentReadability)
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstSentence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  return (match?.[1] ?? trimmed).slice(0, 220);
}

function installationHint(view: ProjectSummarySource, fallback: string | null): string | null {
  if (view.projectKind === "collection") {
    return "Reference collection; there is no direct install step.";
  }
  if (view.deployments.includes("cloudflare")) {
    return "Deploy on Cloudflare Workers using the repository's deployment instructions.";
  }
  if (view.deployments.includes("docker")) {
    return "Run with Docker using the repository's container instructions.";
  }
  if (view.deployments.includes("library_only")) {
    return "Install as a library or package using the repository instructions.";
  }
  return fallback;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 6);
}

function inferDependencies(item: ProjectKnowledge): string[] {
  const dependencies = new Set<string>();
  const text = [item.project.description, item.project.topics.join(" "), item.agentCard.summaryForAgent].join(" ").toLowerCase();

  if (text.includes("mcp")) {
    dependencies.add("MCP");
  }
  if (text.includes("cloudflare") || text.includes("workers")) {
    dependencies.add("Cloudflare Workers");
  }
  if (text.includes("rag") || text.includes("retrieval")) {
    dependencies.add("Vector database");
  }
  if (text.includes("browser")) {
    dependencies.add("Browser automation");
  }
  if (text.includes("llm") || text.includes("agent")) {
    dependencies.add("LLM provider");
  }

  return Array.from(dependencies);
}
