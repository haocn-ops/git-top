import type { GrpMode } from "./grp-request";
import type { GrpAlternative, GrpComparison, GrpEdge, GrpNode, SolutionPath, StackRole } from "./grp-types";

export type GrpResultType = "plan" | "comparison" | "project_set" | "composition";

export interface GrpResponse {
  intent: string;
  mode: GrpMode;
  resultType: GrpResultType;
  subGoals: string[];
  nodes: GrpNode[];
  edges: GrpEdge[];
  solutionPaths: SolutionPath[];
  recommendedStack: StackRole[];
  alternatives: GrpAlternative[];
  comparison?: GrpComparison;
  explanation: string[];
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
  metadata: {
    version: "grp.v1";
    generatedAt: string;
    candidateCount: number;
    maxDepth: number;
  };
}

export function buildGrpExplanation(
  decomposition: { intent: string },
  nodes: GrpNode[],
  paths: SolutionPath[],
  stack: StackRole[],
  mode: GrpMode
): string[] {
  const lines = [
    `GRP interpreted the goal as ${decomposition.intent}.`,
    `The engine matched ${nodes.filter((node) => node.kind === "project").length} project nodes and ${nodes.filter((node) => node.kind !== "project").length} concept nodes.`
  ];
  if (paths[0]) {
    lines.push(`The top solution path scored ${paths[0].score} using relevance, deployment fit, graph edge strength, and role coverage.`);
  }
  if (stack.length > 0) {
    lines.push(`The recommended stack covers ${stack.map((role) => role.role.replace(/_/g, " ")).join(", ")}.`);
  }
  if (mode === "compare") {
    lines.push("Compare mode keeps graph context while avoiding unsupported claims about projects that are not indexed.");
  }
  return lines;
}

export function resultTypeForMode(mode: GrpMode): GrpResultType {
  if (mode === "compare") {
    return "comparison";
  }
  if (mode === "find") {
    return "project_set";
  }
  if (mode === "compose") {
    return "composition";
  }
  return "plan";
}
