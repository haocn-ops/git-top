import type { Env } from "./types";

export interface OperationsAlert {
  task: string;
  status: "failed" | "warning" | "recovered";
  error?: string | null;
  summary?: Record<string, unknown>;
  occurredAt?: string;
}

export interface OperationsDigest {
  summary: Record<string, unknown>;
  occurredAt?: string;
}

export async function sendOperationsAlert(env: Env, alert: OperationsAlert): Promise<boolean> {
  return sendOperationsWebhook(env.OPERATIONS_ALERT_WEBHOOK, {
    task: alert.task,
    status: alert.status,
    error: alert.error ?? null,
    summary: alert.summary ?? {},
    occurredAt: alert.occurredAt
  });
}

export async function sendOperationsDigest(env: Env, digest: OperationsDigest): Promise<boolean> {
  return sendOperationsWebhook(env.OPERATIONS_DIGEST_WEBHOOK, {
    task: "daily-operations-digest",
    status: "digest",
    error: null,
    summary: digest.summary,
    occurredAt: digest.occurredAt
  });
}

async function sendOperationsWebhook(
  webhook: string | undefined,
  event: { task: string; status: OperationsAlert["status"] | "digest"; error: string | null; summary: Record<string, unknown>; occurredAt?: string }
): Promise<boolean> {
  const target = validWebhook(webhook);
  if (!target) {
    return false;
  }

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        service: "git.top",
        environment: "production",
        task: event.task,
        status: event.status,
        error: event.error,
        summary: event.summary,
        occurred_at: event.occurredAt ?? new Date().toISOString(),
        operations_url: "https://git.top/operations",
        trust_url: "https://git.top/api/trust"
      }),
      signal: AbortSignal.timeout(5_000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

function validWebhook(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
