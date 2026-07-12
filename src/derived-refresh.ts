import { generateAlternatives, generateAlternativesForAll } from "./alternatives";
import { getSyncStateNumber, getSyncStateValue, setSyncStateValue } from "./db-sync-store";
import { updateProjectAlternatives } from "./db-write-store";
import { upsertGovernanceRun } from "./governance-store";
import { getKnowledgeForSourcePolicy } from "./source-policy";
import type { Env } from "./types";

interface RefreshAlternativesOptions {
  recordRun?: boolean;
  offset?: number;
  limit?: number;
}

export const maxAlternativesRefreshBatchSize = 25;
export const scheduledAlternativesRefreshBatchSize = 15;
const alternativesCursorKey = "alternatives_cursor";
const alternativesCycleStartedAtKey = "alternatives_cycle_started_at";

export async function refreshAlternativesDerivedData(
  env: Env,
  trigger: "admin" | "cron" | "manual" = "manual",
  options: RefreshAlternativesOptions = {}
) {
  const startedAt = new Date().toISOString();
  const recordRun = options.recordRun ?? true;
  const knowledgePolicy = await getKnowledgeForSourcePolicy(env);
  if (!knowledgePolicy.ok) {
    throw new Error(`Knowledge source unavailable: ${knowledgePolicy.failure.metadata.reason}`);
  }

  const knowledge = knowledgePolicy.knowledge;
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = options.limit === undefined ? undefined : Math.max(1, Math.min(maxAlternativesRefreshBatchSize, Math.trunc(options.limit)));
  const targets = limit === undefined ? knowledge.projects : knowledge.projects.slice(offset, offset + limit);
  const result =
    limit === undefined
      ? generateAlternativesForAll(knowledge.projects)
      : {
          updated: targets.length,
          updates: targets.map((project) => ({
            projectId: project.project.id,
            alternatives: generateAlternatives(project, knowledge.projects, 3)
          }))
        };
  const updated = await updateProjectAlternatives(env, result.updates);
  const finishedAt = new Date().toISOString();
  const nextOffset = Math.min(knowledge.projects.length, offset + targets.length);
  const complete = nextOffset >= knowledge.projects.length;
  const run = recordRun
    ? await upsertGovernanceRun(env, {
        task: "derived:alternatives",
        status: "success",
        trigger,
        startedAt,
        finishedAt,
        summary: {
          updated,
          candidate_count: result.updates.length,
          project_count: knowledge.projects.length,
          offset,
          limit: limit ?? knowledge.projects.length,
          next_offset: nextOffset,
          complete,
          source: knowledge.metadata.source,
          source_reason: knowledge.metadata.reason
        }
      })
    : null;

  return {
    updated,
    updates: result.updates,
    batch: {
      offset,
      limit: limit ?? knowledge.projects.length,
      nextOffset,
      total: knowledge.projects.length,
      complete
    },
    metadata: knowledge.metadata,
    run
  };
}

export async function refreshAlternativesIncremental(
  env: Env,
  trigger: "admin" | "cron" | "manual" = "cron",
  batchSize = scheduledAlternativesRefreshBatchSize
) {
  const startedAt = new Date().toISOString();
  const cursor = await getSyncStateNumber(env, alternativesCursorKey);
  const cycleStartedAt = cursor === 0 ? startedAt : (await getSyncStateValue(env, alternativesCycleStartedAtKey)) ?? startedAt;
  if (cursor === 0) {
    await setSyncStateValue(env, alternativesCycleStartedAtKey, cycleStartedAt);
  }

  try {
    const result = await refreshAlternativesDerivedData(env, trigger, {
      offset: cursor,
      limit: Math.max(1, Math.min(maxAlternativesRefreshBatchSize, Math.trunc(batchSize))),
      recordRun: false
    });
    if (result.batch.total > 0 && result.updated === 0 && cursor > 0) {
      await setSyncStateValue(env, alternativesCursorKey, "0");
      await setSyncStateValue(env, alternativesCycleStartedAtKey, startedAt);
      return refreshAlternativesIncremental(env, trigger, batchSize);
    }
    const finishedAt = new Date().toISOString();
    const nextCursor = result.batch.complete ? 0 : result.batch.nextOffset;
    await setSyncStateValue(env, alternativesCursorKey, String(nextCursor));

    const summary = {
      complete: result.batch.complete,
      cycle_started_at: cycleStartedAt,
      offset: result.batch.offset,
      next_offset: result.batch.nextOffset,
      batch_size: result.batch.limit,
      updated: result.updated,
      project_count: result.batch.total,
      source: result.metadata.source,
      source_reason: result.metadata.reason
    };
    await upsertGovernanceRun(env, {
      id: "derived:alternatives-progress",
      task: "derived:alternatives-progress",
      status: "success",
      trigger,
      startedAt,
      finishedAt,
      summary
    });

    const run = result.batch.complete
      ? await upsertGovernanceRun(env, {
          task: "derived:alternatives",
          status: "success",
          trigger,
          startedAt: cycleStartedAt,
          finishedAt,
          summary
        })
      : null;

    return { ...result, cursor, nextCursor, cycleStartedAt, run };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await upsertGovernanceRun(env, {
      id: "derived:alternatives-progress",
      task: "derived:alternatives-progress",
      status: "failed",
      trigger,
      startedAt,
      finishedAt,
      summary: { complete: false, cycle_started_at: cycleStartedAt, offset: cursor, batch_size: batchSize },
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
