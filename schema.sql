CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE,
  github_url TEXT NOT NULL,
  homepage_url TEXT,
  description TEXT,
  language TEXT,
  topics_json TEXT NOT NULL DEFAULT '[]',
  license TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT,
  created_at TEXT,
  updated_at TEXT,
  pushed_at TEXT,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_metrics (
  project_id TEXT PRIMARY KEY,
  stars_30d_delta INTEGER NOT NULL DEFAULT 0,
  commits_30d INTEGER NOT NULL DEFAULT 0,
  releases_180d INTEGER NOT NULL DEFAULT 0,
  contributors_90d INTEGER NOT NULL DEFAULT 0,
  issue_first_response_median_hours REAL,
  recent_push_days INTEGER,
  git_score INTEGER NOT NULL DEFAULT 0,
  maintenance_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS agent_cards (
  project_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  deployment_json TEXT NOT NULL DEFAULT '[]',
  cloudflare_ready INTEGER NOT NULL DEFAULT 0,
  use_cases_json TEXT NOT NULL DEFAULT '[]',
  not_good_for_json TEXT NOT NULL DEFAULT '[]',
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  summary_for_agent TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v1',
  generated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS star_snapshots (
  project_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (project_id, captured_at),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  offset INTEGER NOT NULL,
  next_offset INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  synced_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  alternatives_updated INTEGER NOT NULL,
  synced_json TEXT NOT NULL DEFAULT '[]',
  failed_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_projects_language ON projects(language);
CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cards_category ON agent_cards(category);
CREATE INDEX IF NOT EXISTS idx_agent_cards_cloudflare_ready ON agent_cards(cloudflare_ready);
CREATE INDEX IF NOT EXISTS idx_metrics_git_score ON project_metrics(git_score DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_maintenance_score ON project_metrics(maintenance_score DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at ON sync_runs(started_at DESC);
