-- Audited production cleanup for a repository that returned GitHub API 404.
-- Preserve the candidate discovery record as failed, but remove stale knowledge rows.

DELETE FROM star_snapshots WHERE project_id = 'hadihonarvar/flock';
DELETE FROM classification_overrides WHERE project_id = 'hadihonarvar/flock';
DELETE FROM project_metrics WHERE project_id = 'hadihonarvar/flock';
DELETE FROM agent_cards WHERE project_id = 'hadihonarvar/flock';
DELETE FROM projects WHERE id = 'hadihonarvar/flock';

UPDATE candidate_repositories
SET status = 'failed',
    last_error = 'GitHub API 404 during freshness recovery on 2026-07-12'
WHERE lower(repository) = 'hadihonarvar/flock';
