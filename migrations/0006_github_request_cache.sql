CREATE TABLE IF NOT EXISTS github_request_cache (
  cache_key TEXT PRIMARY KEY,
  etag TEXT,
  last_modified TEXT,
  body_json TEXT NOT NULL,
  status INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_github_request_cache_checked_at ON github_request_cache(checked_at DESC);
