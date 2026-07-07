export type GovernanceCadence = "daily" | "weekly" | "biweekly" | "monthly";

export interface ScheduledGovernanceDefinition {
  task: string;
  cadence: GovernanceCadence;
  expectedIntervalHours: number;
  missingAfterHours: number;
}

export const scheduledGovernanceDefinitions: ScheduledGovernanceDefinition[] = [
  {
    task: "daily-production-health",
    cadence: "daily",
    expectedIntervalHours: 24,
    missingAfterHours: 30
  },
  {
    task: "weekly-data-governance",
    cadence: "weekly",
    expectedIntervalHours: 24 * 7,
    missingAfterHours: 24 * 8
  },
  {
    task: "derived:alternatives",
    cadence: "weekly",
    expectedIntervalHours: 24 * 7,
    missingAfterHours: 24 * 8
  },
  {
    task: "biweekly-live-check",
    cadence: "biweekly",
    expectedIntervalHours: 24 * 14,
    missingAfterHours: 24 * 16
  },
  {
    task: "monthly-corpus-review",
    cadence: "monthly",
    expectedIntervalHours: 24 * 31,
    missingAfterHours: 24 * 35
  }
];

export function scheduledGovernanceDefinition(task: string): ScheduledGovernanceDefinition {
  const definition = scheduledGovernanceDefinitions.find((item) => item.task === task);
  if (!definition) {
    throw new Error(`Unknown scheduled governance task: ${task}`);
  }
  return definition;
}
