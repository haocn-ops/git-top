import { readFile, writeFile } from "node:fs/promises";
import { categoryHints, inferSeedCategory } from "./seed-category-hints.mjs";

const seedPath = new URL("../data/seed-repositories.json", import.meta.url);
const outputPath = new URL("../docs/SEED_CANDIDATES.md", import.meta.url);
const existing = new Set(JSON.parse(await readFile(seedPath, "utf8")).map((repo) => repo.toLowerCase()));
const token = process.env.GITHUB_TOKEN;
const perQuery = Number(process.env.GIT_TOP_CANDIDATE_PER_QUERY ?? 20);
const targetTotal = Number(process.env.GIT_TOP_CANDIDATE_TARGET ?? 220);
const perCategoryLimit = Number(process.env.GIT_TOP_CANDIDATE_PER_CATEGORY ?? 24);
const mode = parseMode(process.argv.slice(2));

const queriesByCategory = {
  agent_framework: [
    "ai agent framework",
    "multi-agent framework",
    "agent framework llm"
  ],
  coding_agent: [
    "coding agent llm",
    "developer agent ai",
    "ai code assistant"
  ],
  browser_agent: [
    "browser agent ai",
    "web automation agent",
    "playwright agent ai"
  ],
  rag_framework: [
    "retrieval augmented generation framework",
    "rag llm framework",
    "knowledge base llm"
  ],
  vector_database: [
    "vector database embeddings",
    "semantic search vector",
    "vector search database"
  ],
  llm_gateway: [
    "llm gateway openai compatible",
    "openai proxy llm",
    "ai gateway"
  ],
  llm_eval: [
    "llm evaluation framework",
    "ai eval benchmark",
    "prompt evaluation llm"
  ],
  prompt_tooling: [
    "prompt engineering framework",
    "structured output llm",
    "prompt management"
  ],
  workflow_automation: [
    "ai workflow automation",
    "workflow orchestration agents",
    "automation llm agents"
  ],
  local_llm_runtime: [
    "local llm inference",
    "llm runtime local",
    "open source inference server llm"
  ],
  ai_app_template: [
    "ai app template",
    "llm starter template",
    "chatbot template open source"
  ],
  mcp_server: [
    "model context protocol server",
    "modelcontextprotocol server",
    "mcp server"
  ],
  ai_observability: [
    "llm observability",
    "ai tracing observability",
    "opentelemetry llm"
  ]
};

const candidateOrgs = [
  "langchain-ai",
  "run-llama",
  "modelcontextprotocol",
  "microsoft",
  "openai",
  "google",
  "google-gemini",
  "GoogleCloudPlatform",
  "cloudflare",
  "huggingface",
  "vercel",
  "supabase",
  "browserbase",
  "browser-use",
  "firecrawl",
  "apify",
  "qdrant",
  "weaviate",
  "milvus-io",
  "chroma-core",
  "lancedb",
  "ollama",
  "bentoml",
  "mlc-ai",
  "sgl-project",
  "vllm-project",
  "open-webui",
  "BerriAI",
  "Portkey-AI",
  "promptfoo",
  "guardrails-ai",
  "langfuse",
  "Arize-ai",
  "traceloop",
  "comet-ml",
  "SigNoz",
  "n8n-io",
  "activepieces",
  "windmill-labs",
  "PrefectHQ",
  "dagster-io",
  "triggerdotdev",
  "HumanSignal",
  "Giskard-AI",
  "deepset-ai",
  "jina-ai",
  "mem0ai",
  "getzep",
  "supermemoryai",
  "FlowiseAI",
  "langgenius",
  "lobehub",
  "CopilotKit",
  "e2b-dev"
];

const candidates = [];
const seen = new Set(existing);

if (mode === "search") {
  for (const [category, queries] of Object.entries(queriesByCategory)) {
    for (const query of queries) {
      const result = await githubSearch(query, perQuery);
      if (!result) {
        continue;
      }
      for (const repo of result.items ?? []) {
        addCandidate(repo, category);
      }
      await sleep(250);
    }
  }
} else {
  for (const org of candidateOrgs) {
    const repos = await githubOrgRepos(org);
    for (const repo of repos) {
      addCandidate(repo, null);
    }
    await sleep(250);
  }
}

const rankedCandidates = candidates
  .filter((candidate) => candidate.category !== "other")
  .sort((left, right) => right.stars - left.stars);
const selected = balancedSelection(rankedCandidates, perCategoryLimit, targetTotal);

await writeReport(selected);
console.log(
  JSON.stringify(
    {
      candidates: candidates.length,
      selected: selected.length,
      byCategory: countBy(selected, "category")
    },
    null,
    2
  )
);

async function githubSearch(query, perPage) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perPage));

  const response = await fetch(url, {
    headers: requestHeaders()
  });
  if (!response.ok) {
    console.warn(`Skipping GitHub search ${response.status} for ${query}`);
    return null;
  }
  return response.json();
}

async function githubOrgRepos(org) {
  const repos = [];
  for (let page = 1; page <= 2; page += 1) {
    const url = new URL(`https://api.github.com/orgs/${org}/repos`);
    url.searchParams.set("type", "public");
    url.searchParams.set("sort", "pushed");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: requestHeaders()
    });
    if (!response.ok) {
      console.warn(`Skipping org ${org}: GitHub API ${response.status}`);
      break;
    }
    const pageRepos = await response.json();
    repos.push(...pageRepos);
    if (pageRepos.length < 100) {
      break;
    }
  }
  return repos;
}

function addCandidate(repo, fallbackCategory) {
  const fullName = String(repo.full_name ?? "");
  const normalized = fullName.toLowerCase();
  if (!fullName || seen.has(normalized) || repo.archived || repo.private || repo.disabled || repo.fork) {
    return;
  }

  if (isPeripheralRepository(repo)) {
    return;
  }

  const category = inferRepositoryCategory(repo, fallbackCategory);
  if (!category || !passesCategoryQuality(repo, category)) {
    return;
  }

  candidates.push({
    repository: fullName,
    category,
    queryCategory: fallbackCategory,
    stars: repo.stargazers_count ?? 0,
    pushedAt: repo.pushed_at ?? null,
    description: repo.description ?? ""
  });
  seen.add(normalized);
}

function inferRepositoryCategory(repo, fallbackCategory) {
  const fullName = String(repo.full_name ?? "");
  const text = [
    fullName,
    repo.description ?? "",
    repo.language ?? "",
    ...(Array.isArray(repo.topics) ? repo.topics : [])
  ]
    .join(" ")
    .toLowerCase();
  const byRepoName = inferSeedCategory(fullName, null);
  if (byRepoName) {
    return byRepoName;
  }
  for (const [category, hints] of Object.entries(categoryHints)) {
    if (hints.some((hint) => text.includes(hint))) {
      return category;
    }
  }
  return fallbackCategory;
}

function categoryPriority(category) {
  const counts = {
    llm_gateway: 0,
    llm_eval: 1,
    workflow_automation: 2,
    vector_database: 3,
    prompt_tooling: 4,
    browser_agent: 5,
    coding_agent: 6,
    ai_observability: 7,
    ai_app_template: 8,
    rag_framework: 9,
    local_llm_runtime: 10,
    mcp_server: 11,
    agent_framework: 12
  };
  return counts[category] ?? 99;
}

function balancedSelection(items, categoryLimit, totalLimit) {
  const selectedItems = [];
  const counts = {};
  for (const item of items.sort((left, right) => categoryPriority(left.category) - categoryPriority(right.category) || right.stars - left.stars)) {
    if ((counts[item.category] ?? 0) >= categoryLimit) {
      continue;
    }
    selectedItems.push(item);
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    if (selectedItems.length >= totalLimit) {
      break;
    }
  }
  return selectedItems;
}

function isPeripheralRepository(repo) {
  const name = String(repo.name ?? "").toLowerCase();
  const description = String(repo.description ?? "").toLowerCase();
  const blockedNames = [
    ".github",
    "docs",
    "documentation",
    "helm",
    "helm-charts",
    "chart",
    "charts",
    "examples",
    "example",
    "tests",
    "test",
    "blog",
    "talks",
    "website",
    "homepage",
    "scripts",
    "terraform-provider",
    "terraform-aws",
    "terraform-google"
  ];
  if (blockedNames.includes(name)) {
    return true;
  }
  return /(^|[-_])(docs?|helm|charts?|examples?|tests?|blog|talks|website|terraform)([-_]|$)/.test(name) ||
    description.includes("helm chart") ||
    description.includes("documentation for") ||
    description.includes("docs for");
}

function passesCategoryQuality(repo, category) {
  const text = [
    repo.full_name ?? "",
    repo.description ?? "",
    repo.language ?? "",
    ...(Array.isArray(repo.topics) ? repo.topics : [])
  ]
    .join(" ")
    .toLowerCase();
  const stars = repo.stargazers_count ?? 0;
  if (stars < 20 && !["mcp_server", "llm_gateway"].includes(category)) {
    return false;
  }
  const rules = {
    llm_gateway: ["gateway", "litellm", "portkey", "openrouter", "open webui", "open-webui", "openai-compatible", "openai compatible", "proxy"],
    llm_eval: ["llm", "eval", "evaluation", "benchmark", "prompt", "model", "giskard", "label studio", "label-studio", "deepeval", "ragas"],
    workflow_automation: ["workflow", "automation", "agent", "n8n", "flowise", "prefect", "dagster", "trigger", "orchestration"],
    vector_database: ["vector", "embedding", "semantic", "ann", "search", "pgvector", "database"],
    prompt_tooling: ["prompt", "structured output", "guardrails", "instructor", "baml", "lmql", "semantic router"],
    browser_agent: ["browser", "playwright", "automation", "web agent", "scraping", "crawl"],
    coding_agent: ["coding", "code", "developer", "swe", "assistant", "ide"],
    ai_observability: ["observability", "trace", "tracing", "monitoring", "telemetry", "eval"],
    ai_app_template: ["template", "starter", "chat", "app", "cookbook", "sample"],
    rag_framework: ["rag", "retrieval", "knowledge", "embedding", "search", "reader"],
    local_llm_runtime: ["llm", "inference", "runtime", "local", "model", "serve"],
    mcp_server: ["mcp", "model context protocol"],
    agent_framework: ["agent", "multi-agent", "tool calling", "framework"]
  };
  return (rules[category] ?? []).some((needle) => text.includes(needle));
}

function requestHeaders() {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "git-top-seed-candidate-search"
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

async function writeReport(items) {
  const lines = [
    "# Git.Top Seed Candidates",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "This report lists live GitHub search candidates for seed expansion. It is a discovery aid; candidates still need seed validation and live checks before release.",
    "",
    "## Summary",
    "",
    `- Selected candidates: ${items.length}`,
    ...Object.entries(countBy(items, "category")).map(([category, count]) => `- ${category}: ${count}`),
    "",
    "## Candidates",
    "",
    "Repository | Category | Stars | Pushed At | Description",
    "--- | --- | ---: | --- | ---",
    ...items.map((item) =>
      [
        `\`${item.repository}\``,
        `\`${item.category}\``,
        item.stars,
        item.pushedAt ?? "",
        String(item.description ?? "").replace(/\|/g, "\\|").trim()
      ].join(" | ").trimEnd()
    )
  ];
  await writeFile(outputPath, `${lines.join("\n")}\n`);
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
    return counts;
  }, {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMode(args) {
  const modeArg = args.find((arg) => arg.startsWith("--mode="));
  const value = modeArg ? modeArg.slice("--mode=".length) : "orgs";
  if (!["orgs", "search"].includes(value)) {
    throw new Error("--mode must be orgs or search.");
  }
  return value;
}
