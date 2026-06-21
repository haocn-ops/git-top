import { readFile, writeFile } from "node:fs/promises";
import { listProjectKnowledgeWithMeta, recommendProjectList, searchProjectList } from "../src/db.ts";
import { normalizeGrpRequest, runGrpQuery } from "../src/grp.ts";
import { seedProjects } from "../src/seed.ts";
import { buildGeneratedKnowledgeFixturesForSeed } from "./eval-fixtures.mjs";
import { mockD1Env } from "./mock-d1.mjs";
import { inferSeedCategory } from "./seed-category-hints.mjs";

export async function buildEvaluationContext() {
  const seedRepositories = JSON.parse(await readFile(new URL("../data/seed-repositories.json", import.meta.url), "utf8"));
  const generatedEvaluationProjects = buildGeneratedKnowledgeFixturesForSeed(seedRepositories).map((item) => item.knowledge);
  const d1FixtureProjects = (await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: generatedEvaluationProjects }))).projects;
  const evaluationProjects = buildEvaluationProjects(seedRepositories, [...d1FixtureProjects, ...seedProjects]);
  const generatedFixtureIds = new Set(generatedEvaluationProjects.map((item) => item.project.id.toLowerCase()));
  const seedProjectIds = new Set(seedProjects.map((item) => item.project.id.toLowerCase()));
  const effectiveGeneratedFixtureCount = [...generatedFixtureIds].filter((id) => !seedProjectIds.has(id)).length;

  return {
    evaluationProjects,
    generatedEvaluationProjects,
    d1FixtureProjects,
    effectiveGeneratedFixtureCount
  };
}

export function runEvalCases(evalCases, evaluationProjects) {
  return evalCases.map((testCase) => runCase(testCase, evaluationProjects));
}

export function runEvalCasesWithSearch(evalCases, evaluationProjects, searchProjectListOverride) {
  return evalCases.map((testCase) => runCase(testCase, evaluationProjects, { searchProjectListOverride }));
}

export function summarizeEvalResults(caseResults) {
  const total = caseResults.length;
  const top1 = caseResults.filter((item) => item.top1_hit).length;
  const top3 = caseResults.filter((item) => item.top3_hit).length;
  const category = caseResults.filter((item) => item.category_match).length;
  const deployment = caseResults.filter((item) => item.deployment_match).length;
  const cloudflareReady = caseResults.filter((item) => item.cloudflare_ready_match).length;
  const unacceptableHitCount = caseResults.reduce((sum, item) => sum + item.unacceptable_hits.length, 0);

  return {
    evaluated_cases: total,
    top1_hit_rate: rate(top1, total),
    top3_hit_rate: rate(top3, total),
    category_accuracy: rate(category, total),
    deployment_accuracy: rate(deployment, total),
    cloudflare_ready_accuracy: rate(cloudflareReady, total),
    unacceptable_hit_count: unacceptableHitCount
  };
}

export async function writeEvalReport(report, { outputPath, title, description }) {
  const generatedAt = new Date().toISOString();
  const reviewFocus = buildReviewFocus(report.cases);
  const rows = report.cases.map((item) =>
    [
      `\`${item.id}\``,
      item.type,
      item.top1_hit ? "yes" : "no",
      item.top3_hit ? "yes" : "no",
      item.category_match ? "yes" : "no",
      item.deployment_match ? "yes" : "no",
      item.cloudflare_ready_match ? "yes" : "no",
      item.unacceptable_hits.length,
      item.candidates.slice(0, 5).map((id) => `\`${id}\``).join(", ")
    ].join(" | ")
  );
  const markdown = [
    `# ${title}`,
    "",
    `Generated at: ${generatedAt}`,
    "",
    description,
    "",
    "## Summary",
    "",
    `- Evaluated cases: ${report.evaluated_cases}`,
    `- Top-1 hit rate: ${report.top1_hit_rate}`,
    `- Top-3 hit rate: ${report.top3_hit_rate}`,
    `- Category accuracy: ${report.category_accuracy}`,
    `- Deployment accuracy: ${report.deployment_accuracy}`,
    `- Cloudflare readiness accuracy: ${report.cloudflare_ready_accuracy}`,
    `- Unacceptable hit count: ${report.unacceptable_hit_count}`,
    `- Generated fixture projects: ${report.generated_fixture_projects}`,
    `- D1 fixture projects: ${report.d1_fixture_projects}`,
    `- Effective generated fixture projects: ${report.effective_generated_fixture_projects}`,
    `- Synthetic projects: ${report.synthetic_projects}`,
    "",
    "## Review Focus",
    "",
    ...reviewFocus,
    "",
    "## Cases",
    "",
    "Case | Type | Top-1 | Top-3 | Category | Deployment | Cloudflare Ready | Unacceptable Hits | Top Candidates",
    "--- | --- | --- | --- | --- | --- | --- | ---: | ---",
    ...rows
  ].join("\n");

  await writeFile(outputPath, `${markdown}\n`);
}

function runCase(testCase, evaluationProjects, options = {}) {
  const candidates = candidateProjects(testCase, evaluationProjects, options);
  const candidateIds = candidates.map((item) => item.project.id);
  const expected = testCase.expected ?? {};
  const acceptable = expected.acceptableProjects ?? [];
  const unacceptable = expected.unacceptableProjects ?? [];
  const top1Hit = acceptable.length === 0 ? true : acceptable.includes(candidateIds[0]);
  const top3Hit = acceptable.length === 0 ? true : candidateIds.slice(0, 3).some((id) => acceptable.includes(id));
  const unacceptableHits = candidateIds.filter((id) => unacceptable.includes(id));
  const categoryMatches = expected.categories?.length
    ? candidates.some((item) => expected.categories.includes(item.agentCard.category))
    : true;
  const deploymentMatches = expected.deployments?.length
    ? candidates.some((item) => item.agentCard.deployment.some((deployment) => expected.deployments.includes(deployment)))
    : true;
  const cloudflareReadyMatches =
    typeof expected.cloudflareReady === "boolean"
      ? candidates.some((item) => item.agentCard.cloudflareReady === expected.cloudflareReady)
      : true;

  return {
    id: testCase.id,
    type: testCase.type,
    top1_hit: top1Hit,
    top3_hit: top3Hit,
    category_match: categoryMatches,
    deployment_match: deploymentMatches,
    cloudflare_ready_match: cloudflareReadyMatches,
    unacceptable_hits: unacceptableHits,
    candidates: candidateIds,
    expected_acceptable: acceptable,
    expected_unacceptable: unacceptable
  };
}

function buildReviewFocus(caseResults) {
  const focus = caseResults.filter(
    (item) =>
      !item.top1_hit ||
      !item.top3_hit ||
      !item.category_match ||
      !item.deployment_match ||
      !item.cloudflare_ready_match ||
      item.unacceptable_hits.length > 0
  );

  if (focus.length === 0) {
    return ["No review focus items. The current cases all satisfy the tracked thresholds."];
  }

  return focus.flatMap((item) => [
    `### \`${item.id}\``,
    "",
    `- Issue: ${reviewIssue(item)}`,
    `- Expected: ${formatIds(item.expected_acceptable)}`,
    `- Observed: ${formatIds(item.candidates.slice(0, 8))}`,
    `- Tuning hint: ${tuningHint(item)}`,
    ""
  ]);
}

function reviewIssue(item) {
  const issues = [];
  if (!item.top1_hit) {
    issues.push("top-1 miss");
  }
  if (!item.top3_hit) {
    issues.push("top-3 miss");
  }
  if (!item.category_match) {
    issues.push("category mismatch");
  }
  if (!item.deployment_match) {
    issues.push("deployment mismatch");
  }
  if (!item.cloudflare_ready_match) {
    issues.push("Cloudflare readiness mismatch");
  }
  if (item.unacceptable_hits.length > 0) {
    issues.push(`unacceptable hits: ${formatIds(item.unacceptable_hits)}`);
  }
  return issues.join(", ");
}

function tuningHint(item) {
  if (item.id.startsWith("local-category-")) {
    return "Review broad category ranking separately from exact keyword search; likely needs scoped category ranking or category-specific canonical-project priors.";
  }
  if (item.id.startsWith("local-deployment-")) {
    return "Review broad deployment ranking separately from exact runtime mentions; likely needs deployment-specific quality priors and blocker-aware ordering.";
  }
  if (item.id.includes("ambiguous")) {
    return "Preserve exact project/topic intent before applying broad quality boosts.";
  }
  if (item.id.includes("cloudflare")) {
    return "Keep positive Cloudflare signals and runtime blockers separated in ranking evidence.";
  }
  return "Compare expected and observed candidates before changing global scoring weights.";
}

function formatIds(ids) {
  return ids.length > 0 ? ids.slice(0, 8).map((id) => `\`${id}\``).join(", ") : "none";
}

function candidateProjects(testCase, evaluationProjects, options = {}) {
  if (testCase.type === "search") {
    const search = options.searchProjectListOverride ?? searchProjectList;
    return search(evaluationProjects, normalizeSearchQuery(testCase.query));
  }

  if (testCase.type === "recommend") {
    return recommendProjectList(evaluationProjects, normalizeRecommendationQuery(testCase.query))
      .map((recommendation) => evaluationProjects.find((item) => item.project.id === recommendation.project_id))
      .filter(Boolean);
  }

  if (testCase.type === "grp") {
    const parsed = normalizeGrpRequest(testCase.query);
    if (!parsed.ok) {
      throw new Error(`${testCase.id}: invalid GRP request: ${parsed.message}`);
    }
    const result = runGrpQuery(evaluationProjects, parsed.request);
    const constraints = testCase.query.constraints ?? {};
    const ids = unique([
      ...result.nodes
        .filter((node) => node.kind === "project")
        .filter((node) => matchesGrpConstraints(node, constraints))
        .map((node) => node.repo)
        .filter(Boolean),
      ...(result.comparison?.projects.map((project) => project.id) ?? [])
    ]);
    return ids.map((id) => evaluationProjects.find((item) => item.project.id === id)).filter(Boolean);
  }

  throw new Error(`${testCase.id}: unsupported eval case type ${testCase.type}`);
}

function normalizeSearchQuery(query) {
  return {
    q: stringValue(query.q),
    category: stringValue(query.category),
    deployment: stringValue(query.deployment),
    difficulty: stringValue(query.difficulty),
    language: stringValue(query.language),
    cloudflareReady: boolValue(query.cloudflareReady),
    limit: numberValue(query.limit)
  };
}

function normalizeRecommendationQuery(query) {
  return {
    useCase: stringValue(query.useCase),
    deployment: stringValue(query.deployment),
    difficulty: stringValue(query.difficulty),
    language: stringValue(query.language),
    cloudflareReady: boolValue(query.cloudflareReady),
    limit: numberValue(query.limit)
  };
}

function rate(count, total) {
  return total === 0 ? 0 : Number((count / total).toFixed(3));
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function boolValue(value) {
  return typeof value === "boolean" ? value : undefined;
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function unique(values) {
  return Array.from(new Set(values));
}

function matchesGrpConstraints(node, constraints) {
  if (typeof constraints.category === "string" && node.category !== constraints.category) {
    return false;
  }

  if (Array.isArray(constraints.deploy) && constraints.deploy.length > 0) {
    const deployments = node.deployment ?? [];
    return constraints.deploy.some((deployment) => deployments.includes(String(deployment).toLowerCase()));
  }

  return true;
}

export function buildLocalEvalCases(projects) {
  return [...categoryCases(projects), ...deploymentCases(projects), ...cloudflareReadinessCases(projects)];
}

function categoryCases(projects) {
  const byCategory = groupBy(projects, (item) => item.agentCard.category);
  return Array.from(byCategory.entries())
    .filter(([category]) => category !== "other")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => {
      const ranked = items.slice().sort(byEvaluationScore).slice(0, 8);
      return {
        id: `local-category-${category}`,
        type: "search",
        description: `Local generated probe for ${category}.`,
        query: {
          q: categoryQuery(category),
          category,
          limit: 8
        },
        expected: {
          acceptableProjects: ranked.map((item) => item.project.id),
          categories: [category],
          deployments: commonDeployments(ranked),
          unacceptableProjects: []
        }
      };
    });
}

function deploymentCases(projects) {
  const deployments = ["cloudflare", "docker", "local", "library_only", "serverless", "vercel", "kubernetes"];
  return deployments
    .map((deployment) => {
      const items = projects
        .filter((item) => item.agentCard.deployment.includes(deployment))
        .sort(byEvaluationScore)
        .slice(0, 8);
      return { deployment, items };
    })
    .filter(({ items }) => items.length > 0)
    .map(({ deployment, items }) => ({
      id: `local-deployment-${deployment}`,
      type: "search",
      description: `Local generated probe for ${deployment} deployment.`,
      query: {
        q: deploymentQuery(deployment),
        deployment,
        limit: 8
      },
      expected: {
        acceptableProjects: items.map((item) => item.project.id),
        deployments: [deployment],
        unacceptableProjects: []
      }
    }));
}

function cloudflareReadinessCases(projects) {
  const ready = projects
    .filter((item) => item.agentCard.cloudflareReady)
    .sort(byEvaluationScore)
    .slice(0, 8);
  const notReady = projects
    .filter((item) => item.agentCard.deployment.includes("cloudflare") && !item.agentCard.cloudflareReady)
    .sort(byEvaluationScore)
    .slice(0, 8);
  return [
    {
      id: "local-cloudflare-ready",
      type: "search",
      description: "Local generated probe for projects that are directly Cloudflare-ready.",
      query: {
        q: "cloudflare workers durable objects ready deploy",
        deployment: "cloudflare",
        cloudflareReady: true,
        limit: 8
      },
      expected: {
        acceptableProjects: ready.map((item) => item.project.id),
        deployments: ["cloudflare"],
        cloudflareReady: true,
        unacceptableProjects: notReady.map((item) => item.project.id)
      }
    },
    {
      id: "local-cloudflare-mentioned-not-ready",
      type: "search",
      description: "Local generated probe for projects that mention Cloudflare but have runtime blockers.",
      query: {
        q: "cloudflare workers blockers python docker postgres",
        deployment: "cloudflare",
        cloudflareReady: false,
        limit: 8
      },
      expected: {
        acceptableProjects: notReady.map((item) => item.project.id),
        deployments: ["cloudflare"],
        cloudflareReady: false,
        unacceptableProjects: ready.map((item) => item.project.id)
      }
    }
  ].filter((testCase) => testCase.expected.acceptableProjects.length > 0);
}

function categoryQuery(category) {
  const queries = {
    agent_framework: "agent framework tool calling orchestration",
    coding_agent: "coding agent developer assistant",
    browser_agent: "browser automation web agent",
    rag_framework: "rag retrieval indexing framework",
    vector_database: "vector database embedding search",
    llm_gateway: "llm gateway proxy router",
    llm_eval: "llm evaluation benchmark testing",
    prompt_tooling: "prompt tooling structured output guardrails",
    workflow_automation: "workflow automation orchestration",
    local_llm_runtime: "local llm runtime inference serving",
    ai_app_template: "ai app template starter",
    mcp_server: "mcp server model context protocol tools",
    ai_observability: "llm observability tracing monitoring"
  };
  return queries[category] ?? category.replaceAll("_", " ");
}

function deploymentQuery(deployment) {
  const queries = {
    cloudflare: "cloudflare workers durable objects serverless",
    docker: "docker compose deployment",
    local: "local install open source project",
    library_only: "library install package",
    serverless: "serverless deployment",
    vercel: "vercel deployment",
    kubernetes: "kubernetes helm deployment"
  };
  return queries[deployment] ?? deployment.replaceAll("_", " ");
}

function commonDeployments(items) {
  const counts = new Map();
  for (const item of items) {
    for (const deployment of item.agentCard.deployment) {
      counts.set(deployment, (counts.get(deployment) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([deployment]) => deployment);
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function byEvaluationScore(a, b) {
  return b.metrics.gitScore - a.metrics.gitScore || b.project.stars - a.project.stars || a.project.id.localeCompare(b.project.id);
}

function buildEvaluationProjects(repositories, overrides) {
  const byId = new Map(overrides.map((item) => [item.project.id.toLowerCase(), item]));
  for (const repository of repositories) {
    const normalized = repository.toLowerCase();
    if (!byId.has(normalized)) {
      const project = syntheticProjectKnowledge(repository);
      byId.set(normalized, project);
    }
  }
  return Array.from(byId.values());
}

function syntheticProjectKnowledge(repository) {
  const now = "2026-06-20T00:00:00Z";
  const [owner, name] = repository.split("/");
  const category = inferCategory(repository);
  const deployment = inferDeployment(repository, category);
  const topics = topicWords(repository, category, deployment);
  const cloudflareReady = deployment.includes("cloudflare") && category === "agent_framework";
  const score = scoreForCategory(category);

  return {
    project: {
      id: repository,
      owner,
      name,
      fullName: repository,
      githubUrl: `https://github.com/${repository}`,
      homepageUrl: null,
      description: descriptionFor(repository, category),
      language: languageFor(repository),
      topics,
      license: null,
      stars: score * 100,
      forks: Math.round(score * 7),
      openIssues: 10,
      defaultBranch: "main",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: repository,
      category,
      difficulty: category === "local_llm_runtime" || category === "vector_database" ? "advanced" : "intermediate",
      deployment,
      cloudflareReady,
      useCases: useCasesFor(category, repository),
      notGoodFor: cloudflareReady ? [] : ["direct Cloudflare Workers deployment without adaptation"],
      alternatives: [],
      summaryForAgent: `Use ${repository} when the user needs ${category.replaceAll("_", " ")} capabilities for AI agent projects.`,
      classification: {
        category: { confidence: "medium", evidence: [`Matched ${category} seed coverage hints.`] },
        deployment: { confidence: "low", evidence: ["Deployment inferred from seed repository metadata."] },
        difficulty: { confidence: "low", evidence: ["Difficulty inferred from category."] },
        cloudflareReady: { confidence: cloudflareReady ? "medium" : "low", evidence: ["Cloudflare readiness inferred from repository metadata."] }
      },
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: repository,
      stars30dDelta: Math.round(score / 2),
      commits30d: Math.round(score / 3),
      releases180d: 3,
      contributors90d: Math.round(score / 4),
      issueFirstResponseMedianHours: 24,
      recentPushDays: 3,
      gitScore: score,
      maintenanceScore: Math.max(50, score - 5),
      signalConfidence: {
        stars30dDelta: "estimated",
        commits30d: "unknown",
        releases180d: "unknown",
        contributors90d: "unknown"
      },
      calculatedAt: now
    }
  };
}

function inferCategory(repository) {
  return inferSeedCategory(repository, "other");
}

function inferDeployment(repository, category) {
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
  if (["vector_database", "workflow_automation", "local_llm_runtime"].includes(category)) {
    deployments.add("docker");
    deployments.add("cloud");
  }
  if (["rag_framework", "agent_framework", "prompt_tooling"].includes(category)) {
    deployments.add("library_only");
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

function descriptionFor(repository, category) {
  return `${repository} is indexed as ${category.replaceAll("_", " ")} for Git.Top evaluation.`;
}

function useCasesFor(category, repository) {
  const byCategory = {
    agent_framework: ["build AI agents", "orchestrate tools", "prototype agent workflows"],
    coding_agent: ["automate coding tasks", "review and modify code", "assist developer workflows"],
    browser_agent: ["automate browser tasks", "operate web workflows", "test web interactions"],
    rag_framework: ["build RAG systems", "index documents", "connect private data to LLMs"],
    vector_database: ["store embeddings", "run vector search", "serve retrieval workloads"],
    llm_gateway: ["route LLM requests", "proxy model providers", "standardize LLM APIs"],
    llm_eval: ["evaluate LLM outputs", "benchmark prompts", "test agent quality"],
    prompt_tooling: ["manage prompts", "constrain structured outputs", "build prompt workflows"],
    workflow_automation: ["orchestrate workflows", "schedule automation", "connect tools"],
    local_llm_runtime: ["run local LLMs", "serve inference", "prototype private model deployments"],
    ai_app_template: ["bootstrap AI apps", "build chat interfaces", "start SaaS templates"],
    mcp_server: ["connect agents to tools", "serve MCP tools", "bootstrap MCP integrations"],
    ai_observability: ["trace LLM applications", "monitor agents", "debug production AI systems"],
    other: ["evaluate AI project fit", "compare open source projects"]
  };
  return byCategory[category] ?? [`evaluate ${repository}`];
}

function languageFor(repository) {
  const normalized = repository.toLowerCase();
  if (normalized.includes("python") || normalized.includes("haystack") || normalized.includes("llama") || normalized.includes("dspy")) {
    return "Python";
  }
  if (normalized.includes("typescript") || normalized.includes("js") || normalized.includes("vercel")) {
    return "TypeScript";
  }
  return null;
}

function scoreForCategory(category) {
  const scores = {
    agent_framework: 82,
    coding_agent: 84,
    browser_agent: 80,
    rag_framework: 83,
    vector_database: 82,
    llm_gateway: 79,
    llm_eval: 78,
    prompt_tooling: 77,
    workflow_automation: 78,
    local_llm_runtime: 82,
    ai_app_template: 76,
    mcp_server: 81,
    ai_observability: 78,
    other: 60
  };
  return scores[category] ?? 60;
}
