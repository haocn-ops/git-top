import { buildAlternatives } from "./grp-alternatives";
import { retrieveSeeds } from "./grp-candidates";
import { buildComparison } from "./grp-comparison";
import { decomposeGoal } from "./grp-decomposition";
import { expandGraph } from "./grp-graph";
import { buildSolutionPaths, composeRecommendedStack } from "./grp-paths";
import { buildGrpExplanation, resultTypeForMode } from "./grp-response";
import type { ScoredProject } from "./grp-candidates";
import type { GrpConstraints, GrpMode, GrpRequest } from "./grp-request";
import type { GrpResponse } from "./grp-response";
import type { GrpAlternative, GrpComparison, GrpEdge, GrpNode, SolutionPath, StackRole } from "./grp-types";
import type { ProjectKnowledge } from "./types";

export { normalizeGrpRequest } from "./grp-request";
export type { GrpComplexity, GrpConstraints, GrpContext, GrpMode, GrpRequest } from "./grp-request";
export type { GrpResponse, GrpResultType } from "./grp-response";
export type { GrpAlternative, GrpComparison, GrpEdge, GrpNode, GrpScore, SolutionPath, StackRole } from "./grp-types";

const maxDepth = 2;

export function runGrpQuery(projects: ProjectKnowledge[], request: GrpRequest): GrpResponse {
  const mode = request.mode ?? "plan";
  const decomposition = decomposeGoal(request);
  const seeds = retrieveSeeds(projects, decomposition, request, mode);
  const graph = expandGraph(projects, seeds, decomposition, request);
  const comparison = mode === "compare" ? buildComparison(projects, seeds, request) : undefined;
  const solutionPaths = mode === "find" || mode === "compare" ? [] : buildSolutionPaths(graph.nodes, graph.edges, decomposition, mode, request.constraints);
  const stackSourceNodes = mode === "compose" ? graph.nodes : solutionPaths[0]?.nodes ?? graph.nodes;
  const recommendedStack = mode === "compare" ? [] : composeRecommendedStack(stackSourceNodes, decomposition, mode, request.constraints);
  const alternatives = buildAlternatives(projects, seeds, recommendedStack);
  const resultType = resultTypeForMode(mode);
  const evidence = grpEvidence(seeds, graph.nodes, graph.edges, solutionPaths, recommendedStack);

  return {
    intent: decomposition.intent,
    mode,
    resultType,
    subGoals: decomposition.subGoals,
    nodes: graph.nodes,
    edges: graph.edges,
    solutionPaths,
    recommendedStack,
    alternatives,
    comparison,
    explanation: buildGrpExplanation(decomposition, graph.nodes, solutionPaths, recommendedStack, mode),
    evidence,
    caveats: evidence.caveats,
    confidenceReason: evidence.confidenceReason,
    sourceFields: evidence.sourceFields,
    lastVerifiedAt: evidence.lastVerifiedAt,
    metadata: {
      version: "grp.v1",
      generatedAt: new Date().toISOString(),
      candidateCount: seeds.length,
      maxDepth
    }
  };
}

function grpEvidence(
  seeds: ScoredProject[],
  nodes: GrpNode[],
  edges: GrpEdge[],
  solutionPaths: SolutionPath[],
  recommendedStack: StackRole[]
) {
  const caveats: string[] = [];
  if (seeds.length === 0) {
    caveats.push("No seed projects matched the request strongly enough; result should be treated as exploratory.");
  }
  if (nodes.length === 0) {
    caveats.push("No graph nodes were produced for the request.");
  }
  if (edges.length === 0) {
    caveats.push("No graph edges were produced; relationship evidence is limited.");
  }
  if (solutionPaths.length === 0 && recommendedStack.length === 0) {
    caveats.push("No solution path or recommended stack was produced for this mode.");
  }
  const lastVerifiedAt = seeds
    .map((entry) => entry.item.project.syncedAt ?? entry.item.metrics.calculatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const confidenceReason =
    seeds.length > 0 && nodes.length > 0 && (edges.length > 0 || solutionPaths.length > 0 || recommendedStack.length > 0)
      ? "GRP result is grounded in retrieved seed projects, graph nodes, and relationship or path evidence."
      : "GRP result has limited graph grounding; validate recommended projects with project, score, graph, and compare endpoints.";
  return {
    sourceFields: ["grp.request", "grp.decomposition", "grp.seeds", "grp.nodes", "grp.edges", "grp.solution_paths", "grp.recommended_stack"],
    caveats,
    confidenceReason,
    lastVerifiedAt
  };
}
