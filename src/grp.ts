import { generateAlternatives } from "./alternatives";
import { calculateAgentScore, toProjectKnowledgeView } from "./project-view";
import type { ProjectKnowledge } from "./types";

export type GrpMode = "plan" | "compare" | "find" | "compose";
export type GrpResultType = "plan" | "comparison" | "project_set" | "composition";
export type GrpComplexity = "low" | "medium" | "high";

export interface GrpRequest {
  goal: string;
  mode?: GrpMode;
  constraints?: GrpConstraints;
  context?: GrpContext;
}

export interface GrpConstraints {
  deploy?: string[];
  license?: string;
  complexity?: GrpComplexity;
  agent_ready?: boolean;
  language?: string;
  category?: string;
}

export interface GrpContext {
  previous_selected_projects?: string[];
  current_stack?: string[];
}

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
  metadata: {
    version: "grp.v1";
    generatedAt: string;
    candidateCount: number;
    maxDepth: number;
  };
}

interface GoalDecomposition {
  intent: string;
  subGoals: string[];
  requiredCapabilities: string[];
  keywords: string[];
}

interface ScoredProject {
  item: ProjectKnowledge;
  node: GrpNode;
}

const validModes = new Set<GrpMode>(["plan", "compare", "find", "compose"]);
const maxDepth = 2;

export function normalizeGrpRequest(input: unknown): { ok: true; request: Required<Pick<GrpRequest, "goal" | "mode">> & GrpRequest } | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "GRP request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) {
    return { ok: false, message: "GRP request requires a non-empty goal." };
  }

  const mode = typeof body.mode === "string" && validModes.has(body.mode as GrpMode) ? (body.mode as GrpMode) : body.mode === undefined ? "plan" : null;
  if (!mode) {
    return { ok: false, message: "GRP mode must be one of: plan, compare, find, compose." };
  }

  return {
    ok: true,
    request: {
      goal,
      mode,
      constraints: normalizeConstraints(body.constraints),
      context: normalizeContext(body.context)
    }
  };
}

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
    explanation: buildExplanation(decomposition, graph.nodes, solutionPaths, recommendedStack, mode),
    metadata: {
      version: "grp.v1",
      generatedAt: new Date().toISOString(),
      candidateCount: seeds.length,
      maxDepth
    }
  };
}

function normalizeConstraints(input: unknown): GrpConstraints | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as Record<string, unknown>;
  const complexity = typeof value.complexity === "string" && ["low", "medium", "high"].includes(value.complexity) ? (value.complexity as GrpComplexity) : undefined;
  return {
    deploy: Array.isArray(value.deploy) ? value.deploy.filter((item): item is string => typeof item === "string").map(normalizeToken) : undefined,
    license: typeof value.license === "string" ? normalizeToken(value.license) : undefined,
    complexity,
    agent_ready: typeof value.agent_ready === "boolean" ? value.agent_ready : undefined,
    language: typeof value.language === "string" ? normalizeToken(value.language) : undefined,
    category: typeof value.category === "string" ? normalizeToken(value.category) : undefined
  };
}

function normalizeContext(input: unknown): GrpContext | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as Record<string, unknown>;
  return {
    previous_selected_projects: Array.isArray(value.previous_selected_projects)
      ? value.previous_selected_projects.filter((item): item is string => typeof item === "string")
      : undefined,
    current_stack: Array.isArray(value.current_stack) ? value.current_stack.filter((item): item is string => typeof item === "string") : undefined
  };
}

function decomposeGoal(request: GrpRequest): GoalDecomposition {
  const goalText = [request.goal, request.context?.current_stack?.join(" ") ?? ""].join(" ").toLowerCase();
  const capabilities = new Set<string>();
  const subGoals = new Set<string>();

  addCapability(goalText, capabilities, subGoals, ["cursor", "coding agent", "code agent", "opendevin", "openhands", "autonomous coding", "coding stack"], "coding_agent", "coding agent core");
  addCapability(goalText, capabilities, subGoals, ["cloudflare", "worker", "workers", "edge", "d1", "r2", "durable object"], "cloudflare", "edge/serverless runtime");
  addCapability(goalText, capabilities, subGoals, ["mcp", "model context protocol", "tool protocol", "tool calling"], "mcp_server", "tool protocol");
  addCapability(goalText, capabilities, subGoals, ["browser", "web automation", "browser use"], "browser_agent", "browser/tool use");
  addCapability(goalText, capabilities, subGoals, ["rag", "retrieval", "knowledge base"], "rag_framework", "retrieval/memory layer");
  addCapability(goalText, capabilities, subGoals, ["vector", "embedding"], "vector_database", "vector storage");
  addCapability(goalText, capabilities, subGoals, ["gateway", "openrouter", "litellm", "llm api", "workers ai"], "llm_gateway", "LLM integration");
  addCapability(goalText, capabilities, subGoals, ["local", "ollama", "llama.cpp"], "local_llm_runtime", "local model runtime");
  addCapability(goalText, capabilities, subGoals, ["template", "starter", "boilerplate"], "ai_app_template", "application template");
  addCapability(goalText, capabilities, subGoals, ["eval", "evaluation", "benchmark"], "llm_eval", "evaluation layer");
  addCapability(goalText, capabilities, subGoals, ["observe", "observability", "tracing"], "ai_observability", "observability layer");

  if (capabilities.has("coding_agent")) {
    capabilities.add("mcp_server");
    capabilities.add("browser_agent");
    capabilities.add("llm_gateway");
    subGoals.add("tool protocol");
    subGoals.add("browser/tool use");
    subGoals.add("LLM integration");
  }

  if (goalText.includes("autonomous") && goalText.includes("stack")) {
    capabilities.add("mcp_server");
    capabilities.add("llm_gateway");
    subGoals.add("tool protocol");
    subGoals.add("LLM integration");
  }

  for (const deployment of request.constraints?.deploy ?? []) {
    capabilities.add(deployment);
    subGoals.add(deployment === "cloudflare" ? "edge/serverless runtime" : `${deployment} deployment`);
  }
  if (request.constraints?.category) {
    capabilities.add(request.constraints.category);
  }
  if (request.constraints?.agent_ready) {
    subGoals.add("agent-ready project selection");
  }

  if (subGoals.size === 0) {
    subGoals.add("project capability fit");
    subGoals.add("deployment fit");
    subGoals.add("maintenance and agent readiness");
  }

  return {
    intent: slug(request.goal),
    subGoals: Array.from(subGoals).slice(0, 8),
    requiredCapabilities: Array.from(capabilities),
    keywords: keywordsFor(request.goal)
  };
}

function retrieveSeeds(projects: ProjectKnowledge[], decomposition: GoalDecomposition, request: GrpRequest, mode: GrpMode): ScoredProject[] {
  const scored = projects.map((item) => ({
    item,
    node: toProjectNode(item, decomposition, request, mode)
  }));

  const selected = scored
    .filter((entry) => entry.node.score.finalScore >= 24 || isNamedInGoal(entry.item, request.goal))
    .sort((a, b) => b.node.score.finalScore - a.node.score.finalScore || b.item.metrics.gitScore - a.item.metrics.gitScore)
    .slice(0, mode === "find" ? 20 : 16);

  return selected.length > 0 ? selected : scored.sort((a, b) => b.node.score.finalScore - a.node.score.finalScore).slice(0, 8);
}

function expandGraph(
  projects: ProjectKnowledge[],
  seeds: ScoredProject[],
  decomposition: GoalDecomposition,
  request: GrpRequest
): { nodes: GrpNode[]; edges: GrpEdge[] } {
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
      const alternativeProject = projects.find((item) => item.project.id === alternative.project_id || item.project.fullName === alternative.project_id);
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

function buildComparison(projects: ProjectKnowledge[], seeds: ScoredProject[], request: GrpRequest): GrpComparison {
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

function buildSolutionPaths(nodes: GrpNode[], edges: GrpEdge[], decomposition: GoalDecomposition, mode: GrpMode, constraints: GrpConstraints | undefined): SolutionPath[] {
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

function composeRecommendedStack(nodes: GrpNode[], decomposition: GoalDecomposition, mode: GrpMode, constraints?: GrpConstraints): StackRole[] {
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

function buildAlternatives(projects: ProjectKnowledge[], seeds: ScoredProject[], stack: StackRole[]): GrpAlternative[] {
  const selected = new Set(stack.map((item) => item.nodeId));
  const matchedSeeds = seeds.filter((entry) => selected.has(entry.node.id));
  const sourceSeeds = matchedSeeds.length > 0 ? matchedSeeds : seeds.slice(0, 6);

  return sourceSeeds
    .map((entry) => ({
      source: entry.item.project.id,
      alternatives: alternativesFor(entry.item, projects)
        .slice(0, 4)
        .map((alternative) => ({
          projectId: alternative.project_id,
          reason: alternative.reason,
          score: projects.find((project) => project.project.id === alternative.project_id)?.metrics.gitScore
        }))
    }))
    .filter((item) => item.alternatives.length > 0);
}

function toProjectNode(item: ProjectKnowledge, decomposition: GoalDecomposition, request: GrpRequest, mode: GrpMode): GrpNode {
  const relevanceScore = relevanceScoreForProject(item, decomposition, request);
  const agentScore = calculateAgentScore(item);
  const deployScore = deployScoreForProject(item, request);
  const stabilityScore = Math.round(item.metrics.maintenanceScore * 0.55 + item.metrics.gitScore * 0.45);
  const constraintScore = constraintScoreForProject(item, request);
  const finalScore = weightedFinalScore({ relevanceScore, agentScore, deployScore, stabilityScore, constraintScore }, mode);

  return {
    id: item.project.id,
    label: item.project.name,
    kind: "project",
    repo: item.project.id,
    category: item.agentCard.category,
    deployment: item.agentCard.deployment,
    score: {
      relevanceScore,
      agentScore,
      deployScore,
      stabilityScore,
      constraintScore,
      finalScore
    },
    reasons: reasonsForProject(item, { relevanceScore, deployScore, constraintScore }, request, decomposition)
  };
}

function relevanceScoreForProject(item: ProjectKnowledge, decomposition: GoalDecomposition, request: GrpRequest): number {
  const text = projectText(item);
  let score = 0;

  for (const keyword of decomposition.keywords) {
    if (text.includes(keyword)) {
      score += 10;
    }
  }

  for (const capability of decomposition.requiredCapabilities) {
    if (item.agentCard.category === capability || text.includes(capability.replace(/_/g, " "))) {
      score += 18;
    }
    if (item.agentCard.deployment.includes(capability as never)) {
      score += 16;
    }
  }

  if (isNamedInGoal(item, request.goal)) {
    score += 45;
  }

  return clamp(score);
}

function deployScoreForProject(item: ProjectKnowledge, request: GrpRequest): number {
  const requested = request.constraints?.deploy ?? [];
  if (requested.length === 0) {
    return Math.min(100, 50 + item.agentCard.deployment.length * 8 + (item.agentCard.cloudflareReady ? 15 : 0));
  }

  let score = 0;
  for (const deployment of requested) {
    if (item.agentCard.deployment.includes(deployment as never)) {
      score += 45;
    } else if (deployment === "cloudflare" && item.agentCard.cloudflareReady) {
      score += 45;
    } else if (deployment === "cloud" && item.agentCard.deployment.some((value) => ["cloud", "serverless", "cloudflare", "vercel"].includes(value))) {
      score += 25;
    } else if (deployment === "serverless" && item.agentCard.deployment.some((value) => ["serverless", "cloudflare", "vercel"].includes(value))) {
      score += 25;
    }
  }
  return clamp(score || 25);
}

function constraintScoreForProject(item: ProjectKnowledge, request: GrpRequest): number {
  const constraints = request.constraints;
  if (!constraints) {
    return 60;
  }

  let score = 40;
  if (constraints.license && normalizeToken(item.project.license ?? "") === constraints.license) {
    score += 20;
  }
  if (constraints.language && normalizeToken(item.project.language ?? "") === constraints.language) {
    score += 18;
  }
  if (constraints.category && item.agentCard.category === constraints.category) {
    score += 18;
  }
  if (constraints.agent_ready && (item.agentCard.category.includes("agent") || calculateAgentScore(item) >= 72)) {
    score += 16;
  }
  if (constraints.complexity && difficultyFitsComplexity(item.agentCard.difficulty, constraints.complexity)) {
    score += 12;
  }

  return clamp(score);
}

function weightedFinalScore(score: Omit<GrpScore, "finalScore">, mode: GrpMode): number {
  if (mode === "find") {
    return weightedScore([
      [score.relevanceScore, 0.45],
      [score.agentScore, 0.2],
      [score.deployScore, 0.15],
      [score.stabilityScore, 0.15],
      [score.constraintScore, 0.05]
    ]);
  }
  if (mode === "compose") {
    return weightedScore([
      [score.relevanceScore, 0.35],
      [score.agentScore, 0.2],
      [score.deployScore, 0.25],
      [score.stabilityScore, 0.15],
      [score.constraintScore, 0.05]
    ]);
  }
  return weightedScore([
    [score.relevanceScore, 0.35],
    [score.agentScore, 0.25],
    [score.deployScore, 0.2],
    [score.stabilityScore, 0.15],
    [score.constraintScore, 0.05]
  ]);
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

function buildExplanation(decomposition: GoalDecomposition, nodes: GrpNode[], paths: SolutionPath[], stack: StackRole[], mode: GrpMode): string[] {
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

function resultTypeForMode(mode: GrpMode): GrpResultType {
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

function reasonsForProject(
  item: ProjectKnowledge,
  scores: Pick<GrpScore, "relevanceScore" | "deployScore" | "constraintScore">,
  request: GrpRequest,
  decomposition: GoalDecomposition
): string[] {
  const reasons: string[] = [];
  if (scores.relevanceScore >= 60) {
    reasons.push(`Matches the goal through ${item.agentCard.category.replace(/_/g, " ")} capability.`);
  }
  if (request.constraints?.deploy?.some((deployment) => item.agentCard.deployment.includes(deployment as never))) {
    reasons.push(`Supports requested deployment target: ${request.constraints.deploy.join(", ")}.`);
  }
  if (item.agentCard.cloudflareReady) {
    reasons.push("Marked Cloudflare-ready in the Agent Card.");
  }
  if (scores.constraintScore >= 70) {
    reasons.push("Satisfies the explicit request constraints.");
  }
  if (item.metrics.maintenanceScore >= 70) {
    reasons.push("Has a strong maintenance profile.");
  }
  if (reasons.length === 0) {
    reasons.push(`Related to ${decomposition.subGoals[0] ?? "the requested goal"}.`);
  }
  return reasons.slice(0, 4);
}

function alternativesFor(item: ProjectKnowledge, projects: ProjectKnowledge[]) {
  return item.agentCard.alternatives.length > 0 ? item.agentCard.alternatives : generateAlternatives(item, projects, 4);
}

function addCapability(text: string, capabilities: Set<string>, subGoals: Set<string>, keywords: string[], capability: string, subGoal: string): void {
  if (keywords.some((keyword) => text.includes(keyword))) {
    capabilities.add(capability);
    subGoals.add(subGoal);
  }
}

function projectText(item: ProjectKnowledge): string {
  return [
    item.project.id,
    item.project.name,
    item.project.description,
    item.project.language,
    item.project.license,
    item.project.topics.join(" "),
    item.agentCard.category,
    item.agentCard.deployment.join(" "),
    item.agentCard.useCases.join(" "),
    item.agentCard.summaryForAgent
  ]
    .join(" ")
    .toLowerCase();
}

function isNamedInGoal(item: ProjectKnowledge, goal: string): boolean {
  const normalized = normalizeToken(goal);
  return [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", " "), item.project.fullName.replace("/", "-")]
    .map(normalizeToken)
    .some((alias) => alias.length > 2 && normalized.includes(alias));
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

function keywordsFor(goal: string): string[] {
  return goal
    .toLowerCase()
    .split(/[^a-z0-9._/-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !["the", "and", "for", "with", "that", "this", "from", "into", "like", "build", "find"].includes(part))
    .slice(0, 12);
}

function difficultyFitsComplexity(difficulty: string, complexity: GrpComplexity): boolean {
  if (complexity === "low") {
    return difficulty === "beginner";
  }
  if (complexity === "medium") {
    return difficulty === "beginner" || difficulty === "intermediate";
  }
  return true;
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

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "goal";
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
