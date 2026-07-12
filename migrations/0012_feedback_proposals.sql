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

CREATE INDEX IF NOT EXISTS idx_feedback_proposals_status_created
  ON feedback_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_proposals_project
  ON feedback_proposals(project_id, created_at DESC);
