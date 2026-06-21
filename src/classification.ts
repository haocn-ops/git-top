import { curatedCategoryEvidence, inferCuratedCategory } from "./category-hints";
import type { AgentCard, Category, Deployment, Difficulty, GithubRepoSignals, GithubRepository } from "./types";

export interface ClassificationResult {
  category: Category;
  deployment: Deployment[];
  difficulty: Difficulty;
  cloudflareReady: boolean;
  classification: NonNullable<AgentCard["classification"]>;
}

export function classifyRepository(repo: GithubRepository, signals: GithubRepoSignals): ClassificationResult {
  const metadataCorpus = normalize([repo.full_name, repo.description, repo.language, ...(repo.topics ?? [])].join(" "));
  const corpus = normalize([metadataCorpus, signals.readmeText, signals.files.join(" ")].join(" "));
  const category = inferCuratedCategory(repo.full_name) ?? detectCategory(corpus, metadataCorpus);
  const deployment = detectDeployment(corpus, signals.files);
  const cloudflareReady = deployment.includes("cloudflare") && !hasRuntimeBlockers(corpus);
  const difficulty = detectDifficulty(repo, signals, deployment);
  const classification = buildClassification(repo, signals, corpus, metadataCorpus, category, deployment, difficulty, cloudflareReady);

  return {
    category,
    deployment,
    difficulty,
    cloudflareReady,
    classification
  };
}

function buildClassification(
  repo: GithubRepository,
  signals: GithubRepoSignals,
  corpus: string,
  metadataCorpus: string,
  category: Category,
  deployment: Deployment[],
  difficulty: Difficulty,
  cloudflareReady: boolean
): NonNullable<AgentCard["classification"]> {
  const categoryEvidence = evidenceForCategory(category, corpus, metadataCorpus, repo.full_name);
  const deploymentEvidence = evidenceForDeployment(deployment, corpus, signals.files);
  const difficultyEvidence = evidenceForDifficulty(repo, signals, deployment, difficulty);
  const cloudflareEvidence = evidenceForCloudflareReady(corpus, deployment, cloudflareReady);

  return {
    category: {
      confidence: confidenceFromEvidence(categoryEvidence, category === "other"),
      evidence: categoryEvidence
    },
    deployment: {
      confidence: confidenceFromEvidence(deploymentEvidence, deployment.length <= 1),
      evidence: deploymentEvidence
    },
    difficulty: {
      confidence: confidenceFromEvidence(difficultyEvidence, false),
      evidence: difficultyEvidence
    },
    cloudflareReady: {
      confidence: confidenceFromEvidence(cloudflareEvidence, !deployment.includes("cloudflare")),
      evidence: cloudflareEvidence
    }
  };
}

function detectCategory(corpus: string, metadataCorpus: string): Category {
  if (hasAny(metadataCorpus, ["openai compatible gateway", "openai-compatible gateway", "openai compatible proxy", "openai-compatible proxy"])) {
    return "llm_gateway";
  }
  if (hasAny(metadataCorpus, ["model context protocol", "mcp server", "modelcontextprotocol"]) || hasWord(metadataCorpus, "mcp")) {
    return "mcp_server";
  }
  if (hasAny(metadataCorpus, ["browser-use", "browserbase"]) || hasAny(metadataCorpus, ["browser agent", "browser automation"])) {
    return "browser_agent";
  }
  if (
    hasAny(metadataCorpus, ["continuedev", "cline", "aider", "openhands", "tabbyml", "openai/codex"]) ||
    hasAny(metadataCorpus, ["coding agent", "code assistant", "developer assistant"])
  ) {
    return "coding_agent";
  }
  if (hasAny(metadataCorpus, ["agent engineering platform", "agent framework", "agents framework"])) {
    return "agent_framework";
  }
  if (hasAny(metadataCorpus, ["vector database", "ann search", "embedding database"])) {
    return "vector_database";
  }
  if (hasAny(metadataCorpus, ["template", "starter", "boilerplate"])) {
    return "ai_app_template";
  }
  if (hasAny(metadataCorpus, ["prompt tooling", "prompt management", "prompt engineering", "structured output", "structured-output", "guardrails"])) {
    return "prompt_tooling";
  }
  if (hasEvaluationSignal(metadataCorpus)) {
    return "llm_eval";
  }
  if (hasAny(metadataCorpus, ["rag", "retrieval augmented", "retrieval-augmented", "indexing", "data framework"])) {
    return "rag_framework";
  }
  if (hasAny(metadataCorpus, ["workflow", "automation", "orchestration"])) {
    return "workflow_automation";
  }
  if (hasAny(metadataCorpus, ["observability", "trace", "tracing", "monitoring"])) {
    return "ai_observability";
  }
  if (hasAny(metadataCorpus, ["local llm", "local-llm", "inference server", "serve models", "model-serving", "gguf"])) {
    return "local_llm_runtime";
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
  if (hasEvaluationSignal(corpus)) {
    return "llm_eval";
  }
  if (hasAny(corpus, ["template", "starter", "boilerplate"])) {
    return "ai_app_template";
  }
  if (hasAny(corpus, ["local llm", "local-llm", "inference server", "serve models", "model serving", "model-serving", "gguf"])) {
    return "local_llm_runtime";
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

function evidenceForCategory(category: Category, corpus: string, metadataCorpus: string, projectId: string): string[] {
  const hints: Record<Category, string[]> = {
    agent_framework: ["agent framework", "agents framework", "agent", "agents", "tool calling"],
    coding_agent: ["coding agent", "code assistant", "developer assistant", "ide", "openhands", "cline", "aider"],
    browser_agent: ["browser agent", "browser automation", "web agent", "playwright", "browser-use"],
    rag_framework: ["rag", "retrieval augmented", "retrieval-augmented", "indexing", "data framework"],
    vector_database: ["vector database", "embedding database", "ann search"],
    llm_gateway: ["gateway", "proxy", "router", "openai compatible"],
    llm_eval: ["eval", "evaluation", "benchmark"],
    prompt_tooling: ["prompt", "prompt management"],
    workflow_automation: ["workflow", "automation", "orchestration"],
    local_llm_runtime: ["local llm", "inference server", "serve models", "gguf"],
    ai_app_template: ["template", "starter", "boilerplate"],
    mcp_server: ["model context protocol", "mcp server", "modelcontextprotocol"],
    ai_observability: ["observability", "trace", "tracing", "monitoring"],
    other: []
  };
  const overrideEvidence = curatedCategoryEvidence(projectId, category);
  if (overrideEvidence.length > 0) {
    return overrideEvidence;
  }

  const evidence = collectEvidence(metadataCorpus, hints[category], "metadata");
  return evidence.length > 0 ? evidence : collectEvidence(corpus, hints[category], "repository content");
}

function evidenceForDeployment(deployment: Deployment[], corpus: string, files: string[]): string[] {
  const fileSet = new Set(files.map((file) => file.toLowerCase()));
  const evidence: string[] = [];
  if (deployment.includes("docker") && (fileSet.has("dockerfile") || fileSet.has("docker-compose.yml"))) {
    evidence.push("Found Docker configuration file.");
  }
  if (deployment.includes("cloudflare") && fileSet.has("wrangler.toml")) {
    evidence.push("Found wrangler.toml.");
  }
  evidence.push(...collectEvidence(corpus, ["cloudflare workers", "durable objects", "vercel", "kubernetes", "helm chart", "serverless", "pip install", "npm install", "pnpm add", "library"], "repository content"));
  if (deployment.includes("local")) {
    evidence.push("Local usage is assumed for open source repositories unless contradicted.");
  }
  return unique(evidence).slice(0, 6);
}

function evidenceForDifficulty(repo: GithubRepository, signals: GithubRepoSignals, deployment: Deployment[], difficulty: Difficulty): string[] {
  if (deployment.includes("cloudflare")) {
    return ["Cloudflare deployment path suggests a guided serverless setup."];
  }
  if (repo.stargazers_count < 10000 && difficulty === "beginner") {
    return ["Repository has under 10k stars, so complexity is treated conservatively."];
  }
  if (signals.files.some((file) => ["docker-compose.yml", "helmfile.yaml", "skaffold.yaml"].includes(file.toLowerCase()))) {
    return ["Found multi-service or orchestration configuration files."];
  }
  if ((repo.topics ?? []).some((topic) => ["kubernetes", "distributed", "inference"].includes(topic))) {
    return ["Repository topics include infrastructure-heavy concepts."];
  }
  return ["No strong beginner or advanced signal found; defaulting to intermediate."];
}

function evidenceForCloudflareReady(corpus: string, deployment: Deployment[], cloudflareReady: boolean): string[] {
  const evidence: string[] = [];
  if (deployment.includes("cloudflare")) {
    evidence.push(`Cloudflare signal: ${cloudflareSignals(corpus).join(", ") || "deployment metadata"}.`);
  }
  const blockers = runtimeBlockers(corpus);
  if (blockers.length > 0) {
    evidence.push(`Runtime blocker: ${blockers.slice(0, 4).join(", ")}.`);
  } else if (cloudflareReady) {
    evidence.push("Runtime blocker: none detected.");
  }
  if (!cloudflareReady && !deployment.includes("cloudflare")) {
    evidence.push("No Cloudflare deployment signal detected.");
  }
  return evidence;
}

function collectEvidence(corpus: string, needles: string[], source: string): string[] {
  return needles.filter((needle) => corpus.includes(needle)).slice(0, 4).map((needle) => `Matched "${needle}" in ${source}.`);
}

function confidenceFromEvidence(evidence: string[], weakDefault: boolean): "high" | "medium" | "low" {
  if (evidence.length >= 2) {
    return "high";
  }
  if (evidence.length === 1) {
    return weakDefault ? "low" : "medium";
  }
  return "low";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function hasRuntimeBlockers(corpus: string): boolean {
  return runtimeBlockers(corpus).length > 0;
}

function cloudflareSignals(corpus: string): string[] {
  return ["wrangler.toml", "cloudflare workers", "durable objects"].filter((item) => corpus.includes(item));
}

function runtimeBlockers(corpus: string): string[] {
  return ["python", "cuda", "gpu", "docker daemon", "postgres", "native extension", "filesystem"].filter((item) => corpus.includes(item));
}

function hasAny(corpus: string, needles: string[]): boolean {
  return needles.some((needle) => corpus.includes(needle));
}

function hasEvaluationSignal(corpus: string): boolean {
  return hasWord(corpus, "eval") || hasAny(corpus, ["evaluation", "benchmark", "red-team", "red teaming"]);
}

function hasWord(corpus: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(corpus);
}

function normalize(value: string): string {
  return value.toLowerCase();
}
