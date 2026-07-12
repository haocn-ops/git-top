ALTER TABLE candidate_repositories ADD COLUMN admission_json TEXT NOT NULL DEFAULT '{}';

UPDATE candidate_repositories
SET admission_json = json_object(
  'decision', CASE WHEN status = 'synced' THEN 'admitted' ELSE 'legacy' END,
  'reason', 'Backfilled from candidate state before automated admission policy.'
)
WHERE admission_json = '{}';
