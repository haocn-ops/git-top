export interface GrpScore {
  relevanceScore: number;
  agentScore: number;
  deployScore: number;
  stabilityScore: number;
  constraintScore: number;
  finalScore: number;
}

export interface GrpNode {
  id: string;
  label: string;
  kind: "project" | "category" | "deployment" | "use_case" | "dependency" | "capability" | "runtime" | "protocol" | "llm";
  repo?: string;
  category?: string;
  deployment?: string[];
  score: GrpScore;
  reasons: string[];
}

export interface GrpEdge {
  source: string;
  target: string;
  kind: "alternative" | "category" | "deployment" | "use_case" | "dependency" | "compatible_with" | "requires" | "implements";
  weight: number;
  reason: string;
}

export interface SolutionPath {
  id: string;
  path: string[];
  nodes: GrpNode[];
  edges: GrpEdge[];
  score: number;
  stackRoles: StackRole[];
  explanation: string[];
  tradeoffs: string[];
}

export interface StackRole {
  role: "runtime" | "protocol" | "agent_core" | "tool_execution" | "llm_access" | "memory" | "storage" | "observability" | "template";
  nodeId: string;
  label: string;
  required: boolean;
}

export interface GrpAlternative {
  source: string;
  alternatives: Array<{
    projectId: string;
    reason: string;
    score?: number;
  }>;
}

export interface GrpComparison {
  projects: Array<{
    id: string;
    label: string;
    indexed: boolean;
    category?: string;
    deployment: string[];
    agentScore: number;
    maintenanceScore?: number;
    strengths: string[];
    gaps: string[];
  }>;
  overlap: {
    categories: string[];
    deployments: string[];
  };
  differences: string[];
  winner: string | null;
  reasoning: string;
}
