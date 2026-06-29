import { generateAlternativesForAll } from "./alternatives";
import { updateProjectAlternatives } from "./db-write-store";
import { upsertGovernanceRun } from "./governance-store";
import { getKnowledgeForSourcePolicy } from "./source-policy";
import type { Env } from "./types";

export async function refreshAlternativesDerivedData(env: Env, trigger: "admin" | "cron" | "manual" = "manual") {
  const startedAt = new Date().toISOString();
  const knowledgePolicy = await getKnowledgeForSourcePolicy(env);
  if (!knowledgePolicy.ok) {
    throw new Error(`Knowledge source unavailable: ${knowledgePolicy.failure.metadata.reason}`);
  }

  const knowledge = knowledgePolicy.knowledge;
  const result = generateAlternativesForAll(knowledge.projects);
  const updated = await updateProjectAlternatives(env, result.updates);
  const finishedAt = new Date().toISOString();
  const run = await upsertGovernanceRun(env, {
    task: "derived:alternatives",
    status: "success",
    trigger,
    startedAt,
    finishedAt,
    summary: {
      updated,
      candidate_count: result.updates.length,
      project_count: knowledge.projects.length,
      source: knowledge.metadata.source,
      source_reason: knowledge.metadata.reason
    }
  });

  return {
    updated,
    updates: result.updates,
    metadata: knowledge.metadata,
    run
  };
}
