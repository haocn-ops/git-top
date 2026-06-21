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
  dependencies: string[];
  deployments: string[];
  difficulty: string;
  cloudflareReady: boolean;
  useCases: string[];
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
  agentScoreBreakdown: {
    documentation: number;
    maintenance: number;
    deployment: number;
    popularity: number;
    community: number;
  };
}

export function toProjectKnowledgeView(item: ProjectKnowledge): ProjectKnowledgeView {
  const qualityScore = item.metrics.gitScore;
  const agentScore = calculateAgentScore(item);

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
    dependencies: inferDependencies(item),
    deployments: item.agentCard.deployment,
    difficulty: item.agentCard.difficulty,
    cloudflareReady: item.agentCard.cloudflareReady,
    useCases: item.agentCard.useCases,
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
    agentScoreBreakdown: getAgentScoreParts(item)
  };
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
