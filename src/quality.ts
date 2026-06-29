import { isReviewedCollection } from "./collection-policy";
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
  releaseScore: number;
  dataTrustScore: number;
  scoreSummary: QualityScoreSummary;
  riskLevel: QualityRiskLevel;
  riskSummary: QualityRiskSummary;
  improvementPlan: QualityImprovementPlanItem[];
  projectCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  categoryDistribution: Record<Category, number>;
  coverage: QualityCoverage;
  issues: QualityIssue[];
}

export interface QualityScoreSummary {
  releaseScoreMeaning: string;
  dataTrustScoreMeaning: string;
  riskLevelMeaning: string;
}

export type QualityRiskLevel = "low" | "medium" | "high";

export interface QualityRiskSummary {
  level: QualityRiskLevel;
  reasons: string[];
  lowConfidenceClassificationRate: number;
  collectionReviewRate: number;
  staleProjectRate: number;
  staleCollectionRate: number;
}

export interface QualityImprovementPlanItem {
  priority: "P0" | "P1" | "P2";
  title: string;
  reason: string;
  target: string;
  action: string;
  urls: string[];
}

export interface LowConfidenceReviewItem {
  projectId: string;
  category: Category;
  impactScore: number;
  impactFactors: string[];
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
const collectionScopes = ["awesome_list", "cookbook", "starter_collection", "integration_collection", "resource_hub"] as const;
const collectionFreshnessValues = ["active", "stale", "unknown"] as const;
const highIntentCategories = new Set<Category>(["agent_framework", "mcp_server", "rag_framework", "coding_agent", "browser_agent", "ai_app_template"]);
const highVisibilityProjectIds = new Set([
  "cloudflare/agents",
  "cloudflare/mcp-server-cloudflare",
  "github/github-mcp-server",
  "langchain-ai/langchain",
  "langchain-ai/langgraph",
  "modelcontextprotocol/servers",
  "openai/openai-agents-python",
  "run-llama/llama_index",
  "vercel/ai"
]);

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
  collectionCount: number;
  collectionRate: number;
  collectionScopeCounts: Record<(typeof collectionScopes)[number], number>;
  collectionFreshnessCounts: Record<(typeof collectionFreshnessValues)[number], number>;
  staleCollectionCount: number;
  collectionReviewCount: number;
}

export function buildQualityReport(projects: ProjectKnowledge[]): QualityReport {
  const projectIndex = new Map(projects.map((project) => [project.project.id.toLowerCase(), project]));
  const issues = projects.flatMap((project) => checkProject(project, projectIndex));
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const distribution = categoryDistribution(projects);
  const coverage = buildCoverage(projects, distribution);
  const riskSummary = buildRiskSummary(coverage, projects.length);
  const penalty = errorCount * 10 + warningCount * 4;
  const releaseScore = Math.max(0, Math.min(100, 100 - penalty));
  const dataTrustScore = buildDataTrustScore(coverage, projects.length);
  const improvementPlan = buildImprovementPlan(coverage, riskSummary, issues, projects.length);

  return {
    score: releaseScore,
    releaseScore,
    dataTrustScore,
    scoreSummary: {
      releaseScoreMeaning: "Release gate score. Errors and warnings reduce this score; info observations stay visible without lowering it.",
      dataTrustScoreMeaning: "Corpus trust score. Low-confidence classification, collection review load, stale project sync, and stale collection metadata reduce this score.",
      riskLevelMeaning: "Risk level is derived from corpus confidence thresholds and may be high even when the release gate has no blocking issues."
    },
    riskLevel: riskSummary.level,
    riskSummary,
    improvementPlan,
    projectCount: projects.length,
    issueCount: issues.length,
    errorCount,
    warningCount,
    categoryDistribution: distribution,
    coverage,
    issues
  };
}

function buildImprovementPlan(
  coverage: QualityCoverage,
  riskSummary: QualityRiskSummary,
  issues: QualityIssue[],
  projectCount: number
): QualityImprovementPlanItem[] {
  const plan: QualityImprovementPlanItem[] = [];
  const staleSyncCount = issues.filter((issue) => issue.code === "stale_sync").length;
  const weakAlternativesCount = issues.filter((issue) => issue.code === "weak_alternatives").length;
  const missingAlternativesCount = issues.filter((issue) => issue.code === "missing_alternatives").length;
  const collectionReviewRate = rate(coverage.collectionReviewCount, projectCount);

  if (staleSyncCount > 0 || coverage.staleProjectRate > 0) {
    plan.push({
      priority: coverage.staleProjectRate >= 0.1 ? "P0" : "P1",
      title: "Refresh stale project sync data",
      reason: `${staleSyncCount} projects are reported with stale sync observations; stale project rate is ${percent(coverage.staleProjectRate)}.`,
      target: "Reduce stale_project_rate below 10% and clear stale_sync observations for high-visibility projects.",
      action: "Run the production catch-up sync or targeted admin sync for stale high-traffic repositories, then re-run quality and smoke checks.",
      urls: ["/status", "/api/sync/status", "/operations", "/api/quality"]
    });
  }

  if (coverage.lowConfidenceClassificationCount > 0 || riskSummary.lowConfidenceClassificationRate >= 0.1) {
    plan.push({
      priority: riskSummary.lowConfidenceClassificationRate >= 0.25 ? "P0" : "P1",
      title: "Burn down low-confidence classifications",
      reason: `${coverage.lowConfidenceClassificationCount} projects include low-confidence classification signals; rate is ${percent(riskSummary.lowConfidenceClassificationRate)}.`,
      target: "Review high-impact low-confidence projects first and move flagship category/deployment evidence to high confidence.",
      action: "Use the review queue to inspect README/topics/evidence, add classification overrides for reviewed projects, and add eval coverage for recurring ambiguities.",
      urls: ["/quality/review", "/api/quality/review", "/docs#governance"]
    });
  }

  if (coverage.collectionReviewCount > 0 || collectionReviewRate >= 0.05) {
    plan.push({
      priority: collectionReviewRate >= 0.15 ? "P1" : "P2",
      title: "Review collection semantics",
      reason: `${coverage.collectionReviewCount} collections need curation, scope, item-count, or freshness review; collection review rate is ${percent(collectionReviewRate)}.`,
      target: "Keep collections useful for discovery without treating them as direct runtime choices.",
      action: "Confirm scope, curated status, freshness, and estimated item counts for collection/resource repositories; apply reviewed collection policy entries where appropriate.",
      urls: ["/coverage", "/quality/review", "/api/quality"]
    });
  }

  if (weakAlternativesCount > 0 || missingAlternativesCount > 0) {
    plan.push({
      priority: weakAlternativesCount + missingAlternativesCount >= 10 ? "P1" : "P2",
      title: "Strengthen alternatives evidence",
      reason: `${weakAlternativesCount} popular projects have weak same-category alternatives and ${missingAlternativesCount} popular projects are missing alternatives.`,
      target: "Improve direct replacement quality for high-traffic alternatives and comparison pages.",
      action: "Refresh generated alternatives, inspect same-category overlap, and add reviewed alternatives for high-visibility projects when generated matches are adjacent rather than direct substitutes.",
      urls: ["/alternatives", "/topics/alternatives-engine-guide", "/api/recipes"]
    });
  }

  if (plan.length === 0) {
    plan.push({
      priority: "P2",
      title: "Maintain quality gates",
      reason: "No major quality risk thresholds are currently exceeded.",
      target: "Keep release score above 90 and data trust risk low.",
      action: "Continue running quality, focused tests, API/MCP validation, and production smoke before deployments.",
      urls: ["/api/quality", "/status", "/roadmap"]
    });
  }

  return plan;
}

function buildDataTrustScore(coverage: QualityCoverage, projectCount: number): number {
  const collectionReviewRate = rate(coverage.collectionReviewCount, projectCount);
  const staleCollectionRate = rate(coverage.staleCollectionCount, Math.max(coverage.collectionCount, 1));
  const penalty =
    coverage.lowConfidenceClassificationRate * 40 +
    collectionReviewRate * 30 +
    coverage.staleProjectRate * 20 +
    staleCollectionRate * 10;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function buildLowConfidenceReviewReport(projects: ProjectKnowledge[]): LowConfidenceReviewReport {
  const items = projects
    .map(reviewItem)
    .filter((item): item is LowConfidenceReviewItem => item !== null)
    .sort((a, b) => b.impactScore - a.impactScore || b.reasons.length - a.reasons.length || a.projectId.localeCompare(b.projectId));
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
    ...reviewImpact(item, reasons),
    classificationSignals: nonHighSignals,
    reasons,
    suggestedAction: suggestedReviewAction(item, signals, reasons)
  };
}

function reviewImpact(item: ProjectKnowledge, reasons: string[]): Pick<LowConfidenceReviewItem, "impactScore" | "impactFactors"> {
  let score = 0;
  const factors: string[] = [];

  if (highVisibilityProjectIds.has(item.project.id.toLowerCase())) {
    score += 50;
    factors.push("Referenced in product examples or docs.");
  }
  if (highIntentCategories.has(item.agentCard.category)) {
    score += 20;
    factors.push("High-intent agent selection category.");
  }
  if (item.agentCard.cloudflareReady) {
    score += 18;
    factors.push("Cloudflare-ready answer surface.");
  }
  if (item.project.stars >= 50000) {
    score += 25;
    factors.push("Very high-star project.");
  } else if (item.project.stars >= 10000) {
    score += 16;
    factors.push("High-star project.");
  } else if (item.project.stars >= 1000) {
    score += 8;
    factors.push("Visible project by stars.");
  }
  if (item.metrics.gitScore >= 80) {
    score += 14;
    factors.push("High quality-score candidate.");
  } else if (item.metrics.gitScore >= 65) {
    score += 8;
    factors.push("Mid quality-score candidate.");
  }
  if (item.agentCard.projectKind === "collection" && !isReviewedCollection(item)) {
    score += 12;
    factors.push("Collection semantics need review.");
  }
  if (reasons.some((reason) => reason.includes("low-confidence"))) {
    score += 10;
    factors.push("Low-confidence classification evidence.");
  }
  if (reasons.some((reason) => reason.includes("Cloudflare-ready"))) {
    score += 10;
    factors.push("Cloudflare readiness ambiguity.");
  }

  return {
    impactScore: score,
    impactFactors: factors.length ? factors : ["Lower user-visible impact."]
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
  if (item.agentCard.projectKind === "collection" && !isReviewedCollection(item)) {
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

function checkProject(item: ProjectKnowledge, projectIndex: Map<string, ProjectKnowledge>): QualityIssue[] {
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

  if (!hasReviewedCategoryEvidence(item) && !categoryLooksPlausible(item.agentCard.category, text)) {
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
    issues.push(issue(projectId, "info", "stale_sync", "Project has not been synced in over 7 days."));
  }

  if (item.project.stars > 10000 && item.agentCard.alternatives.length === 0) {
    issues.push(issue(projectId, "info", "missing_alternatives", "Popular project has no alternatives."));
  }

  if (item.project.stars > 10000 && item.agentCard.alternatives.length > 0) {
    const hasSameCategoryAlternative = item.agentCard.alternatives.some((alternative) => {
      const alternativeProject = projectIndex.get(alternative.project_id.toLowerCase());
      return alternativeProject?.agentCard.category === item.agentCard.category;
    });

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

function hasReviewedCategoryEvidence(item: ProjectKnowledge): boolean {
  const evidence = item.agentCard.classification?.category?.evidence ?? [];
  return evidence.some((entry) => {
    const normalized = normalize(entry);
    return (
      normalized.includes("manual quality burn-down override") ||
      normalized.includes("manual product trust override") ||
      normalized.includes("curated category override")
    );
  });
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
  const collections = projects.filter((item) => item.agentCard.projectKind === "collection");
  const collectionScopeCounts = Object.fromEntries(collectionScopes.map((scope) => [scope, 0])) as QualityCoverage["collectionScopeCounts"];
  const collectionFreshnessCounts = Object.fromEntries(collectionFreshnessValues.map((freshness) => [freshness, 0])) as QualityCoverage["collectionFreshnessCounts"];
  for (const item of collections) {
    const metadata = item.agentCard.collectionMetadata;
    if (metadata?.scope && metadata.scope in collectionScopeCounts) {
      collectionScopeCounts[metadata.scope] += 1;
    }
    const freshness = metadata?.freshness ?? "unknown";
    collectionFreshnessCounts[freshness] += 1;
  }
  const staleCollectionCount = collections.filter((item) => item.agentCard.collectionMetadata?.freshness === "stale").length;
  const collectionReviewCount = collections.filter(needsCollectionReview).length;

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
    averageMaintenanceScore: average(projects.map((item) => item.metrics.maintenanceScore)),
    collectionCount: collections.length,
    collectionRate: rate(collections.length, projects.length),
    collectionScopeCounts,
    collectionFreshnessCounts,
    staleCollectionCount,
    collectionReviewCount
  };
}

function buildRiskSummary(coverage: QualityCoverage, projectCount: number): QualityRiskSummary {
  const collectionReviewRate = rate(coverage.collectionReviewCount, projectCount);
  const staleCollectionRate = rate(coverage.staleCollectionCount, Math.max(coverage.collectionCount, 1));
  const reasons: string[] = [];
  let riskScore = 0;

  if (coverage.lowConfidenceClassificationRate >= 0.25) {
    riskScore += 2;
    reasons.push("At least 25% of projects include low-confidence classification signals.");
  } else if (coverage.lowConfidenceClassificationRate >= 0.1) {
    riskScore += 1;
    reasons.push("At least 10% of projects include low-confidence classification signals.");
  }

  if (collectionReviewRate >= 0.15) {
    riskScore += 2;
    reasons.push("At least 15% of indexed projects are collections that need review.");
  } else if (collectionReviewRate >= 0.05) {
    riskScore += 1;
    reasons.push("At least 5% of indexed projects are collections that need review.");
  }

  if (coverage.staleProjectRate >= 0.1) {
    riskScore += 2;
    reasons.push("At least 10% of projects have stale sync data.");
  } else if (coverage.staleProjectRate > 0) {
    riskScore += 1;
    reasons.push("Some projects have stale sync data.");
  }

  if (staleCollectionRate >= 0.25) {
    riskScore += 1;
    reasons.push("At least 25% of collections are marked stale.");
  }

  return {
    level: riskScore >= 3 ? "high" : riskScore >= 1 ? "medium" : "low",
    reasons: reasons.length > 0 ? reasons : ["No major quality risk thresholds are currently exceeded."],
    lowConfidenceClassificationRate: coverage.lowConfidenceClassificationRate,
    collectionReviewRate,
    staleProjectRate: coverage.staleProjectRate,
    staleCollectionRate
  };
}

function needsCollectionReview(item: ProjectKnowledge): boolean {
  if (isReviewedCollection(item)) {
    return false;
  }
  const metadata = item.agentCard.collectionMetadata;
  return !metadata || !metadata.curated || metadata.estimatedItems === null || metadata.freshness !== "active";
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

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
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
