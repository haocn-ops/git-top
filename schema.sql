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
  signal_confidence_json TEXT NOT NULL DEFAULT '{}',
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS agent_cards (
  project_id TEXT PRIMARY KEY,
  project_kind TEXT NOT NULL DEFAULT 'project',
  collection_json TEXT NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  deployment_json TEXT NOT NULL DEFAULT '[]',
  cloudflare_ready INTEGER NOT NULL DEFAULT 0,
  use_cases_json TEXT NOT NULL DEFAULT '[]',
  not_good_for_json TEXT NOT NULL DEFAULT '[]',
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  summary_for_agent TEXT NOT NULL,
  classification_json TEXT NOT NULL DEFAULT '{}',
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

CREATE TABLE IF NOT EXISTS classification_overrides (
  project_id TEXT PRIMARY KEY,
  category TEXT,
  difficulty TEXT,
  deployment_json TEXT,
  cloudflare_ready INTEGER,
  classification_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS governance_runs (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL DEFAULT '{}',
  report_url TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS github_request_cache (
  cache_key TEXT PRIMARY KEY,
  etag TEXT,
  last_modified TEXT,
  body_json TEXT NOT NULL,
  status INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_repositories (
  repository TEXT PRIMARY KEY,
  category TEXT,
  source TEXT NOT NULL,
  source_query TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  pushed_at TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  admission_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_synced_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS project_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_proposals (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  proposed_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL,
  source_agent TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_language ON projects(language);
CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cards_category ON agent_cards(category);
CREATE INDEX IF NOT EXISTS idx_agent_cards_cloudflare_ready ON agent_cards(cloudflare_ready);
CREATE INDEX IF NOT EXISTS idx_metrics_git_score ON project_metrics(git_score DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_maintenance_score ON project_metrics(maintenance_score DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at ON sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_classification_overrides_reviewed_at ON classification_overrides(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_runs_task_started_at ON governance_runs(task, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_runs_started_at ON governance_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_request_cache_checked_at ON github_request_cache(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_repositories_status ON candidate_repositories(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_repositories_stars ON candidate_repositories(stars DESC);
CREATE INDEX IF NOT EXISTS idx_project_changes_occurred_at ON project_changes(occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_project_changes_project ON project_changes(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_proposals_status_created ON feedback_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_proposals_project ON feedback_proposals(project_id, created_at DESC);

INSERT INTO sync_state(key, value, updated_at)
VALUES ('project_change_feed_started_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO NOTHING;

CREATE TRIGGER IF NOT EXISTS project_changes_after_insert
AFTER INSERT ON projects
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, after_json, occurred_at)
  VALUES (NEW.id, 'added', json_array('project'), json_object('full_name', NEW.full_name, 'stars', NEW.stars, 'synced_at', NEW.synced_at), NEW.synced_at);
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_update
AFTER UPDATE ON projects
WHEN OLD.stars IS NOT NEW.stars OR OLD.description IS NOT NEW.description OR OLD.pushed_at IS NOT NEW.pushed_at
  OR OLD.license IS NOT NEW.license OR OLD.homepage_url IS NOT NEW.homepage_url
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, before_json, after_json, occurred_at)
  VALUES (
    NEW.id,
    'updated',
    json_array(
      CASE WHEN OLD.stars IS NOT NEW.stars THEN 'stars' END,
      CASE WHEN OLD.description IS NOT NEW.description THEN 'description' END,
      CASE WHEN OLD.pushed_at IS NOT NEW.pushed_at THEN 'pushed_at' END,
      CASE WHEN OLD.license IS NOT NEW.license THEN 'license' END,
      CASE WHEN OLD.homepage_url IS NOT NEW.homepage_url THEN 'homepage_url' END
    ),
    json_object('stars', OLD.stars, 'pushed_at', OLD.pushed_at),
    json_object('stars', NEW.stars, 'pushed_at', NEW.pushed_at, 'synced_at', NEW.synced_at),
    NEW.synced_at
  );
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_delete
AFTER DELETE ON projects
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, before_json, occurred_at)
  VALUES (OLD.id, 'deleted', json_array('project'), json_object('full_name', OLD.full_name, 'stars', OLD.stars, 'synced_at', OLD.synced_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_classification_update
AFTER UPDATE OF category, difficulty, deployment_json, cloudflare_ready, classification_json ON agent_cards
WHEN OLD.category IS NOT NEW.category OR OLD.difficulty IS NOT NEW.difficulty
  OR OLD.deployment_json IS NOT NEW.deployment_json OR OLD.cloudflare_ready IS NOT NEW.cloudflare_ready
  OR OLD.classification_json IS NOT NEW.classification_json
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, before_json, after_json, occurred_at)
  VALUES (
    NEW.project_id,
    'classification_changed',
    json_array('category', 'difficulty', 'deployment', 'cloudflare_ready', 'classification'),
    json_object('category', OLD.category, 'difficulty', OLD.difficulty, 'cloudflare_ready', OLD.cloudflare_ready),
    json_object('category', NEW.category, 'difficulty', NEW.difficulty, 'cloudflare_ready', NEW.cloudflare_ready),
    NEW.generated_at
  );
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_score_update
AFTER UPDATE OF git_score, maintenance_score ON project_metrics
WHEN abs(OLD.git_score - NEW.git_score) >= 3 OR abs(OLD.maintenance_score - NEW.maintenance_score) >= 3
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, before_json, after_json, occurred_at)
  VALUES (
    NEW.project_id,
    'score_changed',
    json_array('git_score', 'maintenance_score'),
    json_object('git_score', OLD.git_score, 'maintenance_score', OLD.maintenance_score),
    json_object('git_score', NEW.git_score, 'maintenance_score', NEW.maintenance_score),
    NEW.calculated_at
  );
END;
