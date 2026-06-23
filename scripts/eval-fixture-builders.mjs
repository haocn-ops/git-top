import { generateAgentCard } from "../src/cards.ts";
import { calculateMetrics } from "../src/scoring.ts";
import { inferSeedCategory } from "./seed-category-hints.mjs";
import { baseSignals, generatedKnowledgeNow, repoFixture } from "./eval-fixture-core.mjs";
import { generatedKnowledgeFixtures } from "./eval-fixture-data.mjs";

export function buildGeneratedKnowledgeFixtures(now = generatedKnowledgeNow) {
  return generatedKnowledgeFixtures.map((fixture) => ({
    fixture,
    knowledge: knowledgeFromFixture(fixture, now)
  }));
}

export function buildGeneratedKnowledgeFixturesForSeed(seedRepositories, now = generatedKnowledgeNow) {
  const fixturesById = new Map(generatedKnowledgeFixtures.map((fixture) => [fixture.repo.full_name.toLowerCase(), fixture]));
  const fixtures = [...generatedKnowledgeFixtures];

  for (const repository of seedRepositories) {
    const normalized = repository.toLowerCase();
    if (!fixturesById.has(normalized)) {
      const fixture = seedRepositoryFixture(repository);
      fixturesById.set(normalized, fixture);
      fixtures.push(fixture);
    }
  }

  return fixtures.map((fixture) => ({
    fixture,
    knowledge: knowledgeFromFixture(fixture, now)
  }));
}

function knowledgeFromFixture(fixture, now) {
  return {
    project: projectFromRepo(fixture.repo, now),
    agentCard: generateAgentCard(fixture.repo, fixture.signals, now),
    metrics: calculateMetrics(fixture.repo, fixture.signals, now, {
      signalConfidence: fixture.signals.signalConfidence
    })
  };
}

function seedRepositoryFixture(repository) {
  const [owner, name] = repository.split("/");
  const category = inferSeedCategory(repository, "other");
  const deployment = inferredDeployment(repository, category);
  const topics = topicWords(repository, category, deployment);
  const readmeText = seedReadmeText(repository, category, deployment);
  return {
    repo: repoFixture({
      owner,
      name,
      description: descriptionFor(repository, category),
      topics,
      language: languageFor(repository),
      stars: starsForCategory(category)
    }),
    signals: {
      ...baseSignals,
      readmeText,
      files: filesForDeployment(deployment),
      signalConfidence: {
        commits30d: "estimated",
        releases180d: "estimated",
        contributors90d: "estimated"
      }
    },
    expected: {
      category,
      deployments: deployment,
      cloudflareReady: deployment.includes("cloudflare")
    }
  };
}

function inferredDeployment(repository, category) {
  const normalized = repository.toLowerCase();
  const deployments = new Set(["local"]);

  if (normalized.includes("cloudflare")) {
    deployments.add("cloudflare");
    deployments.add("serverless");
  }
  if (normalized.includes("vercel") || normalized.includes("bolt.new")) {
    deployments.add("vercel");
    deployments.add("serverless");
  }
  if (["vector_database", "workflow_automation", "local_llm_runtime", "llm_gateway", "ai_observability"].includes(category)) {
    deployments.add("docker");
    if (!deployments.has("cloudflare") && !deployments.has("vercel")) {
      deployments.add("cloud");
    }
  }
  if (["agent_framework", "rag_framework", "prompt_tooling", "llm_eval", "mcp_server", "coding_agent"].includes(category)) {
    deployments.add("library_only");
    if (!deployments.has("cloudflare") && !deployments.has("vercel")) {
      deployments.add("cloud");
    }
  }
  if (category === "ai_app_template") {
    deployments.add("serverless");
    if (!deployments.has("cloudflare") && !deployments.has("vercel")) {
      deployments.add("cloud");
    }
  }

  return Array.from(deployments);
}

function topicWords(repository, category, deployment) {
  const words = repository
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  return Array.from(new Set([...words, category.replaceAll("_", "-"), ...category.split("_"), ...deployment]));
}

function seedReadmeText(repository, category, deployment) {
  const phrases = {
    agent_framework: "agent framework with agents, tool calling, and orchestration",
    coding_agent: "coding agent and developer assistant for software workflows",
    browser_agent: "browser automation and web agent workflows",
    rag_framework: "RAG framework for retrieval augmented generation and indexing",
    vector_database: "vector database for embeddings and semantic search",
    llm_gateway: "OpenAI compatible LLM gateway, proxy, and router",
    llm_eval: "LLM evaluation, benchmark, and testing workflows",
    prompt_tooling: "prompt tooling, guardrails, and structured output workflows",
    workflow_automation: "workflow automation and orchestration",
    local_llm_runtime: "local LLM runtime and inference serving",
    ai_app_template: "AI app template and starter project",
    mcp_server: "Model Context Protocol MCP server and tool integration",
    ai_observability: "LLM observability, tracing, and monitoring",
    other: "AI project metadata for Git.Top evaluation"
  };
  const deploymentHints = [];
  if (deployment.includes("docker")) {
    deploymentHints.push("Docker deployment supported");
  }
  if (deployment.includes("cloudflare")) {
    deploymentHints.push("Cloudflare Workers deployment path");
  }
  if (deployment.includes("vercel")) {
    deploymentHints.push("Vercel deployment path");
  }
  if (deployment.includes("library_only")) {
    deploymentHints.push("install as a library with package managers");
  }
  return `${repository} is a ${phrases[category] ?? phrases.other}. ${deploymentHints.join(". ")}.`;
}

function filesForDeployment(deployment) {
  const files = new Set(["package.json"]);
  if (deployment.includes("docker")) {
    files.add("Dockerfile");
  }
  if (deployment.includes("cloudflare")) {
    files.add("wrangler.toml");
  }
  if (deployment.includes("vercel")) {
    files.add("vercel.json");
  }
  return Array.from(files);
}

function descriptionFor(repository, category) {
  return `${repository} is indexed as ${category.replaceAll("_", " ")} for Git.Top generated knowledge fixtures.`;
}

function languageFor(repository) {
  const normalized = repository.toLowerCase();
  if (normalized.includes("python") || normalized.includes("llama") || normalized.includes("haystack") || normalized.includes("qdrant-client")) {
    return "Python";
  }
  if (normalized.includes("js") || normalized.includes("typescript") || normalized.includes("vercel") || normalized.includes("openai-guardrails-js")) {
    return "TypeScript";
  }
  if (normalized.includes("go-client") || normalized.includes("gateway")) {
    return "Go";
  }
  return "TypeScript";
}

function starsForCategory(category) {
  const stars = {
    agent_framework: 18000,
    coding_agent: 16000,
    browser_agent: 14000,
    rag_framework: 15000,
    vector_database: 13000,
    llm_gateway: 11000,
    llm_eval: 9000,
    prompt_tooling: 9000,
    workflow_automation: 12000,
    local_llm_runtime: 15000,
    ai_app_template: 10000,
    mcp_server: 10000,
    ai_observability: 9000,
    other: 3000
  };
  return stars[category] ?? stars.other;
}

function projectFromRepo(repo, syncedAt) {
  return {
    id: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    githubUrl: repo.html_url,
    homepageUrl: repo.homepage,
    description: repo.description,
    language: repo.language,
    topics: repo.topics,
    license: repo.license.spdx_id,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    syncedAt
  };
}
