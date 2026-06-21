ALTER TABLE project_metrics
ADD COLUMN signal_confidence_json TEXT NOT NULL DEFAULT '{}';
