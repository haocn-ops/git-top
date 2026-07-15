-- Audited production cleanup after the 2026-07-15 stale-project refresh.
-- Two repositories moved to new canonical GitHub names and were re-synced under
-- those names. One repository returned GitHub API 404. Preserve their candidate
-- records as failed, but retire the obsolete knowledge rows so the change-feed
-- trigger emits deletion tombstones.

DELETE FROM star_snapshots
WHERE lower(project_id) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');

DELETE FROM classification_overrides
WHERE lower(project_id) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');

DELETE FROM project_metrics
WHERE lower(project_id) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');

DELETE FROM agent_cards
WHERE lower(project_id) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');

DELETE FROM projects
WHERE lower(id) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');

UPDATE candidate_repositories
SET status = 'failed',
    last_error = CASE lower(repository)
      WHEN 'aaronjmars/aeon' THEN 'Repository renamed to aeonfun/aeon during freshness recovery on 2026-07-15'
      WHEN 'ahwanulm/9router-v2' THEN 'Repository renamed to ahwanulm/AMRouter during freshness recovery on 2026-07-15'
      ELSE 'GitHub API 404 during freshness recovery on 2026-07-15'
    END
WHERE lower(repository) IN ('aaronjmars/aeon', 'ahwanulm/9router-v2', 'ms33834/autoship-cli');
