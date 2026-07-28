export function prioritizeRepositories(staleRepositories, dueRepositories, limit) {
  return Array.from(new Set([...dueRepositories, ...staleRepositories])).slice(0, limit);
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
