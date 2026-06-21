import assert from "node:assert/strict";
import { generateAlternatives, generateAlternativesForAll } from "../src/alternatives.ts";
import { searchProjectList } from "../src/project-search.ts";
import { normalizeGrpRequest, runGrpQuery } from "../src/grp.ts";
import worker from "../src/index.ts";
import { getProjectDetailData } from "../src/next-data.ts";
import { buildQualityReport } from "../src/quality.ts";
import { calculateMetrics } from "../src/scoring.ts";
import { seedProjects } from "../src/seed.ts";
import { defaultSyncLimit, scheduledSyncLimit, selectRepositoryBatch } from "../src/sync.ts";

await testScoring();
await testQualityInfoIssuesDoNotLowerScore();
await testQualityCollectionCoverage();
await testLegacyConsoleRedirects();
await testSyncBatchSelection();
await testNextProjectDetailLookup();
await testBrowseRanking();
await testBrowseRankingBroadVocabulary();
await testSpecificIntentRanking();
await testAlternatives();
await testGrpNormalization();
await testGrpQueries();

console.log("Validated core scoring, Worker routing, alternatives, and GRP logic.");

async function testLegacyConsoleRedirects() {
  const register = await worker.fetch(new Request("https://git.top/register"), {});
  assert.equal(register.status, 302);
  assert.equal(register.headers.get("location"), "https://git.top/projects");

  const projects = await worker.fetch(new Request("https://git.top/projects"), {});
  assert.equal(projects.status, 200);

  const reports = await worker.fetch(new Request("https://git.top/reports"), {});
  assert.equal(reports.status, 302);
  assert.equal(reports.headers.get("location"), "https://git.top/graph");
}

async function testScoring() {
  const now = new Date().toISOString();
  const repo = {
    id: 1,
    name: "scored-agent",
    full_name: "mock/scored-agent",
    owner: { login: "mock" },
    html_url: "https://github.com/mock/scored-agent",
    homepage: null,
    description: "Mock scored agent",
    language: "TypeScript",
    topics: ["agents"],
    license: { spdx_id: "MIT" },
    stargazers_count: 1000,
    forks_count: 100,
    open_issues_count: 10,
    default_branch: "main",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: now,
    pushed_at: now
  };
  const signals = {
    readmeText: "",
    files: [],
    commits30d: 200,
    releases180d: 12,
    contributors90d: 80,
    issueFirstResponseMedianHours: 4,
    signalConfidence: {
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }
  };

  const metrics = calculateMetrics(repo, signals, now, {
    stars30dDelta: 1500,
    signalConfidence: {
      stars30dDelta: "snapshot",
      stars30dWindowDays: 31,
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }
  });

  assert.equal(metrics.projectId, "mock/scored-agent");
  assert.equal(metrics.stars30dDelta, 1500);
  assert.equal(metrics.gitScore, 100);
  assert.equal(metrics.maintenanceScore, 100);
  assert.equal(metrics.signalConfidence?.stars30dDelta, "snapshot");
  assert.equal(metrics.signalConfidence?.stars30dWindowDays, 31);
}

async function testQualityInfoIssuesDoNotLowerScore() {
  const infoOnlyProject = makeSearchFixture("mock/info-only-quality", {
    description: "A well described agent framework with several practical production use cases.",
    topics: ["agent", "framework", "tool-calling"],
    stars: 500,
    gitScore: 50,
    maintenanceScore: 90,
    useCases: ["build agent workflows", "orchestrate tools"]
  });

  const report = buildQualityReport([infoOnlyProject]);
  assert.equal(report.errorCount, 0);
  assert.equal(report.warningCount, 0);
  assert.ok(report.issues.some((issue) => issue.severity === "info" && issue.code === "score_skew"));
  assert.equal(report.score, 100, "info-only quality observations should not lower the release score");
}

async function testQualityCollectionCoverage() {
  const activeCollection = makeSearchFixture("mock/awesome-agents", {
    projectKind: "collection",
    collectionMetadata: {
      scope: "awesome_list",
      curated: true,
      estimatedItems: 100,
      freshness: "active"
    },
    description: "A curated awesome list of production agent framework resources.",
    topics: ["awesome", "agents", "framework"],
    stars: 2000,
    gitScore: 85,
    maintenanceScore: 75,
    useCases: ["find agent resources", "compare framework examples"]
  });
  const staleCollection = makeSearchFixture("mock/rag-cookbook", {
    projectKind: "collection",
    collectionMetadata: {
      scope: "cookbook",
      curated: true,
      estimatedItems: null,
      freshness: "stale"
    },
    description: "A cookbook collection for retrieval augmented generation examples.",
    topics: ["cookbook", "rag", "retrieval"],
    stars: 1200,
    gitScore: 70,
    maintenanceScore: 60,
    useCases: ["find RAG examples", "review cookbook patterns"]
  });
  const project = makeSearchFixture("mock/runtime-project", {
    description: "A production agent framework runtime.",
    topics: ["agent", "runtime"],
    stars: 800,
    gitScore: 80,
    maintenanceScore: 80,
    useCases: ["run agent workflows", "deploy runtime components"]
  });

  const report = buildQualityReport([activeCollection, staleCollection, project]);
  assert.equal(report.coverage.collectionCount, 2);
  assert.equal(report.coverage.collectionRate, 0.667);
  assert.equal(report.coverage.collectionScopeCounts.awesome_list, 1);
  assert.equal(report.coverage.collectionScopeCounts.cookbook, 1);
  assert.equal(report.coverage.collectionFreshnessCounts.active, 1);
  assert.equal(report.coverage.collectionFreshnessCounts.stale, 1);
  assert.equal(report.coverage.staleCollectionCount, 1);
  assert.equal(report.coverage.collectionReviewCount, 1);
}

async function testSyncBatchSelection() {
  assert.equal(defaultSyncLimit, 1, "manual sync without a limit should stay conservative by default");
  assert.equal(scheduledSyncLimit, 5, "scheduled sync should make steady progress with lightweight signals");

  const repositories = ["a/a", "b/b", "c/c", "d/d", "e/e"];
  assert.deepEqual(selectRepositoryBatch(repositories, 1, 3), ["b/b", "c/c", "d/d"]);
  assert.deepEqual(selectRepositoryBatch(repositories, 3, 4), ["d/d", "e/e", "a/a", "b/b"]);
  assert.deepEqual(selectRepositoryBatch(repositories, 0, 10), repositories);
  assert.deepEqual(selectRepositoryBatch([], 0, 5), []);
}

async function testNextProjectDetailLookup() {
  const detail = await getProjectDetailData("cloudflare-agents");
  assert.ok(detail, "graph slug should resolve to the matching seed project");
  assert.equal(detail.view.repo, "cloudflare/agents");

  const missing = await getProjectDetailData("not-a-real-project");
  assert.equal(missing, null, "missing project detail should not silently fall back to the first project");
}

async function testBrowseRanking() {
  const lowQualityExact = makeSearchFixture("mock/exact-agent-framework", {
    description: "A small agent framework starter",
    topics: ["agent-framework", "cloudflare"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });
  const highQualityBroad = makeSearchFixture("mock/broad-agent-runtime", {
    description: "Production agent orchestration framework runtime",
    stars: 250000,
    gitScore: 100,
    maintenanceScore: 100
  });
  const projects = [lowQualityExact, highQualityBroad];
  const filters = {
    q: "agent framework",
    category: "agent_framework",
    deployment: "cloudflare",
    limit: 8
  };

  const defaultResults = searchProjectList(projects, filters);
  assert.equal(defaultResults[0].project.id, lowQualityExact.project.id, "default search should preserve exact query intent");

  const browseResults = searchProjectList(projects, { ...filters, ranking: "browse" });
  assert.equal(browseResults[0].project.id, highQualityBroad.project.id, "browse ranking should boost stronger broad-scope candidates");
}

async function testBrowseRankingBroadVocabulary() {
  const canonicalRag = makeSearchFixture("mock/canonical-rag", {
    category: "rag_framework",
    deployment: ["local", "library_only"],
    description: "Data framework for LLM applications with retrieval and indexing support.",
    topics: ["rag", "retrieval"],
    stars: 100000,
    gitScore: 95,
    maintenanceScore: 90
  });
  const exactButLowerQualityRag = makeSearchFixture("mock/exact-rag", {
    category: "rag_framework",
    deployment: ["local"],
    description: "RAG retrieval indexing framework.",
    topics: ["rag", "retrieval", "indexing"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });
  const localPlatform = makeSearchFixture("mock/local-platform", {
    category: "agent_framework",
    deployment: ["local", "docker"],
    description: "Production framework that can be installed locally.",
    topics: ["agent", "framework"],
    stars: 100000,
    gitScore: 95,
    maintenanceScore: 90
  });
  const lowQualityLocalTopic = makeSearchFixture("mock/local-topic", {
    category: "local_llm_runtime",
    deployment: ["local"],
    description: "Small local open source project.",
    topics: ["local", "project"],
    stars: 100,
    gitScore: 10,
    maintenanceScore: 10
  });

  const ragResults = searchProjectList([exactButLowerQualityRag, canonicalRag], {
    q: "rag retrieval indexing framework",
    category: "rag_framework",
    ranking: "browse",
    limit: 8
  });
  assert.equal(ragResults[0].project.id, canonicalRag.project.id, "browse category probes should treat indexing as broad vocabulary");

  const localResults = searchProjectList([lowQualityLocalTopic, localPlatform], {
    q: "local install open source project",
    deployment: "local",
    ranking: "browse",
    limit: 8
  });
  assert.equal(localResults[0].project.id, localPlatform.project.id, "browse deployment probes should treat open-source project wording as broad vocabulary");
}

async function testSpecificIntentRanking() {
  const githubMcp = makeSearchFixture("github/github-mcp-server", {
    description: "MCP server for GitHub repository issues and pull request automation.",
    topics: ["github", "mcp", "automation"],
    stars: 500,
    gitScore: 20,
    maintenanceScore: 20
  });
  const broadAutomation = makeSearchFixture("mock/mcp-automation-suite", {
    description: "High quality MCP automation server for repository issues and pull requests.",
    topics: ["mcp", "automation"],
    stars: 250000,
    gitScore: 100,
    maintenanceScore: 100
  });
  const projects = [githubMcp, broadAutomation];
  const filters = {
    q: "github automation mcp server repository issues pull requests",
    limit: 8,
    ranking: "browse"
  };

  const results = searchProjectList(projects, filters);
  assert.equal(results[0].project.id, githubMcp.project.id, "specific owner/topic intent should outrank generic high-quality browse candidates");
}

async function testAlternatives() {
  const cloudflare = seedProjects.find((item) => item.project.id === "cloudflare/agents");
  assert.ok(cloudflare, "seed should include cloudflare/agents");

  const alternatives = generateAlternatives(cloudflare, seedProjects, 3);
  assert.ok(alternatives.length > 0, "cloudflare/agents should have generated alternatives");
  assert.ok(alternatives.every((item) => item.project_id !== cloudflare.project.id));
  assert.ok(alternatives.every((item) => typeof item.reason === "string" && item.reason.length > 0));

  const all = generateAlternativesForAll(seedProjects, 2);
  assert.ok(all.updated > 0);
  assert.equal(all.updated, all.updates.length);
  assert.ok(all.updates.every((update) => update.alternatives.length <= 2));
}

async function testGrpNormalization() {
  const invalid = normalizeGrpRequest({ goal: "   " });
  assert.equal(invalid.ok, false);

  const normalized = normalizeGrpRequest({
    goal: "  Find Cloudflare agent frameworks  ",
    mode: "find",
    constraints: {
      deploy: ["Cloudflare", "Workers"],
      language: "TypeScript",
      agent_ready: true
    },
    context: {
      current_stack: ["MCP"]
    }
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.request.goal, "Find Cloudflare agent frameworks");
  assert.equal(normalized.request.mode, "find");
  assert.deepEqual(normalized.request.constraints?.deploy, ["cloudflare", "workers"]);
  assert.equal(normalized.request.constraints?.language, "typescript");
  assert.deepEqual(normalized.request.context?.current_stack, ["MCP"]);
}

async function testGrpQueries() {
  const findRequest = normalizeGrpRequest({
    goal: "Find Cloudflare-ready agent frameworks",
    mode: "find",
    constraints: {
      deploy: ["cloudflare"],
      agent_ready: true
    }
  });
  assert.equal(findRequest.ok, true);
  const findResult = runGrpQuery(seedProjects, findRequest.request);
  assert.equal(findResult.metadata.version, "grp.v1");
  assert.equal(findResult.mode, "find");
  assert.equal(findResult.resultType, "project_set");
  assert.ok(findResult.nodes.some((node) => node.repo === "cloudflare/agents"));
  assert.ok(findResult.metadata.candidateCount > 0);

  const compareRequest = normalizeGrpRequest({
    goal: "Compare cloudflare/agents and run-llama/llama_index for Cloudflare deployment",
    mode: "compare",
    constraints: {
      deploy: ["cloudflare"]
    }
  });
  assert.equal(compareRequest.ok, true);
  const compareResult = runGrpQuery(seedProjects, compareRequest.request);
  assert.equal(compareResult.mode, "compare");
  assert.equal(compareResult.resultType, "comparison");
  assert.ok(compareResult.comparison);
  assert.ok(compareResult.comparison.projects.length >= 2);
  assert.ok(compareResult.comparison.projects.some((project) => project.id === "cloudflare/agents"));
}

function makeSearchFixture(id, overrides) {
  const [owner, name] = id.split("/");
  const now = "2026-06-20T00:00:00Z";
  return {
    project: {
      id,
      owner,
      name,
      fullName: id,
      githubUrl: `https://github.com/${id}`,
      homepageUrl: null,
      description: overrides.description,
      language: "TypeScript",
      topics: overrides.topics ?? ["agent", "runtime", "cloudflare"],
      license: "MIT",
      stars: overrides.stars,
      forks: 10,
      openIssues: 1,
      defaultBranch: "main",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: id,
      projectKind: overrides.projectKind ?? "project",
      ...(overrides.collectionMetadata ? { collectionMetadata: overrides.collectionMetadata } : {}),
      category: overrides.category ?? "agent_framework",
      difficulty: "intermediate",
      deployment: overrides.deployment ?? ["cloudflare"],
      cloudflareReady: true,
      useCases: overrides.useCases ?? ["build agent runtimes"],
      notGoodFor: [],
      alternatives: [],
      summaryForAgent: overrides.description,
      classification: {
        category: { confidence: "high", evidence: ["fixture"] },
        deployment: { confidence: "high", evidence: ["fixture"] },
        difficulty: { confidence: "high", evidence: ["fixture"] },
        cloudflareReady: { confidence: "high", evidence: ["fixture"] }
      },
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: id,
      stars30dDelta: 0,
      commits30d: 0,
      releases180d: 0,
      contributors90d: 0,
      issueFirstResponseMedianHours: null,
      recentPushDays: 1,
      gitScore: overrides.gitScore,
      maintenanceScore: overrides.maintenanceScore,
      signalConfidence: {},
      calculatedAt: now
    }
  };
}
