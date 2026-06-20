import { generateAlternatives } from "./alternatives";
import { calculateAgentScore, toProjectKnowledgeView } from "./project-view";
import type { ProjectKnowledge } from "./types";

export type GraphNodeKind = "project" | "category" | "deployment" | "use_case" | "dependency";
export type GraphEdgeKind = "alternative" | "category" | "deployment" | "use_case" | "dependency";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  score?: number;
  repo?: string;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  kind: GraphEdgeKind;
  reason?: string;
  weight: number;
}

export interface ProjectGraph {
  focus?: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface CompareColumn {
  repo: string;
  stars: number;
  agent: boolean;
  local: boolean;
  cloud: boolean;
  cloudflare: boolean;
  docker: boolean;
  maintenanceScore: number;
  qualityScore: number;
  agentScore: number;
  bestFor: string[];
}

export interface CompareResult {
  projects: CompareColumn[];
  winner: string | null;
  reasoning: string;
  context: {
    deployment?: string;
  };
}

export interface AgentScoreBreakdown {
  documentation: number;
  maintenance: number;
  deployment: number;
  popularity: number;
  community: number;
  agentScore: number;
}

export function buildKnowledgeGraph(projects: ProjectKnowledge[], focusRepo?: string, limit = 24): ProjectGraph {
  const focus = focusRepo ? findProjectByAlias(projects, focusRepo) : null;
  const selected = selectGraphProjects(projects, focus?.project.id ?? focusRepo, limit);
  const nodes = new Map<string, KnowledgeGraphNode>();
  const edges: KnowledgeGraphEdge[] = [];

  for (const item of selected) {
    const view = toProjectKnowledgeView(item);
    addNode(nodes, {
      id: item.project.id,
      label: item.project.name,
      kind: "project",
      score: view.agentScore,
      repo: item.project.id
    });

    addRelationship(nodes, edges, item.project.id, `category:${item.agentCard.category}`, item.agentCard.category.replace(/_/g, " "), "category", 72);

    for (const deployment of item.agentCard.deployment.slice(0, 5)) {
      addRelationship(nodes, edges, item.project.id, `deployment:${deployment}`, deployment, "deployment", deployment === "cloudflare" ? 96 : 64);
    }

    for (const useCase of item.agentCard.useCases.slice(0, 3)) {
      addRelationship(nodes, edges, item.project.id, `use_case:${slug(useCase)}`, useCase, "use_case", 58);
    }

    for (const dependency of view.dependencies.slice(0, 4)) {
      addRelationship(nodes, edges, item.project.id, `dependency:${slug(dependency)}`, dependency, "dependency", 54);
    }

    for (const alternative of alternativesFor(item, projects).slice(0, 4)) {
      addNode(nodes, {
        id: alternative.project_id,
        label: repoName(alternative.project_id),
        kind: "project",
        repo: alternative.project_id
      });
      edges.push({
        source: item.project.id,
        target: alternative.project_id,
        kind: "alternative",
        reason: alternative.reason,
        weight: 100
      });
    }
  }

  return {
    focus: focus?.project.id ?? focusRepo,
    nodes: Array.from(nodes.values()),
    edges: dedupeEdges(edges)
  };
}

export function compareProjectKnowledge(projects: ProjectKnowledge[], context: { deployment?: string } = {}): CompareResult {
  const columns = projects.map((item) => {
    const view = toProjectKnowledgeView(item);
    const deployments = new Set(item.agentCard.deployment);

    return {
      repo: item.project.id,
      stars: item.project.stars,
      agent: item.agentCard.category.includes("agent") || item.project.topics.some((topic) => topic.includes("agent")),
      local: deployments.has("local"),
      cloud: deployments.has("cloud") || deployments.has("serverless") || deployments.has("cloudflare") || deployments.has("vercel"),
      cloudflare: deployments.has("cloudflare"),
      docker: deployments.has("docker"),
      maintenanceScore: item.metrics.maintenanceScore,
      qualityScore: view.qualityScore,
      agentScore: view.agentScore,
      bestFor: item.agentCard.useCases.slice(0, 2)
    };
  });

  const winner = [...columns].sort((a, b) => compareColumns(a, b, context))[0]?.repo ?? null;

  return {
    projects: columns,
    winner,
    reasoning: winner ? buildCompareReason(winner, context) : "No comparable projects were found.",
    context
  };
}

export function getAgentScoreBreakdown(item: ProjectKnowledge): AgentScoreBreakdown {
  const documentation = item.agentCard.summaryForAgent.length > 80 ? 90 : 72;
  const maintenance = item.metrics.maintenanceScore;
  const deployment = Math.min(100, 50 + item.agentCard.deployment.length * 10 + (item.agentCard.cloudflareReady ? 20 : 0));
  const popularity = Math.min(100, Math.round(Math.log10(Math.max(item.project.stars, 1)) * 20));
  const community = Math.min(100, 45 + item.metrics.contributors90d);

  return {
    documentation,
    maintenance,
    deployment,
    popularity,
    community,
    agentScore: calculateAgentScore(item)
  };
}

function selectGraphProjects(projects: ProjectKnowledge[], focusRepo: string | undefined, limit: number): ProjectKnowledge[] {
  const boundedLimit = Math.max(1, Math.min(80, Math.trunc(limit)));
  if (!focusRepo) {
    return [...projects].sort((a, b) => calculateAgentScore(b) - calculateAgentScore(a)).slice(0, boundedLimit);
  }

  const focus = findProjectByAlias(projects, focusRepo);
  if (!focus) {
    return projects.slice(0, boundedLimit);
  }

  const alternatives = new Set(alternativesFor(focus, projects).map((item) => item.project_id));
  return [
    focus,
    ...projects.filter(
      (item) =>
        item.project.id !== focus.project.id &&
        (alternatives.has(item.project.id) ||
          item.agentCard.category === focus.agentCard.category ||
          shared(item.agentCard.deployment, focus.agentCard.deployment))
    )
  ].slice(0, boundedLimit);
}

function alternativesFor(item: ProjectKnowledge, projects: ProjectKnowledge[]) {
  return item.agentCard.alternatives.length > 0 ? item.agentCard.alternatives : generateAlternatives(item, projects, 4);
}

function findProjectByAlias(projects: ProjectKnowledge[], value: string): ProjectKnowledge | null {
  const wanted = normalizeProjectAlias(value);
  return (
    projects.find((item) =>
      [
        item.project.id,
        item.project.fullName,
        item.project.name,
        item.project.fullName.replace("/", "-"),
        item.project.fullName.replace("/", "--")
      ]
        .map(normalizeProjectAlias)
        .includes(wanted)
    ) ?? null
  );
}

function normalizeProjectAlias(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function compareColumns(a: CompareColumn, b: CompareColumn, context: { deployment?: string }): number {
  const deployment = context.deployment;
  const aContextBoost = deploymentBoost(a, deployment);
  const bContextBoost = deploymentBoost(b, deployment);
  return b.agentScore + bContextBoost - (a.agentScore + aContextBoost) || b.maintenanceScore - a.maintenanceScore;
}

function deploymentBoost(project: CompareColumn, deployment: string | undefined): number {
  if (!deployment) {
    return 0;
  }
  if (deployment === "cloudflare") {
    return project.cloudflare ? 30 : 0;
  }
  if (deployment === "docker") {
    return project.docker ? 20 : 0;
  }
  if (deployment === "local") {
    return project.local ? 20 : 0;
  }
  if (deployment === "cloud") {
    return project.cloud ? 20 : 0;
  }
  return 0;
}

function buildCompareReason(winner: string, context: { deployment?: string }): string {
  if (context.deployment) {
    return `${winner} has the strongest fit after weighting for ${context.deployment} deployment compatibility.`;
  }
  return `${winner} has the strongest combined agent score and maintenance profile in this comparison.`;
}

function addRelationship(
  nodes: Map<string, KnowledgeGraphNode>,
  edges: KnowledgeGraphEdge[],
  source: string,
  target: string,
  label: string,
  kind: Exclude<GraphEdgeKind, "alternative">,
  weight: number
): void {
  addNode(nodes, {
    id: target,
    label,
    kind
  });
  edges.push({
    source,
    target,
    kind,
    weight
  });
}

function addNode(nodes: Map<string, KnowledgeGraphNode>, node: KnowledgeGraphNode): void {
  const existing = nodes.get(node.id);
  nodes.set(node.id, existing ? { ...node, ...existing, score: existing.score ?? node.score } : node);
}

function dedupeEdges(edges: KnowledgeGraphEdge[]): KnowledgeGraphEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source}:${edge.target}:${edge.kind}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function repoName(repo: string): string {
  return repo.split("/").at(-1) ?? repo;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function shared(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((item) => rightSet.has(item));
}
