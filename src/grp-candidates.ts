import { calculateAgentScore } from "./project-view";
import type { GoalDecomposition } from "./grp-decomposition";
import type { GrpComplexity, GrpMode, GrpRequest } from "./grp-request";
import type { GrpNode, GrpScore } from "./grp-types";
import type { ProjectKnowledge } from "./types";

export interface ScoredProject {
  item: ProjectKnowledge;
  node: GrpNode;
}

const defaultCandidatePoolLimit = 160;
const exactModeCandidatePoolLimit = 220;

export function selectGrpCandidatePool(projects: ProjectKnowledge[], decomposition: GoalDecomposition, request: GrpRequest, mode: GrpMode): ProjectKnowledge[] {
  if (projects.length <= defaultCandidatePoolLimit) {
    return projects;
  }

  const limit = mode === "compare" || mode === "find" ? exactModeCandidatePoolLimit : defaultCandidatePoolLimit;
  const selected = new Map<string, ProjectKnowledge>();
  for (const item of projects) {
    if (isMandatoryPoolProject(item, request)) {
      selected.set(item.project.id, item);
    }
  }

  const scored = projects
    .map((item, index) => ({
      item,
      index,
      score: poolScoreForProject(item, decomposition, request)
    }))
    .sort((a, b) => b.score - a.score || b.item.metrics.gitScore - a.item.metrics.gitScore || a.index - b.index);

  for (const entry of scored) {
    if (selected.size >= limit) {
      break;
    }
    selected.set(entry.item.project.id, entry.item);
  }

  return Array.from(selected.values());
}

export function retrieveSeeds(projects: ProjectKnowledge[], decomposition: GoalDecomposition, request: GrpRequest, mode: GrpMode): ScoredProject[] {
  const scored = projects.map((item) => ({
    item,
    node: toProjectNode(item, decomposition, request, mode)
  }));

  const selected = scored
    .filter((entry) => entry.node.score.finalScore >= 24 || isNamedInGoal(entry.item, request.goal))
    .sort((a, b) => b.node.score.finalScore - a.node.score.finalScore || b.item.metrics.gitScore - a.item.metrics.gitScore)
    .slice(0, mode === "find" ? 20 : 16);

  return selected.length > 0 ? selected : scored.sort((a, b) => b.node.score.finalScore - a.node.score.finalScore).slice(0, 8);
}

export function toProjectNode(item: ProjectKnowledge, decomposition: GoalDecomposition, request: GrpRequest, mode: GrpMode): GrpNode {
  const relevanceScore = relevanceScoreForProject(item, decomposition, request);
  const agentScore = calculateAgentScore(item);
  const deployScore = deployScoreForProject(item, request);
  const stabilityScore = Math.round(item.metrics.maintenanceScore * 0.55 + item.metrics.gitScore * 0.45);
  const constraintScore = constraintScoreForProject(item, request);
  const finalScore = weightedFinalScore({ relevanceScore, agentScore, deployScore, stabilityScore, constraintScore }, mode);

  return {
    id: item.project.id,
    label: item.project.name,
    kind: "project",
    repo: item.project.id,
    category: item.agentCard.category,
    deployment: item.agentCard.deployment,
    score: {
      relevanceScore,
      agentScore,
      deployScore,
      stabilityScore,
      constraintScore,
      finalScore
    },
    reasons: reasonsForProject(item, { relevanceScore, deployScore, constraintScore }, request, decomposition)
  };
}

export function isNamedInGoal(item: ProjectKnowledge, goal: string): boolean {
  const normalized = normalizeToken(goal);
  return [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", " "), item.project.fullName.replace("/", "-")]
    .map(normalizeToken)
    .some((alias) => alias.length > 2 && normalized.includes(alias));
}

function poolScoreForProject(item: ProjectKnowledge, decomposition: GoalDecomposition, request: GrpRequest): number {
  let score = Math.round(item.metrics.gitScore * 0.35 + item.metrics.maintenanceScore * 0.25);

  if (isNamedInGoal(item, request.goal)) {
    score += 240;
  }
  if (request.context?.previous_selected_projects?.some((projectId) => sameProjectId(item, projectId))) {
    score += 180;
  }
  if (request.constraints?.category && item.agentCard.category === request.constraints.category) {
    score += 120;
  }
  if (request.constraints?.language && normalizeToken(item.project.language ?? "") === request.constraints.language) {
    score += 45;
  }
  if (request.constraints?.license && normalizeToken(item.project.license ?? "") === request.constraints.license) {
    score += 28;
  }
  if (request.constraints?.agent_ready && (item.agentCard.category.includes("agent") || item.agentCard.summaryForAgent.length > 80)) {
    score += 55;
  }

  for (const deployment of request.constraints?.deploy ?? []) {
    if (item.agentCard.deployment.includes(deployment as never)) {
      score += 90;
    } else if (deployment === "cloudflare" && item.agentCard.cloudflareReady) {
      score += 90;
    } else if (deployment === "cloud" && item.agentCard.deployment.some((value) => ["cloud", "serverless", "cloudflare", "vercel"].includes(value))) {
      score += 42;
    } else if (deployment === "serverless" && item.agentCard.deployment.some((value) => ["serverless", "cloudflare", "vercel"].includes(value))) {
      score += 42;
    }
  }

  if (item.agentCard.cloudflareReady && (request.goal.toLowerCase().includes("cloudflare") || decomposition.requiredCapabilities.includes("cloudflare"))) {
    score += 70;
  }
  if (decomposition.requiredCapabilities.includes(item.agentCard.category)) {
    score += 95;
  }
  for (const deployment of item.agentCard.deployment) {
    if (decomposition.requiredCapabilities.includes(deployment)) {
      score += 65;
    }
  }

  const text = poolText(item);
  for (const capability of decomposition.requiredCapabilities) {
    if (text.includes(capability.replace(/_/g, " "))) {
      score += 38;
    }
  }
  for (const keyword of decomposition.keywords) {
    if (text.includes(keyword)) {
      score += 22;
    }
  }

  return score;
}

function isMandatoryPoolProject(item: ProjectKnowledge, request: GrpRequest): boolean {
  return isNamedInGoal(item, request.goal) || request.context?.previous_selected_projects?.some((projectId) => sameProjectId(item, projectId)) === true;
}

function sameProjectId(item: ProjectKnowledge, projectId: string): boolean {
  const wanted = normalizeToken(projectId);
  return [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", " "), item.project.fullName.replace("/", "-")]
    .map(normalizeToken)
    .some((alias) => alias === wanted || alias.includes(wanted) || wanted.includes(alias));
}

function relevanceScoreForProject(item: ProjectKnowledge, decomposition: GoalDecomposition, request: GrpRequest): number {
  const text = projectText(item);
  let score = 0;

  for (const keyword of decomposition.keywords) {
    if (text.includes(keyword)) {
      score += 10;
    }
  }

  for (const capability of decomposition.requiredCapabilities) {
    if (item.agentCard.category === capability || text.includes(capability.replace(/_/g, " "))) {
      score += 18;
    }
    if (item.agentCard.deployment.includes(capability as never)) {
      score += 16;
    }
  }

  if (isNamedInGoal(item, request.goal)) {
    score += 45;
  }

  return clamp(score);
}

function deployScoreForProject(item: ProjectKnowledge, request: GrpRequest): number {
  const requested = request.constraints?.deploy ?? [];
  if (requested.length === 0) {
    return Math.min(100, 50 + item.agentCard.deployment.length * 8 + (item.agentCard.cloudflareReady ? 15 : 0));
  }

  let score = 0;
  for (const deployment of requested) {
    if (item.agentCard.deployment.includes(deployment as never)) {
      score += 45;
    } else if (deployment === "cloudflare" && item.agentCard.cloudflareReady) {
      score += 45;
    } else if (deployment === "cloud" && item.agentCard.deployment.some((value) => ["cloud", "serverless", "cloudflare", "vercel"].includes(value))) {
      score += 25;
    } else if (deployment === "serverless" && item.agentCard.deployment.some((value) => ["serverless", "cloudflare", "vercel"].includes(value))) {
      score += 25;
    }
  }
  return clamp(score || 25);
}

function constraintScoreForProject(item: ProjectKnowledge, request: GrpRequest): number {
  const constraints = request.constraints;
  if (!constraints) {
    return 60;
  }

  let score = 40;
  if (constraints.license && normalizeToken(item.project.license ?? "") === constraints.license) {
    score += 20;
  }
  if (constraints.language && normalizeToken(item.project.language ?? "") === constraints.language) {
    score += 18;
  }
  if (constraints.category && item.agentCard.category === constraints.category) {
    score += 18;
  }
  if (constraints.agent_ready && (item.agentCard.category.includes("agent") || calculateAgentScore(item) >= 72)) {
    score += 16;
  }
  if (constraints.complexity && difficultyFitsComplexity(item.agentCard.difficulty, constraints.complexity)) {
    score += 12;
  }

  return clamp(score);
}

function weightedFinalScore(score: Omit<GrpScore, "finalScore">, mode: GrpMode): number {
  if (mode === "find") {
    return weightedScore([
      [score.relevanceScore, 0.45],
      [score.agentScore, 0.2],
      [score.deployScore, 0.15],
      [score.stabilityScore, 0.15],
      [score.constraintScore, 0.05]
    ]);
  }
  if (mode === "compose") {
    return weightedScore([
      [score.relevanceScore, 0.35],
      [score.agentScore, 0.2],
      [score.deployScore, 0.25],
      [score.stabilityScore, 0.15],
      [score.constraintScore, 0.05]
    ]);
  }
  return weightedScore([
    [score.relevanceScore, 0.35],
    [score.agentScore, 0.25],
    [score.deployScore, 0.2],
    [score.stabilityScore, 0.15],
    [score.constraintScore, 0.05]
  ]);
}

function reasonsForProject(
  item: ProjectKnowledge,
  scores: Pick<GrpScore, "relevanceScore" | "deployScore" | "constraintScore">,
  request: GrpRequest,
  decomposition: GoalDecomposition
): string[] {
  const reasons: string[] = [];
  if (scores.relevanceScore >= 60) {
    reasons.push(`Matches the goal through ${item.agentCard.category.replace(/_/g, " ")} capability.`);
  }
  if (request.constraints?.deploy?.some((deployment) => item.agentCard.deployment.includes(deployment as never))) {
    reasons.push(`Supports requested deployment target: ${request.constraints.deploy.join(", ")}.`);
  }
  if (item.agentCard.cloudflareReady) {
    reasons.push("Marked Cloudflare-ready in the Agent Card.");
  }
  if (scores.constraintScore >= 70) {
    reasons.push("Satisfies the explicit request constraints.");
  }
  if (item.metrics.maintenanceScore >= 70) {
    reasons.push("Has a strong maintenance profile.");
  }
  if (reasons.length === 0) {
    reasons.push(`Related to ${decomposition.subGoals[0] ?? "the requested goal"}.`);
  }
  return reasons.slice(0, 4);
}

function projectText(item: ProjectKnowledge): string {
  return [
    item.project.id,
    item.project.name,
    item.project.description,
    item.project.language,
    item.project.license,
    item.project.topics.join(" "),
    item.agentCard.category,
    item.agentCard.deployment.join(" "),
    item.agentCard.useCases.join(" "),
    item.agentCard.summaryForAgent
  ]
    .join(" ")
    .toLowerCase();
}

function poolText(item: ProjectKnowledge): string {
  return [
    item.project.id,
    item.project.name,
    item.project.description,
    item.project.language,
    item.project.topics.join(" "),
    item.agentCard.category,
    item.agentCard.deployment.join(" "),
    item.agentCard.useCases.join(" "),
    item.agentCard.summaryForAgent
  ]
    .join(" ")
    .toLowerCase();
}

function difficultyFitsComplexity(difficulty: string, complexity: GrpComplexity): boolean {
  if (complexity === "low") {
    return difficulty === "beginner";
  }
  if (complexity === "medium") {
    return difficulty === "beginner" || difficulty === "intermediate";
  }
  return true;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function weightedScore(parts: Array<[number, number]>): number {
  return Math.round(parts.reduce((total, [score, weight]) => total + score * weight, 0));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
