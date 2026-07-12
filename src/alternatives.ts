import { toProjectKnowledgeView } from "./project-view";
import type { Alternative, ProjectKnowledge } from "./types";

export interface AlternativesUpdate {
  projectId: string;
  alternatives: Alternative[];
}

export interface AlternativesResult {
  updated: number;
  updates: AlternativesUpdate[];
}

export interface AlternativeMatchSignals {
  explicit: boolean;
  sharedCategory: boolean;
  sharedDeployments: string[];
  sharedUseCases: string[];
  sharedTopics: string[];
  intentOverlap: string[];
  dependencyOverlap: string[];
  sameLanguage: boolean;
  strongerMaintenance: boolean;
  cloudflareReadyUpgrade: boolean;
}

export interface AlternativeMatch {
  project: ProjectKnowledge;
  similarityScore: number;
  reason: string;
  signals: AlternativeMatchSignals;
}

export interface AlternativesDecision {
  summary: string;
  stats: {
    candidateCount: number;
    explicitCount: number;
    cloudflareReadyCount: number;
    averageSimilarity: number | null;
    topCandidate: string | null;
  };
  nextActions: Array<{
    label: string;
    href: string;
    kind: "project" | "compare" | "graph" | "score" | "recommend";
  }>;
  comparisonLinks: {
    compare: string;
    graph: string;
    project: string;
    score: string;
  };
  evidence: {
    sourceFields: string[];
    caveats: string[];
    confidenceReason: string;
    lastVerifiedAt: string | null;
  };
  caveats: string[];
  confidenceReason: string;
  sourceFields: string[];
  lastVerifiedAt: string | null;
}

export function generateAlternativesForAll(projects: ProjectKnowledge[], limit = 3): AlternativesResult {
  const updates = projects.map((project) => ({
    projectId: project.project.id,
    alternatives: generateAlternatives(project, projects, limit)
  }));

  return {
    updated: updates.length,
    updates
  };
}

export function generateAlternatives(project: ProjectKnowledge, allProjects: ProjectKnowledge[], limit = 3): Alternative[] {
  return generateAlternativeMatches(project, allProjects, limit).map((match) => ({
    project_id: match.project.project.id,
    projectId: match.project.project.id,
    reason: match.reason
  }));
}

export function generateAlternativeMatches(project: ProjectKnowledge, allProjects: ProjectKnowledge[], limit = 5): AlternativeMatch[] {
  const explicitReasons = new Map(project.agentCard.alternatives.map((alternative) => [alternative.project_id.toLowerCase(), alternative.reason]));

  return allProjects
    .filter((candidate) => candidate.project.id !== project.project.id)
    .map((candidate) => alternativeMatch(project, candidate, explicitReasons.get(candidate.project.id.toLowerCase())))
    .filter((match) => match.similarityScore >= 25)
    .sort((a, b) => b.similarityScore - a.similarityScore || b.project.metrics.gitScore - a.project.metrics.gitScore)
    .slice(0, Math.max(1, Math.min(20, limit)));
}

export function toAlternativeMatchView(match: AlternativeMatch) {
  const guidance = alternativeAdoptionGuidance(match);
  const view = toProjectKnowledgeView(match.project);
  const caveats = [...guidance.adoptionNotes, ...view.caveats].slice(0, 8);
  return {
    ...view,
    projectId: match.project.project.id,
    project_id: match.project.project.id,
    similarityScore: match.similarityScore,
    alternativeReason: match.reason,
    replacementType: replacementType(match),
    matchSignals: match.signals,
    fitSummary: guidance.fitSummary,
    adoptionNotes: guidance.adoptionNotes,
    replacementRisk: guidance.replacementRisk,
    evidence: {
      ...view.evidence,
      source_fields: [...view.sourceFields, "alternative.match_signals", "alternative.similarity_score", "alternative.replacement_type"],
      caveats,
      confidence_reason: alternativeConfidenceReason(match, guidance.replacementRisk),
      last_verified_at: view.lastVerifiedAt
    },
    caveats,
    confidenceReason: alternativeConfidenceReason(match, guidance.replacementRisk),
    sourceFields: [...view.sourceFields, "alternative.match_signals", "alternative.similarity_score", "alternative.replacement_type"],
    lastVerifiedAt: view.lastVerifiedAt
  };
}

export function alternativeAdoptionGuidance(match: AlternativeMatch) {
  const notes: string[] = [];
  if (match.signals.sharedCategory) {
    notes.push("Same category, so it can be evaluated as a direct functional substitute.");
  } else {
    notes.push("Different category, so treat it as an adjacent option rather than a drop-in replacement.");
  }
  if (match.signals.sharedDeployments.length > 0) {
    notes.push(`Deployment overlap: ${match.signals.sharedDeployments.slice(0, 3).join(", ")}.`);
  } else {
    notes.push("No indexed deployment overlap; verify runtime and hosting fit before switching.");
  }
  if (match.signals.dependencyOverlap.length > 0) {
    notes.push(`Shared dependency context: ${match.signals.dependencyOverlap.slice(0, 3).join(", ")}.`);
  }
  if (match.signals.cloudflareReadyUpgrade) {
    notes.push("Cloudflare-ready upgrade candidate.");
  }
  if (!match.signals.sameLanguage && match.project.project.language) {
    notes.push(`Language changes to ${match.project.project.language}; migration cost may be higher.`);
  }

  const type = replacementType(match);
  const replacementRisk =
    ["same_use_case", "same_category"].includes(type) && match.signals.sharedDeployments.length > 0 && match.similarityScore >= 65
      ? "low"
      : match.similarityScore >= 45
        ? "medium"
        : "high";
  return {
    fitSummary:
      type === "same_use_case"
        ? "Strong replacement candidate with overlapping indexed use cases."
        : replacementRisk === "low"
          ? "Strong replacement candidate with category and deployment overlap."
        : replacementRisk === "medium"
          ? "Useful alternative, but compare deployment, language, and dependency fit before switching."
          : "Exploratory alternative; inspect graph and score evidence before treating it as a substitute.",
    adoptionNotes: notes.slice(0, 5),
    replacementRisk
  };
}

export function buildAlternativesDecision(project: ProjectKnowledge, matches: AlternativeMatch[]): AlternativesDecision {
  const source = toProjectKnowledgeView(project);
  const top = matches[0];
  const compareRepos = [project.project.id, ...matches.slice(0, 5).map((match) => match.project.project.id)].join(",");
  const stats = {
    candidateCount: matches.length,
    explicitCount: matches.filter((match) => match.signals.explicit).length,
    cloudflareReadyCount: matches.filter((match) => match.project.agentCard.cloudflareReady).length,
    averageSimilarity: matches.length ? Math.round(matches.reduce((sum, match) => sum + match.similarityScore, 0) / matches.length) : null,
    topCandidate: top?.project.project.id ?? null
  };
  return {
    summary: top
      ? `${source.repo} has ${matches.length} alternative candidates. Top match is ${top.project.project.id} at ${top.similarityScore}/100 because ${top.reason}`
      : `${source.repo} does not have enough indexed alternative candidates yet; inspect related projects and the graph for adjacent options.`,
    stats,
    nextActions: [
      { label: "Compare shortlist", href: `/api/compare?repos=${compareRepos}`, kind: "compare" },
      { label: "Open source graph", href: `/graph/${source.repo}`, kind: "graph" },
      { label: "Explain source score", href: `/score/${source.repo}`, kind: "score" },
      { label: "Open source project", href: `/projects/${source.repo}`, kind: "project" },
      { label: "Get recommendations", href: `/api/recommend?category=${encodeURIComponent(source.category[0] ?? project.agentCard.category)}&limit=5`, kind: "recommend" }
    ],
    comparisonLinks: {
      compare: `/api/compare?repos=${compareRepos}`,
      graph: `/graph/${source.repo}`,
      project: `/projects/${source.repo}`,
      score: `/score/${source.repo}`
    },
    evidence: {
      sourceFields: [...source.sourceFields, "alternative.match_signals", "alternative.similarity_score", "alternative.replacement_type"],
      caveats: alternativesCaveats(matches),
      confidenceReason: alternativesConfidenceReason(matches),
      lastVerifiedAt: source.lastVerifiedAt
    },
    caveats: alternativesCaveats(matches),
    confidenceReason: alternativesConfidenceReason(matches),
    sourceFields: [...source.sourceFields, "alternative.match_signals", "alternative.similarity_score", "alternative.replacement_type"],
    lastVerifiedAt: source.lastVerifiedAt
  };
}

function alternativesCaveats(matches: AlternativeMatch[]): string[] {
  const caveats: string[] = [];
  if (matches.length === 0) {
    caveats.push("No indexed alternative candidates met the similarity threshold.");
  }
  if (matches.some((match) => replacementType(match) === "ecosystem_adjacent")) {
    caveats.push("Some candidates are ecosystem-adjacent rather than direct replacements.");
  }
  if (matches.some((match) => match.signals.sharedDeployments.length === 0)) {
    caveats.push("At least one candidate lacks indexed deployment overlap; verify runtime fit.");
  }
  if (matches.some((match) => !match.signals.sameLanguage)) {
    caveats.push("At least one candidate changes primary language; migration cost may be higher.");
  }
  return caveats.slice(0, 5);
}

function alternativesConfidenceReason(matches: AlternativeMatch[]): string {
  const top = matches[0];
  if (!top) {
    return "No alternative exceeded the indexed similarity threshold; use graph and related projects for exploration.";
  }
  const type = replacementType(top);
  if (top.similarityScore >= 65 && ["same_use_case", "same_category"].includes(type)) {
    return `Top alternative has ${top.similarityScore}/100 similarity with ${type.replace(/_/g, " ")} evidence.`;
  }
  if (top.similarityScore >= 45) {
    return `Top alternative has ${top.similarityScore}/100 similarity, but deployment, language, or dependency fit should be reviewed.`;
  }
  return `Top alternative has weak similarity at ${top.similarityScore}/100; treat as exploration evidence.`;
}

function alternativeConfidenceReason(match: AlternativeMatch, replacementRisk: string): string {
  if (replacementRisk === "low") {
    return `Low replacement risk: ${match.similarityScore}/100 similarity with category or use-case overlap.`;
  }
  if (replacementRisk === "medium") {
    return `Medium replacement risk: ${match.similarityScore}/100 similarity; compare deployment, language, and dependency fit.`;
  }
  return `High replacement risk: ${match.similarityScore}/100 similarity with limited direct replacement evidence.`;
}

function alternativeMatch(project: ProjectKnowledge, candidate: ProjectKnowledge, explicitReason: string | undefined): AlternativeMatch {
  const signals = alternativeSignals(project, candidate, Boolean(explicitReason));
  const similarityScore = scoreAlternative(project, candidate, signals);
  return {
    project: candidate,
    similarityScore,
    reason: explicitReason ?? buildAlternativeReason(project, candidate, signals),
    signals
  };
}

function scoreAlternative(project: ProjectKnowledge, candidate: ProjectKnowledge, signals: AlternativeMatchSignals): number {
  let score = 0;

  if (signals.explicit) {
    score += 20;
  }
  if (signals.sharedCategory) {
    score += 28;
  }

  score += Math.min(24, signals.intentOverlap.length * 8);
  score += Math.min(16, signals.sharedDeployments.length * 8);
  score += Math.min(16, signals.sharedUseCases.length * 8);
  score += Math.min(12, signals.sharedTopics.length * 4);
  score += Math.min(10, signals.dependencyOverlap.length * 5);

  if (signals.sameLanguage) {
    score += 6;
  }
  if (signals.cloudflareReadyUpgrade) {
    score += 5;
  }

  if (signals.strongerMaintenance) {
    score += Math.min(7, candidate.metrics.maintenanceScore - project.metrics.maintenanceScore);
  }

  score += Math.min(6, Math.round(candidate.metrics.gitScore / 18));

  return Math.max(0, Math.min(100, Math.round(score)));
}

function alternativeSignals(project: ProjectKnowledge, candidate: ProjectKnowledge, explicit: boolean): AlternativeMatchSignals {
  return {
    explicit,
    sharedCategory: candidate.agentCard.category === project.agentCard.category,
    sharedDeployments: sharedValues(project.agentCard.deployment, candidate.agentCard.deployment),
    sharedUseCases: sharedValues(project.agentCard.useCases, candidate.agentCard.useCases),
    sharedTopics: sharedValues(project.project.topics, candidate.project.topics),
    intentOverlap: sharedValues(intentTerms(project), intentTerms(candidate)),
    dependencyOverlap: sharedValues(inferredDependencyTerms(project), inferredDependencyTerms(candidate)),
    sameLanguage: Boolean(project.project.language && candidate.project.language === project.project.language),
    strongerMaintenance: candidate.metrics.maintenanceScore > project.metrics.maintenanceScore,
    cloudflareReadyUpgrade: candidate.agentCard.cloudflareReady && !project.agentCard.cloudflareReady
  };
}

function buildAlternativeReason(project: ProjectKnowledge, candidate: ProjectKnowledge, signals: AlternativeMatchSignals): string {
  if (signals.intentOverlap.length > 0 && signals.sharedCategory) {
    return `Same ${candidate.agentCard.category.replace(/_/g, " ")} intent with ${signals.intentOverlap.slice(0, 3).join(", ")} overlap.`;
  }

  if (signals.sharedCategory && signals.sharedDeployments.length > 0) {
    return `Similar ${candidate.agentCard.category.replace(/_/g, " ")} with ${signals.sharedDeployments.slice(0, 2).join("/")} deployment overlap.`;
  }

  if (signals.sharedCategory) {
    return `Similar ${candidate.agentCard.category.replace(/_/g, " ")} with overlapping use cases and project signals.`;
  }

  if (signals.cloudflareReadyUpgrade) {
    return "Useful alternative when Cloudflare-ready deployment is preferred.";
  }

  if (candidate.project.language && !signals.sameLanguage) {
    return `Useful alternative for teams preferring ${candidate.project.language}.`;
  }

  if (signals.strongerMaintenance) {
    return "Useful alternative with stronger current maintenance signals.";
  }

  return "Useful alternative with overlapping use cases and project signals.";
}

function replacementType(match: AlternativeMatch): "same_use_case" | "same_category" | "same_deployment" | "ecosystem_adjacent" {
  if (match.signals.sharedUseCases.length > 0 || match.signals.intentOverlap.length > 0) {
    return "same_use_case";
  }
  if (match.signals.sharedCategory) {
    return "same_category";
  }
  if (match.signals.sharedDeployments.length > 0) {
    return "same_deployment";
  }
  return "ecosystem_adjacent";
}

function intentTerms(item: ProjectKnowledge): string[] {
  const text = [item.project.name, item.project.description, item.project.topics.join(" "), item.agentCard.useCases.join(" "), item.agentCard.summaryForAgent]
    .join(" ")
    .toLowerCase();
  const terms = new Set<string>();
  for (const [term, needles] of Object.entries(intentTermDictionary)) {
    if (needles.some((needle) => text.includes(needle))) {
      terms.add(term);
    }
  }
  return Array.from(terms);
}

const intentTermDictionary: Record<string, string[]> = {
  agent_memory: ["memory", "long-term memory", "context engine", "state management", "agent-memory", "ai-memory"],
  rag: ["rag", "retrieval", "retrieval augmented", "document search", "knowledge grounding"],
  browser_automation: ["browser", "playwright", "chromium", "web automation"],
  coding_agent: ["coding", "codebase", "developer workflow", "software engineering"],
  mcp: ["mcp", "model context protocol", "tool server", "json-rpc"],
  llm_gateway: ["gateway", "proxy", "routing", "model provider"],
  observability: ["trace", "tracing", "observability", "monitoring", "dashboard"],
  workflow: ["workflow", "orchestration", "automation", "scheduled jobs"],
  local_inference: ["local model", "local inference", "model serving", "gpu", "cuda"]
};

function inferredDependencyTerms(item: ProjectKnowledge): string[] {
  const text = [
    item.project.name,
    item.project.fullName,
    item.project.description,
    item.project.topics.join(" "),
    item.agentCard.category,
    item.agentCard.deployment.join(" "),
    item.agentCard.useCases.join(" "),
    item.agentCard.summaryForAgent
  ]
    .join(" ")
    .toLowerCase();
  const dependencies: string[] = [];
  if (text.includes("mcp")) dependencies.push("mcp");
  if (text.includes("cloudflare") || text.includes("workers")) dependencies.push("cloudflare-workers");
  if (text.includes("rag") || text.includes("retrieval")) dependencies.push("vector-database");
  if (text.includes("browser") || text.includes("playwright") || text.includes("chromium")) dependencies.push("browser-automation");
  if (text.includes("llm") || text.includes("agent")) dependencies.push("llm-provider");
  return dependencies;
}

function sharedValues(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalize));
  return left.filter((value) => rightSet.has(normalize(value)));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
