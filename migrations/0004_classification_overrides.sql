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

CREATE INDEX IF NOT EXISTS idx_classification_overrides_reviewed_at
ON classification_overrides(reviewed_at DESC);
