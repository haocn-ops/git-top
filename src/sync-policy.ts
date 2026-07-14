export const scheduledSyncLimit = 8;
export const scheduledCandidateLimit = 1;
export const scheduledRefreshLimit = scheduledSyncLimit - scheduledCandidateLimit;
export const scheduledRunsPerDay = 24;

export const syncTargetDays = {
  hot: 2,
  warm: 7,
  cold: 30
} as const;
