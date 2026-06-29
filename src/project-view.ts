import type { ProjectKnowledge } from "./types";

export interface ProjectKnowledgeView {
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

export function toProjectKnowledgeView(item: ProjectKnowledge): ProjectKnowledgeView {
  const qualityScore = item.metrics.gitScore;
  const agentScore = calculateAgentScore(item);
  const gitTopScoreBreakdown = getGitTopScoreParts(item);
  const gitTopScore = calculateGitTopScoreFromParts(gitTopScoreBreakdown);

  return {
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
