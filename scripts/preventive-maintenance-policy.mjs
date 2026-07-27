export function prioritizeRepositories(staleRepositories, dueRepositories, limit) {
  return Array.from(new Set([...dueRepositories, ...staleRepositories])).slice(0, limit);
}
