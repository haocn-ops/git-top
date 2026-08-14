import type { Env } from "./types";

export type AdoptionEventName =
  | "connect_page_view"
  | "connect_config_copy"
  | "mcp_initialize"
  | "mcp_tools_list"
  | "mcp_tool_call_completed"
  | "rest_agent_call_completed"
  | "workflow_completed";

export type AdoptionResultClass =
  | "success"
  | "client_error"
  | "strict_source_rejection"
  | "not_found"
  | "stale_cursor"
  | "server_error";

export interface AdoptionEvent {
  name: AdoptionEventName;
  profile?: "core" | "full";
  clientName?: string;
  clientVersion?: string;
  operation?: string;
  resultClass?: AdoptionResultClass;
  source?: "d1" | "seed" | "unknown";
  status?: number;
  durationMs?: number;
  campaignSource?: string;
  responseSizeBucket?: "empty" | "small" | "medium" | "large" | "very_large" | "unknown";
}

export interface AnalyticsEnginePoint {
  blob1?: unknown;
  blob2?: unknown;
  blob3?: unknown;
  blob4?: unknown;
  blob5?: unknown;
  blob6?: unknown;
  blob7?: unknown;
  blob8?: unknown;
  blob9?: unknown;
  double1?: unknown;
  double2?: unknown;
}

export interface AdoptionMetricsSummary {
  eventCount: number;
  funnel: {
    connectPageViews: number;
    connectConfigCopies: number;
    successfulInitializations: number;
    successfulToolDiscovery: number;
    successfulFirstValueCalls: number;
    successfulWorkflows: number;
    firstValueCallsPerInitialization: number | null;
  };
  outcomes: Record<AdoptionResultClass | "unknown", number>;
  toolSuccessRate: number | null;
  strictSourceRejectionRate: number | null;
  fallbackRate: number | null;
  latencyMs: {
    sampleCount: number;
    p50: number | null;
    p95: number | null;
  };
  attribution: {
    campaignTaggedEvents: number;
    agentCallsWithCampaign: number;
    agentCallsWithoutCampaign: number;
    agentCallAttributionRate: number | null;
  };
  byClient: Record<string, AdoptionDimensionSummary>;
  byCampaignSource: Record<string, AdoptionDimensionSummary>;
  byOperation: Record<string, AdoptionDimensionSummary>;
  insights: {
    strongestClient: string | null;
    strongestCampaignSource: string | null;
    strongestOperation: string | null;
    primaryFailureMode: AdoptionResultClass | null;
  };
}

export interface AdoptionDimensionSummary {
  connectPageViews: number;
  configCopies: number;
  initializeSuccesses: number;
  toolDiscoverySuccesses: number;
  firstValueCalls: number;
  workflowCompletions: number;
  agentCalls: number;
  agentCallSuccesses: number;
  errors: number;
}

const knownClients = ["codex", "claude", "cursor", "vscode", "windsurf", "chatgpt", "cline", "continue"] as const;

/**
 * Analytics Engine is optional so local development and deployments without the
 * binding keep working. The event payload is deliberately limited to bounded
 * dimensions and never includes prompts, arguments, results, repositories, or IPs.
 */
export function recordAdoptionEvent(env: Env, event: AdoptionEvent): void {
  if (!env.ADOPTION_ANALYTICS) {
    return;
  }

  try {
    env.ADOPTION_ANALYTICS.writeDataPoint({
      blobs: [
        event.name,
        dimension(event.profile, "unknown"),
        dimension(event.clientName, "unknown"),
        dimension(event.clientVersion, "unknown"),
        dimension(event.operation, "unknown"),
        dimension(event.resultClass, "unknown"),
        dimension(event.source, "unknown"),
        dimension(event.campaignSource, "unknown"),
        dimension(event.responseSizeBucket, "unknown")
      ],
      doubles: [
        boundedNumber(event.status, 0, 599),
        boundedNumber(event.durationMs, 0, 600_000)
      ]
    });
  } catch {
    // Analytics must never change the API, MCP, or page response path.
  }
}

export function normalizeClientName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return knownClients.includes(normalized as (typeof knownClients)[number]) ? normalized : "other";
}

export function normalizeClientVersion(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/[^a-z0-9._-]/gi, "").slice(0, 32);
  return normalized || undefined;
}

export function normalizeCampaignSource(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 48);
  return normalized || undefined;
}

export function campaignSourceFromRequest(request: Request): string | undefined {
  const url = new URL(request.url);
  return normalizeCampaignSource(url.searchParams.get("source") ?? request.headers.get("x-git-top-source"));
}

export function responseSizeBucket(bytes: number | undefined): AdoptionEvent["responseSizeBucket"] {
  if (!Number.isFinite(bytes)) {
    return "unknown";
  }
  if (Number(bytes) === 0) {
    return "empty";
  }
  if (Number(bytes) <= 16_384) {
    return "small";
  }
  if (Number(bytes) <= 65_536) {
    return "medium";
  }
  if (Number(bytes) <= 262_144) {
    return "large";
  }
  return "very_large";
}

export function normalizeAnalyticsPoint(point: AnalyticsEnginePoint): AdoptionEvent {
  const name = point.blob1;
  if (!isAdoptionEventName(name)) {
    throw new Error(`Unknown adoption event name: ${String(name ?? "missing")}`);
  }
  const profile = asEnum(point.blob2, ["core", "full"]);
  const clientName = analyticsDimension(point.blob3);
  const clientVersion = analyticsDimension(point.blob4, 32);
  const operation = analyticsDimension(point.blob5);
  const source = asEnum(point.blob7, ["d1", "seed", "unknown"]);
  const campaignSource = analyticsDimension(point.blob8, 48);
  const responseBucket = asEnum(point.blob9, ["empty", "small", "medium", "large", "very_large", "unknown"]);
  const status = finiteNumber(point.double1);
  const durationMs = finiteNumber(point.double2);
  return {
    name,
    ...(profile ? { profile } : {}),
    ...(clientName ? { clientName } : {}),
    ...(clientVersion ? { clientVersion } : {}),
    ...(operation ? { operation } : {}),
    ...(isAdoptionResultClass(point.blob6) ? { resultClass: point.blob6 } : {}),
    ...(source ? { source } : {}),
    ...(campaignSource ? { campaignSource } : {}),
    ...(responseBucket ? { responseSizeBucket: responseBucket } : {}),
    ...(status !== undefined ? { status: boundedNumber(status, 0, 599) } : {}),
    ...(durationMs !== undefined ? { durationMs: boundedNumber(durationMs, 0, 600_000) } : {})
  };
}

/**
 * Reduce exported Analytics Engine dimensions to an adoption review snapshot.
 * This intentionally counts calls, not users or sessions: the event contract
 * has no identity mechanism and must not imply unique-user measurement.
 */
export function summarizeAdoptionEvents(events: readonly AdoptionEvent[]): AdoptionMetricsSummary {
  const outcomes = emptyOutcomes();
  const byClient: Record<string, AdoptionDimensionSummary> = {};
  const byCampaignSource: Record<string, AdoptionDimensionSummary> = {};
  const byOperation: Record<string, AdoptionDimensionSummary> = {};
  const latencySamples: number[] = [];
  let successfulInitializations = 0;
  let successfulToolDiscovery = 0;
  let successfulFirstValueCalls = 0;
  let successfulWorkflows = 0;
  let connectPageViews = 0;
  let connectConfigCopies = 0;
  let toolCalls = 0;
  let successfulToolCalls = 0;
  let strictSourceRejections = 0;
  let agentCalls = 0;
  let successfulAgentCalls = 0;
  let seedBackedAgentCalls = 0;
  let campaignTaggedEvents = 0;
  let agentCallsWithCampaign = 0;

  for (const event of events) {
    const resultClass = event.resultClass ?? "unknown";
    outcomes[resultClass] = (outcomes[resultClass] ?? 0) + 1;
    const successful = resultClass === "success";
    if (event.campaignSource) {
      campaignTaggedEvents += 1;
    }
    if (event.name === "connect_page_view") {
      connectPageViews += 1;
    }
    if (event.name === "connect_config_copy") {
      connectConfigCopies += 1;
    }
    if (event.name === "mcp_initialize" && successful) {
      successfulInitializations += 1;
    }
    if (event.name === "mcp_tools_list" && successful) {
      successfulToolDiscovery += 1;
    }
    if (event.name === "workflow_completed" && successful) {
      successfulWorkflows += 1;
    }
    if (event.name === "mcp_tool_call_completed" || event.name === "rest_agent_call_completed") {
      agentCalls += 1;
      agentCallsWithCampaign += event.campaignSource ? 1 : 0;
      if (Number.isFinite(event.durationMs)) {
        latencySamples.push(Math.min(600_000, Math.max(0, Number(event.durationMs))));
      }
      if (successful) {
        successfulAgentCalls += 1;
        successfulFirstValueCalls += 1;
        if (event.source === "seed") {
          seedBackedAgentCalls += 1;
        }
      }
    }
    if (event.name === "mcp_tool_call_completed") {
      toolCalls += 1;
      if (successful) {
        successfulToolCalls += 1;
      }
    }
    if (resultClass === "strict_source_rejection") {
      strictSourceRejections += 1;
    }

    const dimensions = [
      [byClient, event.clientName],
      [byCampaignSource, event.campaignSource],
      [byOperation, event.operation]
    ] as const;
    for (const [target, key] of dimensions) {
      if (!key) {
        continue;
      }
      const summary = target[key] ?? emptyDimensionSummary();
      updateDimensionSummary(summary, event, successful);
      target[key] = summary;
    }
  }

  return {
    eventCount: events.length,
    funnel: {
      connectPageViews,
      connectConfigCopies,
      successfulInitializations,
      successfulToolDiscovery,
      successfulFirstValueCalls,
      successfulWorkflows,
      firstValueCallsPerInitialization: ratio(successfulFirstValueCalls, successfulInitializations)
    },
    outcomes,
    toolSuccessRate: ratio(successfulToolCalls, toolCalls),
    strictSourceRejectionRate: ratio(strictSourceRejections, agentCalls),
    fallbackRate: ratio(seedBackedAgentCalls, successfulAgentCalls),
    latencyMs: {
      sampleCount: latencySamples.length,
      p50: percentile(latencySamples, 0.5),
      p95: percentile(latencySamples, 0.95)
    },
    attribution: {
      campaignTaggedEvents,
      agentCallsWithCampaign,
      agentCallsWithoutCampaign: agentCalls - agentCallsWithCampaign,
      agentCallAttributionRate: ratio(agentCallsWithCampaign, agentCalls)
    },
    byClient,
    byCampaignSource,
    byOperation,
    insights: {
      strongestClient: strongestDimension(byClient),
      strongestCampaignSource: strongestDimension(byCampaignSource),
      strongestOperation: strongestDimension(byOperation),
      primaryFailureMode: primaryFailureMode(outcomes)
    }
  };
}

export function clientFromRequest(request: Request): string | undefined {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  const explicitClient = request.headers.get("x-git-top-client");
  if (explicitClient) {
    return normalizeClientName(explicitClient);
  }
  for (const client of knownClients) {
    if (userAgent.includes(client)) {
      return client;
    }
  }
  return undefined;
}

function dimension(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().replace(/[^a-z0-9._:-]/gi, "").slice(0, 64);
  return normalized || fallback;
}

function boundedNumber(value: number | undefined, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function isAdoptionEventName(value: unknown): value is AdoptionEventName {
  return [
    "connect_page_view",
    "connect_config_copy",
    "mcp_initialize",
    "mcp_tools_list",
    "mcp_tool_call_completed",
    "rest_agent_call_completed",
    "workflow_completed"
  ].includes(value as AdoptionEventName);
}

function isAdoptionResultClass(value: unknown): value is AdoptionResultClass {
  return ["success", "client_error", "strict_source_rejection", "not_found", "stale_cursor", "server_error"].includes(value as AdoptionResultClass);
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function analyticsDimension(value: unknown, maximumLength = 64): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().replace(/[^a-z0-9._:-]/gi, "").slice(0, maximumLength);
  return normalized || undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function emptyOutcomes(): Record<AdoptionResultClass | "unknown", number> {
  return {
    success: 0,
    client_error: 0,
    strict_source_rejection: 0,
    not_found: 0,
    stale_cursor: 0,
    server_error: 0,
    unknown: 0
  };
}

function emptyDimensionSummary(): AdoptionDimensionSummary {
  return {
    connectPageViews: 0,
    configCopies: 0,
    initializeSuccesses: 0,
    toolDiscoverySuccesses: 0,
    firstValueCalls: 0,
    workflowCompletions: 0,
    agentCalls: 0,
    agentCallSuccesses: 0,
    errors: 0
  };
}

function updateDimensionSummary(summary: AdoptionDimensionSummary, event: AdoptionEvent, successful: boolean): void {
  if (event.name === "connect_page_view") {
    summary.connectPageViews += 1;
  }
  if (event.name === "connect_config_copy") {
    summary.configCopies += 1;
  }
  if (event.name === "mcp_initialize" && successful) {
    summary.initializeSuccesses += 1;
  }
  if (event.name === "workflow_completed" && successful) {
    summary.workflowCompletions += 1;
  }
  if (event.name === "mcp_tools_list" && successful) {
    summary.toolDiscoverySuccesses += 1;
  }
  if (event.name === "mcp_tool_call_completed" || event.name === "rest_agent_call_completed") {
    summary.agentCalls += 1;
    summary.firstValueCalls += successful ? 1 : 0;
    summary.agentCallSuccesses += successful ? 1 : 0;
  }
  if (!successful && event.name !== "connect_page_view") {
    summary.errors += 1;
  }
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Number((numerator / denominator).toFixed(3)) : null;
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function strongestDimension(values: Record<string, AdoptionDimensionSummary>): string | null {
  const ranked = Object.entries(values)
    .filter(([key, summary]) => key !== "unknown" && dimensionValue(summary) > 0)
    .sort(([keyA, valueA], [keyB, valueB]) =>
      dimensionValue(valueB) - dimensionValue(valueA) ||
      valueB.workflowCompletions - valueA.workflowCompletions ||
      valueB.firstValueCalls - valueA.firstValueCalls ||
      keyA.localeCompare(keyB)
    );
  return ranked[0]?.[0] ?? null;
}

function dimensionValue(summary: AdoptionDimensionSummary): number {
  return summary.workflowCompletions * 3 + summary.firstValueCalls * 2 + summary.toolDiscoverySuccesses + summary.initializeSuccesses;
}

function primaryFailureMode(outcomes: AdoptionMetricsSummary["outcomes"]): AdoptionResultClass | null {
  const failures: AdoptionResultClass[] = ["client_error", "strict_source_rejection", "not_found", "stale_cursor", "server_error"];
  const ranked = failures.sort((a, b) => outcomes[b] - outcomes[a] || a.localeCompare(b));
  return outcomes[ranked[0]] > 0 ? ranked[0] : null;
}
