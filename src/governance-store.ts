import { rowToGovernanceRun, type GovernanceRunRow } from "./db-mapping";
import { scheduledGovernanceDefinitions, type GovernanceCadence } from "./governance-schedule";
import type { Env, GovernanceRun, GovernanceRunStatus, GovernanceRunTrigger } from "./types";

export interface GovernanceRunInput {
  id?: string;
  task: string;
  status: GovernanceRunStatus;
  trigger?: GovernanceRunTrigger;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  summary?: Record<string, unknown>;
  reportUrl?: string | null;
  error?: string | null;
}

export interface GovernanceSummary {
  generatedAt: string;
  runCount: number;
  latestRun: GovernanceRun | null;
  latestByTask: GovernanceRun[];
  statusCounts: Record<GovernanceRunStatus, number>;
  failedTasks: GovernanceRun[];
  missingTasks: MissingGovernanceTask[];
}

export interface MissingGovernanceTask {
  task: string;
  cadence: GovernanceCadence;
  expectedIntervalHours: number;
  missingAfterHours: number;
  latestRun: GovernanceRun | null;
  lastSuccessfulRunAt: string | null;
  hoursSinceLastSuccess: number | null;
  reason: string;
}

const validStatuses = new Set<GovernanceRunStatus>(["success", "failed", "running", "skipped"]);
const validTriggers = new Set<GovernanceRunTrigger>(["github_actions", "cron", "admin", "manual"]);

export async function upsertGovernanceRun(env: Env, input: GovernanceRunInput): Promise<GovernanceRun> {
  if (!env.DB) {
    throw new Error("D1 binding is required to record governance runs.");
  }

  const now = new Date().toISOString();
  const startedAt = input.startedAt ?? input.finishedAt ?? now;
  const finishedAt = input.finishedAt ?? now;
  const run: GovernanceRun = {
    id: input.id || crypto.randomUUID(),
    task: input.task,
    status: input.status,
    trigger: input.trigger ?? "manual",
    startedAt,
    finishedAt,
    durationMs: normalizeDuration(input.durationMs, startedAt, finishedAt),
    summary: input.summary ?? {},
    reportUrl: input.reportUrl ?? null,
    error: input.error ?? null,
    createdAt: now
  };

  await env.DB.prepare(
    `INSERT OR REPLACE INTO governance_runs (
      id, task, status, trigger, started_at, finished_at, duration_ms,
      summary_json, report_url, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      run.id,
      run.task,
      run.status,
      run.trigger,
      run.startedAt,
      run.finishedAt,
      run.durationMs,
      JSON.stringify(run.summary),
      run.reportUrl,
      run.error,
      run.createdAt
    )
    .run();

  return run;
}

export async function listGovernanceRuns(env: Env, limit = 25, task?: string): Promise<GovernanceRun[]> {
  if (!env.DB) {
    return [];
  }

  const normalizedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  try {
    const statement = task
      ? env.DB.prepare(
          `SELECT * FROM governance_runs
           WHERE task = ?
           ORDER BY started_at DESC
           LIMIT ?`
        ).bind(task, normalizedLimit)
      : env.DB.prepare(
          `SELECT * FROM governance_runs
           ORDER BY started_at DESC
           LIMIT ?`
        ).bind(normalizedLimit);
    const rows = await statement.all<GovernanceRunRow>();
    return (rows.results ?? []).map(rowToGovernanceRun);
  } catch {
    return [];
  }
}

export async function getLatestGovernanceRun(env: Env, task: string): Promise<GovernanceRun | null> {
  if (!env.DB) {
    return null;
  }

  try {
    const row = await env.DB.prepare(
      `SELECT * FROM governance_runs
       WHERE task = ?
       ORDER BY started_at DESC
       LIMIT 1`
    )
      .bind(task)
      .first<GovernanceRunRow>();
    return row ? rowToGovernanceRun(row) : null;
  } catch {
    return null;
  }
}

export async function getLatestGovernanceRunByTask(env: Env, task: string): Promise<GovernanceRun | null> {
  return getLatestGovernanceRun(env, task);
}

export async function getGovernanceSummary(env: Env, now = new Date()): Promise<GovernanceSummary> {
  const runs = await listGovernanceRuns(env, 100);
  const latestByTaskMap = new Map<string, GovernanceRun>();
  const statusCounts: Record<GovernanceRunStatus, number> = {
    success: 0,
    failed: 0,
    running: 0,
    skipped: 0
  };

  for (const run of runs) {
    statusCounts[run.status] += 1;
    if (!latestByTaskMap.has(run.task)) {
      latestByTaskMap.set(run.task, run);
    }
  }

  const latestByTask = Array.from(latestByTaskMap.values()).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const missingTasks = buildMissingTasks(runs, latestByTaskMap, now);

  return {
    generatedAt: now.toISOString(),
    runCount: runs.length,
    latestRun: runs[0] ?? null,
    latestByTask,
    statusCounts,
    failedTasks: latestByTask.filter((run) => run.status === "failed"),
    missingTasks
  };
}

function buildMissingTasks(runs: GovernanceRun[], latestByTaskMap: Map<string, GovernanceRun>, now: Date): MissingGovernanceTask[] {
  const nowMs = now.getTime();
  return scheduledGovernanceDefinitions.flatMap<MissingGovernanceTask>((definition) => {
    const latestRun = latestByTaskMap.get(definition.task) ?? null;
    const latestSuccess = runs
      .filter((run) => run.task === definition.task && run.status === "success")
      .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];

    if (!latestSuccess) {
      return [
        {
          task: definition.task,
          cadence: definition.cadence,
          expectedIntervalHours: definition.expectedIntervalHours,
          missingAfterHours: definition.missingAfterHours,
          latestRun,
          lastSuccessfulRunAt: null,
          hoursSinceLastSuccess: null,
          reason: `No successful ${definition.cadence} run recorded.`
        }
      ];
    }

    const finishedMs = Date.parse(latestSuccess.finishedAt);
    if (!Number.isFinite(finishedMs)) {
      return [];
    }

    const hoursSinceLastSuccess = Math.floor(Math.max(0, nowMs - finishedMs) / (60 * 60 * 1000));
    if (hoursSinceLastSuccess <= definition.missingAfterHours) {
      return [];
    }

    return [
      {
        task: definition.task,
        cadence: definition.cadence,
        expectedIntervalHours: definition.expectedIntervalHours,
        missingAfterHours: definition.missingAfterHours,
        latestRun,
        lastSuccessfulRunAt: latestSuccess.finishedAt,
        hoursSinceLastSuccess,
        reason: `Last successful ${definition.cadence} run is ${hoursSinceLastSuccess}h old.`
      }
    ];
  });
}

export function parseGovernanceRunInput(body: unknown): { ok: true; input: GovernanceRunInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Governance run body must be an object." };
  }

  const value = body as Record<string, unknown>;
  const task = typeof value.task === "string" ? value.task.trim() : "";
  const status = typeof value.status === "string" ? value.status : "";
  const trigger = typeof value.trigger === "string" ? value.trigger : undefined;

  if (!task || task.length > 120 || !/^[a-z0-9:_-]+$/i.test(task)) {
    return { ok: false, message: "task must be a short identifier containing letters, numbers, dash, underscore, or colon." };
  }
  if (!validStatuses.has(status as GovernanceRunStatus)) {
    return { ok: false, message: "status must be one of success, failed, running, or skipped." };
  }
  if (trigger && !validTriggers.has(trigger as GovernanceRunTrigger)) {
    return { ok: false, message: "trigger must be one of github_actions, cron, admin, or manual." };
  }

  return {
    ok: true,
    input: {
      id: typeof value.id === "string" && value.id.trim() ? value.id.trim().slice(0, 160) : undefined,
      task,
      status: status as GovernanceRunStatus,
      trigger: trigger as GovernanceRunTrigger | undefined,
      startedAt: parseIso(value.started_at ?? value.startedAt),
      finishedAt: parseIso(value.finished_at ?? value.finishedAt),
      durationMs: typeof value.duration_ms === "number" ? value.duration_ms : typeof value.durationMs === "number" ? value.durationMs : undefined,
      summary: isPlainObject(value.summary) ? (value.summary as Record<string, unknown>) : {},
      reportUrl: parseHttpUrl(value.report_url ?? value.reportUrl),
      error: typeof value.error === "string" ? value.error.slice(0, 4000) : null
    }
  };
}

function normalizeDuration(value: number | undefined, startedAt: string, finishedAt: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  const start = Date.parse(startedAt);
  const finish = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(finish)) {
    return 0;
  }
  return Math.max(0, finish - start);
}

function parseIso(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().slice(0, 2048) : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
