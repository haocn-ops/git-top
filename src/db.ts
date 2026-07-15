import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import {
  findAlternativesFromList,
  getProjectKnowledgeFromList,
  getTrendingFromList,
  recommendProjectList,
  searchProjectList
} from "./project-search";
import type { Env, ProjectKnowledge } from "./types";
import type { ClassificationOverrideInput } from "./db-write-store";
import type { ProjectFilters, Recommendation, RecommendationQuery } from "./project-search";
import type { KnowledgeMetadata } from "./knowledge-source";

export { findAlternativesFromList, getProjectKnowledgeFromList, getTrendingFromList, recommendProjectList, searchProjectList } from "./project-search";
export type { ProjectFilters, Recommendation, RecommendationQuery } from "./project-search";
export { listProjectKnowledgeWithMeta } from "./knowledge-source";
export type { KnowledgeMetadata, KnowledgeSource, KnowledgeSourceReason, ProjectKnowledgeResult } from "./knowledge-source";
export {
  getStarsDeltaSnapshot,
  getSyncCursor,
  getSyncedProjectCount,
  getSyncStatus,
  insertSyncRun,
  listSyncRuns,
  setSyncCursor
} from "./db-sync-store";
export type { StarDeltaSnapshot } from "./db-sync-store";
export { getHealth } from "./health";
export type { HealthStatus } from "./health";
export {
  listClassificationOverrides,
  retireRenamedProjectKnowledge,
  updateProjectAlternatives,
  upsertClassificationOverride,
  upsertProjectKnowledge
} from "./db-write-store";
export type { ClassificationOverrideInput } from "./db-write-store";

export async function listProjectKnowledge(env: Env): Promise<ProjectKnowledge[]> {
  return (await listProjectKnowledgeWithMeta(env)).projects;
}

export async function getKnowledgeMetadata(env: Env): Promise<KnowledgeMetadata> {
  return (await listProjectKnowledgeWithMeta(env)).metadata;
}

export async function getProjectKnowledge(env: Env, id: string): Promise<ProjectKnowledge | null> {
  return getProjectKnowledgeFromList(await listProjectKnowledge(env), id);
}

export async function searchProjects(env: Env, filters: ProjectFilters): Promise<ProjectKnowledge[]> {
  return searchProjectList(await listProjectKnowledge(env), filters);
}

export async function getTrending(env: Env, filters: Pick<ProjectFilters, "category" | "limit">): Promise<ProjectKnowledge[]> {
  return getTrendingFromList(await listProjectKnowledge(env), filters);
}

export async function recommendProjects(env: Env, query: RecommendationQuery): Promise<Recommendation[]> {
  return recommendProjectList(await listProjectKnowledge(env), query);
}

export async function findAlternatives(env: Env, id: string, limit = 5): Promise<ProjectKnowledge[]> {
  return findAlternativesFromList(await listProjectKnowledge(env), id, limit);
}
