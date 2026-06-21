import type { GrpRequest } from "./grp-request";

export interface GoalDecomposition {
  intent: string;
  subGoals: string[];
  requiredCapabilities: string[];
  keywords: string[];
}

export function decomposeGoal(request: GrpRequest): GoalDecomposition {
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

function addCapability(text: string, capabilities: Set<string>, subGoals: Set<string>, keywords: string[], capability: string, subGoal: string): void {
  if (keywords.some((keyword) => text.includes(keyword))) {
    capabilities.add(capability);
    subGoals.add(subGoal);
  }
}

function keywordsFor(goal: string): string[] {
  return goal
    .toLowerCase()
    .split(/[^a-z0-9._/-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !["the", "and", "for", "with", "that", "this", "from", "into", "like", "build", "find"].includes(part))
    .slice(0, 12);
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "goal";
}
