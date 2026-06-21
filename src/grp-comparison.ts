import { isNamedInGoal, toProjectNode } from "./grp-candidates";
import { decomposeGoal } from "./grp-decomposition";
import type { ScoredProject } from "./grp-candidates";
import type { GrpRequest } from "./grp-request";
import type { GrpComparison } from "./grp-types";
import type { ProjectKnowledge } from "./types";

export function buildComparison(projects: ProjectKnowledge[], seeds: ScoredProject[], request: GrpRequest): GrpComparison {
  const terms = parseComparisonTerms(request.goal);
  const termMatches = terms.map((term) => ({ term, project: findProjectForTerm(projects, term) }));
  const matched = termMatches
    .filter((entry): entry is { term: string; project: ProjectKnowledge } => Boolean(entry.project))
    .map((entry) => ({
      item: entry.project,
      node: toProjectNode(entry.project, decomposeGoal(request), request, "compare")
    }));
  const named = seeds.filter((entry) => isNamedInGoal(entry.item, request.goal));
  const compared = terms.length >= 2 ? matched : (named.length >= 2 ? named : seeds.slice(0, 3)).slice(0, 4);
  const projectSummaries: GrpComparison["projects"] = compared.map((entry) => {
    const deployment = entry.item.agentCard.deployment;
    return {
      id: entry.item.project.id,
      label: entry.item.project.name,
      indexed: true,
      category: entry.item.agentCard.category,
      deployment,
      agentScore: entry.node.score.agentScore,
      maintenanceScore: entry.item.metrics.maintenanceScore,
      strengths: comparisonStrengths(entry),
      gaps: comparisonGaps(entry, request)
    };
  });
  for (const unmatched of termMatches.filter((entry) => !entry.project)) {
    projectSummaries.push({
      id: slug(unmatched.term),
      label: unmatched.term,
      indexed: false,
      deployment: [],
      agentScore: 0,
      strengths: ["not indexed in Git.Top yet"],
      gaps: ["no indexed repository metadata", "no graph relationships available"]
    });
  }
  const categorySets = projectSummaries.map((project) => new Set(project.category ? [project.category] : []));
  const deploymentSets = projectSummaries.map((project) => new Set(project.deployment));
  const overlap = {
    categories: intersectSets(categorySets),
    deployments: intersectSets(deploymentSets)
  };
  const winner = [...compared].sort((a, b) => b.node.score.finalScore - a.node.score.finalScore)[0]?.item.project.id ?? null;

  return {
    projects: projectSummaries,
    overlap,
    differences: comparisonDifferences(projectSummaries),
    winner,
    reasoning: winner
      ? `${winner} has the strongest GRP score among indexed compared projects for this goal and constraints.`
      : "No indexed projects were found for the named comparison terms."
  };
}

function comparisonStrengths(entry: ScoredProject): string[] {
  const strengths: string[] = [];
  if (entry.node.score.agentScore >= 75) {
    strengths.push("strong agent score");
  }
  if (entry.item.metrics.maintenanceScore >= 70) {
    strengths.push("healthy maintenance profile");
  }
  if (entry.item.agentCard.cloudflareReady) {
    strengths.push("Cloudflare-ready");
  }
  if (entry.item.agentCard.deployment.includes("docker")) {
    strengths.push("Docker deployable");
  }
  return strengths.length > 0 ? strengths : ["indexed project with relevant graph signals"];
}

function comparisonGaps(entry: ScoredProject, request: GrpRequest): string[] {
  const gaps: string[] = [];
  for (const deployment of request.constraints?.deploy ?? []) {
    if (!entry.item.agentCard.deployment.includes(deployment as never) && !(deployment === "cloudflare" && entry.item.agentCard.cloudflareReady)) {
      gaps.push(`no direct ${deployment} deployment signal`);
    }
  }
  if (entry.node.score.relevanceScore < 40) {
    gaps.push("weak direct goal relevance");
  }
  if (entry.item.metrics.maintenanceScore < 60) {
    gaps.push("maintenance signal needs review");
  }
  return gaps;
}

function comparisonDifferences(projects: GrpComparison["projects"]): string[] {
  const differences: string[] = [];
  if (projects.length > 0 && projects.every((project) => !project.indexed)) {
    return ["None of the named comparison terms are indexed in Git.Top yet, so graph differences cannot be computed."];
  }
  const categories = Array.from(new Set(projects.map((project) => project.category).filter(Boolean)));
  if (categories.length > 1) {
    differences.push(`Different categories: ${categories.join(", ")}.`);
  }
  const cloudflareReady = projects.filter((project) => project.deployment.includes("cloudflare")).map((project) => project.id);
  if (cloudflareReady.length > 0 && cloudflareReady.length < projects.length) {
    differences.push(`Only ${cloudflareReady.join(", ")} has direct Cloudflare deployment metadata.`);
  }
  const dockerReady = projects.filter((project) => project.deployment.includes("docker")).map((project) => project.id);
  if (dockerReady.length > 0 && dockerReady.length < projects.length) {
    differences.push(`Only ${dockerReady.join(", ")} has direct Docker deployment metadata.`);
  }
  return differences.length > 0 ? differences : ["Compared projects have similar indexed category and deployment signals."];
}

function intersectSets(sets: Array<Set<string>>): string[] {
  if (sets.length === 0) {
    return [];
  }
  return Array.from(sets[0]).filter((value) => sets.every((set) => set.has(value)));
}

function parseComparisonTerms(goal: string): string[] {
  const normalized = goal.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s+(?:vs\.?|versus|compared to)\s+/i);
  if (parts.length < 2) {
    return [];
  }

  return parts
    .flatMap((part) => part.split(/\s*,\s*/))
    .map((part) => part.replace(/\s+for\s+.+$/i, "").replace(/\s+on\s+.+$/i, "").trim())
    .filter((part) => part.length > 1)
    .slice(0, 4);
}

function findProjectForTerm(projects: ProjectKnowledge[], term: string): ProjectKnowledge | undefined {
  const wanted = normalizeToken(term);
  return projects.find((item) =>
    [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", " "), item.project.fullName.replace("/", "-")]
      .map(normalizeToken)
      .some((alias) => alias === wanted || alias.includes(wanted) || wanted.includes(alias))
  );
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "goal";
}
