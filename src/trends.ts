import { toProjectKnowledgeView } from "./project-view";
import type { ProjectKnowledge } from "./types";

export interface TrendProjectSummary {
  repo: string;
  name: string;
  description: string;
  language: string | null;
  category: string[];
  deployments: string[];
  cloudflareReady: boolean;
  qualityScore: number;
  agentScore: number;
  gitTopScore: number;
  qualitySignalConfidence: ReturnType<typeof toProjectKnowledgeView>["qualitySignalConfidence"];
}

export interface TrendBucket {
  id: string;
  label: string;
  count: number;
  averageScore: number;
  averageMaintenance: number;
  cloudflareReadyCount: number;
  topProjects: TrendProjectSummary[];
  insight: string;
  href: string;
}

export interface TrendSignal {
  label: string;
  value: number | string;
  description: string;
  href: string;
}

export interface TrendsView {
  summary: string;
  stats: {
    projectCount: number;
    categoryCount: number;
    deploymentCount: number;
    cloudflareReadyCount: number;
    collectionCount: number;
  };
  trendSignals: TrendSignal[];
  categories: TrendBucket[];
  deployments: TrendBucket[];
  languages: TrendBucket[];
  risingProjects: TrendProjectSummary[];
  agentBriefing: string[];
}

export function buildTrendsView(projects: ProjectKnowledge[], limit = 6): TrendsView {
  const boundedLimit = Math.max(3, Math.min(12, Math.round(limit)));
  const allCategories = buildBuckets(projects, (item) => [item.agentCard.category], (id) => `/categories/${encodeURIComponent(id)}`);
  const allDeployments = buildBuckets(projects, (item) => item.agentCard.deployment, (id) => `/deployments/${encodeURIComponent(id)}`);
  const allLanguages = buildBuckets(projects, (item) => (item.project.language ? [item.project.language] : []), (id) => `/api/search?language=${encodeURIComponent(id)}&ranking=browse&limit=12`);
  const categories = allCategories.slice(0, boundedLimit);
  const deployments = allDeployments.slice(0, boundedLimit);
  const languages = allLanguages.slice(0, boundedLimit);
  const risingProjects = [...projects]
    .sort((a, b) => projectMomentumScore(b) - projectMomentumScore(a) || b.metrics.gitScore - a.metrics.gitScore)
    .slice(0, boundedLimit)
    .map(toTrendProjectSummary);
  const cloudflareReadyCount = projects.filter((item) => item.agentCard.cloudflareReady).length;
  const collectionCount = projects.filter((item) => item.agentCard.projectKind === "collection").length;
  const topCategory = categories[0];
  const topDeployment = deployments[0];
  const topLanguage = languages[0];

  return {
    summary: topCategory
      ? `${topCategory.label} is the largest indexed category with ${topCategory.count} projects; ${topDeployment?.label ?? "deployment"} leads deployment coverage across the corpus.`
      : "Trend data is not available yet; add projects through the GitHub sync pipeline.",
    stats: {
      projectCount: projects.length,
      categoryCount: allCategories.length,
      deploymentCount: allDeployments.length,
      cloudflareReadyCount,
      collectionCount
    },
    trendSignals: [
      {
        label: "Largest category",
        value: topCategory ? topCategory.label : "n/a",
        description: topCategory ? `${topCategory.count} indexed projects, average Git.Top Score ${topCategory.averageScore}.` : "No category data available.",
        href: topCategory ? `/categories/${encodeURIComponent(topCategory.id)}` : "/discover"
      },
      {
        label: "Dominant deployment",
        value: topDeployment ? topDeployment.label : "n/a",
        description: topDeployment ? `${topDeployment.count} projects expose this deployment path.` : "No deployment data available.",
        href: topDeployment ? `/deployments/${encodeURIComponent(topDeployment.id)}` : "/discover"
      },
      {
        label: "Top language",
        value: topLanguage ? topLanguage.label : "n/a",
        description: topLanguage ? `${topLanguage.count} indexed projects use this primary language.` : "No language data available.",
        href: topLanguage ? `/api/search?language=${encodeURIComponent(topLanguage.id)}&ranking=browse&limit=12` : "/api/search"
      },
      {
        label: "Cloudflare-ready",
        value: cloudflareReadyCount,
        description: "Projects with Cloudflare or Workers deployment readiness signals.",
        href: "/topics/cloudflare-ready-ai-projects"
      }
    ],
    categories,
    deployments,
    languages,
    risingProjects,
    agentBriefing: buildAgentBriefing(categories, deployments, languages, risingProjects)
  };
}

function buildBuckets(projects: ProjectKnowledge[], keysForProject: (item: ProjectKnowledge) => string[], hrefForKey: (key: string) => string): TrendBucket[] {
  const groups = new Map<string, ProjectKnowledge[]>();
  for (const project of projects) {
    for (const rawKey of keysForProject(project)) {
      const key = rawKey.trim();
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), project]);
    }
  }

  return [...groups.entries()]
    .map(([id, items]) => {
      const topProjects = [...items].sort((a, b) => projectMomentumScore(b) - projectMomentumScore(a) || b.metrics.gitScore - a.metrics.gitScore).slice(0, 4);
      const averageScore = average(items.map((item) => item.metrics.gitScore));
      const averageMaintenance = average(items.map((item) => item.metrics.maintenanceScore));
      const cloudflareReadyCount = items.filter((item) => item.agentCard.cloudflareReady).length;
      return {
        id,
        label: label(id),
        count: items.length,
        averageScore,
        averageMaintenance,
        cloudflareReadyCount,
        topProjects: topProjects.map(toTrendProjectSummary),
        insight: `${items.length} projects, ${cloudflareReadyCount} Cloudflare-ready, average maintenance ${averageMaintenance}.`,
        href: hrefForKey(id)
      };
    })
    .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore);
}

function buildAgentBriefing(categories: TrendBucket[], deployments: TrendBucket[], languages: TrendBucket[], risingProjects: TrendProjectSummary[]): string[] {
  const briefing = [];
  if (categories[0]) {
    briefing.push(`${categories[0].label} has the deepest indexed coverage; start there for broad discovery.`);
  }
  if (deployments[0]) {
    briefing.push(`${deployments[0].label} is the most common deployment signal; verify fit through project graph pages before recommending.`);
  }
  if (languages[0]) {
    briefing.push(`${languages[0].label} leads primary-language coverage, which can affect migration cost and ecosystem fit.`);
  }
  if (risingProjects[0]) {
    briefing.push(`${risingProjects[0].repo} has the strongest current momentum blend of score, maintenance, stars, and Cloudflare readiness.`);
  }
  briefing.push("Treat these as current corpus trends, not market-wide claims; cite metadata.source and quality signal confidence.");
  return briefing;
}

function toTrendProjectSummary(item: ProjectKnowledge): TrendProjectSummary {
  const view = toProjectKnowledgeView(item);
  return {
    repo: view.repo,
    name: view.name,
    description: view.description || view.overview,
    language: view.language,
    category: view.category,
    deployments: view.deployments,
    cloudflareReady: view.cloudflareReady,
    qualityScore: view.qualityScore,
    agentScore: view.agentScore,
    gitTopScore: view.gitTopScore,
    qualitySignalConfidence: view.qualitySignalConfidence
  };
}

function projectMomentumScore(item: ProjectKnowledge): number {
  const starsDelta = Math.max(0, item.metrics.stars30dDelta);
  const starDeltaBoost = Math.min(25, Math.log10(starsDelta + 1) * 10);
  const cloudflareBoost = item.agentCard.cloudflareReady ? 8 : 0;
  const projectKindPenalty = item.agentCard.projectKind === "collection" ? -6 : 0;
  return item.metrics.gitScore * 0.42 + item.metrics.maintenanceScore * 0.34 + item.metrics.contributors90d * 0.12 + starDeltaBoost + cloudflareBoost + projectKindPenalty;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function label(value: string): string {
  const labels: Record<string, string> = {
    ai_app_template: "AI App Template",
    ai_observability: "AI Observability",
    agent_framework: "Agent Framework",
    browser_agent: "Browser Agent",
    coding_agent: "Coding Agent",
    llm_eval: "LLM Eval",
    llm_gateway: "LLM Gateway",
    local_llm_runtime: "Local LLM Runtime",
    mcp_server: "MCP Server",
    rag_framework: "RAG Framework",
    vector_database: "Vector Database",
    workflow_automation: "Workflow Automation",
    library_only: "Library Only"
  };
  return labels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
