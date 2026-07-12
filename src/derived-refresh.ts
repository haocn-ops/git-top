import { generateAlternatives, generateAlternativesForAll } from "./alternatives";
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
