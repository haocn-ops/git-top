import { generateAlternatives } from "./alternatives";
import { calculateAgentScore, toProjectKnowledgeView } from "./project-view";
import { findRelatedProjectsFromList } from "./project-search";
import type { ProjectKnowledge } from "./types";

export type GraphNodeKind = "project" | "category" | "deployment" | "use_case" | "dependency";
export type GraphEdgeKind = "alternative" | "related" | "category" | "deployment" | "use_case" | "dependency";

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
  project?: {
    repo: string;
    name: string;
    description: string;
    maintainer: string;
    license: string | null;
    language: string | null;
    recentActivity: string;
  };
  summary?: string;
  graphStats: {
    nodeCount: number;
    edgeCount: number;
    projectCount: number;
    relationshipCounts: Record<GraphEdgeKind, number>;
  };
  nextActions?: Array<{
    label: string;
    href: string;
    kind: "project" | "alternatives" | "related" | "score" | "compare";
  }>;
  relationshipGroups?: {
    alternatives: Array<{ repo: string; reason: string }>;
    related: Array<{ repo: string; reason: string }>;
    dependencies: string[];
    deploymentTargets: string[];
    useCases: string[];
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
  summary: string;
  stats: {
    candidateCount: number;
    cloudflareReadyCount: number;
    dockerReadyCount: number;
    localReadyCount: number;
    highestAgentScore: number | null;
    highestQualityScore: number | null;
  };
  decisionMatrix: Array<{
    repo: string;
    strengths: string[];
    tradeoffs: string[];
    nextStep: string;
  }>;
  nextActions: Array<{
    label: string;
    href: string;
    kind: "project" | "graph" | "alternatives" | "score" | "recommend";
  }>;
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

    for (const related of findRelatedProjectsFromList(projects, item.project.id, 3)) {
      addNode(nodes, {
        id: related.project.id,
        label: related.project.name,
        kind: "project",
        score: calculateAgentScore(related),
        repo: related.project.id
      });
      edges.push({
        source: item.project.id,
        target: related.project.id,
        kind: "related",
        reason: relatedReason(item, related),
        weight: 82
      });
    }
  }

  const outputNodes = Array.from(nodes.values());
  const outputEdges = dedupeEdges(edges);
  const relationshipGroups = focus ? graphRelationshipGroups(focus, projects) : undefined;
  const evidence = graphEvidence(focus, outputNodes, outputEdges, relationshipGroups);
  return {
    focus: focus?.project.id ?? focusRepo,
    ...(focus
      ? {
          project: graphProjectContext(focus),
          summary: graphSummary(focus, relationshipGroups, outputNodes, outputEdges),
          nextActions: graphNextActions(focus)
        }
      : {}),
    graphStats: graphStats(outputNodes, outputEdges),
    ...(relationshipGroups ? { relationshipGroups } : {}),
    evidence,
    caveats: evidence.caveats,
    confidenceReason: evidence.confidenceReason,
    sourceFields: evidence.sourceFields,
    lastVerifiedAt: evidence.lastVerifiedAt,
    nodes: outputNodes,
    edges: outputEdges
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
    summary: buildCompareSummary(columns, winner, context),
    stats: compareStats(columns),
    decisionMatrix: columns.map((column) => compareDecision(column, context, winner)),
    nextActions: compareNextActions(columns, winner),
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
  const related = new Set(findRelatedProjectsFromList(projects, focus.project.id, boundedLimit).map((item) => item.project.id));
  return [
    focus,
    ...projects.filter(
      (item) =>
        item.project.id !== focus.project.id &&
        (related.has(item.project.id) ||
          alternatives.has(item.project.id) ||
          item.agentCard.category === focus.agentCard.category ||
          shared(item.agentCard.deployment, focus.agentCard.deployment))
    )
  ].slice(0, boundedLimit);
}

function alternativesFor(item: ProjectKnowledge, projects: ProjectKnowledge[]) {
  return item.agentCard.alternatives.length > 0 ? item.agentCard.alternatives : generateAlternatives(item, projects, 4);
}

function graphProjectContext(item: ProjectKnowledge): NonNullable<ProjectGraph["project"]> {
  return {
    repo: item.project.id,
    name: item.project.name,
    description: item.project.description ?? item.agentCard.summaryForAgent,
    maintainer: item.project.owner,
    license: item.project.license,
    language: item.project.language,
    recentActivity: recentActivityLabel(item.metrics.recentPushDays)
  };
}

function graphRelationshipGroups(item: ProjectKnowledge, projects: ProjectKnowledge[]): NonNullable<ProjectGraph["relationshipGroups"]> {
  const view = toProjectKnowledgeView(item);
  const alternatives = alternativesFor(item, projects).slice(0, 8);
  const related = findRelatedProjectsFromList(projects, item.project.id, 8);
  return {
    alternatives: alternatives.map((alternative) => ({
      repo: alternative.project_id,
      reason: alternative.reason
    })),
    related: related.map((relatedProject) => ({
      repo: relatedProject.project.id,
      reason: relatedReason(item, relatedProject)
    })),
    dependencies: view.dependencies,
    deploymentTargets: view.deployments,
    useCases: view.useCases
  };
}

function graphSummary(
  item: ProjectKnowledge,
  groups: NonNullable<ProjectGraph["relationshipGroups"]> | undefined,
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[]
): string {
  if (!groups) {
    return `${item.project.id} graph includes ${nodes.length} nodes and ${edges.length} relationship edges.`;
  }
  return `${item.project.id} graph connects ${groups.alternatives.length} alternatives, ${groups.related.length} related projects, ${groups.dependencies.length} inferred dependencies, ${groups.deploymentTargets.length} deployment targets, and ${groups.useCases.length} use cases.`;
}

function graphStats(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]): ProjectGraph["graphStats"] {
  const relationshipCounts = {
    alternative: 0,
    related: 0,
    category: 0,
    deployment: 0,
    use_case: 0,
    dependency: 0
  } satisfies Record<GraphEdgeKind, number>;
  for (const edge of edges) {
    relationshipCounts[edge.kind] += 1;
  }
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    projectCount: nodes.filter((node) => node.kind === "project").length,
    relationshipCounts
  };
}

function graphNextActions(item: ProjectKnowledge): NonNullable<ProjectGraph["nextActions"]> {
  const repo = item.project.id;
  return [
    { label: "Open project knowledge", href: `/projects/${repo}`, kind: "project" },
    { label: "Find alternatives", href: `/alternatives/${repo}`, kind: "alternatives" },
    { label: "Explore related projects", href: `/api/related/${repo}`, kind: "related" },
    { label: "Explain score", href: `/score/${repo}`, kind: "score" },
    { label: "Compare shortlist", href: `/api/compare?repos=${repo}`, kind: "compare" }
  ];
}

function graphEvidence(
  focus: ProjectKnowledge | null,
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  groups: NonNullable<ProjectGraph["relationshipGroups"]> | undefined
): ProjectGraph["evidence"] {
  const view = focus ? toProjectKnowledgeView(focus) : null;
  const caveats: string[] = [];
  if (!focus) {
    caveats.push("Graph is corpus-level; inspect a focused project graph before citing project-specific relationships.");
  }
  if (edges.length === 0) {
    caveats.push("No relationship edges are available in this graph response.");
  }
  if (groups && groups.alternatives.length === 0) {
    caveats.push("No direct alternatives are indexed for the focus project.");
  }
  if (groups && groups.deploymentTargets.length === 0) {
    caveats.push("No deployment targets are indexed for the focus project.");
  }
  const sourceFields = [
    ...(view?.sourceFields ?? ["project.id", "agent_card.category", "agent_card.deployment", "agent_card.use_cases"]),
    "graph.nodes",
    "graph.edges",
    "graph.relationship_groups"
  ];
  return {
    sourceFields,
    caveats: [...(view?.caveats ?? []), ...caveats].slice(0, 8),
    confidenceReason: focus
      ? `${focus.project.id} graph is grounded in indexed alternatives, related projects, deployments, dependencies, and use cases.`
      : `Corpus graph uses ${nodes.length} nodes and ${edges.length} edges; use focused graph calls for stronger project-level evidence.`,
    lastVerifiedAt: view?.lastVerifiedAt ?? null
  };
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

function buildCompareSummary(columns: CompareColumn[], winner: string | null, context: { deployment?: string }): string {
  if (!winner) {
    return "No comparable indexed projects were found for this comparison.";
  }
  const deploymentContext = context.deployment ? ` with ${context.deployment} deployment preference` : "";
  return `${winner} leads ${columns.length} compared projects${deploymentContext}. Review the decision matrix before treating it as the default recommendation.`;
}

function compareStats(columns: CompareColumn[]): CompareResult["stats"] {
  return {
    candidateCount: columns.length,
    cloudflareReadyCount: columns.filter((column) => column.cloudflare).length,
    dockerReadyCount: columns.filter((column) => column.docker).length,
    localReadyCount: columns.filter((column) => column.local).length,
    highestAgentScore: columns.length ? Math.max(...columns.map((column) => column.agentScore)) : null,
    highestQualityScore: columns.length ? Math.max(...columns.map((column) => column.qualityScore)) : null
  };
}

function compareDecision(column: CompareColumn, context: { deployment?: string }, winner: string | null): CompareResult["decisionMatrix"][number] {
  const strengths: string[] = [];
  const tradeoffs: string[] = [];
  if (column.repo === winner) {
    strengths.push("Leads this comparison context.");
  }
  if (column.agentScore >= 75) {
    strengths.push(`Strong agent score at ${column.agentScore}/100.`);
  }
  if (column.qualityScore >= 70) {
    strengths.push(`Strong quality score at ${column.qualityScore}/100.`);
  }
  if (context.deployment === "cloudflare" && column.cloudflare) {
    strengths.push("Matches Cloudflare deployment preference.");
  }
  if (context.deployment === "docker" && column.docker) {
    strengths.push("Matches Docker deployment preference.");
  }
  if (context.deployment === "local" && column.local) {
    strengths.push("Matches local deployment preference.");
  }
  if (strengths.length === 0) {
    strengths.push("Useful baseline candidate for comparison.");
  }

  if (context.deployment === "cloudflare" && !column.cloudflare) {
    tradeoffs.push("No explicit Cloudflare deployment signal.");
  }
  if (column.maintenanceScore < 50) {
    tradeoffs.push(`Maintenance score is ${column.maintenanceScore}/100.`);
  }
  if (column.bestFor.length === 0) {
    tradeoffs.push("No structured best-fit use cases are indexed.");
  }
  return {
    repo: column.repo,
    strengths: strengths.slice(0, 3),
    tradeoffs: tradeoffs.slice(0, 3),
    nextStep: column.repo === winner ? "Inspect score and graph before adopting." : "Use as an alternative or fallback candidate."
  };
}

function compareNextActions(columns: CompareColumn[], winner: string | null): CompareResult["nextActions"] {
  const target = winner ?? columns[0]?.repo;
  if (!target) {
    return [{ label: "Get recommendations", href: "/api/recommend?limit=5", kind: "recommend" }];
  }
  return [
    { label: "Open winning project", href: `/projects/${target}`, kind: "project" },
    { label: "Inspect graph", href: `/graph/${target}`, kind: "graph" },
    { label: "Find alternatives", href: `/alternatives/${target}`, kind: "alternatives" },
    { label: "Explain score", href: `/score/${target}`, kind: "score" },
    { label: "Get recommendations", href: `/api/recommend?limit=5`, kind: "recommend" }
  ];
}

function addRelationship(
  nodes: Map<string, KnowledgeGraphNode>,
  edges: KnowledgeGraphEdge[],
  source: string,
  target: string,
  label: string,
  kind: Exclude<GraphEdgeKind, "alternative" | "related">,
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

function relatedReason(source: ProjectKnowledge, target: ProjectKnowledge): string {
  const sharedCategory = source.agentCard.category === target.agentCard.category ? source.agentCard.category.replaceAll("_", " ") : null;
  const deployment = source.agentCard.deployment.find((item) => target.agentCard.deployment.includes(item));
  if (sharedCategory && deployment) {
    return `Shared ${sharedCategory} category and ${deployment} deployment context.`;
  }
  if (sharedCategory) {
    return `Shared ${sharedCategory} ecosystem.`;
  }
  if (deployment) {
    return `Shared ${deployment} deployment context.`;
  }
  return "Related through overlapping topics, dependencies, or use cases.";
}

function recentActivityLabel(days: number | null): string {
  if (days === null) {
    return "unknown";
  }
  if (days <= 7) {
    return "active_last_week";
  }
  if (days <= 30) {
    return "active_last_month";
  }
  if (days <= 90) {
    return "active_last_quarter";
  }
  return "stale";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function shared(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((item) => rightSet.has(item));
}
