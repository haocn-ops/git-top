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
  coverage: QualityCoverage;
  issues: QualityIssue[];
}

export interface LowConfidenceReviewItem {
  projectId: string;
  category: Category;
  classificationSignals: Array<{
    field: "category" | "deployment" | "difficulty" | "cloudflareReady";
    confidence: "high" | "medium" | "low";
    evidence: string[];
  }>;
  reasons: string[];
  suggestedAction: string;
}

export interface LowConfidenceReviewReport {
  projectCount: number;
  reviewCount: number;
  lowSignalCount: number;
  mediumSignalCount: number;
  categoryCounts: Record<Category, number>;
  items: LowConfidenceReviewItem[];
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
const classificationFields = ["category", "deployment", "difficulty", "cloudflareReady"] as const;

export interface QualityCoverage {
  categoryCoverage: Record<Category, number>;
  coveredCategories: number;
  totalCategories: number;
  missingCategories: Category[];
  lowConfidenceClassificationCount: number;
  lowConfidenceClassificationRate: number;
  staleProjectCount: number;
  staleProjectRate: number;
  cloudflareReadyCount: number;
  averageGitScore: number;
  averageMaintenanceScore: number;
}

export function buildQualityReport(projects: ProjectKnowledge[]): QualityReport {
  const issues = projects.flatMap(checkProject);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const distribution = categoryDistribution(projects);
  const penalty = errorCount * 10 + warningCount * 4 + issues.filter((issue) => issue.severity === "info").length;

  return {
    score: Math.max(0, Math.min(100, 100 - penalty)),
    projectCount: projects.length,
    issueCount: issues.length,
    errorCount,
    warningCount,
    categoryDistribution: distribution,
    coverage: buildCoverage(projects, distribution),
    issues
  };
}

export function buildLowConfidenceReviewReport(projects: ProjectKnowledge[]): LowConfidenceReviewReport {
  const items = projects
    .map(reviewItem)
    .filter((item): item is LowConfidenceReviewItem => item !== null)
    .sort((a, b) => b.reasons.length - a.reasons.length || a.projectId.localeCompare(b.projectId));
  const categoryCounts = Object.fromEntries(categories.map((category) => [category, 0])) as Record<Category, number>;
  for (const item of items) {
    categoryCounts[item.category] += 1;
  }

  return {
    projectCount: projects.length,
    reviewCount: items.length,
    lowSignalCount: items.reduce((count, item) => count + item.classificationSignals.filter((signal) => signal.confidence === "low").length, 0),
    mediumSignalCount: items.reduce((count, item) => count + item.classificationSignals.filter((signal) => signal.confidence === "medium").length, 0),
    categoryCounts,
    items
  };
}

function reviewItem(item: ProjectKnowledge): LowConfidenceReviewItem | null {
  const classification = item.agentCard.classification;
  const nonHighSignals: LowConfidenceReviewItem["classificationSignals"] = [];
  for (const field of classificationFields) {
    const signal = classification?.[field];
    if (signal && signal.confidence !== "high") {
      nonHighSignals.push({
        field,
        confidence: signal.confidence,
        evidence: signal.evidence
      });
    }
  }
  const signals = nonHighSignals.filter(isActionableClassificationSignal);
  const reasons = reviewReasons(item, signals);

  if (reasons.length === 0) {
    return null;
  }

  return {
    projectId: item.project.id,
    category: item.agentCard.category,
    classificationSignals: nonHighSignals,
    reasons,
    suggestedAction: suggestedReviewAction(item, signals, reasons)
  };
}

function isActionableClassificationSignal(signal: LowConfidenceReviewItem["classificationSignals"][number]): boolean {
  if (
    signal.field === "cloudflareReady" &&
    signal.confidence === "low" &&
    signal.evidence.some((item) => item.includes("No Cloudflare deployment signal detected."))
  ) {
    return false;
  }
  return signal.confidence === "low";
}

function reviewReasons(
  item: ProjectKnowledge,
  signals: LowConfidenceReviewItem["classificationSignals"]
): string[] {
  const reasons: string[] = [];
  if (signals.some((signal) => signal.confidence === "low")) {
    reasons.push("Contains low-confidence classification evidence.");
  }
  if (item.agentCard.category === "other") {
    reasons.push("Category is other.");
  }
  if (item.agentCard.projectKind === "collection") {
    reasons.push("Repository is a collection and may need curation semantics review.");
  }
  if (item.agentCard.cloudflareReady && signals.some((signal) => signal.field === "cloudflareReady" && signal.confidence !== "high")) {
    reasons.push("Cloudflare-ready classification is not high-confidence.");
  }
  if (signals.length > 0 && item.metrics.signalConfidence && Object.values(item.metrics.signalConfidence).some((confidence) => confidence === "unknown" || confidence === "estimated")) {
    reasons.push("Quality metrics include estimated or unknown signals.");
  }
  return reasons;
}

function suggestedReviewAction(
  item: ProjectKnowledge,
  signals: LowConfidenceReviewItem["classificationSignals"],
  reasons: string[]
): string {
  if (item.agentCard.category === "other") {
    return "Inspect README/topics and either assign a V1 category or remove from the curated seed list.";
  }
  if (item.agentCard.projectKind === "collection") {
    return "Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.";
  }
  if (signals.some((signal) => signal.field === "cloudflareReady")) {
    return "Verify Cloudflare runtime evidence and blockers, then update classification hints or overrides.";
  }
  if (reasons.some((reason) => reason.includes("Quality metrics"))) {
    return "Re-sync from GitHub with complete signal collection before relying on score movement.";
  }
  return "Inspect README, topics, and repository files; add an eval case if the classification is important.";
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

function buildCoverage(projects: ProjectKnowledge[], distribution: Record<Category, number>): QualityCoverage {
  const missingCategories = categories.filter((category) => category !== "other" && distribution[category] === 0);
  const lowConfidenceClassificationCount = projects.filter((item) =>
    Object.values(item.agentCard.classification ?? {}).some((signal) => signal?.confidence === "low")
  ).length;
  const staleProjectCount = projects.filter((item) => Date.now() - Date.parse(item.project.syncedAt) > 7 * 24 * 60 * 60 * 1000).length;
  const cloudflareReadyCount = projects.filter((item) => item.agentCard.cloudflareReady).length;

  return {
    categoryCoverage: distribution,
    coveredCategories: categories.filter((category) => category !== "other" && distribution[category] > 0).length,
    totalCategories: categories.length - 1,
    missingCategories,
    lowConfidenceClassificationCount,
    lowConfidenceClassificationRate: rate(lowConfidenceClassificationCount, projects.length),
    staleProjectCount,
    staleProjectRate: rate(staleProjectCount, projects.length),
    cloudflareReadyCount,
    averageGitScore: average(projects.map((item) => item.metrics.gitScore)),
    averageMaintenanceScore: average(projects.map((item) => item.metrics.maintenanceScore))
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function rate(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Number((count / total).toFixed(3));
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
