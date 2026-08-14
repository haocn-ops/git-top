export function prioritizeRepositories(staleRepositories, dueRepositories, limit, hotRepositories = []) {
  return Array.from(new Set([...hotRepositories, ...dueRepositories, ...staleRepositories])).slice(0, limit);
}

export function selectPreventiveMaintenanceRepositories({
  staleRepositories,
  dueRepositories,
  hotRepositories = [],
  nextBatch = [],
  syncFreshness,
  limit
}) {
  const prioritized = prioritizeRepositories(staleRepositories, dueRepositories, limit, hotRepositories);
  if (prioritized.length > 0 || syncFreshness === "fresh") {
    return { repositories: prioritized, recoveryMode: null };
  }
  const heartbeatRepository = nextBatch.find((projectId) => typeof projectId === "string" && projectId.trim());
  return heartbeatRepository
    ? { repositories: [heartbeatRepository], recoveryMode: "stale_sync_heartbeat" }
    : { repositories: [], recoveryMode: "stale_sync_unrecoverable" };
}

export function assessPreventiveMaintenance({ failures, staleProjectCount, syncHealth, syncFreshness }) {
  const operationalFailureCount = failures.length;
  const operationallyHealthy = operationalFailureCount === 0 && syncHealth === "healthy" && syncFreshness === "fresh";
  return {
    status: operationallyHealthy ? "success" : "failed",
    operational_failure_count: operationalFailureCount,
    stale_backlog: staleProjectCount > 0 ? "remaining" : "clear",
    stale_project_count: staleProjectCount
  };
}
