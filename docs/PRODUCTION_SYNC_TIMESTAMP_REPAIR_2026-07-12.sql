-- Repair the project freshness timestamp from the authoritative sync audit trail.
-- The repository completed multiple GitHub syncs with an empty failed_json array,
-- while its project row retained the previous timestamp.
UPDATE projects
SET synced_at = (
  SELECT MAX(sync_runs.finished_at)
  FROM sync_runs, json_each(sync_runs.synced_json)
  WHERE json_each.value = projects.id
    AND sync_runs.failed_json = '[]'
)
WHERE id = 'TencentEdgeOne/edgeone-pages-mcp'
  AND EXISTS (
    SELECT 1
    FROM sync_runs, json_each(sync_runs.synced_json)
    WHERE json_each.value = projects.id
      AND sync_runs.failed_json = '[]'
  );
