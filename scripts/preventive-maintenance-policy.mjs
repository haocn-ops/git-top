export function prioritizeRepositories(staleRepositories, dueRepositories, limit) {
  return Array.from(new Set([...staleRepositories, ...dueRepositories])).slice(0, limit);
}
