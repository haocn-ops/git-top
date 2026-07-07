import { generateAlternatives } from "./alternatives";
import { toProjectKnowledgeView } from "./project-view";
import { toProjectNode } from "./grp-candidates";
import type { ScoredProject } from "./grp-candidates";
import type { GoalDecomposition } from "./grp-decomposition";
import type { GrpRequest } from "./grp-request";
import type { GrpEdge, GrpNode } from "./grp-types";
import type { ProjectKnowledge } from "./types";

export interface GrpGraph {
  nodes: GrpNode[];
  edges: GrpEdge[];
}

export function expandGraph(
  projects: ProjectKnowledge[],
  seeds: ScoredProject[],
  decomposition: GoalDecomposition,
  request: GrpRequest,
  lookupProjects: ProjectKnowledge[] = projects
): GrpGraph {
  const nodes = new Map<string, GrpNode>();
  const edges: GrpEdge[] = [];

  for (const capability of decomposition.requiredCapabilities.slice(0, 10)) {
    addNode(nodes, conceptNode(capability, conceptKind(capability), [`Required by intent ${decomposition.intent}.`], 86));
  }

  for (const entry of seeds) {
    addNode(nodes, entry.node);

    const categoryId = `category:${entry.item.agentCard.category}`;
    addNode(nodes, conceptNode(categoryId, "category", [`${entry.item.project.name} is categorized as ${entry.item.agentCard.category}.`], 72));
    edges.push(edge(entry.node.id, categoryId, "category", 72, "Project category relationship."));

    for (const deployment of entry.item.agentCard.deployment.slice(0, 5)) {
      const id = `deployment:${deployment}`;
      addNode(nodes, conceptNode(id, "deployment", [`${entry.item.project.name} supports ${deployment} deployment.`], deployment === "cloudflare" ? 92 : 68));
      edges.push(edge(entry.node.id, id, "deployment", deployment === "cloudflare" ? 92 : 68, "Deployment compatibility."));
    }

    const view = toProjectKnowledgeView(entry.item);
    for (const useCase of entry.item.agentCard.useCases.slice(0, 3)) {
      const id = `use_case:${slug(useCase)}`;
      addNode(nodes, conceptNode(id, "use_case", [`Use case: ${useCase}.`], relevanceForText(useCase, decomposition.keywords)));
      edges.push(edge(entry.node.id, id, "use_case", 58, "Agent Card use-case relationship."));
    }

    for (const dependency of view.dependencies.slice(0, 4)) {
      const id = `dependency:${slug(dependency)}`;
      addNode(nodes, conceptNode(id, conceptKind(dependency), [`Inferred dependency: ${dependency}.`], 62));
      edges.push(edge(entry.node.id, id, "dependency", 54, "Inferred dependency relationship."));
    }

    for (const alternative of alternativesFor(entry.item, projects).slice(0, 4)) {
      const alternativeProject = lookupProjects.find((item) => item.project.id === alternative.project_id || item.project.fullName === alternative.project_id);
      const alternativeNode = alternativeProject
        ? toProjectNode(alternativeProject, decomposition, request, "find")
        : conceptNode(alternative.project_id, "project", [alternative.reason], 55);
      addNode(nodes, alternativeNode);
      edges.push(edge(entry.node.id, alternativeNode.id, "alternative", 76, alternative.reason));
    }
  }

  connectCompatibleConcepts(nodes, edges);

  const retainedNodes = Array.from(nodes.values())
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, 80);
  const retainedNodeIds = new Set(retainedNodes.map((node) => node.id));

  return {
    nodes: retainedNodes,
    edges: dedupeEdges(edges)
      .filter((edgeItem) => retainedNodeIds.has(edgeItem.source) && retainedNodeIds.has(edgeItem.target))
      .slice(0, 200)
  };
}

export function alternativesFor(item: ProjectKnowledge, projects: ProjectKnowledge[]) {
  return item.agentCard.alternatives.length > 0 ? item.agentCard.alternatives : generateAlternatives(item, projects, 4);
}

function conceptNode(id: string, kind: GrpNode["kind"], reasons: string[], baseScore: number): GrpNode {
  const label = id.includes(":") ? id.split(":").at(-1) ?? id : id;
  return {
    id,
    label: label.replace(/_/g, " "),
    kind,
    score: {
      relevanceScore: baseScore,
      agentScore: baseScore,
      deployScore: kind === "deployment" || kind === "runtime" ? baseScore : 50,
      stabilityScore: 60,
      constraintScore: baseScore,
      finalScore: baseScore
    },
    reasons
  };
}

function connectCompatibleConcepts(nodes: Map<string, GrpNode>, edges: GrpEdge[]): void {
  const values = Array.from(nodes.values());
  const mcp = values.find((node) => node.id.includes("mcp"));
  const cloudflare = values.find((node) => node.id.includes("cloudflare"));
  const codingAgent = values.find((node) => node.id.includes("coding_agent") || node.category === "coding_agent");
  const browser = values.find((node) => node.id.includes("browser_agent") || node.category === "browser_agent");
  const llm = values.find((node) => node.id.includes("llm"));

  if (cloudflare && mcp) {
    edges.push(edge(cloudflare.id, mcp.id, "compatible_with", 82, "Cloudflare can host lightweight tool and API protocol layers."));
  }
  if (mcp && codingAgent) {
    edges.push(edge(mcp.id, codingAgent.id, "compatible_with", 86, "Coding agents can use MCP as a tool protocol."));
  }
  if (codingAgent && browser) {
    edges.push(edge(codingAgent.id, browser.id, "requires", 76, "Autonomous coding flows often need browser or tool execution."));
  }
  if (codingAgent && llm) {
    edges.push(edge(codingAgent.id, llm.id, "requires", 88, "Coding agents require LLM access."));
  }
}

function relevanceForText(text: string, keywords: string[]): number {
  if (keywords.length === 0) {
    return 58;
  }
  return clamp(48 + keywords.filter((keyword) => text.toLowerCase().includes(keyword)).length * 14);
}

function conceptKind(value: string): GrpNode["kind"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("cloudflare") || normalized.includes("worker") || normalized.includes("serverless") || normalized.includes("docker")) {
    return "runtime";
  }
  if (normalized.includes("mcp") || normalized.includes("protocol")) {
    return "protocol";
  }
  if (normalized.includes("llm") || normalized.includes("gateway") || normalized.includes("openrouter")) {
    return "llm";
  }
  if (normalized.includes("deployment:")) {
    return "deployment";
  }
  if (normalized.includes("category:")) {
    return "category";
  }
  if (normalized.includes("dependency:")) {
    return "dependency";
  }
  return "capability";
}

function edge(source: string, target: string, kind: GrpEdge["kind"], weight: number, reason: string): GrpEdge {
  return {
    source,
    target,
    kind,
    weight,
    reason
  };
}

function addNode(nodes: Map<string, GrpNode>, node: GrpNode): void {
  const existing = nodes.get(node.id);
  nodes.set(node.id, existing && existing.score.finalScore >= node.score.finalScore ? existing : node);
}

function dedupeEdges(edges: GrpEdge[]): GrpEdge[] {
  const seen = new Set<string>();
  return edges.filter((item) => {
    const key = `${item.source}:${item.target}:${item.kind}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "goal";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
