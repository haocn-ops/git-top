import { normalizeCampaignSource, summarizeAdoptionEvents, type AdoptionEvent } from "./adoption-analytics";

export const adoptionReportWindows = {
  weeklyHours: 24 * 7,
  monthlyHours: 24 * 30
} as const;

export const defaultOperatorCampaignSources = ["production-smoke"] as const;

export interface AdoptionReportOptions {
  limit: number;
  output: string | null;
  excludedCampaignSources: string[];
}

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
    }
  };
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
