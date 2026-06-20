import type { Alternative, ProjectKnowledge } from "./types";

export interface AlternativesUpdate {
  projectId: string;
  alternatives: Alternative[];
}

export interface AlternativesResult {
  updated: number;
  updates: AlternativesUpdate[];
}

export function generateAlternativesForAll(projects: ProjectKnowledge[], limit = 3): AlternativesResult {
  const updates = projects
    .map((project) => ({
      projectId: project.project.id,
      alternatives: generateAlternatives(project, projects, limit)
    }))
    .filter((update) => update.alternatives.length > 0);

  return {
    updated: updates.length,
    updates
  };
}

export function generateAlternatives(project: ProjectKnowledge, allProjects: ProjectKnowledge[], limit = 3): Alternative[] {
  return allProjects
    .filter((candidate) => candidate.project.id !== project.project.id)
    .map((candidate) => ({
      candidate,
      score: scoreAlternative(project, candidate)
    }))
    .filter(({ score }) => score >= 25)
    .sort((a, b) => b.score - a.score || b.candidate.metrics.gitScore - a.candidate.metrics.gitScore)
    .slice(0, Math.max(1, Math.min(10, limit)))
    .map(({ candidate }) => ({
      project_id: candidate.project.id,
      reason: buildAlternativeReason(project, candidate)
    }));
}

function scoreAlternative(project: ProjectKnowledge, candidate: ProjectKnowledge): number {
  let score = 0;

  if (candidate.agentCard.category === project.agentCard.category) {
    score += 50;
  }

  score += sharedCount(project.agentCard.deployment, candidate.agentCard.deployment) * 8;
  score += sharedCount(project.agentCard.useCases, candidate.agentCard.useCases) * 10;
  score += sharedCount(project.project.topics, candidate.project.topics) * 3;

  if (project.project.language && candidate.project.language === project.project.language) {
    score += 10;
  }

  if (candidate.agentCard.cloudflareReady && !project.agentCard.cloudflareReady) {
    score += 8;
  }

  if (candidate.metrics.maintenanceScore > project.metrics.maintenanceScore) {
    score += Math.min(10, candidate.metrics.maintenanceScore - project.metrics.maintenanceScore);
  }

  return score;
}

function buildAlternativeReason(project: ProjectKnowledge, candidate: ProjectKnowledge): string {
  if (candidate.agentCard.category === project.agentCard.category) {
    return `Similar ${candidate.agentCard.category.replace(/_/g, " ")} with ${sharedDeploymentText(project, candidate)} deployment overlap.`;
  }

  if (candidate.agentCard.cloudflareReady && !project.agentCard.cloudflareReady) {
    return "Useful alternative when Cloudflare-ready deployment is preferred.";
  }

  if (candidate.project.language && candidate.project.language !== project.project.language) {
    return `Useful alternative for teams preferring ${candidate.project.language}.`;
  }

  if (candidate.metrics.maintenanceScore > project.metrics.maintenanceScore) {
    return "Useful alternative with stronger current maintenance signals.";
  }

  return "Useful alternative with overlapping use cases and project signals.";
}

function sharedDeploymentText(project: ProjectKnowledge, candidate: ProjectKnowledge): string {
  const shared = project.agentCard.deployment.filter((deployment) => candidate.agentCard.deployment.includes(deployment));
  return shared.length > 0 ? shared.slice(0, 2).join("/") : "some";
}

function sharedCount(left: string[], right: string[]): number {
  const rightSet = new Set(right.map(normalize));
  return left.map(normalize).filter((value) => rightSet.has(value)).length;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
