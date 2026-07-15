import { generateAgentCard } from "./cards";
import { generateAlternatives } from "./alternatives";
import { getSyncCursor, getStarsDeltaSnapshot, insertSyncRun, setSyncCursor } from "./db-sync-store";
import { retireRenamedProjectKnowledge, updateProjectAlternatives, upsertProjectKnowledge } from "./db-write-store";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { defaultSeedRepositories, GithubClient, type GithubRequestMetrics } from "./github";
import { calculateMetrics } from "./scoring";
import { selectPriorityRepositoryIds } from "./sync-priority";
import { scheduledSyncLimit } from "./sync-policy";
import { pruneOperationalData } from "./storage-maintenance";
import type { Env, GithubRepository, Project, ProjectKnowledge, SyncFailure, SyncTrigger } from "./types";
import { validateProjectKnowledge, ValidationError } from "./validation";

export const defaultSyncLimit = 1;
export const maxSyncLimit = 50;
export { scheduledSyncLimit } from "./sync-policy";

const lightweightSignalOptions = {
  maxCommitPages: 1,
  maxReleasePages: 1,
  maxContributorPages: 1,
  includeIssueFirstResponse: false
} as const;

export interface SyncOptions {
  repositories?: string[];
  limit?: number;
  offset?: number;
  trigger?: SyncTrigger;
  signalDepth?: "full" | "lite";
  refreshDerived?: boolean;
}

export interface SyncResult {
  synced: string[];
  renamed: Array<{ from: string; to: string }>;
  alternativesUpdated: number;
  offset: number;
  nextOffset: number;
  failed: SyncFailure[];
  metricSources: Record<
    string,
    {
      stars30dDelta: "snapshot" | "estimated";
      stars30dWindowDays?: number;
      commits30d?: "complete" | "partial" | "unknown";
      releases180d?: "complete" | "partial" | "unknown";
      contributors90d?: "complete" | "partial" | "unknown";
    }
  >;
  githubRequestMetrics: GithubRequestMetrics;
  repositoryRequestMetrics: Record<string, GithubRequestMetrics>;
  derivedRefresh: {
    alternatives: "updated" | "skipped";
  };
}

export async function syncGithubProjects(env: Env, options: SyncOptions = {}): Promise<SyncResult> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required for sync.");
  }

  await pruneOperationalData(env);

  const allRepositories = normalizeRepositories(options.repositories ?? defaultSeedRepositories);
  const usesCursor = !options.repositories && options.offset === undefined;
  const trigger = options.trigger ?? "manual";
  const offset = allRepositories.length === 0 ? 0 : usesCursor ? (await getSyncCursor(env)) % allRepositories.length : clampOffset(options.offset);
  const limit = clampLimit(options.limit);
  const cursorRepositories = selectRepositoryBatch(allRepositories, offset, limit);
  const cursorReserve = usesCursor && options.trigger === "cron" ? 1 : 0;
  const priorityProjects = usesCursor && trigger === "cron" ? (await listProjectKnowledgeWithMeta(env)).projects : [];
  const priorityRepositoryPool = priorityProjects.map((project) => project.project.id);
  const priorityRepositories =
    usesCursor && trigger === "cron"
      ? selectPriorityRepositoryIds(priorityProjects, priorityRepositoryPool, Math.max(1, limit - cursorReserve))
      : [];
  const repositories =
    usesCursor && trigger === "cron"
      ? selectScheduledRepositoryBatch(allRepositories, offset, limit, priorityRepositories, cursorReserve, priorityRepositoryPool).repositories
      : cursorRepositories;
  const github = new GithubClient(env);
  const signalOptions = options.signalDepth === "lite" ? lightweightSignalOptions : undefined;
  const refreshDerived = options.refreshDerived ?? trigger !== "cron";
  const startedAt = new Date();
  let cursorAdvanceCount = 0;
  const cursorProgress = new Set<string>();
  const result: SyncResult = {
    synced: [],
    renamed: [],
    alternativesUpdated: 0,
    offset,
    nextOffset: offset,
    failed: [],
    metricSources: {},
    githubRequestMetrics: github.getRequestMetrics(),
    repositoryRequestMetrics: {},
    derivedRefresh: {
      alternatives: refreshDerived ? "updated" : "skipped"
    }
  };

  for (const repository of repositories) {
    const beforeMetrics = github.getRequestMetrics();
    try {
      const repo = await github.getRepository(repository);
      const signals = await github.getSignals(repo, signalOptions);
      const now = new Date().toISOString();
      const stars30dSnapshot = await getStarsDeltaSnapshot(env, repo.full_name, repo.stargazers_count, now);
      const signalConfidence = {
        stars30dDelta: stars30dSnapshot === null ? "estimated" : "snapshot",
        ...(stars30dSnapshot ? { stars30dWindowDays: stars30dSnapshot.windowDays } : {}),
        ...signals.signalConfidence
      } satisfies NonNullable<ProjectKnowledge["metrics"]["signalConfidence"]>;
      result.metricSources[repository] = signalConfidence;
      result.repositoryRequestMetrics[repository] = deltaGithubMetrics(beforeMetrics, github.getRequestMetrics());
      const knowledge: ProjectKnowledge = {
        project: repositoryToProject(repo, now),
        agentCard: generateAgentCard(repo, signals, now),
        metrics: calculateMetrics(repo, signals, now, { stars30dDelta: stars30dSnapshot?.delta, signalConfidence })
      };

      validateProjectKnowledge(knowledge);
      await upsertProjectKnowledge(env, knowledge);
      if (await retireRenamedProjectKnowledge(env, repository, repo.full_name)) {
        result.renamed.push({ from: repository, to: repo.full_name });
      }
      result.synced.push(repository);
      cursorProgress.add(repository.toLowerCase());
      cursorAdvanceCount = countCursorProgress(cursorRepositories, cursorProgress);
    } catch (error) {
      result.repositoryRequestMetrics[repository] = deltaGithubMetrics(beforeMetrics, github.getRequestMetrics());
      const retryable = isRetryableSyncError(error);
      result.failed.push({
        repository,
        error: formatSyncError(error)
      });
      if (retryable) {
        break;
      }
      cursorProgress.add(repository.toLowerCase());
      cursorAdvanceCount = countCursorProgress(cursorRepositories, cursorProgress);
    }
  }
  result.githubRequestMetrics = github.getRequestMetrics();

  const nextOffset = nextSyncOffset(allRepositories.length, offset, cursorAdvanceCount);
  result.nextOffset = nextOffset;

  if (refreshDerived) {
    const projects = (await listProjectKnowledgeWithMeta(env)).projects;
    const syncedIds = new Set(result.synced.map((repository) => repository.toLowerCase()));
    const alternativeUpdates = projects
      .filter((project) => syncedIds.has(project.project.id.toLowerCase()))
      .map((project) => ({
        projectId: project.project.id,
        alternatives: generateAlternatives(project, projects, 5)
      }));
    result.alternativesUpdated = await updateProjectAlternatives(env, alternativeUpdates);
  }

  if (usesCursor) {
    await setSyncCursor(env, nextOffset);
  }

  await insertSyncRun(env, {
    id: crypto.randomUUID(),
    trigger,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    offset,
    nextOffset,
    limit,
    syncedCount: result.synced.length,
    failedCount: result.failed.length,
    alternativesUpdated: result.alternativesUpdated,
    synced: result.synced,
    failed: result.failed
  });

  return result;
}

function formatSyncError(error: unknown): string {
  if (error instanceof ValidationError) {
    return `Validation failed: ${error.issues.join("; ")}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown sync error";
}

function repositoryToProject(repo: GithubRepository, syncedAt: string): Project {
  return {
    id: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    githubUrl: repo.html_url,
    homepageUrl: repo.homepage || null,
    description: repo.description,
    language: repo.language,
    topics: repo.topics ?? [],
    license: repo.license?.spdx_id ?? null,
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

function normalizeRepositories(repositories: string[]): string[] {
  return Array.from(
    new Set(
      repositories
        .map((repo) => repo.trim())
        .filter((repo) => /^[^/\s]+\/[^/\s]+$/.test(repo))
    )
  );
}

export function selectRepositoryBatch(repositories: string[], offset: number, limit: number): string[] {
  if (repositories.length === 0 || limit <= 0) {
    return [];
  }

  const normalizedOffset = Math.max(0, offset) % repositories.length;
  const batchSize = Math.min(limit, repositories.length);
  return Array.from({ length: batchSize }, (_, index) => repositories[(normalizedOffset + index) % repositories.length]);
}

export function selectScheduledRepositoryBatch(
  repositories: string[],
  offset: number,
  limit: number,
  priorityRepositories: string[],
  cursorReserve = 0,
  priorityRepositoryPool: string[] = repositories
): { repositories: string[]; cursorRepositories: string[] } {
  const cursorRepositories = selectRepositoryBatch(repositories, offset, limit);
  const selectedPriorityLimit = Math.max(0, Math.min(limit - Math.max(0, Math.trunc(cursorReserve)), limit));
  const canonical = new Map([...repositories, ...priorityRepositoryPool].map((repo) => [repo.toLowerCase(), repo]));
  const selected: string[] = [];
  const seen = new Set<string>();

  if (selectedPriorityLimit > 0) {
    for (const repository of priorityRepositories) {
      const normalized = repository.toLowerCase();
      const canonicalRepository = canonical.get(normalized);
      if (!canonicalRepository || seen.has(normalized)) {
        continue;
      }
      selected.push(canonicalRepository);
      seen.add(normalized);
      if (selected.length >= selectedPriorityLimit) {
        break;
      }
    }
  }

  for (const repository of cursorRepositories) {
    const normalized = repository.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    selected.push(repository);
    seen.add(normalized);
    if (selected.length >= limit) {
      break;
    }
  }

  return {
    repositories: selected,
    cursorRepositories
  };
}

export function nextSyncOffset(repositoryCount: number, offset: number, advancedCount: number): number {
  if (repositoryCount <= 0) {
    return 0;
  }
  return (Math.max(0, Math.trunc(offset)) + Math.max(0, Math.trunc(advancedCount))) % repositoryCount;
}

function countCursorProgress(cursorRepositories: string[], processedRepositories: Set<string>): number {
  let count = 0;
  while (count < cursorRepositories.length && processedRepositories.has(cursorRepositories[count].toLowerCase())) {
    count += 1;
  }
  return count;
}

function deltaGithubMetrics(before: GithubRequestMetrics, after: GithubRequestMetrics): GithubRequestMetrics {
  return {
    total: after.total - before.total,
    conditional: after.conditional - before.conditional,
    cacheHits: after.cacheHits - before.cacheHits,
    cacheMisses: after.cacheMisses - before.cacheMisses,
    revalidated: after.revalidated - before.revalidated
  };
}

function clampLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return defaultSyncLimit;
  }
  return Math.max(1, Math.min(maxSyncLimit, Math.trunc(value)));
}

function clampOffset(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

function isRetryableSyncError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  if (message.includes("too many subrequests")) {
    return true;
  }
  if (message.includes("github api 403") || message.includes("github api 429")) {
    return true;
  }
  return /github api 5\d\d/.test(message);
}
