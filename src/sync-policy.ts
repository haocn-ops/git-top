export const scheduledSyncLimit = 8;
export const scheduledCandidateLimit = 1;
export const scheduledCandidateRunsPerDay = 1;
export const scheduledRefreshLimit = scheduledSyncLimit;
export const scheduledRefreshLimitWithDiscovery = scheduledSyncLimit - scheduledCandidateLimit;
export const scheduledRunsPerDay = 24;
export const scheduledDailyRefreshCapacity = scheduledRunsPerDay * scheduledSyncLimit - scheduledCandidateRunsPerDay * scheduledCandidateLimit;
export const syncRefreshLeadHours = 6;
export const qualityFreshnessDays = 7;

export const syncTargetDays = {
  hot: 2,
  warm: qualityFreshnessDays,
  cold: qualityFreshnessDays
} as const;

export interface CandidateDiscoveryDecisionInput {
  hourUtc: number;
  overdueCount: number;
  refreshDueCount: number;
  capacityHeadroom: number;
}

export function shouldRunScheduledCandidateDiscovery(input: CandidateDiscoveryDecisionInput): boolean {
  return (
    input.hourUtc === 0 &&
    input.overdueCount === 0 &&
    input.refreshDueCount < scheduledRefreshLimitWithDiscovery &&
    input.capacityHeadroom >= scheduledRunsPerDay
  );
}
