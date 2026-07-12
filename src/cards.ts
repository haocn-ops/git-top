import { classifyRepository } from "./classification";
import { reviewedCollectionPolicy } from "./collection-policy";
import type { AgentCard, Category, CollectionMetadata, Deployment, GithubRepoSignals, GithubRepository } from "./types";

export function generateAgentCard(repo: GithubRepository, signals: GithubRepoSignals, now: string): AgentCard {
  const { category, deployment, cloudflareReady, difficulty, classification } = classifyRepository(repo, signals);
  const projectKind = detectProjectKind(repo, signals);

  return {
    projectId: repo.full_name,
    projectKind,
    ...(projectKind === "collection" ? { collectionMetadata: buildCollectionMetadata(repo, signals) } : {}),
    category,
    difficulty,
    deployment,
    cloudflareReady,
    useCases: buildUseCases(category, repo, projectKind),
    notGoodFor: buildNotGoodFor(category, deployment, cloudflareReady, projectKind),
    alternatives: [],
    summaryForAgent: buildSummary(repo, category, deployment, cloudflareReady, projectKind),
    classification,
    schemaVersion: "v1",
    generatedAt: now
  };
}

function buildUseCases(category: Category, repo: GithubRepository, projectKind: AgentCard["projectKind"]): string[] {
  if (projectKind === "collection") {
    return ["discover related AI projects", "compare implementation patterns", "bootstrap project selection"];
  }

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

function buildNotGoodFor(category: Category, deployment: Deployment[], cloudflareReady: boolean, projectKind: AgentCard["projectKind"]): string[] {
  const warnings: string[] = [];
  if (projectKind === "collection") {
    warnings.push("users expecting a single installable runtime or library");
  }
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

function buildSummary(
  repo: GithubRepository,
  category: Category,
  deployment: Deployment[],
  cloudflareReady: boolean,
  projectKind: AgentCard["projectKind"]
): string {
  const categoryText = category.replace(/_/g, " ");
  const deploymentText = deployment.slice(0, 3).map(humanizeIdentifier).join(", ");
  const cloudflareText = cloudflareReady ? " It is marked Cloudflare-ready." : "";
  if (projectKind === "collection") {
    return `Use ${repo.full_name} when the user needs a curated ${categoryText} resource collection with ${deploymentText} usage paths.${cloudflareText}`;
  }
  return `Use ${repo.full_name} when the user needs ${indefiniteArticle(categoryText)} ${categoryText} project with ${deploymentText} deployment options.${cloudflareText}`;
}

function indefiniteArticle(value: string): "a" | "an" {
  return /^[aeiou]/i.test(value) ? "an" : "a";
}

function humanizeIdentifier(value: string): string {
  return value.replaceAll("_", "-");
}

function detectProjectKind(repo: GithubRepository, signals: GithubRepoSignals): AgentCard["projectKind"] {
  if (reviewedCollectionPolicy(repo.full_name)) {
    return "collection";
  }

  const identityCorpus = [repo.full_name, repo.name, repo.description, ...(repo.topics ?? [])].join(" ").toLowerCase();
  const readmeCorpus = signals.readmeText.toLowerCase();

  if (hasAny(identityCorpus, ["awesome", "cookbook", "cookbooks", "recipes"])) {
    return "collection";
  }
  if (hasAny(identityCorpus, ["resource collection", "starter collection", "template collection", "server directory", "resource hub"])) {
    return "collection";
  }
  if (hasAny(readmeCorpus, ["awesome list", "curated list", "resource collection", "starter collection", "template collection"])) {
    return "collection";
  }

  return "project";
}

function buildCollectionMetadata(repo: GithubRepository, signals: GithubRepoSignals): CollectionMetadata {
  const corpus = [repo.full_name, repo.name, repo.description, ...(repo.topics ?? []), signals.readmeText].join(" ").toLowerCase();
  const scope = collectionScope(corpus);
  return {
    scope,
    curated: hasAny(corpus, ["awesome", "curated", "cookbook", "course", "directory"]),
    estimatedItems: estimatedCollectionItems(corpus, scope),
    freshness: collectionFreshness(signals)
  };
}

function collectionScope(corpus: string): CollectionMetadata["scope"] {
  if (corpus.includes("awesome")) {
    return "awesome_list";
  }
  if (corpus.includes("cookbook") || corpus.includes("course")) {
    return "cookbook";
  }
  if (corpus.includes("starter collection") || corpus.includes("template") || corpus.includes("starter")) {
    return "starter_collection";
  }
  if (corpus.includes("mcp") || corpus.includes("integration") || corpus.includes("directory")) {
    return "integration_collection";
  }
  return "resource_hub";
}

function estimatedCollectionItems(corpus: string, scope: CollectionMetadata["scope"]): number | null {
  if (scope === "awesome_list") {
    return 100;
  }
  if (scope === "cookbook") {
    return 25;
  }
  if (scope === "starter_collection") {
    return 10;
  }
  if (scope === "integration_collection") {
    return 10;
  }
  return corpus.includes("collection") ? 20 : null;
}

function collectionFreshness(signals: GithubRepoSignals): CollectionMetadata["freshness"] {
  if (signals.commits30d >= 10 || signals.releases180d > 0) {
    return "active";
  }
  if (signals.commits30d === 0 && signals.releases180d === 0) {
    return "stale";
  }
  return "unknown";
}

function hasAny(corpus: string, needles: string[]): boolean {
  return needles.some((needle) => corpus.includes(needle));
}
