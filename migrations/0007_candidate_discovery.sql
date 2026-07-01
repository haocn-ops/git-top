CREATE TABLE IF NOT EXISTS candidate_repositories (
  repository TEXT PRIMARY KEY,
  category TEXT,
  source TEXT NOT NULL,
  source_query TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  pushed_at TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_synced_at TEXT,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidate_repositories_status ON candidate_repositories(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_repositories_stars ON candidate_repositories(stars DESC);
