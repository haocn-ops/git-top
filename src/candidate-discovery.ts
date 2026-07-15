import { defaultSeedRepositories } from "./github";
import { upsertGovernanceRun } from "./governance-store";
import { syncGithubProjects } from "./sync";
import type { Category, Env, GovernanceRunTrigger } from "./types";

interface CandidateDiscoveryOptions {
  trigger?: GovernanceRunTrigger;
  maxCandidates?: number;
  searchIndex?: number;
}

interface GithubSearchRepository {
  full_name?: string;
  name?: string;
  description?: string | null;
  stargazers_count?: number;
  pushed_at?: string | null;
  archived?: boolean;
  disabled?: boolean;
  private?: boolean;
  fork?: boolean;
}

interface CandidateRepository {
  repository: string;
  category: Category;
  source: "github_search";
  sourceQuery: string;
  stars: number;
  pushedAt: string | null;
  description: string;
}

export interface CandidateAdmissionDecision {
  admitted: boolean;
  reasons: string[];
  signals: {
    active: boolean;
    relevant: boolean;
    described: boolean;
    authority: boolean;
  };
}

const discoveryQueries: Array<{ category: Category; query: string }> = [
  { category: "agent_framework", query: "ai agent framework" },
  { category: "coding_agent", query: "coding agent llm" },
  { category: "browser_agent", query: "browser automation agent" },
  { category: "rag_framework", query: "rag framework llm" },
  { category: "vector_database", query: "vector database embeddings" },
  { category: "llm_gateway", query: "llm gateway openai compatible" },
  { category: "llm_eval", query: "llm evaluation framework" },
  { category: "prompt_tooling", query: "structured output llm" },
  { category: "workflow_automation", query: "ai workflow automation" },
  { category: "local_llm_runtime", query: "local llm inference server" },
  { category: "ai_app_template", query: "llm app template" },
  { category: "mcp_server", query: "model context protocol server" },
  { category: "ai_observability", query: "llm observability tracing" }
];

export async function discoverAndSyncCandidateProjects(env: Env, options: CandidateDiscoveryOptions = {}) {
  if (!env.DB) {
    throw new Error("D1 binding DB is required for candidate discovery.");
  }

  const startedAt = new Date();
  const trigger = options.trigger ?? "manual";
  const query = discoveryQueries[normalizeSearchIndex(options.searchIndex ?? currentSearchIndex(), discoveryQueries.length)];

  try {
    const maxCandidates = normalizeLimit(options.maxCandidates, 1, 5);
    const discovered = await searchGithubCandidates(env, query.query, query.category);
    const existing = await listExistingRepositories(env);
    const newCandidates = discovered.filter((candidate) => !existing.has(candidate.repository.toLowerCase()));
    const admissionByRepository = new Map(
      newCandidates.map((candidate) => [candidate.repository.toLowerCase(), evaluateCandidateAdmission(candidate)] as const)
    );
    const admitted = newCandidates.filter((candidate) => admissionByRepository.get(candidate.repository.toLowerCase())?.admitted);
    const selected = admitted.slice(0, maxCandidates);
    const selectedIds = new Set(selected.map((candidate) => candidate.repository.toLowerCase()));
    const quarantined = newCandidates
      .filter((candidate) => !selectedIds.has(candidate.repository.toLowerCase()))
      .map((candidate) => ({
        ...toCandidateResponse(candidate),
        admission: admissionByRepository.get(candidate.repository.toLowerCase()) ?? null
      }));

    await upsertCandidateRepositories(env, discovered, selectedIds, admissionByRepository);

    let synced: string[] = [];
    let failed: Array<{ repository: string; error: string }> = [];
    let renamed: Array<{ from: string; to: string }> = [];
    if (selected.length > 0) {
      const sync = await syncGithubProjects(env, {
        repositories: selected.map((candidate) => candidate.repository),
        limit: selected.length,
        trigger: trigger === "cron" ? "cron" : "admin",
        signalDepth: "lite",
        refreshDerived: false
      });
      synced = sync.synced;
      failed = sync.failed;
      renamed = sync.renamed;
      const renamedIds = new Set(renamed.map((item) => item.from.toLowerCase()));
      await markCandidateSyncResults(
        env,
        synced.filter((repository) => !renamedIds.has(repository.toLowerCase())),
        failed
      );
    }

    const finishedAt = new Date();
    const status = failed.length > 0 && synced.length === 0 ? "failed" : selected.length === 0 ? "skipped" : "success";
    const run = await upsertGovernanceRun(env, {
      task: "candidate-discovery",
      status,
      trigger,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      summary: {
        source: "github_search",
        query: query.query,
        category: query.category,
        discovered: discovered.length,
        admitted: admitted.map((candidate) => candidate.repository),
        renamed,
        quarantined,
        selected: selected.map((candidate) => candidate.repository),
        synced,
        failed
      },
      error: status === "failed" ? failed[0]?.error ?? "candidate discovery failed" : null
    });

    return {
      query,
      discovered_count: discovered.length,
      selected: selected.map(toCandidateResponse),
      quarantined,
      synced,
      failed,
      run
    };
  } catch (error) {
    const finishedAt = new Date();
    const message = formatError(error);
    const run = await upsertGovernanceRun(env, {
      task: "candidate-discovery",
      status: "failed",
      trigger,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      summary: {
        source: "github_search",
        query: query.query,
        category: query.category
      },
      error: message
    });
    return {
      query,
      discovered_count: 0,
      selected: [],
      synced: [],
      failed: [{ repository: query.query, error: message }],
      run
    };
  }
}

async function searchGithubCandidates(env: Env, query: string, category: Category): Promise<CandidateRepository[]> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `${query} stars:>=${minimumStarsForCategory(category)} archived:false fork:false`);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "25");

  const response = await fetch(url, {
    headers: githubHeaders(env)
  });
  if (!response.ok) {
    throw new Error(`GitHub candidate search ${response.status} for ${query}: ${await response.text()}`);
  }

  const body = (await response.json()) as { items?: GithubSearchRepository[] };
  return (body.items ?? [])
    .map((repo) => toCandidate(repo, query, category))
    .filter((candidate): candidate is CandidateRepository => candidate !== null);
}

function toCandidate(repo: GithubSearchRepository, sourceQuery: string, category: Category): CandidateRepository | null {
  const repository = String(repo.full_name ?? "").trim();
  if (!repository || repo.archived || repo.disabled || repo.private || repo.fork) {
    return null;
  }
  if (isPeripheralRepository(repository, repo.description ?? "")) {
    return null;
  }
  const stars = Number(repo.stargazers_count ?? 0);
  if (stars < minimumStarsForCategory(category)) {
    return null;
  }
  return {
    repository,
    category,
    source: "github_search",
    sourceQuery,
    stars,
    pushedAt: repo.pushed_at ?? null,
    description: String(repo.description ?? "")
  };
}

function toCandidateResponse(candidate: CandidateRepository) {
  return {
    repository: candidate.repository,
    category: candidate.category,
    source: candidate.source,
    source_query: candidate.sourceQuery,
    stars: candidate.stars,
    pushed_at: candidate.pushedAt,
    description: candidate.description
  };
}

async function listExistingRepositories(env: Env): Promise<Set<string>> {
  const existing = new Set(defaultSeedRepositories.map((repo) => repo.toLowerCase()));
  const rows = await env.DB!.prepare("SELECT lower(full_name) AS repository FROM projects").all<{ repository: string }>();
  for (const row of rows.results ?? []) {
    existing.add(String(row.repository).toLowerCase());
  }
  const syncedCandidates = await env.DB!.prepare("SELECT lower(repository) AS repository FROM candidate_repositories WHERE status = 'synced'").all<{ repository: string }>().catch(() => ({ results: [] }));
  for (const row of syncedCandidates.results ?? []) {
    existing.add(String(row.repository).toLowerCase());
  }
  return existing;
}

async function upsertCandidateRepositories(
  env: Env,
  candidates: CandidateRepository[],
  selected: Set<string>,
  admissionByRepository: Map<string, CandidateAdmissionDecision>
): Promise<void> {
  if (candidates.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  await env.DB!.batch(
    candidates.map((candidate) =>
      env.DB!.prepare(
        `INSERT INTO candidate_repositories (
          repository, category, source, source_query, stars, pushed_at, description, status,
          admission_json, first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(repository) DO UPDATE SET
          category = excluded.category,
          source = excluded.source,
          source_query = excluded.source_query,
          stars = excluded.stars,
          pushed_at = excluded.pushed_at,
          description = excluded.description,
          status = CASE WHEN candidate_repositories.status = 'synced' THEN candidate_repositories.status ELSE excluded.status END,
          admission_json = excluded.admission_json,
          last_seen_at = excluded.last_seen_at`
      ).bind(
        candidate.repository,
        candidate.category,
        candidate.source,
        candidate.sourceQuery,
        candidate.stars,
        candidate.pushedAt,
        candidate.description,
        selected.has(candidate.repository.toLowerCase()) ? "approved" : "quarantined",
        JSON.stringify(admissionByRepository.get(candidate.repository.toLowerCase()) ?? {
          admitted: false,
          reasons: ["Repository is already indexed or was not evaluated in this discovery run."],
          signals: {}
        }),
        now,
        now
      )
    )
  ).catch(() => undefined);
}

export function evaluateCandidateAdmission(candidate: CandidateRepository, now = new Date()): CandidateAdmissionDecision {
  const pushedAt = candidate.pushedAt ? Date.parse(candidate.pushedAt) : Number.NaN;
  const active = Number.isFinite(pushedAt) && now.getTime() - pushedAt <= 180 * 24 * 60 * 60 * 1000;
  const described = candidate.description.trim().length >= 20;
  const authority = candidate.stars >= minimumStarsForCategory(candidate.category);
  const corpus = `${candidate.repository} ${candidate.description}`.toLowerCase();
  const relevant = admissionHints[candidate.category].some((hint) => corpus.includes(hint));
  const signals = { active, relevant, described, authority };
  const reasons = Object.entries(signals)
    .filter(([, matched]) => !matched)
    .map(([signal]) => `Failed ${signal} admission signal.`);
  return {
    admitted: Object.values(signals).every(Boolean),
    reasons: reasons.length ? reasons : ["Passed activity, relevance, description, and authority admission signals."],
    signals
  };
}

const admissionHints: Record<Category, string[]> = {
  agent_framework: ["agent", "multi-agent", "tool calling"],
  coding_agent: ["coding", "code", "developer", "ide"],
  browser_agent: ["browser", "playwright", "web automation"],
  rag_framework: ["rag", "retrieval", "knowledge"],
  vector_database: ["vector", "embedding", "similarity search"],
  llm_gateway: ["gateway", "proxy", "router", "openai compatible"],
  llm_eval: ["eval", "benchmark", "test"],
  prompt_tooling: ["prompt", "structured output", "guardrail"],
  workflow_automation: ["workflow", "automation", "orchestration"],
  local_llm_runtime: ["local llm", "inference", "model serving"],
  ai_app_template: ["template", "starter", "app"],
  mcp_server: ["mcp", "model context protocol"],
  ai_observability: ["observability", "trace", "monitoring"],
  other: []
};

async function markCandidateSyncResults(env: Env, synced: string[], failed: Array<{ repository: string; error: string }>): Promise<void> {
  const now = new Date().toISOString();
  const statements = [
    ...synced.map((repository) =>
      env.DB!.prepare("UPDATE candidate_repositories SET status = 'synced', last_synced_at = ?, last_error = NULL WHERE lower(repository) = ?").bind(now, repository.toLowerCase())
    ),
    ...failed.map((failure) =>
      env.DB!.prepare("UPDATE candidate_repositories SET status = 'failed', last_error = ? WHERE lower(repository) = ?").bind(failure.error, failure.repository.toLowerCase())
    )
  ];
  if (statements.length > 0) {
    await env.DB!.batch(statements).catch(() => undefined);
  }
}

function githubHeaders(env?: Env): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "git-top-candidate-discovery"
  };
  if (env?.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return headers;
}

function currentSearchIndex(): number {
  return Math.floor(Date.now() / 1000 / 60 / 60);
}

function normalizeSearchIndex(value: number, length: number): number {
  return Math.abs(Math.trunc(value)) % length;
}

function normalizeLimit(value: number | undefined, defaultValue: number, max: number): number {
  if (!value || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

function minimumStarsForCategory(category: Category): number {
  return category === "mcp_server" || category === "llm_gateway" ? 20 : 50;
}

function isPeripheralRepository(repository: string, description: string): boolean {
  const name = repository.split("/").pop()?.toLowerCase() ?? "";
  const text = `${repository} ${description}`.toLowerCase();
  const blockedNames = new Set([".github", "docs", "documentation", "examples", "example", "tests", "test", "website", "homepage"]);
  return blockedNames.has(name) || /(^|[-_])(docs?|examples?|tests?|website|helm|charts?)([-_]|$)/.test(name) || text.includes("documentation for");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown candidate discovery error";
}
