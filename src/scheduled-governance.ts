import { defaultSeedRepositories } from "./github";
import { getHealth } from "./health";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildQualityReport } from "./quality";
import { refreshAlternativesDerivedData } from "./derived-refresh";
import { getSyncStatus } from "./db-sync-store";
import { upsertGovernanceRun } from "./governance-store";
import { scheduledGovernanceDefinition, type GovernanceCadence } from "./governance-schedule";
import type { Env, GovernanceRunStatus } from "./types";

interface ScheduledGovernanceTask {
  task: string;
  cadence: GovernanceCadence;
  shouldRun(date: Date): boolean;
  run(env: Env): Promise<Record<string, unknown>>;
}

interface ScheduledGovernanceResult {
  task: string;
  status: GovernanceRunStatus;
}

const scheduledGovernanceTasks: ScheduledGovernanceTask[] = [
  {
    ...scheduledGovernanceDefinition("daily-production-health"),
    shouldRun: (date) => date.getUTCHours() === 1,
    run: runDailyProductionHealth
  },
  {
    ...scheduledGovernanceDefinition("weekly-data-governance"),
    shouldRun: (date) => date.getUTCDay() === 1 && date.getUTCHours() === 2,
    run: runWeeklyDataGovernance
  },
  {
    ...scheduledGovernanceDefinition("derived:alternatives"),
    shouldRun: (date) => date.getUTCDay() === 1 && date.getUTCHours() === 2,
    run: runWeeklyAlternativesRefresh
  },
  {
    ...scheduledGovernanceDefinition("biweekly-live-check"),
    shouldRun: (date) => [1, 15].includes(date.getUTCDate()) && date.getUTCHours() === 3,
    run: runBiweeklyLiveCheck
  },
  {
    ...scheduledGovernanceDefinition("monthly-corpus-review"),
    shouldRun: (date) => date.getUTCDate() === 1 && date.getUTCHours() === 4,
    run: runMonthlyCorpusReview
  }
];

export async function runScheduledGovernance(env: Env, now = new Date()): Promise<ScheduledGovernanceResult[]> {
  const dueTasks = scheduledGovernanceTasks.filter((task) => task.shouldRun(now));
  const results: ScheduledGovernanceResult[] = [];
  for (const task of dueTasks) {
    results.push(await recordScheduledGovernanceTask(env, task, now));
  }
  return results;
}

async function recordScheduledGovernanceTask(
  env: Env,
  task: ScheduledGovernanceTask,
  scheduledAt: Date
): Promise<ScheduledGovernanceResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  try {
    const summary = await task.run(env);
    const finishedAt = new Date().toISOString();
    await upsertGovernanceRun(env, {
      id: scheduledRunId(task, scheduledAt),
      task: task.task,
      status: "success",
      trigger: "cron",
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedMs,
      summary: {
        cadence: task.cadence,
        scheduled_at: scheduledAt.toISOString(),
        runner: "cloudflare_worker",
        ...summary
      }
    });
    return { task: task.task, status: "success" };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await upsertGovernanceRun(env, {
      id: scheduledRunId(task, scheduledAt),
      task: task.task,
      status: "failed",
      trigger: "cron",
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedMs,
      summary: {
        cadence: task.cadence,
        scheduled_at: scheduledAt.toISOString(),
        runner: "cloudflare_worker"
      },
      error: formatError(error)
    });
    return { task: task.task, status: "failed" };
  }
}

async function runDailyProductionHealth(env: Env): Promise<Record<string, unknown>> {
  const [health, sync, knowledge] = await Promise.all([
    getHealth(env),
    getSyncStatus(env, defaultSeedRepositories),
    listProjectKnowledgeWithMeta(env)
  ]);
  const quality = buildQualityReport(knowledge.projects);

  if (!health.ok || health.db !== "available") {
    throw new Error(`Production health check failed: db=${health.db}`);
  }
  if (sync.health !== "healthy" || sync.freshness !== "fresh") {
    throw new Error(`Sync check failed: health=${sync.health}, freshness=${sync.freshness}`);
  }
  if (knowledge.metadata.source !== "d1") {
    throw new Error(`Quality check expected D1 source, got ${knowledge.metadata.source}`);
  }
  if (quality.errorCount > 0 || quality.releaseScore < 90) {
    throw new Error(`Quality check failed: release_score=${quality.releaseScore}, errors=${quality.errorCount}`);
  }

  return {
    health_ok: health.ok,
    db: health.db,
    project_count: health.projectCount,
    raw_project_count: health.rawProjectCount,
    sync_health: sync.health,
    sync_freshness: sync.freshness,
    indexed_count: sync.indexedCount,
    synced_count: sync.syncedCount,
    last_successful_sync_at: sync.lastSuccessfulSyncAt,
    quality_score: quality.score,
    release_score: quality.releaseScore,
    data_trust_score: quality.dataTrustScore,
    risk_level: quality.riskLevel,
    issue_count: quality.issueCount,
    error_count: quality.errorCount,
    warning_count: quality.warningCount
  };
}

async function runWeeklyDataGovernance(env: Env): Promise<Record<string, unknown>> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  if (knowledge.metadata.source !== "d1") {
    throw new Error(`Weekly governance expected D1 source, got ${knowledge.metadata.source}`);
  }
  const quality = buildQualityReport(knowledge.projects);
  if (quality.errorCount > 0) {
    throw new Error(`Weekly governance found ${quality.errorCount} quality error(s).`);
  }

  return {
    project_count: quality.projectCount,
    category_count: Object.values(quality.categoryDistribution).filter((count) => count > 0).length,
    missing_categories: quality.coverage.missingCategories,
    low_confidence_classification_count: quality.coverage.lowConfidenceClassificationCount,
    low_confidence_classification_rate: quality.coverage.lowConfidenceClassificationRate,
    collection_review_count: quality.coverage.collectionReviewCount,
    stale_project_count: quality.coverage.staleProjectCount,
    stale_collection_count: quality.coverage.staleCollectionCount,
    data_trust_score: quality.dataTrustScore,
    risk_level: quality.riskLevel,
    risk_reasons: quality.riskSummary.reasons
  };
}

async function runBiweeklyLiveCheck(env: Env): Promise<Record<string, unknown>> {
  const sync = await getSyncStatus(env, defaultSeedRepositories);
  if (sync.health === "degraded") {
    throw new Error(`Recent sync is degraded: ${sync.lastError?.repository ?? "unknown"} ${sync.lastError?.error ?? ""}`.trim());
  }
  if (sync.remainingCount > 0) {
    throw new Error(`Seed corpus still has ${sync.remainingCount} unsynced repositories.`);
  }

  return {
    health: sync.health,
    freshness: sync.freshness,
    seed_total: sync.seedTotal,
    synced_count: sync.syncedCount,
    indexed_count: sync.indexedCount,
    remaining_count: sync.remainingCount,
    cycle_complete: sync.cycleComplete,
    cursor: sync.cursor,
    priority_stale_counts: sync.priority?.staleCounts,
    last_successful_sync_at: sync.lastSuccessfulSyncAt
  };
}

async function runWeeklyAlternativesRefresh(env: Env): Promise<Record<string, unknown>> {
  const alternatives = await refreshAlternativesDerivedData(env, "cron", { recordRun: false });
  return {
    updated: alternatives.updated,
    candidate_count: alternatives.updates.length,
    project_count: alternatives.metadata.projectCount,
    source: alternatives.metadata.source,
    source_reason: alternatives.metadata.reason
  };
}

async function runMonthlyCorpusReview(env: Env): Promise<Record<string, unknown>> {
  const [knowledge, alternatives] = await Promise.all([
    listProjectKnowledgeWithMeta(env),
    refreshAlternativesDerivedData(env, "cron")
  ]);
  const quality = buildQualityReport(knowledge.projects);

  return {
    project_count: quality.projectCount,
    category_distribution: quality.categoryDistribution,
    release_score: quality.releaseScore,
    data_trust_score: quality.dataTrustScore,
    risk_level: quality.riskLevel,
    improvement_plan: quality.improvementPlan.map((item) => ({
      priority: item.priority,
      title: item.title,
      target: item.target
    })),
    alternatives_updated: alternatives.updated,
    alternatives_candidate_count: alternatives.updates.length,
    alternatives_source: alternatives.metadata.source
  };
}

function scheduledRunId(task: ScheduledGovernanceTask, scheduledAt: Date): string {
  return `${task.task}:${scheduledBucket(task, scheduledAt)}`;
}

function scheduledBucket(task: ScheduledGovernanceTask, scheduledAt: Date): string {
  const year = scheduledAt.getUTCFullYear();
  const month = String(scheduledAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(scheduledAt.getUTCDate()).padStart(2, "0");
  const hour = String(scheduledAt.getUTCHours()).padStart(2, "0");
  if (task.cadence === "monthly") {
    return `${year}-${month}`;
  }
  return `${year}-${month}-${day}T${hour}`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
