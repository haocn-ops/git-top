CREATE TABLE IF NOT EXISTS project_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_changes_occurred_at
  ON project_changes(occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_project_changes_project
  ON project_changes(project_id, occurred_at DESC);

INSERT INTO sync_state(key, value, updated_at)
VALUES ('project_change_feed_started_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO NOTHING;

CREATE TRIGGER IF NOT EXISTS project_changes_after_insert
AFTER INSERT ON projects
BEGIN
  INSERT INTO project_changes(project_id, change_type, changed_fields_json, after_json, occurred_at)
  VALUES (
    NEW.id,
    'added',
    json_array('project'),
    json_object('full_name', NEW.full_name, 'stars', NEW.stars, 'synced_at', NEW.synced_at),
    NEW.synced_at
  );
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_update
AFTER UPDATE ON projects
WHEN OLD.stars IS NOT NEW.stars
  OR OLD.description IS NOT NEW.description
  OR OLD.pushed_at IS NOT NEW.pushed_at
  OR OLD.license IS NOT NEW.license
  OR OLD.homepage_url IS NOT NEW.homepage_url
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
  VALUES (
    OLD.id,
    'deleted',
    json_array('project'),
    json_object('full_name', OLD.full_name, 'stars', OLD.stars, 'synced_at', OLD.synced_at),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );
END;

CREATE TRIGGER IF NOT EXISTS project_changes_after_classification_update
AFTER UPDATE OF category, difficulty, deployment_json, cloudflare_ready, classification_json ON agent_cards
WHEN OLD.category IS NOT NEW.category
  OR OLD.difficulty IS NOT NEW.difficulty
  OR OLD.deployment_json IS NOT NEW.deployment_json
  OR OLD.cloudflare_ready IS NOT NEW.cloudflare_ready
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
WHEN abs(OLD.git_score - NEW.git_score) >= 3
  OR abs(OLD.maintenance_score - NEW.maintenance_score) >= 3
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

DELETE FROM project_changes WHERE occurred_at < datetime('now', '-30 days');
