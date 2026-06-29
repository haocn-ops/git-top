import { readFile } from "node:fs/promises";
import { generateAgentCard } from "../src/cards.ts";
import { classifyRepository } from "../src/classification.ts";
import { reviewedCollectionPolicy } from "../src/collection-policy.ts";
import { seedProjects } from "../src/seed.ts";
import { validateProjectKnowledge } from "../src/validation.ts";
import {
  buildGeneratedKnowledgeFixturesForSeed,
  generatedKnowledgeFixtures,
  generatedKnowledgeNow
} from "./eval-fixtures.mjs";

const seedRepositories = JSON.parse(await readFile(new URL("../data/seed-repositories.json", import.meta.url), "utf8"));
const qualityBurnDownProjects = new Map([
  ["a2aproject/a2a", "agent_framework"],
  ["ag2ai/ag2", "agent_framework"],
  ["apache/answer", "ai_app_template"],
  ["agentscope-ai/agentscope", "agent_framework"],
  ["arize-ai/openinference", "ai_observability"],
  ["bentoml/bentoml", "local_llm_runtime"],
  ["copilotkit/aimock", "ai_app_template"],
  ["guardrails-ai/guardrails_pii", "prompt_tooling"],
  ["kserve/kserve", "local_llm_runtime"],
  ["mlc-ai/mlc-llm", "local_llm_runtime"],
  ["milvus-io/milvus-sdk-java", "vector_database"],
  ["builderio/gpt-crawler", "ai_app_template"],
  ["signoz/signoz-otel-collector", "ai_observability"],
  ["huggingface/optimum", "local_llm_runtime"],
  ["sweepai/sweep", "coding_agent"],
  ["lmstudio-ai/lms", "local_llm_runtime"],
  ["openai/openai-openapi", "llm_gateway"],
  ["n8n-io/task-runner-launcher", "workflow_automation"],
  ["qdrant/rust-client", "vector_database"],
  ["firecrawl/fireplexity", "browser_agent"],
  ["dagster-io/dagster-open-platform", "workflow_automation"],
  ["supermemoryai/opensearch-ai", "rag_framework"],
  ["firecrawl/open-researcher", "browser_agent"],
  ["openai/openai-structured-outputs-samples", "prompt_tooling"],
  ["qdrant/page-search", "vector_database"],
  ["qdrant/n8n-nodes-qdrant", "vector_database"],
  ["weaviate/retrieve-dspy", "rag_framework"],
  ["flowiseai/flowisepy", "workflow_automation"],
  ["supermemoryai/supermemory-mcp", "mcp_server"],
  ["triggerdotdev/trigger.dev", "workflow_automation"],
  ["vllm-project/semantic-router", "prompt_tooling"],
  ["vllm-project/vllm-omni", "local_llm_runtime"]
]);

for (const project of seedProjects) {
  validateProjectKnowledge(project);
}

for (const fixture of generatedKnowledgeFixtures) {
  const classification = classifyRepository(fixture.repo, fixture.signals);
  assertEqual(classification.category, fixture.expected.category, `${fixture.repo.full_name} direct category`);
  assertEqual(classification.cloudflareReady, fixture.expected.cloudflareReady, `${fixture.repo.full_name} direct cloudflareReady`);
  for (const deployment of fixture.expected.deployments) {
    assertIncludes(classification.deployment, deployment, `${fixture.repo.full_name} direct deployment`);
  }
  assertClassificationEvidence(classification, fixture.repo.full_name);
  assertCloudflareEvidence(classification, fixture);

  const agentCard = generateAgentCard(fixture.repo, fixture.signals, generatedKnowledgeNow);
  assertEqual(agentCard.category, fixture.expected.category, `${fixture.repo.full_name} category`);
  assertEqual(agentCard.cloudflareReady, fixture.expected.cloudflareReady, `${fixture.repo.full_name} cloudflareReady`);
  if (agentCard.projectKind === "collection" && !agentCard.collectionMetadata) {
    throw new Error(`${fixture.repo.full_name} collection fixture missing collectionMetadata`);
  }
  if (fixture.expected.projectKind) {
    assertEqual(agentCard.projectKind, fixture.expected.projectKind, `${fixture.repo.full_name} projectKind`);
  }
  for (const deployment of fixture.expected.deployments) {
    assertIncludes(agentCard.deployment, deployment, `${fixture.repo.full_name} deployment`);
  }
  assertClassificationEvidence(agentCard, fixture.repo.full_name);
  assertCloudflareEvidence(agentCard, fixture);

}

testProjectKindDetection();
testCollectionPolicyLookup();

const generatedKnowledge = buildGeneratedKnowledgeFixturesForSeed(seedRepositories, generatedKnowledgeNow);
for (const { knowledge } of generatedKnowledge) {
  validateProjectKnowledge(knowledge);
  const expectedCategory = qualityBurnDownProjects.get(knowledge.project.id.toLowerCase());
  if (expectedCategory) {
    assertEqual(knowledge.agentCard.category, expectedCategory, `${knowledge.project.id} quality burn-down category`);
  }
}

console.log(`Validated ${seedProjects.length} seed projects and ${generatedKnowledge.length} generated knowledge fixtures.`);

function testProjectKindDetection() {
  const langchain = generateAgentCard(
    mockRepo("langchain-ai/langchain", "Build context-aware reasoning applications", ["agents", "llm", "rag"]),
    mockSignals("Includes cookbook examples, integrations, and templates inside the project documentation."),
    generatedKnowledgeNow
  );
  assertEqual(langchain.projectKind, "project", "langchain-ai/langchain projectKind");

  const a2a = generateAgentCard(
    mockRepo("a2aproject/A2A", "Agent framework protocol for agent-to-agent workflows", ["agent-framework", "agents", "protocol"]),
    mockSignals("Agent framework protocol for agent-to-agent workflows."),
    generatedKnowledgeNow
  );
  assertEqual(a2a.projectKind, "project", "a2aproject/A2A projectKind");
  assertEqual(a2a.category, "agent_framework", "a2aproject/A2A category");

  const openinference = generateAgentCard(
    mockRepo("Arize-ai/openinference", "AI observability tracing instrumentation", ["observability", "tracing", "monitoring"]),
    mockSignals("AI observability tracing instrumentation."),
    generatedKnowledgeNow
  );
  assertEqual(openinference.projectKind, "project", "Arize-ai/openinference projectKind");
  assertEqual(openinference.category, "ai_observability", "Arize-ai/openinference category");

  const awesome = generateAgentCard(
    mockRepo("punkpeye/awesome-mcp-servers", "A curated list of MCP servers", ["awesome", "mcp", "servers"]),
    mockSignals("Curated resource collection for Model Context Protocol servers."),
    generatedKnowledgeNow
  );
  assertEqual(awesome.projectKind, "collection", "punkpeye/awesome-mcp-servers projectKind");

  const cookbook = generateAgentCard(
    mockRepo("openai/openai-cookbook", "Examples and guides for building with OpenAI", ["cookbook", "examples", "openai"]),
    mockSignals("Cookbook examples for AI applications."),
    generatedKnowledgeNow
  );
  assertEqual(cookbook.projectKind, "collection", "openai/openai-cookbook projectKind");
}

function testCollectionPolicyLookup() {
  if (!reviewedCollectionPolicy("Giskard-AI/awesome-ai-safety")) {
    throw new Error("reviewed collection policy lookup should be case-insensitive");
  }
}

function mockRepo(fullName, description, topics) {
  const [owner, name] = fullName.split("/");
  return {
    id: 1,
    name,
    full_name: fullName,
    owner: { login: owner },
    html_url: `https://github.com/${fullName}`,
    homepage: null,
    description,
    language: "TypeScript",
    topics,
    license: { spdx_id: "MIT" },
    stargazers_count: 10000,
    forks_count: 100,
    open_issues_count: 10,
    default_branch: "main",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2026-06-20T00:00:00Z",
    pushed_at: "2026-06-20T00:00:00Z"
  };
}

function mockSignals(readmeText) {
  return {
    readmeText,
    files: ["package.json"],
    commits30d: 5,
    releases180d: 1,
    contributors90d: 4,
    issueFirstResponseMedianHours: null,
    signalConfidence: {
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }
  };
}

function assertClassificationEvidence(subject, label) {
  for (const key of ["category", "deployment", "difficulty", "cloudflareReady"]) {
    const signal = subject.classification?.[key];
    if (!signal) {
      throw new Error(`${label} missing classification.${key}`);
    }
    if (!["high", "medium", "low"].includes(signal.confidence)) {
      throw new Error(`${label} classification.${key} has invalid confidence ${signal.confidence}`);
    }
    if (!Array.isArray(signal.evidence)) {
      throw new Error(`${label} classification.${key}.evidence must be an array`);
    }
  }
}

function assertCloudflareEvidence(subject, fixture) {
  if (!fixture.expected.deployments.includes("cloudflare")) {
    return;
  }
  const evidence = subject.classification?.cloudflareReady?.evidence ?? [];
  assertEvidenceIncludes(evidence, "Cloudflare signal:", `${fixture.repo.full_name} Cloudflare signal evidence`);
  if (fixture.expected.cloudflareReady) {
    assertEvidenceIncludes(evidence, "Runtime blocker: none detected.", `${fixture.repo.full_name} Cloudflare ready blocker evidence`);
  } else {
    assertEvidenceIncludes(evidence, "Runtime blocker:", `${fixture.repo.full_name} Cloudflare blocker evidence`);
  }
}

function assertEvidenceIncludes(evidence, expected, label) {
  if (!evidence.some((item) => item.includes(expected))) {
    throw new Error(`${label}: expected evidence to include ${expected}; got ${evidence.join(" | ")}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`${label}: expected ${values.join(", ")} to include ${expected}`);
  }
}
