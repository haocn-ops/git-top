import type { AgentCard, Project, ProjectKnowledge, ProjectMetrics } from "./types";

export interface ProjectFilters {
  q?: string;
  category?: string;
  deployment?: string;
  difficulty?: string;
  cloudflareReady?: boolean;
  language?: string;
  ranking?: string;
  limit?: number;
}

export interface RecommendationQuery {
  useCase?: string;
  deployment?: string;
  difficulty?: string;
  language?: string;
  cloudflareReady?: boolean;
  limit?: number;
}

export interface Recommendation {
  project_id: string;
  score: number;
  reason: string;
  tradeoffs: string[];
  project: Project;
  agent_card: AgentCard;
  metrics: ProjectMetrics;
}

const defaultLimit = 20;

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
  const query = normalize(filters.q);
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
    .slice(0, limit);
}

export function getTrendingFromList(projects: ProjectKnowledge[], filters: Pick<ProjectFilters, "category" | "limit">): ProjectKnowledge[] {
  return searchProjectList(projects, { category: filters.category, limit: filters.limit });
}

export function recommendProjectList(projects: ProjectKnowledge[], query: RecommendationQuery): Recommendation[] {
  const limit = clampLimit(query.limit, 5);
  const useCase = normalize(query.useCase);
  const candidates = searchProjectList(projects, {
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
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );

      const useCaseScore = useCase ? keywordOverlapScore(useCase, text) : 20;
      const score = Math.round(
        useCaseScore * 0.45 + item.metrics.gitScore * 0.3 + item.metrics.maintenanceScore * 0.2 + readinessBoost(item, query) * 0.05
      );

      return {
        project_id: item.project.id,
        score,
        reason: buildRecommendationReason(item, query),
        tradeoffs: item.agentCard.notGoodFor.slice(0, 2),
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

  const explicit = new Set(project.agentCard.alternatives.map((item) => item.project_id));

  return projects
    .filter((item) => item.project.id !== project.project.id)
    .map((item) => ({
      item,
      score:
        (explicit.has(item.project.id) ? 100 : 0) +
        (item.agentCard.category === project.agentCard.category ? 50 : 0) +
        sharedCount(item.agentCard.useCases, project.agentCard.useCases) * 10 +
        item.metrics.gitScore * 0.2
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, clampLimit(limit, 5))
    .map(({ item }) => item);
}

function buildRecommendationReason(item: ProjectKnowledge, query: RecommendationQuery): string {
  const parts = [item.agentCard.summaryForAgent];
  if (query.deployment && item.agentCard.deployment.includes(query.deployment as never)) {
    parts.push(`It matches the requested ${query.deployment} deployment target.`);
  }
  if (query.cloudflareReady && item.agentCard.cloudflareReady) {
    parts.push("It is marked Cloudflare-ready.");
  }
  if (query.difficulty && item.agentCard.difficulty === query.difficulty) {
    parts.push(`Its difficulty is ${query.difficulty}.`);
  }
  return parts.join(" ");
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

function keywordOverlapScore(query: string, text: string): number {
  const words = queryTokens(query);
  if (words.length === 0) {
    return 0;
  }

  const hits = words.filter((word) => text.includes(word)).length;
  return Math.round((hits / words.length) * 100);
}

function queryMatchScore(query: string, words: string[], haystack: string, item: ProjectKnowledge): number {
  if (haystack.includes(query)) {
    return 1000 + item.metrics.gitScore;
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;

  return hits * 120 + deploymentHits * 80 + topicHits * 60 + categoryHits * 60 + specificIntentBoost(words, item) + collectionIntentBoost(words, item) + item.metrics.gitScore;
}

function specificIntentBoost(words: string[], item: ProjectKnowledge): number {
  const identityText = normalize([item.project.owner, item.project.name, item.project.fullName, item.project.topics.join(" ")].join(" "));
  const specificHits = words.filter((word) => !specificIntentStopWords.has(word) && identityText.includes(word)).length;
  return specificHits * 480;
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
  if (haystack.includes(query)) {
    return 220 + qualityScore;
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;

  return hits * 70 + deploymentHits * 70 + topicHits * 45 + categoryHits * 65 + specificIntentBoost(words, item) + collectionIntentBoost(words, item) + qualityScore;
}

function isBrowseRankingQuery(filters: ProjectFilters, words: string[], limit: number): boolean {
  if (limit < 8 || filters.difficulty || filters.language || typeof filters.cloudflareReady === "boolean") {
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

function isSearchHit(value: { item: ProjectKnowledge; score: number } | null): value is { item: ProjectKnowledge; score: number } {
  return value !== null;
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

function normalizeProjectId(value: string | null | undefined): string {
  return normalize(value).replace(/^\/+|\/+$/g, "");
}

function clampLimit(value: number | undefined, fallback = defaultLimit): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
}
