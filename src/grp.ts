import { buildAlternatives } from "./grp-alternatives";
import { retrieveSeeds } from "./grp-candidates";
import { buildComparison } from "./grp-comparison";
import { decomposeGoal } from "./grp-decomposition";
import { expandGraph } from "./grp-graph";
import { buildSolutionPaths, composeRecommendedStack } from "./grp-paths";
import { buildGrpExplanation, resultTypeForMode } from "./grp-response";
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
    metadata: {
      version: "grp.v1",
      generatedAt: new Date().toISOString(),
      candidateCount: seeds.length,
      maxDepth
    }
  };
}
