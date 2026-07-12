import { generateAlternativeMatches } from "./alternatives";
import { resolveProject } from "./project-aliases";
import { toProjectKnowledgeView, type ProjectKnowledgeView } from "./project-view";
import type { AgentCard, ClassificationSignal, Project, ProjectKnowledge, ProjectMetrics, ProjectKind } from "./types";

export interface ProjectFilters {
  q?: string;
  category?: string;
  deployment?: string;
  difficulty?: string;
  cloudflareReady?: boolean;
  language?: string;
  projectKind?: ProjectKind | string;
  minConfidence?: ClassificationSignal["confidence"] | string;
  ranking?: string;
  limit?: number;
  offset?: number;
}

export interface RecommendationQuery {
  useCase?: string;
  deployment?: string;
  difficulty?: string;
  language?: string;
  category?: string;
  license?: string;
  cloudflareReady?: boolean;
  limit?: number;
}

export interface Recommendation extends ProjectKnowledgeView {
  project_id: string;
  projectId: string;
  score: number;
  reason: string;
  reasons: string[];
  decision_summary: string;
  fit_profile: {
    primary_fit: string;
    deployment_fit: string;
    maturity: string;
    agent_readiness: string;
  };
  adoption_plan: string[];
  risk_flags: string[];
  tradeoffs: string[];
  next_actions: Array<{
    label: string;
    href: string;
    kind: "project" | "graph" | "alternatives" | "score" | "compare";
  }>;
  matched_constraints: Record<string, string | boolean>;
  unmatched_constraints: Record<string, string | boolean>;
  ranking_signals: {
    use_case_match: number;
    community: number;
    maintenance: number;
    readiness: number;
    license_fit: number;
  };
  confidence: "high" | "medium" | "low";
  confidence_reason: string;
  evidence: ProjectKnowledgeView["evidence"] & {
    classification: ReturnType<typeof toProjectKnowledgeView>["classification"];
    quality_signal_confidence: ReturnType<typeof toProjectKnowledgeView>["qualitySignalConfidence"];
    source_fields: string[];
    caveats: string[];
    recommendation_reasons: string[];
    ranking_signals: Recommendation["ranking_signals"];
    matched_constraints: Recommendation["matched_constraints"];
    unmatched_constraints: Recommendation["unmatched_constraints"];
  };
  caveats: string[];
  source_fields: string[];
  last_verified_at: string | null;
  project: Project;
  agent_card: AgentCard;
  metrics: ProjectMetrics;
}

export interface SearchResultContext {
  applied_filters: Record<string, string | boolean>;
  known_filter_values: {
    category: string[];
    deployment: string[];
    difficulty: string[];
    language: string[];
    project_kind: ProjectKind[];
    min_confidence: ClassificationSignal["confidence"][];
    cloudflare_ready: boolean[];
  };
  empty_reason?: string;
  suggestions?: string[];
  query_interpretation?: {
    original: string;
    normalized: string;
    transformations: string[];
  };
}

const defaultLimit = 20;
const multilingualSearchTerms: Array<[string, string]> = [
  ["浏览器自动化", "browser automation agent"],
  ["编程助手", "coding agent"],
  ["代码智能体", "coding agent"],
  ["向量数据库", "vector database"],
  ["检索增强", "rag retrieval"],
  ["模型网关", "llm gateway"],
  ["大模型网关", "llm gateway"],
  ["模型评测", "llm evaluation"],
  ["可观测性", "observability tracing"],
  ["工作流自动化", "workflow automation"],
  ["本地大模型", "local llm runtime"],
  ["智能体框架", "agent framework"],
  ["代理框架", "agent framework"],
  ["智能体", "agent"],
  ["服务器", "server"]
];
const searchTypoCorrections: Record<string, string> = {
  langchian: "langchain",
  clouldflare: "cloudflare",
  cloudfalre: "cloudflare",
  observabilty: "observability",
  evalution: "evaluation",
  brower: "browser",
  framwork: "framework"
};

export function getProjectKnowledgeFromList(projects: ProjectKnowledge[], id: string): ProjectKnowledge | null {
  const wanted = normalizeProjectId(id);
  return (
    projects.find((item) => {
      const aliases = [
        item.project.id,
        item.project.fullName,
        item.project.name,
        item.project.fullName.replace("/", "-"),
        item.project.fullName.replace("/", "--")
      ].map(normalizeProjectId);
      return aliases.includes(wanted);
    }) ?? null
  );
}

export function searchProjectList(projects: ProjectKnowledge[], filters: ProjectFilters): ProjectKnowledge[] {
  const limit = clampLimit(filters.limit);
  const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
  const interpretation = interpretSearchQuery(filters.q);
  const alias = /^[a-z0-9_.\/-]+$/iu.test(interpretation.normalized) ? resolveProject(projects, interpretation.normalized) : null;
  const query = normalize(alias?.resolvedId ?? interpretation.normalized);
  const queryWords = queryTokens(query);
  const browseMode = filters.ranking === "browse" && isBrowseRankingQuery(filters, queryWords, limit);

  return projects
    .map((item) => {
      if (filters.category && item.agentCard.category !== filters.category) {
        return null;
      }
      if (filters.deployment && !item.agentCard.deployment.includes(filters.deployment as never)) {
        return null;
      }
      if (filters.difficulty && item.agentCard.difficulty !== filters.difficulty) {
        return null;
      }
      if (typeof filters.cloudflareReady === "boolean" && item.agentCard.cloudflareReady !== filters.cloudflareReady) {
        return null;
      }
      if (filters.language && normalize(item.project.language) !== normalize(filters.language)) {
        return null;
      }
      if (filters.projectKind && (item.agentCard.projectKind ?? "project") !== filters.projectKind) {
        return null;
      }
      if (filters.minConfidence && !meetsMinimumClassificationConfidence(item, filters.minConfidence)) {
        return null;
      }
      if (!query) {
        return { item, score: item.metrics.gitScore };
      }

      const haystack = normalize(
        [
          item.project.name,
          item.project.fullName,
          item.project.description,
          item.project.language,
          item.project.topics.join(" "),
          item.agentCard.category,
          item.agentCard.projectKind,
          item.agentCard.deployment.join(" "),
          item.agentCard.collectionMetadata?.scope,
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );

      const score = browseMode ? browseModeQueryScore(query, queryWords, haystack, item) : queryMatchScore(query, queryWords, haystack, item);
      return score > 0 ? { item, score } : null;
    })
    .filter(isSearchHit)
    .sort((a, b) => b.score - a.score || byGitScore(a.item, b.item))
    .map(({ item }) => item)
    .slice(offset, offset + limit);
}

export function describeSearchResult(projects: ProjectKnowledge[], filters: ProjectFilters, resultCount: number): SearchResultContext {
  const appliedFilters: Record<string, string | boolean> = {};
  if (filters.q) {
    appliedFilters.q = filters.q;
  }
  if (filters.category) {
    appliedFilters.category = filters.category;
  }
  if (filters.deployment) {
    appliedFilters.deployment = filters.deployment;
  }
  if (filters.difficulty) {
    appliedFilters.difficulty = filters.difficulty;
  }
  if (filters.language) {
    appliedFilters.language = filters.language;
  }
  if (filters.projectKind) {
    appliedFilters.project_kind = filters.projectKind;
  }
  if (filters.minConfidence) {
    appliedFilters.min_confidence = filters.minConfidence;
  }
  if (typeof filters.cloudflareReady === "boolean") {
    appliedFilters.cloudflare_ready = filters.cloudflareReady;
  }

  const knownFilterValues = {
    category: sortedUnique(projects.map((item) => item.agentCard.category)),
    deployment: sortedUnique(projects.flatMap((item) => item.agentCard.deployment)),
    difficulty: sortedUnique(projects.map((item) => item.agentCard.difficulty)),
    language: sortedUnique(projects.map((item) => item.project.language).filter((value): value is string => Boolean(value))),
    project_kind: ["project", "collection"] as ProjectKind[],
    min_confidence: ["low", "medium", "high"] as ClassificationSignal["confidence"][],
    cloudflare_ready: [false, true]
  };
  const interpretation = interpretSearchQuery(filters.q);
  const queryInterpretation = interpretation.transformations.length > 0 ? { query_interpretation: interpretation } : {};

  if (resultCount > 0) {
    return {
      applied_filters: appliedFilters,
      known_filter_values: knownFilterValues,
      ...queryInterpretation
    };
  }

  const suggestions: string[] = [];
  if (filters.category && !knownFilterValues.category.includes(filters.category)) {
    const nearest = nearestFilterValue(filters.category, knownFilterValues.category);
    suggestions.push(nearest ? `Unknown category '${filters.category}'. Try category='${nearest}'.` : `Unknown category '${filters.category}'.`);
  }
  if (filters.deployment && !knownFilterValues.deployment.includes(filters.deployment)) {
    const nearest = nearestFilterValue(filters.deployment, knownFilterValues.deployment);
    suggestions.push(nearest ? `Unknown deployment '${filters.deployment}'. Try deployment='${nearest}'.` : `Unknown deployment '${filters.deployment}'.`);
  }
  if (filters.difficulty && !knownFilterValues.difficulty.includes(filters.difficulty)) {
    const nearest = nearestFilterValue(filters.difficulty, knownFilterValues.difficulty);
    suggestions.push(nearest ? `Unknown difficulty '${filters.difficulty}'. Try difficulty='${nearest}'.` : `Unknown difficulty '${filters.difficulty}'.`);
  }
  if (filters.language && !knownFilterValues.language.map(normalize).includes(normalize(filters.language))) {
    const nearest = nearestFilterValue(filters.language, knownFilterValues.language);
    suggestions.push(nearest ? `Unknown language '${filters.language}'. Try language='${nearest}'.` : `Unknown language '${filters.language}'.`);
  }
  if (filters.projectKind && !knownFilterValues.project_kind.includes(filters.projectKind as ProjectKind)) {
    const nearest = nearestFilterValue(filters.projectKind, knownFilterValues.project_kind);
    suggestions.push(nearest ? `Unknown project_kind '${filters.projectKind}'. Try project_kind='${nearest}'.` : `Unknown project_kind '${filters.projectKind}'.`);
  }
  if (filters.minConfidence && !knownFilterValues.min_confidence.includes(filters.minConfidence as ClassificationSignal["confidence"])) {
    const nearest = nearestFilterValue(filters.minConfidence, knownFilterValues.min_confidence);
    suggestions.push(nearest ? `Unknown min_confidence '${filters.minConfidence}'. Try min_confidence='${nearest}'.` : `Unknown min_confidence '${filters.minConfidence}'.`);
  }
  if (Object.keys(appliedFilters).length > 1) {
    suggestions.push("Relax one filter at a time, or use ranking='browse' for broad category/deployment discovery.");
  }
  if (filters.q && !filters.ranking) {
    suggestions.push("Use q for REST search and query for MCP search_projects; the REST API also accepts query as an alias.");
  }

  return {
    applied_filters: appliedFilters,
    known_filter_values: knownFilterValues,
    empty_reason:
      suggestions.length > 0
        ? "No projects matched the requested query and filters; at least one filter may be unknown or the intersection may be empty."
        : "No projects matched the requested query and filters.",
    suggestions,
    ...queryInterpretation
  };
}

export function interpretSearchQuery(value: string | undefined): { original: string; normalized: string; transformations: string[] } {
  const original = (value ?? "").trim();
  let normalized = original.toLowerCase();
  const transformations: string[] = [];
  for (const [source, target] of multilingualSearchTerms) {
    if (normalized.includes(source)) {
      normalized = normalized.replaceAll(source, ` ${target} `);
      transformations.push(`${source} -> ${target}`);
    }
  }
  normalized = normalized.replace(/[\s]+/gu, " ").trim();
  normalized = normalized
    .split(" ")
    .map((token) => {
      const correction = searchTypoCorrections[token];
      if (correction) {
        transformations.push(`${token} -> ${correction}`);
        return correction;
      }
      return token;
    })
    .join(" ");
  return { original, normalized, transformations: [...new Set(transformations)] };
}

export function getTrendingFromList(projects: ProjectKnowledge[], filters: Pick<ProjectFilters, "category" | "limit">): ProjectKnowledge[] {
  return searchProjectList(projects, { category: filters.category, limit: filters.limit });
}

export function recommendProjectList(projects: ProjectKnowledge[], query: RecommendationQuery): Recommendation[] {
  const limit = clampLimit(query.limit, 5);
  const useCase = normalize(query.useCase);
  const candidates = searchProjectList(projects, {
    category: query.category,
    deployment: query.deployment,
    difficulty: query.difficulty,
    language: query.language,
    cloudflareReady: query.cloudflareReady,
    limit: 100
  });

  return candidates
    .map((item) => {
      const text = normalize(
        [
          item.project.description,
          item.project.topics.join(" "),
          item.agentCard.category,
          item.project.license,
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );

      const useCaseScore = useCase ? keywordOverlapScore(useCase, text) : 20;
      const readiness = readinessBoost(item, query);
      const licenseFit = licenseFitBoost(item, query);
      const rankingSignals = {
        use_case_match: useCaseScore,
        community: item.metrics.gitScore,
        maintenance: item.metrics.maintenanceScore,
        readiness,
        license_fit: licenseFit
      };
      const score = Math.round(
        useCaseScore * 0.4 + item.metrics.gitScore * 0.25 + item.metrics.maintenanceScore * 0.2 + readiness * 0.05 + licenseFit * 0.1
      );
      const matchedConstraints = recommendationMatchedConstraints(item, query);
      const unmatchedConstraints = recommendationUnmatchedConstraints(item, query);
      const reasons = buildRecommendationReasons(item, query, rankingSignals, matchedConstraints, unmatchedConstraints);
      const tradeoffs = buildRecommendationTradeoffs(item, query, unmatchedConstraints);
      const confidence = recommendationConfidence(score, rankingSignals, matchedConstraints, unmatchedConstraints, query);
      const projectView = toProjectKnowledgeView(item);
      const caveats = sortedUnique([...tradeoffs, ...buildRecommendationRiskFlags(item, query, rankingSignals, unmatchedConstraints, confidence), ...projectView.caveats]).slice(0, 8);
      const sourceFields = sortedUnique([...projectView.sourceFields, "recommendation.query", "recommendation.ranking_signals", "recommendation.constraints"]);
      const recommendationConfidenceReason = buildRecommendationConfidenceReason(
        confidence,
        score,
        rankingSignals,
        matchedConstraints,
        unmatchedConstraints,
        projectView.confidenceReason
      );

      return {
        ...projectView,
        project_id: item.project.id,
        projectId: item.project.id,
        score,
        reason: reasons.join(" "),
        reasons,
        decision_summary: buildRecommendationDecisionSummary(item, score, query, matchedConstraints, unmatchedConstraints),
        fit_profile: buildRecommendationFitProfile(item, query, rankingSignals, matchedConstraints, unmatchedConstraints),
        adoption_plan: buildRecommendationAdoptionPlan(item, query, matchedConstraints, unmatchedConstraints),
        risk_flags: buildRecommendationRiskFlags(item, query, rankingSignals, unmatchedConstraints, confidence),
        tradeoffs,
        next_actions: buildRecommendationNextActions(item),
        matched_constraints: matchedConstraints,
        unmatched_constraints: unmatchedConstraints,
        ranking_signals: rankingSignals,
        confidence,
        confidence_reason: recommendationConfidenceReason,
        evidence: {
          classification: projectView.classification,
          quality_signal_confidence: projectView.qualitySignalConfidence,
          source_fields: sourceFields,
          caveats,
          recommendation_reasons: reasons,
          ranking_signals: rankingSignals,
          matched_constraints: matchedConstraints,
          unmatched_constraints: unmatchedConstraints,
          confidence_reason: recommendationConfidenceReason,
          last_verified_at: projectView.lastVerifiedAt
        },
        caveats,
        source_fields: sourceFields,
        last_verified_at: projectView.lastVerifiedAt,
        project: item.project,
        agent_card: item.agentCard,
        metrics: item.metrics
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findAlternativesFromList(projects: ProjectKnowledge[], id: string, limit = 5): ProjectKnowledge[] {
  const project = getProjectKnowledgeFromList(projects, id);
  if (!project) {
    return [];
  }
  return generateAlternativeMatches(project, projects, clampLimit(limit, 5)).map((match) => match.project);
}

export function findRelatedProjectsFromList(projects: ProjectKnowledge[], id: string, limit = 8): ProjectKnowledge[] {
  const project = getProjectKnowledgeFromList(projects, id);
  if (!project) {
    return [];
  }
  const alternativeIds = new Set(project.agentCard.alternatives.map((item) => item.project_id.toLowerCase()));
  const projectText = projectRelationText(project);

  return projects
    .filter((item) => item.project.id !== project.project.id)
    .map((item) => {
      const sameCategory = item.agentCard.category === project.agentCard.category ? 34 : 0;
      const sharedDeployments = sharedCount(item.agentCard.deployment, project.agentCard.deployment) * 13;
      const sharedTopics = sharedCount(item.project.topics, project.project.topics) * 9;
      const sharedUseCases = sharedCount(item.agentCard.useCases, project.agentCard.useCases) * 8;
      const dependencyOverlap = sharedCount(inferredDependencyTerms(item), inferredDependencyTerms(project)) * 12;
      const textOverlap = keywordOverlapScore(projectText, projectRelationText(item)) * 0.12;
      const explicitAlternativePenalty = alternativeIds.has(item.project.id.toLowerCase()) ? -24 : 0;
      const qualityBoost = item.metrics.gitScore * 0.12 + item.metrics.maintenanceScore * 0.08;
      return {
        item,
        score: sameCategory + sharedDeployments + sharedTopics + sharedUseCases + dependencyOverlap + textOverlap + explicitAlternativePenalty + qualityBoost
      };
    })
    .filter((entry) => entry.score > 10)
    .sort((a, b) => b.score - a.score || byGitScore(a.item, b.item))
    .slice(0, clampLimit(limit, 8))
    .map(({ item }) => item);
}

function buildRecommendationReasons(
  item: ProjectKnowledge,
  query: RecommendationQuery,
  rankingSignals: Recommendation["ranking_signals"],
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"]
): string[] {
  const parts = [item.agentCard.summaryForAgent];
  if (query.useCase) {
    parts.push(`Use-case match is ${rankingSignals.use_case_match}/100 for "${query.useCase}".`);
  }
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    parts.push(`It matches the requested ${query.deployment} deployment target.`);
  }
  if (query.category && item.agentCard.category === query.category) {
    parts.push(`It is classified as ${query.category}.`);
  }
  if (query.license && matchedConstraints.license) {
    parts.push(`Its license matches ${query.license}.`);
  }
  if (query.cloudflareReady && item.agentCard.cloudflareReady) {
    parts.push("It is marked Cloudflare-ready.");
  }
  if (query.difficulty && item.agentCard.difficulty === query.difficulty) {
    parts.push(`Its difficulty is ${query.difficulty}.`);
  }
  if (Object.keys(unmatchedConstraints).length > 0) {
    parts.push(`Unmatched constraints: ${Object.keys(unmatchedConstraints).join(", ")}.`);
  }
  parts.push(`Ranking signals: community ${rankingSignals.community}/100, maintenance ${rankingSignals.maintenance}/100.`);
  return parts;
}

function buildRecommendationDecisionSummary(
  item: ProjectKnowledge,
  score: number,
  query: RecommendationQuery,
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"]
): string {
  const matched = Object.keys(matchedConstraints);
  const unmatched = Object.keys(unmatchedConstraints);
  const context = query.useCase ? ` for "${query.useCase}"` : "";
  if (unmatched.length === 0 && matched.length > 0) {
    if (score >= 65) {
      return `${item.project.fullName} is a strong candidate${context}: recommendation score ${score}/100 with matched ${matched.join(", ")} constraints.`;
    }
    return `${item.project.fullName} is an exploration candidate${context}: recommendation score ${score}/100 with matched constraints, but quality and maturity signals need review.`;
  }
  if (unmatched.length > 0) {
    return `${item.project.fullName} is a conditional candidate${context}: recommendation score ${score}/100, but review ${unmatched.join(", ")} before adopting.`;
  }
  return `${item.project.fullName} is ranked by Git.Top fit signals${context}: recommendation score ${score}/100.`;
}

function buildRecommendationFitProfile(
  item: ProjectKnowledge,
  query: RecommendationQuery,
  rankingSignals: Recommendation["ranking_signals"],
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"]
): Recommendation["fit_profile"] {
  const primaryFit = query.useCase
    ? rankingSignals.use_case_match >= 60
      ? `Strong use-case overlap for "${query.useCase}".`
      : rankingSignals.use_case_match >= 30
        ? `Partial use-case overlap for "${query.useCase}"; validate the target workflow.`
        : `Weak indexed use-case overlap for "${query.useCase}"; inspect graph and README evidence.`
    : `Ranked within ${item.agentCard.category} using quality and readiness signals.`;
  const deploymentFit = query.deployment
    ? matchedConstraints.deployment
      ? `Matches requested ${query.deployment} deployment.`
      : `Does not explicitly list ${query.deployment}; indexed deployments are ${item.agentCard.deployment.join(", ")}.`
    : item.agentCard.deployment.length
      ? `Supports ${item.agentCard.deployment.slice(0, 3).join(", ")} deployment paths.`
      : "No indexed deployment target.";
  const maturity =
    rankingSignals.community >= 70 && rankingSignals.maintenance >= 60
      ? "High maturity signal from community and maintenance scores."
      : rankingSignals.maintenance >= 50
        ? "Moderate maturity signal; maintenance is acceptable but compare community adoption."
        : "Early or uneven maturity signal; review maintenance history before adoption.";
  const agentReadiness =
    item.agentCard.useCases.length > 0 && item.agentCard.summaryForAgent
      ? "Agent-readable summary and use cases are available."
      : Object.keys(unmatchedConstraints).length > 0
        ? "Agent should cite unmatched constraints before recommending."
        : "Agent-readable metadata is partial; inspect project and score evidence.";
  return {
    primary_fit: primaryFit,
    deployment_fit: deploymentFit,
    maturity,
    agent_readiness: agentReadiness
  };
}

function buildRecommendationAdoptionPlan(
  item: ProjectKnowledge,
  query: RecommendationQuery,
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"]
): string[] {
  const plan = [
    `Open /projects/${item.project.id} to verify license, language, classification evidence, and quality signal confidence.`,
    `Inspect /graph/${item.project.id} for dependencies, related projects, deployment targets, and alternatives.`
  ];
  if (Object.keys(unmatchedConstraints).length > 0) {
    plan.push(`Resolve unmatched constraints before adoption: ${Object.keys(unmatchedConstraints).join(", ")}.`);
  } else if (Object.keys(matchedConstraints).length > 0) {
    plan.push(`Use the matched constraints (${Object.keys(matchedConstraints).join(", ")}) as the initial acceptance checklist.`);
  }
  if (query.deployment || item.agentCard.deployment.length > 0) {
    plan.push(`Prototype the ${query.deployment ?? item.agentCard.deployment[0]} deployment path before committing to a migration.`);
  }
  plan.push(`Compare against /alternatives/${item.project.id} before final selection.`);
  return plan.slice(0, 5);
}

function buildRecommendationNextActions(item: ProjectKnowledge): Recommendation["next_actions"] {
  const repo = item.project.id;
  return [
    { label: "Open project knowledge", href: `/projects/${repo}`, kind: "project" },
    { label: "Inspect graph", href: `/graph/${repo}`, kind: "graph" },
    { label: "Find alternatives", href: `/alternatives/${repo}`, kind: "alternatives" },
    { label: "Explain score", href: `/score/${repo}`, kind: "score" },
    { label: "Compare shortlist", href: `/compare/${repo}`, kind: "compare" }
  ];
}

function recommendationMatchedConstraints(item: ProjectKnowledge, query: RecommendationQuery): Record<string, string | boolean> {
  const matched: Record<string, string | boolean> = {};
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    matched.deployment = query.deployment;
  }
  if (query.category && item.agentCard.category === query.category) {
    matched.category = query.category;
  }
  if (query.difficulty && item.agentCard.difficulty === query.difficulty) {
    matched.difficulty = query.difficulty;
  }
  if (query.language && normalize(item.project.language) === normalize(query.language)) {
    matched.language = item.project.language ?? query.language;
  }
  if (typeof query.cloudflareReady === "boolean" && item.agentCard.cloudflareReady === query.cloudflareReady) {
    matched.cloudflare_ready = query.cloudflareReady;
  }
  if (query.license && licenseFitBoost(item, query) === 100) {
    matched.license = item.project.license ?? query.license;
  }
  return matched;
}

function recommendationUnmatchedConstraints(item: ProjectKnowledge, query: RecommendationQuery): Record<string, string | boolean> {
  const unmatched: Record<string, string | boolean> = {};
  if (query.deployment && !item.agentCard.deployment.includes(query.deployment as never)) {
    unmatched.deployment = query.deployment;
  }
  if (query.category && item.agentCard.category !== query.category) {
    unmatched.category = query.category;
  }
  if (query.difficulty && item.agentCard.difficulty !== query.difficulty) {
    unmatched.difficulty = query.difficulty;
  }
  if (query.language && normalize(item.project.language) !== normalize(query.language)) {
    unmatched.language = query.language;
  }
  if (typeof query.cloudflareReady === "boolean" && item.agentCard.cloudflareReady !== query.cloudflareReady) {
    unmatched.cloudflare_ready = query.cloudflareReady;
  }
  if (query.license && licenseFitBoost(item, query) !== 100) {
    unmatched.license = query.license;
  }
  return unmatched;
}

function buildRecommendationTradeoffs(
  item: ProjectKnowledge,
  query: RecommendationQuery,
  unmatchedConstraints: Recommendation["unmatched_constraints"]
): string[] {
  const tradeoffs = [...item.agentCard.notGoodFor.slice(0, 2)];
  if (query.license && unmatchedConstraints.license) {
    tradeoffs.push(`License is ${item.project.license ?? "unknown"}, not an exact ${query.license} match.`);
  }
  if (query.deployment && unmatchedConstraints.deployment) {
    tradeoffs.push(`Deployment targets do not explicitly include ${query.deployment}.`);
  }
  if (query.useCase && item.agentCard.useCases.length === 0) {
    tradeoffs.push("No structured use cases are available for this project yet.");
  }
  return sortedUnique(tradeoffs).slice(0, 4);
}

function buildRecommendationRiskFlags(
  item: ProjectKnowledge,
  query: RecommendationQuery,
  rankingSignals: Recommendation["ranking_signals"],
  unmatchedConstraints: Recommendation["unmatched_constraints"],
  confidence: Recommendation["confidence"]
): string[] {
  const risks: string[] = [];
  if (Object.keys(unmatchedConstraints).length > 0) {
    risks.push(`Unmatched constraints: ${Object.keys(unmatchedConstraints).join(", ")}.`);
  }
  if (confidence === "low") {
    risks.push("Low recommendation confidence; use as a discovery lead, not a final choice.");
  }
  if (rankingSignals.maintenance < 40) {
    risks.push("Maintenance signal is weak; inspect recent commits, releases, and issues.");
  }
  if (query.useCase && rankingSignals.use_case_match < 35) {
    risks.push("Use-case overlap is weak in indexed text.");
  }
  if (item.agentCard.projectKind === "collection") {
    risks.push("This is a collection/resource hub, not a single installable project.");
  }
  if (query.cloudflareReady && !item.agentCard.cloudflareReady) {
    risks.push("Cloudflare-ready constraint is not satisfied.");
  }
  return sortedUnique(risks).slice(0, 5);
}

function recommendationConfidence(
  score: number,
  rankingSignals: Recommendation["ranking_signals"],
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"],
  query: RecommendationQuery
): Recommendation["confidence"] {
  const requestedConstraintCount = [query.deployment, query.category, query.difficulty, query.language, query.license, typeof query.cloudflareReady === "boolean" ? query.cloudflareReady : undefined].filter(
    (value) => value !== undefined && value !== null && value !== ""
  ).length;
  const unmatchedCount = Object.keys(unmatchedConstraints).length;
  if (unmatchedCount > 0) {
    return unmatchedCount >= Math.max(1, requestedConstraintCount) ? "low" : "medium";
  }
  if (
    score >= 65 &&
    rankingSignals.use_case_match >= 60 &&
    rankingSignals.maintenance >= 40 &&
    Object.keys(matchedConstraints).length >= Math.max(1, requestedConstraintCount)
  ) {
    return "high";
  }
  if (score >= 45 && (rankingSignals.use_case_match >= 50 || (rankingSignals.community >= 60 && rankingSignals.maintenance >= 50))) {
    return "medium";
  }
  return "low";
}

function buildRecommendationConfidenceReason(
  confidence: Recommendation["confidence"],
  score: number,
  rankingSignals: Recommendation["ranking_signals"],
  matchedConstraints: Recommendation["matched_constraints"],
  unmatchedConstraints: Recommendation["unmatched_constraints"],
  projectConfidenceReason: string
): string {
  const matched = Object.keys(matchedConstraints);
  const unmatched = Object.keys(unmatchedConstraints);
  if (confidence === "high") {
    return `High confidence because the ${score}/100 recommendation has strong use-case overlap, usable maintenance, and matched constraints (${matched.join(", ") || "quality fit"}); ${projectConfidenceReason}`;
  }
  if (confidence === "medium") {
    return `Medium confidence because the ${score}/100 recommendation is usable but ${unmatched.length ? `unmatched constraints need review (${unmatched.join(", ")})` : "quality or maturity evidence should be reviewed"}; ${projectConfidenceReason}`;
  }
  return `Low confidence because the recommendation score is ${score}/100, use-case match is ${rankingSignals.use_case_match}/100, or constraints are weakly matched; ${projectConfidenceReason}`;
}

function projectRelationText(item: ProjectKnowledge): string {
  return normalize(
    [
      item.project.name,
      item.project.fullName,
      item.project.description,
      item.project.topics.join(" "),
      item.agentCard.category,
      item.agentCard.deployment.join(" "),
      item.agentCard.useCases.join(" "),
      item.agentCard.summaryForAgent
    ].join(" ")
  );
}

function inferredDependencyTerms(item: ProjectKnowledge): string[] {
  const text = projectRelationText(item);
  const dependencies: string[] = [];
  if (text.includes("mcp")) dependencies.push("mcp");
  if (text.includes("cloudflare") || text.includes("workers")) dependencies.push("cloudflare-workers");
  if (text.includes("rag") || text.includes("retrieval")) dependencies.push("vector-database");
  if (text.includes("browser") || text.includes("playwright") || text.includes("chromium")) dependencies.push("browser-automation");
  if (text.includes("llm") || text.includes("agent")) dependencies.push("llm-provider");
  return dependencies;
}

function readinessBoost(item: ProjectKnowledge, query: RecommendationQuery): number {
  let score = 0;
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    score += 60;
  }
  if (query.cloudflareReady && item.agentCard.cloudflareReady) {
    score += 40;
  }
  return Math.min(100, score);
}

function licenseFitBoost(item: ProjectKnowledge, query: RecommendationQuery): number {
  if (!query.license) {
    return 0;
  }
  const projectLicense = normalize(item.project.license);
  const requested = normalize(query.license);
  if (!projectLicense || !requested) {
    return 0;
  }
  return projectLicense.includes(requested) || requested.includes(projectLicense) ? 100 : 0;
}

function keywordOverlapScore(query: string, text: string): number {
  const words = queryTokens(query);
  if (words.length === 0) {
    return 0;
  }

  const hits = words.filter((word) => text.includes(word)).length;
  return Math.round((hits / words.length) * 100);
}

function queryMatchScore(query: string, words: string[], haystack: string, item: ProjectKnowledge): number {
  const identityBoost = exactIdentityBoost(query, item);
  const intentBoost = queryIntentFieldBoost(words, item);
  if (haystack.includes(query)) {
    return 1000 + identityBoost + intentBoost + item.metrics.gitScore;
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;

  return hits * 120 + deploymentHits * 80 + topicHits * 60 + categoryHits * 60 + identityBoost + intentBoost + specificIntentBoost(words, item) + collectionIntentBoost(words, item) + item.metrics.gitScore;
}

function exactIdentityBoost(query: string, item: ProjectKnowledge): number {
  const normalizedQuery = normalizeIdentity(query);
  const fullName = normalizeIdentity(item.project.fullName);
  const name = normalizeIdentity(item.project.name);
  const authority = item.metrics.gitScore * 4 + Math.min(400, Math.log2(Math.max(1, item.project.stars) + 1) * 25);

  if (!normalizedQuery) {
    return 0;
  }
  if (normalizedQuery === fullName) {
    return 7000 + authority;
  }
  if (normalizedQuery === name) {
    return 4200 + authority;
  }
  return 0;
}

function queryIntentFieldBoost(words: string[], item: ProjectKnowledge): number {
  const intentWords = words.filter((word) => !broadProbeWords.has(word));
  if (intentWords.length === 0) {
    return 0;
  }

  const identityText = normalize([item.project.owner, item.project.name, item.project.fullName].join(" "));
  const topicText = normalize(item.project.topics.join(" "));
  const useCaseText = normalize(item.agentCard.useCases.join(" "));
  const summaryText = normalize(item.agentCard.summaryForAgent);
  const descriptionText = normalize(item.project.description);

  const identityHits = intentWords.filter((word) => identityText.includes(word)).length;
  const topicHits = intentWords.filter((word) => topicText.includes(word)).length;
  const useCaseHits = intentWords.filter((word) => useCaseText.includes(word)).length;
  const summaryHits = intentWords.filter((word) => summaryText.includes(word)).length;
  const descriptionHits = intentWords.filter((word) => descriptionText.includes(word)).length;

  return identityHits * 420 + topicHits * 300 + useCaseHits * 220 + summaryHits * 180 + descriptionHits * 90;
}

function specificIntentBoost(words: string[], item: ProjectKnowledge): number {
  const identityText = normalize([item.project.owner, item.project.name, item.project.fullName, item.project.topics.join(" ")].join(" "));
  const specificHits = words.filter((word) => !specificIntentStopWords.has(word) && identityText.includes(word)).length;
  return specificHits * 480 + ownerProjectPairBoost(words, item);
}

function ownerProjectPairBoost(words: string[], item: ProjectKnowledge): number {
  const owner = normalize(item.project.owner);
  if (!words.includes(owner)) {
    return 0;
  }

  const projectTokens = queryTokens(item.project.name);
  const matchesProjectName = projectTokens.some((token) => words.some((word) => token === word || token.replace(/s$/, "") === word || token.includes(word)));
  return matchesProjectName ? 900 : 0;
}

function collectionIntentBoost(words: string[], item: ProjectKnowledge): number {
  if (item.agentCard.projectKind !== "collection") {
    return 0;
  }

  const collectionIntentWords = ["awesome", "collection", "collections", "cookbook", "cookbooks", "examples", "resources"];
  const hasCollectionIntent = words.some((word) => collectionIntentWords.includes(word));
  if (!hasCollectionIntent) {
    return 0;
  }

  const scope = item.agentCard.collectionMetadata?.scope;
  if (scope === "awesome_list") {
    return 180;
  }
  if (scope === "cookbook" || scope === "resource_hub") {
    return 140;
  }
  return 100;
}

function browseModeQueryScore(query: string, words: string[], haystack: string, item: ProjectKnowledge): number {
  const qualityScore = browseModeQualityScore(item);
  const intentBoost = queryIntentFieldBoost(words, item);
  if (haystack.includes(query)) {
    return 220 + intentBoost + qualityScore;
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;

  return hits * 70 + deploymentHits * 70 + topicHits * 45 + categoryHits * 65 + intentBoost + specificIntentBoost(words, item) + collectionIntentBoost(words, item) + qualityScore;
}

function isBrowseRankingQuery(filters: ProjectFilters, words: string[], limit: number): boolean {
  if (limit < 8 || filters.difficulty || filters.language || filters.projectKind || filters.minConfidence || typeof filters.cloudflareReady === "boolean") {
    return false;
  }
  if (!filters.category && !filters.deployment) {
    return false;
  }

  const filterWords = new Set([...queryTokens(filters.category ?? ""), ...queryTokens(filters.deployment ?? "")]);
  const specificWords = words.filter((word) => !broadProbeWords.has(word) && !filterWords.has(word));
  return specificWords.length === 0;
}

function browseModeQualityScore(item: ProjectKnowledge): number {
  return item.metrics.gitScore * 8 + item.metrics.maintenanceScore * 1.5 + Math.min(120, item.project.stars / 1000);
}

function queryTokens(query: string): string[] {
  return query
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2);
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function nearestFilterValue(value: string, knownValues: string[]): string | null {
  const normalized = normalize(value);
  return knownValues.find((known) => normalize(known).includes(normalized) || normalized.includes(normalize(known))) ?? null;
}

function isSearchHit(value: { item: ProjectKnowledge; score: number } | null): value is { item: ProjectKnowledge; score: number } {
  return value !== null;
}

function meetsMinimumClassificationConfidence(item: ProjectKnowledge, confidence: string): boolean {
  const minimum = confidenceRank(confidence);
  if (minimum === null) {
    return false;
  }

  const classification = item.agentCard.classification;
  const signals = [classification?.category, classification?.deployment, classification?.difficulty, classification?.cloudflareReady].filter(
    (signal): signal is ClassificationSignal => Boolean(signal)
  );
  if (signals.length === 0) {
    return minimum <= 1;
  }
  return signals.every((signal) => (confidenceRank(signal.confidence) ?? 0) >= minimum);
}

function confidenceRank(confidence: string): number | null {
  if (confidence === "low") {
    return 1;
  }
  if (confidence === "medium") {
    return 2;
  }
  if (confidence === "high") {
    return 3;
  }
  return null;
}

const broadProbeWords = new Set([
  "agent",
  "automation",
  "benchmark",
  "browser",
  "calling",
  "compose",
  "context",
  "database",
  "deployment",
  "docker",
  "durable",
  "embedding",
  "framework",
  "gateway",
  "guardrails",
  "helm",
  "indexing",
  "inference",
  "install",
  "kubernetes",
  "library",
  "local",
  "llm",
  "mcp",
  "model",
  "monitoring",
  "open",
  "orchestration",
  "package",
  "project",
  "projects",
  "protocol",
  "proxy",
  "rag",
  "retrieval",
  "router",
  "runtime",
  "search",
  "server",
  "serverless",
  "serving",
  "source",
  "starter",
  "structured",
  "template",
  "testing",
  "tool",
  "tools",
  "tracing",
  "vector",
  "vercel",
  "web",
  "workflow",
  "workers"
]);

const specificIntentStopWords = new Set([
  ...broadProbeWords,
  "api",
  "code",
  "docs",
  "example",
  "examples",
  "issue",
  "issues",
  "pull",
  "request",
  "requests",
  "repository",
  "repos"
]);

function sharedCount(left: string[], right: string[]): number {
  const rightText = normalize(right.join(" "));
  return left.filter((item) => rightText.includes(normalize(item))).length;
}

function byGitScore(a: ProjectKnowledge, b: ProjectKnowledge): number {
  return b.metrics.gitScore - a.metrics.gitScore || b.project.stars - a.project.stars;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeIdentity(value: string | null | undefined): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeProjectId(value: string | null | undefined): string {
  return normalize(value).replace(/^\/+|\/+$/g, "");
}

function clampLimit(value: number | undefined, fallback = defaultLimit): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
}
