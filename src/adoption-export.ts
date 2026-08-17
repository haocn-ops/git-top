export const adoptionAnalyticsDataset = "git_top_adoption";
export const adoptionExportDefaults = {
  hours: 24,
  limit: 10_000
} as const;

export interface AdoptionExportOptions {
  hours: number;
  limit: number;
  output: string | null;
}

interface AdoptionExportQueryOptions extends Pick<AdoptionExportOptions, "hours" | "limit"> {
  excludedCampaignSources?: readonly string[];
}

const adoptionGroupColumns = ["blob1", "blob2", "blob3", "blob4", "blob5", "blob6", "blob7", "blob8", "blob9", "double1"] as const;
const historicalVerificationProbeLikePattern = "'\\\\_\\\\_verifymcp\\\\_auth\\\\_probe\\\\_%\\\\_\\\\_'";

export function parseAdoptionExportOptions(args: readonly string[]): AdoptionExportOptions {
  const options: AdoptionExportOptions = { ...adoptionExportDefaults, output: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--hours") {
      options.hours = parseBoundedInteger(args[++index], "hours", 1, 720);
    } else if (argument === "--limit") {
      options.limit = parseBoundedInteger(args[++index], "limit", 1, 10_000);
    } else if (argument === "--output") {
      options.output = args[++index] ?? null;
      if (!options.output || options.output.startsWith("-")) {
        throw new Error("--output requires a file path.");
      }
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

export function buildAdoptionExportQuery(options: AdoptionExportQueryOptions): string {
  const excludedSources = options.excludedCampaignSources ?? [];
  return [
    "SELECT blob1, blob2, blob3, blob4, blob5, blob6, blob7, blob8, blob9, double1, double2, timestamp",
    `FROM ${adoptionAnalyticsDataset}`,
    ...adoptionWhere(options.hours, excludedSources),
    "ORDER BY timestamp DESC",
    `LIMIT ${options.limit}`
  ].filter(Boolean).join(" ");
}

export function buildAdoptionExcludedCountQuery(hours: number, excludedCampaignSources: readonly string[]): string | null {
  if (excludedCampaignSources.length === 0) {
    return null;
  }
  const excludedPredicates = [`blob8 IN (${sqlStringList(excludedCampaignSources)})`];
  if (excludedCampaignSources.includes("operator-check")) {
    excludedPredicates.push(`blob5 LIKE ${historicalVerificationProbeLikePattern}`);
  }
  return [
    "SELECT COUNT() AS event_count",
    `FROM ${adoptionAnalyticsDataset}`,
    `WHERE timestamp >= NOW() - INTERVAL '${hours}' HOUR`,
    `AND (${excludedPredicates.join(" OR ")})`
  ].join(" ");
}

export function buildAdoptionAggregateQuery(options: AdoptionExportQueryOptions): string {
  return [
    `SELECT ${adoptionGroupColumns.join(", ")}, COUNT() AS event_count`,
    `FROM ${adoptionAnalyticsDataset}`,
    ...adoptionWhere(options.hours, options.excludedCampaignSources ?? []),
    `GROUP BY ${adoptionGroupColumns.join(", ")}`,
    "ORDER BY event_count DESC",
    `LIMIT ${options.limit}`
  ].join(" ");
}

export function buildAdoptionLatencyQuery(hours: number, excludedCampaignSources: readonly string[], limit = 10_000): string {
  return [
    "SELECT double2, COUNT() AS sample_count",
    `FROM ${adoptionAnalyticsDataset}`,
    ...adoptionWhere(hours, excludedCampaignSources),
    "AND blob1 IN ('mcp_tool_call_completed', 'rest_agent_call_completed')",
    "GROUP BY double2",
    "ORDER BY double2 ASC",
    `LIMIT ${limit}`
  ].join(" ");
}

function sqlStringList(values: readonly string[]): string {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

function adoptionWhere(hours: number, excludedCampaignSources: readonly string[]): string[] {
  return [
    `WHERE timestamp >= NOW() - INTERVAL '${hours}' HOUR`,
    ...(excludedCampaignSources.length > 0 ? [`AND blob8 NOT IN (${sqlStringList(excludedCampaignSources)})`] : []),
    ...(excludedCampaignSources.includes("operator-check") ? [`AND blob5 NOT LIKE ${historicalVerificationProbeLikePattern}`] : [])
  ];
}

function parseBoundedInteger(value: string | undefined, name: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}
