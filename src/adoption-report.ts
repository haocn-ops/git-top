import { normalizeCampaignSource, summarizeAdoptionEvents, type AdoptionEvent } from "./adoption-analytics";

export const adoptionReportWindows = {
  weeklyHours: 24 * 7,
  monthlyHours: 24 * 30
} as const;

export const defaultOperatorCampaignSources = ["production-smoke"] as const;

export interface AdoptionReportOptions {
  limit: number;
  output: string | null;
  summaryOutput: string | null;
  failOnTruncated: boolean;
  excludedCampaignSources: string[];
}

export const adoptionLearningTargets = {
  successfulInitializations30d: 100,
  successfulFirstValueCalls30d: 50,
  successfulWorkflows7d: 25,
  toolSuccessRate7d: 0.98,
  agentCallAttributionRate7d: 0.8
} as const;

interface AdoptionReportInput {
  weeklyEvents: readonly AdoptionEvent[];
  monthlyEvents: readonly AdoptionEvent[];
  limit: number;
  excludedCampaignSources?: readonly string[];
  generatedAt?: string;
}

export function parseAdoptionReportOptions(args: readonly string[]): AdoptionReportOptions {
  const options: AdoptionReportOptions = {
    limit: 10_000,
    output: null,
    summaryOutput: null,
    failOnTruncated: false,
    excludedCampaignSources: [...defaultOperatorCampaignSources]
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--limit") {
      options.limit = boundedInteger(args[++index], "limit", 1, 10_000);
      continue;
    }
    if (argument === "--output") {
      options.output = args[++index] ?? null;
      if (!options.output || options.output.startsWith("-")) {
        throw new Error("--output requires a file path.");
      }
      continue;
    }
    if (argument === "--summary-output") {
      options.summaryOutput = requiredPath(args[++index], "summary-output");
      continue;
    }
    if (argument === "--fail-on-truncated") {
      options.failOnTruncated = true;
      continue;
    }
    if (argument === "--exclude-source") {
      const value = args[++index];
      if (!value) {
        throw new Error("--exclude-source requires a comma-separated campaign source list.");
      }
      options.excludedCampaignSources = normalizedSources(value.split(","));
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

export function buildAdoptionOperationsReport({
  weeklyEvents,
  monthlyEvents,
  limit,
  excludedCampaignSources = defaultOperatorCampaignSources,
  generatedAt = new Date().toISOString()
}: AdoptionReportInput) {
  const excludedSources = normalizedSources(excludedCampaignSources);
  const weekly = summarizeWindow(weeklyEvents, adoptionReportWindows.weeklyHours, limit, excludedSources);
  const monthly = summarizeWindow(monthlyEvents, adoptionReportWindows.monthlyHours, limit, excludedSources);
  const weeklyFirstValueCalls = weekly.metrics.funnel.successfulFirstValueCalls;
  const operationalReview = buildOperationalReview(weekly, monthly);

  return {
    generated_at: generatedAt,
    measurement: {
      unit: "bounded_events_and_calls",
      identity_free: true,
      note: "Counts are calls, not unique users, sessions, installs, or retention. Only explicitly tagged campaign sources can be excluded as operator traffic."
    },
    exclusions: {
      campaign_sources: excludedSources,
      note: "Keep production validation traffic tagged with source=production-smoke so it stays outside adoption KPIs."
    },
    windows: {
      last_7_days: weekly,
      last_30_days: monthly
    },
    trend: {
      first_value_calls_daily_rate_ratio: dailyRateRatio(
        weekly.metrics.funnel.successfulFirstValueCalls,
        7,
        monthly.metrics.funnel.successfulFirstValueCalls,
        30
      ),
      workflow_completions_daily_rate_ratio: dailyRateRatio(
        weekly.metrics.funnel.successfulWorkflows,
        7,
        monthly.metrics.funnel.successfulWorkflows,
        30
      ),
      interpretation: "A ratio above 1 means the recent 7-day daily rate is above the overlapping 30-day daily rate; it is directional, not a retention or cohort metric."
    },
    adoption_signal: {
      status: weeklyFirstValueCalls === 0 ? "no_first_value_signal" : weeklyFirstValueCalls < 5 ? "early_signal" : "measurable_signal",
      successful_first_value_calls_7d: weeklyFirstValueCalls,
      successful_workflows_7d: weekly.metrics.funnel.successfulWorkflows
    },
    operational_review: operationalReview
  };
}

export function renderAdoptionOperationsMarkdown(report: ReturnType<typeof buildAdoptionOperationsReport>): string {
  const weekly = report.windows.last_7_days;
  const monthly = report.windows.last_30_days;
  const weeklyMetrics = weekly.metrics;
  const monthlyMetrics = monthly.metrics;
  const campaignRows = Object.entries(weeklyMetrics.byCampaignSource)
    .filter(([source]) => source !== "unknown")
    .sort(([sourceA, valueA], [sourceB, valueB]) =>
      valueB.workflowCompletions - valueA.workflowCompletions ||
      valueB.firstValueCalls - valueA.firstValueCalls ||
      sourceA.localeCompare(sourceB)
    );
  const lines = [
    "# Git.Top Adoption Operations Report",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `Operational status: **${report.operational_review.status}**`,
    "",
    "| KPI | 7 days | 30 days |",
    "| --- | ---: | ---: |",
    `| Included bounded events | ${weekly.included_event_count} | ${monthly.included_event_count} |`,
    `| Excluded operator events | ${weekly.excluded_event_count} | ${monthly.excluded_event_count} |`,
    `| Connect page views | ${weeklyMetrics.funnel.connectPageViews} | ${monthlyMetrics.funnel.connectPageViews} |`,
    `| Config copies | ${weeklyMetrics.funnel.connectConfigCopies} | ${monthlyMetrics.funnel.connectConfigCopies} |`,
    `| Successful MCP initializations | ${weeklyMetrics.funnel.successfulInitializations} | ${monthlyMetrics.funnel.successfulInitializations} |`,
    `| Successful first-value calls | ${weeklyMetrics.funnel.successfulFirstValueCalls} | ${monthlyMetrics.funnel.successfulFirstValueCalls} |`,
    `| Successful workflows | ${weeklyMetrics.funnel.successfulWorkflows} | ${monthlyMetrics.funnel.successfulWorkflows} |`,
    `| MCP tool success rate | ${formatRate(weeklyMetrics.toolSuccessRate)} | ${formatRate(monthlyMetrics.toolSuccessRate)} |`,
    `| Agent-call attribution rate | ${formatRate(weeklyMetrics.attribution.agentCallAttributionRate)} | ${formatRate(monthlyMetrics.attribution.agentCallAttributionRate)} |`,
    `| D1 fallback rate | ${formatRate(weeklyMetrics.fallbackRate)} | ${formatRate(monthlyMetrics.fallbackRate)} |`,
    `| Agent-call p95 latency | ${formatDuration(weeklyMetrics.latencyMs.p95)} | ${formatDuration(monthlyMetrics.latencyMs.p95)} |`,
    "",
    "## Learning Targets",
    "",
    "| Target | Actual | Goal | Progress |",
    "| --- | ---: | ---: | ---: |",
    ...report.operational_review.targets.map((target) => `| ${target.label} | ${target.actual_display} | ${target.target_display} | ${target.progress_percent}% |`),
    "",
    "## Campaign Activity",
    ""
  ];
  if (campaignRows.length === 0) {
    lines.push("No attributed campaign activity was observed in the last 7 days.");
  } else {
    lines.push("| Source | Views | Copies | Initializations | First value | Workflows | Agent calls |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const [source, metrics] of campaignRows) {
      lines.push(`| ${source} | ${metrics.connectPageViews} | ${metrics.configCopies} | ${metrics.initializeSuccesses} | ${metrics.firstValueCalls} | ${metrics.workflowCompletions} | ${metrics.agentCalls} |`);
    }
  }
  lines.push("", "## Review Items", "");
  if (report.operational_review.items.length === 0) {
    lines.push("No operational review items.");
  } else {
    for (const item of report.operational_review.items) {
      lines.push(`- **${item.code}**: ${item.message} Action: ${item.action}`);
    }
  }
  lines.push(
    "",
    "> Counts are bounded events and calls, not unique users, installs, sessions, retention, or conversion. Operator traffic is excluded only when it carries an explicit campaign source.",
    ""
  );
  return lines.join("\n");
}

function summarizeWindow(events: readonly AdoptionEvent[], hours: number, limit: number, excludedSources: readonly string[]) {
  const excluded = new Set(excludedSources);
  const includedEvents = events.filter((event) => !event.campaignSource || !excluded.has(event.campaignSource));
  return {
    hours,
    exported_event_count: events.length,
    excluded_event_count: events.length - includedEvents.length,
    included_event_count: includedEvents.length,
    possibly_truncated: events.length >= limit,
    metrics: summarizeAdoptionEvents(includedEvents)
  };
}

function buildOperationalReview(
  weekly: ReturnType<typeof summarizeWindow>,
  monthly: ReturnType<typeof summarizeWindow>
) {
  const items: Array<{ code: string; severity: "info" | "warning" | "critical"; message: string; action: string }> = [];
  if (weekly.possibly_truncated || monthly.possibly_truncated) {
    items.push({
      code: "analytics_export_truncated",
      severity: "critical",
      message: "At least one analytics window reached the bounded export limit, so rates may be incomplete.",
      action: "Shorten the window or add an access-controlled aggregate pipeline before using the report for decisions."
    });
  }
  if (weekly.metrics.funnel.successfulFirstValueCalls === 0) {
    items.push({
      code: "no_first_value_signal",
      severity: "info",
      message: "No non-operator successful first-value calls were observed in the last 7 days.",
      action: "Run one attributed distribution experiment and verify the campaign reaches an MCP tool call."
    });
  }
  if (weekly.metrics.toolSuccessRate !== null && weekly.metrics.toolSuccessRate < adoptionLearningTargets.toolSuccessRate7d) {
    items.push({
      code: "tool_success_below_learning_target",
      severity: "warning",
      message: `MCP tool success is ${formatRate(weekly.metrics.toolSuccessRate)}, below the ${formatRate(adoptionLearningTargets.toolSuccessRate7d)} learning target.`,
      action: "Review the primary failure mode and affected operation before expanding distribution."
    });
  }
  if (weekly.metrics.fallbackRate !== null && weekly.metrics.fallbackRate > 0) {
    items.push({
      code: "d1_fallback_detected",
      severity: "warning",
      message: `Successful seed-backed agent calls produced a ${formatRate(weekly.metrics.fallbackRate)} fallback rate.`,
      action: "Review /api/trust and sync freshness, then require D1 for high-confidence workflows."
    });
  }
  const attributionRate = weekly.metrics.attribution.agentCallAttributionRate;
  if (attributionRate !== null && attributionRate < adoptionLearningTargets.agentCallAttributionRate7d) {
    items.push({
      code: "campaign_attribution_below_target",
      severity: "warning",
      message: `Only ${formatRate(attributionRate)} of agent calls carry a campaign source.`,
      action: "Use attributed /connect links and preserve the generated source query on the MCP endpoint."
    });
  }

  const hasCritical = items.some((item) => item.severity === "critical");
  const hasWarning = items.some((item) => item.severity === "warning");
  const status = hasCritical
    ? "unreliable"
    : weekly.metrics.funnel.successfulFirstValueCalls === 0
      ? "no_signal"
      : hasWarning
        ? "attention"
        : "healthy";
  return {
    status,
    items,
    targets: [
      targetProgress("Successful MCP initializations (30d)", monthly.metrics.funnel.successfulInitializations, adoptionLearningTargets.successfulInitializations30d),
      targetProgress("Successful first-value calls (30d)", monthly.metrics.funnel.successfulFirstValueCalls, adoptionLearningTargets.successfulFirstValueCalls30d),
      targetProgress("Successful workflows (7d)", weekly.metrics.funnel.successfulWorkflows, adoptionLearningTargets.successfulWorkflows7d),
      rateTargetProgress("MCP tool success rate (7d)", weekly.metrics.toolSuccessRate, adoptionLearningTargets.toolSuccessRate7d),
      rateTargetProgress("Agent-call attribution rate (7d)", attributionRate, adoptionLearningTargets.agentCallAttributionRate7d)
    ]
  };
}

function targetProgress(label: string, actual: number, target: number) {
  return {
    label,
    actual,
    target,
    actual_display: String(actual),
    target_display: String(target),
    progress_percent: Math.min(100, Math.round((actual / target) * 100))
  };
}

function rateTargetProgress(label: string, actual: number | null, target: number) {
  return {
    label,
    actual,
    target,
    actual_display: formatRate(actual),
    target_display: formatRate(target),
    progress_percent: actual === null ? 0 : Math.min(100, Math.round((actual / target) * 100))
  };
}

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function formatDuration(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value)} ms`;
}

function dailyRateRatio(recentCount: number, recentDays: number, baselineCount: number, baselineDays: number): number | null {
  const baselineRate = baselineCount / baselineDays;
  if (baselineRate === 0) {
    return null;
  }
  return Number(((recentCount / recentDays) / baselineRate).toFixed(3));
}

function normalizedSources(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => normalizeCampaignSource(value)).filter((value): value is string => Boolean(value)))];
}

function boundedInteger(value: string | undefined, name: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function requiredPath(value: string | undefined, name: string): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`--${name} requires a file path.`);
  }
  return value;
}
