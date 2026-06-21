import { generateAgentCard } from "./cards";
import { generateAlternativesForAll } from "./alternatives";
import {
  getSyncCursor,
  getStarsDeltaSnapshot,
  insertSyncRun,
  listProjectKnowledge,
  setSyncCursor,
  updateProjectAlternatives,
  upsertProjectKnowledge
} from "./db";
import { defaultSeedRepositories, GithubClient } from "./github";
import { calculateMetrics } from "./scoring";
import type { Env, GithubRepository, Project, ProjectKnowledge, SyncFailure, SyncTrigger } from "./types";
import { validateProjectKnowledge, ValidationError } from "./validation";

export interface SyncOptions {
  repositories?: string[];
  limit?: number;
  offset?: number;
  trigger?: SyncTrigger;
}

export interface SyncResult {
  synced: string[];
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
}

export async function syncGithubProjects(env: Env, options: SyncOptions = {}): Promise<SyncResult> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required for sync.");
  }

  const allRepositories = normalizeRepositories(options.repositories ?? defaultSeedRepositories);
  const usesCursor = !options.repositories && options.offset === undefined;
  const offset = allRepositories.length === 0 ? 0 : usesCursor ? (await getSyncCursor(env)) % allRepositories.length : clampOffset(options.offset);
  const limit = clampLimit(options.limit);
  const repositories = allRepositories.slice(offset, offset + limit);
  const nextOffset = allRepositories.length === 0 ? 0 : (offset + limit) % allRepositories.length;
  const github = new GithubClient(env);
  const startedAt = new Date();
  const result: SyncResult = {
    synced: [],
    alternativesUpdated: 0,
    offset,
    nextOffset,
    failed: [],
    metricSources: {}
  };

  for (const repository of repositories) {
    try {
      const repo = await github.getRepository(repository);
      const signals = await github.getSignals(repo);
      const now = new Date().toISOString();
      const stars30dSnapshot = await getStarsDeltaSnapshot(env, repo.full_name, repo.stargazers_count, now);
      const signalConfidence = {
        stars30dDelta: stars30dSnapshot === null ? "estimated" : "snapshot",
        ...(stars30dSnapshot ? { stars30dWindowDays: stars30dSnapshot.windowDays } : {}),
        ...signals.signalConfidence
      } satisfies NonNullable<ProjectKnowledge["metrics"]["signalConfidence"]>;
      result.metricSources[repository] = signalConfidence;
      const knowledge: ProjectKnowledge = {
        project: repositoryToProject(repo, now),
        agentCard: generateAgentCard(repo, signals, now),
        metrics: calculateMetrics(repo, signals, now, { stars30dDelta: stars30dSnapshot?.delta, signalConfidence })
      };

      validateProjectKnowledge(knowledge);
      await upsertProjectKnowledge(env, knowledge);
      result.synced.push(repository);
    } catch (error) {
      result.failed.push({
        repository,
        error: formatSyncError(error)
      });
    }
  }

  const alternatives = generateAlternativesForAll(await listProjectKnowledge(env));
  result.alternativesUpdated = await updateProjectAlternatives(env, alternatives.updates);

  if (usesCursor) {
    await setSyncCursor(env, nextOffset);
  }

  await insertSyncRun(env, {
    id: crypto.randomUUID(),
    trigger: options.trigger ?? "manual",
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

function clampLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 5;
  }
  return Math.max(1, Math.min(10, Math.trunc(value)));
}

function clampOffset(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}
