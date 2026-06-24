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

CREATE INDEX IF NOT EXISTS idx_governance_runs_task_started_at ON governance_runs(task, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_runs_started_at ON governance_runs(started_at DESC);
