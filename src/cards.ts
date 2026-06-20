import type { AgentCard, Category, Deployment, Difficulty, GithubRepoSignals, GithubRepository } from "./types";

export function generateAgentCard(repo: GithubRepository, signals: GithubRepoSignals, now: string): AgentCard {
  const metadataCorpus = normalize([repo.full_name, repo.description, repo.language, ...(repo.topics ?? [])].join(" "));
  const corpus = normalize([metadataCorpus, signals.readmeText, signals.files.join(" ")].join(" "));
  const category = detectCategory(corpus, metadataCorpus);
  const deployment = detectDeployment(corpus, signals.files);
  const cloudflareReady = deployment.includes("cloudflare") && !hasRuntimeBlockers(corpus);
  const difficulty = detectDifficulty(repo, signals, deployment);

  return {
    projectId: repo.full_name,
    category,
    difficulty,
    deployment,
    cloudflareReady,
    useCases: buildUseCases(category, repo),
    notGoodFor: buildNotGoodFor(category, deployment, cloudflareReady),
    alternatives: [],
    summaryForAgent: buildSummary(repo, category, deployment, cloudflareReady),
    schemaVersion: "v1",
    generatedAt: now
  };
}

function detectCategory(corpus: string, metadataCorpus: string): Category {
  if (hasAny(metadataCorpus, ["browser-use", "browserbase"]) || hasAny(metadataCorpus, ["browser agent", "browser automation"])) {
    return "browser_agent";
  }
  if (
    hasAny(metadataCorpus, ["continuedev", "cline", "aider", "openhands", "tabbyml", "openai/codex"]) ||
    hasAny(metadataCorpus, ["coding agent", "code assistant", "developer assistant"])
  ) {
    return "coding_agent";
  }
  if (hasAny(metadataCorpus, ["model context protocol", "mcp server", "modelcontextprotocol"])) {
    return "mcp_server";
  }
  if (hasAny(metadataCorpus, ["agent engineering platform", "agent framework", "agents framework"])) {
    return "agent_framework";
  }
  if (hasAny(metadataCorpus, ["vector database", "ann search", "embedding database"])) {
    return "vector_database";
  }
  if (hasAny(metadataCorpus, ["rag", "retrieval augmented", "retrieval-augmented", "indexing", "data framework"])) {
    return "rag_framework";
  }
  if (hasAny(metadataCorpus, ["agent", "agents", "multiagent", "tool calling"])) {
    return "agent_framework";
  }
  if (hasAny(corpus, ["coding agent", "code assistant", "developer assistant"]) || hasWord(corpus, "ide")) {
    return "coding_agent";
  }
  if (hasAny(corpus, ["browser agent", "browser automation", "web agent", "playwright"])) {
    return "browser_agent";
  }
  if (hasAny(corpus, ["vector database", "ann search", "embedding database"])) {
    return "vector_database";
  }
  if (hasAny(corpus, ["rag", "retrieval augmented", "retrieval-augmented", "indexing"])) {
    return "rag_framework";
  }
  if (hasAny(corpus, ["mcp server", "model context protocol server"])) {
    return "mcp_server";
  }
  if (hasAny(corpus, ["eval", "benchmark", "evaluation"])) {
    return "llm_eval";
  }
  if (hasAny(corpus, ["gateway", "proxy", "router", "openai compatible"])) {
    return "llm_gateway";
  }
  if (hasAny(corpus, ["prompt", "prompt management", "prompt engineering"])) {
    return "prompt_tooling";
  }
  if (hasAny(corpus, ["workflow", "automation", "orchestration"])) {
    return "workflow_automation";
  }
  if (hasAny(corpus, ["local llm", "inference server", "serve models", "gguf"])) {
    return "local_llm_runtime";
  }
  if (hasAny(corpus, ["template", "starter", "boilerplate"])) {
    return "ai_app_template";
  }
  if (hasAny(corpus, ["observability", "tracing", "monitoring"])) {
    return "ai_observability";
  }
  if (hasAny(corpus, ["agent", "agents", "tool calling"])) {
    return "agent_framework";
  }
  return "other";
}

function detectDeployment(corpus: string, files: string[]): Deployment[] {
  const deployments = new Set<Deployment>();
  const fileSet = new Set(files.map((file) => file.toLowerCase()));

  if (fileSet.has("dockerfile") || fileSet.has("docker-compose.yml") || corpus.includes("docker")) {
    deployments.add("docker");
  }
  if (fileSet.has("wrangler.toml") || corpus.includes("cloudflare workers") || corpus.includes("durable objects")) {
    deployments.add("cloudflare");
    deployments.add("serverless");
  }
  if (fileSet.has("vercel.json") || corpus.includes("vercel")) {
    deployments.add("vercel");
    deployments.add("serverless");
  }
  if (corpus.includes("kubernetes") || corpus.includes("helm chart")) {
    deployments.add("kubernetes");
  }
  if (corpus.includes("serverless")) {
    deployments.add("serverless");
  }
  if (hasAny(corpus, ["pip install", "npm install", "pnpm add", "library"])) {
    deployments.add("library_only");
  }

  deployments.add("local");
  if (!deployments.has("cloudflare") && !deployments.has("vercel")) {
    deployments.add("cloud");
  }

  return Array.from(deployments);
}

function detectDifficulty(repo: GithubRepository, signals: GithubRepoSignals, deployment: Deployment[]): Difficulty {
  if (deployment.includes("cloudflare") || repo.stargazers_count < 10000) {
    return "beginner";
  }
  if (signals.files.some((file) => ["docker-compose.yml", "helmfile.yaml", "skaffold.yaml"].includes(file.toLowerCase()))) {
    return "advanced";
  }
  if ((repo.topics ?? []).some((topic) => ["kubernetes", "distributed", "inference"].includes(topic))) {
    return "advanced";
  }
  return "intermediate";
}

function buildUseCases(category: Category, repo: GithubRepository): string[] {
  const project = repo.name;
  const byCategory: Record<Category, string[]> = {
    agent_framework: [`build agents with ${project}`, "orchestrate LLM tools", "prototype autonomous workflows"],
    coding_agent: ["build AI coding assistants", "automate developer workflows", "integrate codebase-aware agents"],
    browser_agent: ["build browser automation agents", "operate web tasks with LLMs", "test web workflows"],
    rag_framework: ["build RAG applications", "connect private data to LLMs", "index documents for retrieval"],
    vector_database: ["store embeddings", "power semantic search", "serve retrieval workloads"],
    llm_gateway: ["route LLM requests", "standardize model provider access", "add gateway-level controls"],
    llm_eval: ["evaluate LLM outputs", "benchmark prompts and agents", "track model quality"],
    prompt_tooling: ["manage prompts", "version prompt workflows", "improve prompt iteration"],
    workflow_automation: ["orchestrate AI workflows", "connect tools and services", "automate repeated tasks"],
    local_llm_runtime: ["run local models", "serve inference endpoints", "prototype private LLM deployments"],
    ai_app_template: ["bootstrap an AI app", "start a production-ready template", "learn app architecture patterns"],
    mcp_server: ["connect agents to tools", "expose APIs through MCP", "bootstrap MCP integrations"],
    ai_observability: ["trace LLM applications", "monitor agent behavior", "debug production AI systems"],
    other: ["evaluate whether this project fits an AI workflow", "compare against similar open source projects"]
  };

  return byCategory[category];
}

function buildNotGoodFor(category: Category, deployment: Deployment[], cloudflareReady: boolean): string[] {
  const warnings: string[] = [];
  if (!cloudflareReady) {
    warnings.push("edge-only Cloudflare Workers deployment without adaptation");
  }
  if (deployment.includes("library_only")) {
    warnings.push("users expecting a complete hosted product");
  }
  if (category === "local_llm_runtime") {
    warnings.push("lightweight serverless applications");
  }
  if (category === "vector_database") {
    warnings.push("simple prompt-only prototypes");
  }
  return warnings.slice(0, 3);
}

function buildSummary(repo: GithubRepository, category: Category, deployment: Deployment[], cloudflareReady: boolean): string {
  const deploymentText = deployment.slice(0, 3).join(", ");
  const cloudflareText = cloudflareReady ? " It is marked Cloudflare-ready." : "";
  return `Use ${repo.full_name} when the user needs a ${category.replace(/_/g, " ")} project with ${deploymentText} deployment options.${cloudflareText}`;
}

function hasRuntimeBlockers(corpus: string): boolean {
  return hasAny(corpus, ["python", "cuda", "gpu", "docker daemon", "postgres", "native extension", "filesystem"]);
}

function hasAny(corpus: string, needles: string[]): boolean {
  return needles.some((needle) => corpus.includes(needle));
}

function hasWord(corpus: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(corpus);
}

function normalize(value: string): string {
  return value.toLowerCase();
}
