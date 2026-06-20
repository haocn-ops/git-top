import type { ProjectKnowledge } from "./types";

export interface ProjectKnowledgeView {
  repo: string;
  name: string;
  category: string[];
  tags: string[];
  description: string;
  overview: string;
  alternatives: Array<{ repo: string; reason: string }>;
  dependencies: string[];
  deployments: string[];
  useCases: string[];
  qualitySignals: {
    stars: number;
    recentCommits: number;
    contributors: number;
    issueResponseTimeHours: number | null;
    releaseFrequency180d: number;
  };
  qualityScore: number;
  agentScore: number;
}

export function toProjectKnowledgeView(item: ProjectKnowledge): ProjectKnowledgeView {
  const qualityScore = item.metrics.gitScore;
  const agentScore = calculateAgentScore(item);

  return {
    repo: item.project.fullName,
    name: item.project.name,
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
    useCases: item.agentCard.useCases,
    qualitySignals: {
      stars: item.project.stars,
      recentCommits: item.metrics.commits30d,
      contributors: item.metrics.contributors90d,
      issueResponseTimeHours: item.metrics.issueFirstResponseMedianHours,
      releaseFrequency180d: item.metrics.releases180d
    },
    qualityScore,
    agentScore
  };
}

export function calculateAgentScore(item: ProjectKnowledge): number {
  const documentation = item.agentCard.summaryForAgent.length > 80 ? 90 : 72;
  const maintenance = item.metrics.maintenanceScore;
  const deployment = Math.min(100, 50 + item.agentCard.deployment.length * 10 + (item.agentCard.cloudflareReady ? 20 : 0));
  const popularity = Math.min(100, Math.round(Math.log10(Math.max(item.project.stars, 1)) * 20));
  const community = Math.min(100, 45 + item.metrics.contributors90d);

  return Math.round(documentation * 0.22 + maintenance * 0.24 + deployment * 0.2 + popularity * 0.18 + community * 0.16);
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
