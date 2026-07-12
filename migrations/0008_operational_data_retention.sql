-- Bound operational data before deploying runtime retention.
-- Core project, agent card, metrics, override, and candidate records are preserved.

DELETE FROM github_request_cache
WHERE length(CAST(body_json AS BLOB)) > 65536
   OR checked_at < datetime('now', '-14 days');

DELETE FROM github_request_cache
WHERE cache_key NOT IN (
  SELECT cache_key
  FROM github_request_cache
  ORDER BY checked_at DESC
  LIMIT 2500
);

DELETE FROM star_snapshots
WHERE captured_at < datetime('now', '-45 days');

DELETE FROM sync_runs
WHERE started_at < datetime('now', '-30 days');

DELETE FROM governance_runs
WHERE started_at < datetime('now', '-180 days');
