import type { GoalDecomposition } from "./grp-decomposition";
import type { GrpConstraints, GrpMode } from "./grp-request";
import type { GrpEdge, GrpNode, SolutionPath, StackRole } from "./grp-types";

export function buildSolutionPaths(nodes: GrpNode[], edges: GrpEdge[], decomposition: GoalDecomposition, mode: GrpMode, constraints: GrpConstraints | undefined): SolutionPath[] {
  const projectNodes = nodes.filter((node) => node.kind === "project").slice(0, 10);
  const conceptNodes = nodes.filter((node) => node.kind !== "project");
  const paths: SolutionPath[] = [];

  for (const project of projectNodes.slice(0, 6)) {
    const related = relatedNodes(project, conceptNodes, edges);
    const pathNodes = selectPathNodes(project, related, conceptNodes, decomposition);
    const pathEdges = edges.filter((item) => pathNodes.some((node) => node.id === item.source) && pathNodes.some((node) => node.id === item.target));
    const stackRoles = composeRecommendedStack(pathNodes, decomposition, mode, constraints);
    const score = scorePath(pathNodes, pathEdges, stackRoles, decomposition);
    paths.push({
      id: `path_${paths.length + 1}`,
      path: pathNodes.map((node) => node.id),
      nodes: pathNodes,
      edges: pathEdges,
      score,
      stackRoles,
      explanation: explainPath(pathNodes, stackRoles),
      tradeoffs: tradeoffsFor(pathNodes, stackRoles, decomposition)
    });
  }

  if (mode === "compose" && projectNodes.length > 1) {
    const composedNodes = composeRoleNodes(nodes, decomposition, constraints);
    const composedEdges = edges.filter((item) => composedNodes.some((node) => node.id === item.source) && composedNodes.some((node) => node.id === item.target));
    const stackRoles = composeRecommendedStack(composedNodes, decomposition, mode, constraints);
    if (isConnectedSubgraph(composedNodes, composedEdges)) {
      paths.unshift({
        id: "path_composed_stack",
        path: composedNodes.map((node) => node.id),
        nodes: composedNodes,
        edges: composedEdges,
        score: scorePath(composedNodes, composedEdges, stackRoles, decomposition, true),
        stackRoles,
        explanation: explainPath(composedNodes, stackRoles),
        tradeoffs: tradeoffsFor(composedNodes, stackRoles, decomposition)
      });
    }
  }

  return paths.sort((a, b) => b.score - a.score).slice(0, 3).map((path, index) => ({ ...path, id: index === 0 && mode === "compose" ? "path_composed_stack" : `path_${index + 1}` }));
}

export function composeRecommendedStack(nodes: GrpNode[], decomposition: GoalDecomposition, mode: GrpMode, constraints?: GrpConstraints): StackRole[] {
  const roles: StackRole[] = [];
  const wantedRoles = rolePriority(decomposition, mode);

  for (const role of wantedRoles) {
    const node = bestNodeForRole(nodes, role, roles.map((item) => item.nodeId), constraints);
    if (node) {
      roles.push({
        role,
        nodeId: node.id,
        label: node.label,
        required: ["runtime", "protocol", "agent_core", "llm_access"].includes(role)
      });
    }
  }

  return roles;
}

function selectPathNodes(project: GrpNode, related: GrpNode[], concepts: GrpNode[], decomposition: GoalDecomposition): GrpNode[] {
  const selected = new Map<string, GrpNode>();
  addNode(selected, project);

  for (const capability of decomposition.requiredCapabilities) {
    const direct = related.find((node) => node.id.includes(capability) || node.label.includes(capability.replace(/_/g, " ")));
    const fallback = concepts.find((node) => node.id.includes(capability) || node.label.includes(capability.replace(/_/g, " ")));
    if (direct || fallback) {
      addNode(selected, direct ?? fallback!);
    }
  }

  for (const node of related.sort((a, b) => b.score.finalScore - a.score.finalScore).slice(0, 4)) {
    addNode(selected, node);
  }

  return Array.from(selected.values()).slice(0, 7);
}

function relatedNodes(project: GrpNode, nodes: GrpNode[], edges: GrpEdge[]): GrpNode[] {
  const relatedIds = new Set(
    edges
      .filter((edgeItem) => edgeItem.source === project.id || edgeItem.target === project.id)
      .flatMap((edgeItem) => [edgeItem.source, edgeItem.target])
      .filter((id) => id !== project.id)
  );
  return nodes.filter((node) => relatedIds.has(node.id));
}

function composeRoleNodes(nodes: GrpNode[], decomposition: GoalDecomposition, constraints?: GrpConstraints): GrpNode[] {
  const selected = new Map<string, GrpNode>();
  for (const role of rolePriority(decomposition, "compose")) {
    const node = bestNodeForRole(nodes, role, Array.from(selected.keys()), constraints);
    if (node) {
      addNode(selected, node);
    }
  }
  return Array.from(selected.values());
}

function rolePriority(decomposition: GoalDecomposition, mode: GrpMode): StackRole["role"][] {
  const roles: StackRole["role"][] = [];
  if (decomposition.requiredCapabilities.includes("cloudflare") || decomposition.requiredCapabilities.includes("serverless")) {
    roles.push("runtime");
  }
  if (decomposition.requiredCapabilities.includes("mcp_server")) {
    roles.push("protocol");
  }
  if (decomposition.requiredCapabilities.includes("coding_agent")) {
    roles.push("agent_core");
  }
  if (decomposition.requiredCapabilities.includes("browser_agent")) {
    roles.push("tool_execution");
  }
  if (decomposition.requiredCapabilities.includes("llm_gateway")) {
    roles.push("llm_access");
  }
  if (decomposition.requiredCapabilities.includes("rag_framework") || decomposition.requiredCapabilities.includes("vector_database")) {
    roles.push("memory");
  }

  const defaults: StackRole["role"][] = mode === "compose" ? ["runtime", "protocol", "agent_core", "tool_execution", "llm_access", "memory", "observability"] : ["agent_core", "runtime", "protocol", "tool_execution", "llm_access"];
  for (const role of defaults) {
    if (!roles.includes(role)) {
      roles.push(role);
    }
  }
  return roles;
}

function bestNodeForRole(nodes: GrpNode[], role: StackRole["role"], used: string[], constraints?: GrpConstraints): GrpNode | undefined {
  return nodes
    .filter((node) => !used.includes(node.id) && roleFit(node, role) > 0)
    .sort(
      (a, b) =>
        roleFit(b, role) + deploymentPreference(b, role, constraints) + concretePreference(b, role) + b.score.finalScore -
        (roleFit(a, role) + deploymentPreference(a, role, constraints) + concretePreference(a, role) + a.score.finalScore)
    )[0];
}

function concretePreference(node: GrpNode, role: StackRole["role"]): number {
  if (role === "runtime") {
    return node.kind === "deployment" || node.kind === "runtime" ? 12 : node.kind === "project" ? 8 : 0;
  }
  return node.kind === "project" ? 35 : 0;
}

function deploymentPreference(node: GrpNode, role: StackRole["role"], constraints?: GrpConstraints): number {
  if (role !== "runtime" || !constraints?.deploy?.length) {
    return 0;
  }
  const text = [node.id, node.label, node.deployment?.join(" ")].join(" ").toLowerCase();
  return constraints.deploy.some((deployment) => text.includes(deployment)) ? 80 : 0;
}

function roleFit(node: GrpNode, role: StackRole["role"]): number {
  const text = [node.id, node.label, node.category, node.deployment?.join(" ")].join(" ").toLowerCase();
  const includes = (...values: string[]) => values.some((value) => text.includes(value));
  if (role === "runtime") {
    return includes("cloudflare", "worker", "serverless", "docker", "runtime", "vercel") ? 40 : 0;
  }
  if (role === "protocol") {
    return includes("mcp", "protocol", "tool calling") ? 45 : 0;
  }
  if (role === "agent_core") {
    return includes("coding_agent", "agent_framework", "openhands", "opendevin", "aider", "agent") ? 45 : 0;
  }
  if (role === "tool_execution") {
    return includes("browser", "automation", "tool") ? 38 : 0;
  }
  if (role === "llm_access") {
    return includes("llm", "gateway", "openrouter", "litellm", "workers ai") ? 38 : 0;
  }
  if (role === "memory") {
    return includes("rag", "vector", "memory", "retrieval") ? 38 : 0;
  }
  if (role === "storage") {
    return includes("d1", "r2", "postgres", "sqlite", "storage") ? 38 : 0;
  }
  if (role === "observability") {
    return includes("observability", "tracing", "eval") ? 38 : 0;
  }
  return includes("template", "starter") ? 38 : 0;
}

function scorePath(nodes: GrpNode[], edges: GrpEdge[], roles: StackRole[], decomposition: GoalDecomposition, composed = false): number {
  const nodeScore = average(nodes.map((node) => node.score.finalScore));
  const edgeScore = edges.length > 0 ? average(edges.map((edgeItem) => edgeItem.weight)) : composed ? 20 : 35;
  const roleCoverageScore = clamp((roles.length / Math.max(1, Math.min(6, rolePriority(decomposition, "compose").length))) * 100);
  const capabilityCoverage = decomposition.requiredCapabilities.length
    ? clamp((decomposition.requiredCapabilities.filter((capability) => nodes.some((node) => node.id.includes(capability) || node.label.includes(capability))).length / decomposition.requiredCapabilities.length) * 100)
    : 70;

  return weightedScore([
    [nodeScore, composed ? 0.5 : 0.6],
    [edgeScore, composed ? 0.3 : 0.2],
    [roleCoverageScore, composed ? 0.15 : 0.15],
    [capabilityCoverage, 0.05]
  ]);
}

function explainPath(nodes: GrpNode[], roles: StackRole[]): string[] {
  const explanations = roles.map((role) => `${role.label} fills the ${role.role.replace(/_/g, " ")} role.`);
  const strongest = nodes[0];
  if (strongest) {
    explanations.unshift(`${strongest.label} is the strongest graph match in this path.`);
  }
  return explanations.slice(0, 6);
}

function tradeoffsFor(nodes: GrpNode[], roles: StackRole[], decomposition: GoalDecomposition): string[] {
  const tradeoffs: string[] = [];
  const presentRoles = new Set(roles.map((role) => role.role));
  for (const role of rolePriority(decomposition, "compose").slice(0, 6)) {
    if (!presentRoles.has(role)) {
      tradeoffs.push(`No strong ${role.replace(/_/g, " ")} node was found in the bounded graph.`);
    }
  }
  if (!nodes.some((node) => node.score.stabilityScore >= 70)) {
    tradeoffs.push("The path has limited maintenance/stability evidence.");
  }
  if (nodes.length > 1 && roles.length > 1 && !nodes.some((node) => node.kind === "project")) {
    tradeoffs.push("This stack is currently concept-only and needs concrete project selection.");
  }
  return tradeoffs.slice(0, 4);
}

function addNode(nodes: Map<string, GrpNode>, node: GrpNode): void {
  const existing = nodes.get(node.id);
  nodes.set(node.id, existing && existing.score.finalScore >= node.score.finalScore ? existing : node);
}

function isConnectedSubgraph(nodes: GrpNode[], edges: GrpEdge[]): boolean {
  if (nodes.length <= 1) {
    return true;
  }
  if (edges.length === 0) {
    return false;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, new Set());
  }
  for (const edgeItem of edges) {
    if (!nodeIds.has(edgeItem.source) || !nodeIds.has(edgeItem.target)) {
      continue;
    }
    adjacency.get(edgeItem.source)?.add(edgeItem.target);
    adjacency.get(edgeItem.target)?.add(edgeItem.source);
  }

  const start = nodes[0].id;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return seen.size === nodeIds.size;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function weightedScore(parts: Array<[number, number]>): number {
  return Math.round(parts.reduce((total, [score, weight]) => total + score * weight, 0));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
