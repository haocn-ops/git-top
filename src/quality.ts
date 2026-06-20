import type { Category, ProjectKnowledge } from "./types";

export type QualitySeverity = "error" | "warning" | "info";

export interface QualityIssue {
  projectId: string;
  severity: QualitySeverity;
  code: string;
  message: string;
}

export interface QualityReport {
  score: number;
  projectCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  categoryDistribution: Record<Category, number>;
  issues: QualityIssue[];
}

const categories: Category[] = [
  "agent_framework",
  "coding_agent",
  "browser_agent",
  "rag_framework",
  "vector_database",
  "llm_gateway",
  "llm_eval",
  "prompt_tooling",
  "workflow_automation",
  "local_llm_runtime",
  "ai_app_template",
  "mcp_server",
  "ai_observability",
  "other"
];

export function buildQualityReport(projects: ProjectKnowledge[]): QualityReport {
  const issues = projects.flatMap(checkProject);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const penalty = errorCount * 10 + warningCount * 4 + issues.filter((issue) => issue.severity === "info").length;

  return {
    score: Math.max(0, Math.min(100, 100 - penalty)),
    projectCount: projects.length,
    issueCount: issues.length,
    errorCount,
    warningCount,
    categoryDistribution: categoryDistribution(projects),
    issues
  };
}

function checkProject(item: ProjectKnowledge): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const projectId = item.project.id;
  const text = normalize(
    [
      item.project.name,
      item.project.description,
      item.project.language,
      item.project.topics.join(" "),
      item.agentCard.summaryForAgent,
      item.agentCard.useCases.join(" ")
    ].join(" ")
  );

  if (item.agentCard.category === "other") {
    issues.push(issue(projectId, "warning", "category_other", "Project is categorized as other."));
  }

  if (!categoryLooksPlausible(item.agentCard.category, text)) {
    issues.push(
      issue(projectId, "warning", "category_low_confidence", `Category ${item.agentCard.category} has weak metadata support.`)
    );
  }

  if (item.agentCard.useCases.length < 2) {
    issues.push(issue(projectId, "warning", "thin_use_cases", "Agent Card has fewer than two use cases."));
  }

  if (item.agentCard.summaryForAgent.length < 60) {
    issues.push(issue(projectId, "info", "thin_summary", "Agent summary is short."));
  }

  if (item.agentCard.cloudflareReady && !item.agentCard.deployment.includes("cloudflare")) {
    issues.push(issue(projectId, "error", "cloudflare_ready_without_deployment", "Cloudflare-ready card lacks cloudflare deployment."));
  }

  if (item.agentCard.cloudflareReady && hasAny(text, ["cuda", "gpu", "docker daemon", "postgres", "python"])) {
    issues.push(issue(projectId, "warning", "cloudflare_ready_with_runtime_blocker", "Cloudflare-ready card may have runtime blockers."));
  }

  if (item.metrics.gitScore < item.metrics.maintenanceScore - 30) {
    issues.push(issue(projectId, "info", "score_skew", "Maintenance score is much higher than Git Score."));
  }

  if (item.metrics.gitScore > 85 && item.metrics.maintenanceScore < 45) {
    issues.push(issue(projectId, "warning", "hot_but_low_maintenance", "Project is hot but maintenance score is low."));
  }

  if (Date.now() - Date.parse(item.project.syncedAt) > 7 * 24 * 60 * 60 * 1000) {
    issues.push(issue(projectId, "warning", "stale_sync", "Project has not been synced in over 7 days."));
  }

  if (item.project.stars > 10000 && item.agentCard.alternatives.length === 0) {
    issues.push(issue(projectId, "info", "missing_alternatives", "Popular project has no alternatives."));
  }

  if (item.project.stars > 10000 && item.agentCard.alternatives.length > 0) {
    const hasSameCategoryAlternative = item.agentCard.alternatives.some((alternative) =>
      alternative.reason.toLowerCase().includes(item.agentCard.category.replace(/_/g, " "))
    );

    if (!hasSameCategoryAlternative) {
      issues.push(issue(projectId, "info", "weak_alternatives", "Popular project alternatives are not same-category matches."));
    }
  }

  return issues;
}

function categoryLooksPlausible(category: Category, text: string): boolean {
  const hints: Record<Category, string[]> = {
    agent_framework: ["agent", "agents", "multiagent", "tool calling", "orchestrat"],
    coding_agent: ["coding", "code", "developer", "ide", "assistant"],
    browser_agent: ["browser", "playwright", "selenium", "web automation"],
    rag_framework: ["rag", "retrieval", "index", "document", "data framework"],
    vector_database: ["vector", "embedding", "ann", "search"],
    llm_gateway: ["gateway", "proxy", "router", "openai compatible"],
    llm_eval: ["eval", "evaluation", "benchmark", "test"],
    prompt_tooling: ["prompt"],
    workflow_automation: ["workflow", "automation", "orchestration"],
    local_llm_runtime: ["local", "inference", "llama", "gguf", "model serving"],
    ai_app_template: ["template", "starter", "boilerplate"],
    mcp_server: ["mcp", "model context protocol"],
    ai_observability: ["observability", "trace", "tracing", "monitoring"],
    other: []
  };

  const categoryHints = hints[category];
  return categoryHints.length === 0 || hasAny(text, categoryHints);
}

function categoryDistribution(projects: ProjectKnowledge[]): Record<Category, number> {
  const counts = Object.fromEntries(categories.map((category) => [category, 0])) as Record<Category, number>;
  for (const item of projects) {
    counts[item.agentCard.category] += 1;
  }
  return counts;
}

function issue(projectId: string, severity: QualitySeverity, code: string, message: string): QualityIssue {
  return { projectId, severity, code, message };
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
