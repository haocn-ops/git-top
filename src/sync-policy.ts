export const scheduledSyncLimit = 8;
export const scheduledCandidateLimit = 1;
export const scheduledCandidateRunsPerDay = 24;
export const scheduledRefreshLimit = scheduledSyncLimit;
export const scheduledRunsPerDay = 48;
export const scheduledDailyRefreshCapacity = scheduledRunsPerDay * scheduledSyncLimit - scheduledCandidateRunsPerDay * scheduledCandidateLimit;
export const syncRefreshLeadHours = 6;
export const qualityFreshnessDays = 7;

export const syncTargetDays = {
  hot: 2,
  warm: qualityFreshnessDays,
  cold: qualityFreshnessDays
} as const;

export interface CandidateDiscoveryDecisionInput {
  minuteUtc: number;
  capacityHeadroom: number;
}

export function shouldRunScheduledCandidateDiscovery(input: CandidateDiscoveryDecisionInput): boolean {
  return input.minuteUtc === 0 && input.capacityHeadroom >= 0;
}
