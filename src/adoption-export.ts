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

export function buildAdoptionExportQuery(options: Pick<AdoptionExportOptions, "hours" | "limit">): string {
  return [
    "SELECT blob1, blob2, blob3, blob4, blob5, blob6, blob7, blob8, blob9, double1, double2",
    `FROM ${adoptionAnalyticsDataset}`,
    `WHERE timestamp >= NOW() - INTERVAL '${options.hours}' HOUR`,
    "ORDER BY timestamp DESC",
    `LIMIT ${options.limit}`
  ].join(" ");
}

function parseBoundedInteger(value: string | undefined, name: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}
