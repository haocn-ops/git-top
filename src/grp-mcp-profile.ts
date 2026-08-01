import type { GrpResponse } from "./grp";
import type { GrpEdge, GrpNode, SolutionPath } from "./grp";

export type McpGrpResponseProfile = "compact" | "full";

const compactNodeLimit = 24;
const compactEdgeLimit = 40;
const compactPathLimit = 3;

export function parseMcpGrpResponseProfile(value: unknown): McpGrpResponseProfile | null {
  if (value === undefined) {
    return "compact";
  }
  return value === "compact" || value === "full" ? value : null;
}

export function mcpGrpResponse(result: GrpResponse, profile: McpGrpResponseProfile) {
  if (profile === "full") {
    return {
      profile,
      ...result,
      metadata: {
        ...result.metadata,
        responseProfile: profile
      }
    };
  }

  const nodes = compactNodes(result);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = compactEdges(result.edges, nodeIds);

  return {
    profile,
    intent: result.intent,
    mode: result.mode,
    resultType: result.resultType,
    subGoals: result.subGoals,
    nodes,
    edges,
    solutionPaths: result.solutionPaths.slice(0, compactPathLimit).map(compactPath),
    recommendedStack: result.recommendedStack,
    alternatives: result.alternatives,
    comparison: result.comparison,
    explanation: result.explanation,
    evidence: result.evidence,
    caveats: result.caveats,
    confidenceReason: result.confidenceReason,
    sourceFields: result.sourceFields,
    lastVerifiedAt: result.lastVerifiedAt,
    metadata: {
      ...result.metadata,
      responseProfile: profile,
      compactLimits: {
        nodes: compactNodeLimit,
        edges: compactEdgeLimit,
        solutionPaths: compactPathLimit
      },
      fullCounts: {
        nodes: result.nodes.length,
        edges: result.edges.length,
        solutionPaths: result.solutionPaths.length
      },
      returnedCounts: {
        nodes: nodes.length,
        edges: edges.length,
        solutionPaths: Math.min(result.solutionPaths.length, compactPathLimit)
      },
      truncated:
        nodes.length < result.nodes.length ||
        edges.length < result.edges.length ||
        result.solutionPaths.length > compactPathLimit
    }
  };
}

function compactNodes(result: GrpResponse): GrpNode[] {
  const orderedIds = new Set<string>();
  for (const role of result.recommendedStack) {
    orderedIds.add(role.nodeId);
  }
  for (const path of result.solutionPaths.slice(0, compactPathLimit)) {
    for (const id of path.path) {
      orderedIds.add(id);
    }
  }
  for (const node of result.nodes.filter((item) => item.kind === "project")) {
    orderedIds.add(node.id);
  }
  for (const node of result.nodes) {
    orderedIds.add(node.id);
  }

  const nodesById = new Map(result.nodes.map((node) => [node.id, node]));
  return Array.from(orderedIds)
    .map((id) => nodesById.get(id))
    .filter((node): node is GrpNode => Boolean(node))
    .slice(0, compactNodeLimit);
}

function compactEdges(edges: GrpEdge[], nodeIds: Set<string>): GrpEdge[] {
  return edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .sort((left, right) => right.weight - left.weight)
    .slice(0, compactEdgeLimit);
}

function compactPath(path: SolutionPath) {
  return {
    id: path.id,
    path: path.path,
    score: path.score,
    stackRoles: path.stackRoles,
    explanation: path.explanation,
    tradeoffs: path.tradeoffs
  };
}
