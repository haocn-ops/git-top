ALTER TABLE agent_cards
ADD COLUMN project_kind TEXT NOT NULL DEFAULT 'project';

ALTER TABLE agent_cards
ADD COLUMN collection_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS star_snapshots (
  project_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (project_id, captured_at),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
