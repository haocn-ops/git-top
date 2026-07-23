import { rowToClassificationOverride, type ClassificationOverrideRow } from "./db-mapping";
import type { AgentCard, Alternative, Category, ClassificationOverride, Deployment, Difficulty, Env, ProjectKnowledge } from "./types";

export interface ClassificationOverrideInput {
  projectId: string;
  category?: Category | null;
  difficulty?: Difficulty | null;
  deployment?: Deployment[] | null;
  cloudflareReady?: boolean | null;
  classification?: AgentCard["classification"] | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string;
}

export async function listClassificationOverrides(env: Env, limit = 100): Promise<ClassificationOverride[]> {
  if (!env.DB) {
    return [];
  }

  const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const rows = await env.DB.prepare(
    `SELECT project_id, category, difficulty, deployment_json, cloudflare_ready, classification_json,
            notes, reviewed_by, reviewed_at, updated_at
     FROM classification_overrides
     ORDER BY reviewed_at DESC
     LIMIT ?`
  )
    .bind(normalizedLimit)
    .all<ClassificationOverrideRow>();

  return (rows.results ?? []).map(rowToClassificationOverride);
}

export async function upsertClassificationOverride(env: Env, input: ClassificationOverrideInput): Promise<ClassificationOverride> {
  if (!env.DB) {
    throw new Error("D1 database binding is required for classification overrides.");
  }

  const now = new Date().toISOString();
  const reviewedAt = input.reviewedAt ?? now;

  await env.DB.prepare(
    `INSERT INTO classification_overrides (
      project_id, category, difficulty, deployment_json, cloudflare_ready, classification_json,
      notes, reviewed_by, reviewed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      category = excluded.category,
      difficulty = excluded.difficulty,
      deployment_json = excluded.deployment_json,
      cloudflare_ready = excluded.cloudflare_ready,
      classification_json = excluded.classification_json,
      notes = excluded.notes,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at,
      updated_at = excluded.updated_at`
  )
    .bind(
      input.projectId,
      input.category ?? null,
      input.difficulty ?? null,
      input.deployment ? JSON.stringify(input.deployment) : null,
      input.cloudflareReady === undefined || input.cloudflareReady === null ? null : input.cloudflareReady ? 1 : 0,
      JSON.stringify(input.classification ?? {}),
      input.notes ?? null,
      input.reviewedBy ?? null,
      reviewedAt,
      now
    )
    .run();

  return {
    projectId: input.projectId,
    category: input.category ?? null,
    difficulty: input.difficulty ?? null,
    deployment: input.deployment ?? null,
    cloudflareReady: input.cloudflareReady ?? null,
    classification: input.classification ?? null,
    notes: input.notes ?? null,
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt,
    updatedAt: now
  };
}

export async function upsertProjectKnowledge(env: Env, knowledge: ProjectKnowledge): Promise<void> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to sync project knowledge.");
  }

  const { project, agentCard, metrics } = knowledge;

  const statements = [
    env.DB.prepare(
      `INSERT INTO projects (
        id, owner, name, full_name, github_url, homepage_url, description, language,
        topics_json, license, stars, forks, open_issues, default_branch,
        created_at, updated_at, pushed_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner = excluded.owner,
        name = excluded.name,
        full_name = excluded.full_name,
        github_url = excluded.github_url,
        homepage_url = excluded.homepage_url,
        description = excluded.description,
        language = excluded.language,
        topics_json = excluded.topics_json,
        license = excluded.license,
        stars = excluded.stars,
        forks = excluded.forks,
        open_issues = excluded.open_issues,
        default_branch = excluded.default_branch,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        pushed_at = excluded.pushed_at,
        synced_at = excluded.synced_at`
    ).bind(
      project.id,
      project.owner,
      project.name,
      project.fullName,
      project.githubUrl,
      project.homepageUrl,
      project.description,
      project.language,
      JSON.stringify(project.topics),
      project.license,
      project.stars,
      project.forks,
      project.openIssues,
      project.defaultBranch,
      project.createdAt,
      project.updatedAt,
      project.pushedAt,
      project.syncedAt
    ),
    env.DB.prepare(
      `INSERT INTO project_metrics (
        project_id, stars_30d_delta, commits_30d, releases_180d, contributors_90d,
        issue_first_response_median_hours, recent_push_days, git_score,
        maintenance_score, signal_confidence_json, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        stars_30d_delta = excluded.stars_30d_delta,
        commits_30d = excluded.commits_30d,
        releases_180d = excluded.releases_180d,
        contributors_90d = excluded.contributors_90d,
        issue_first_response_median_hours = excluded.issue_first_response_median_hours,
        recent_push_days = excluded.recent_push_days,
        git_score = excluded.git_score,
        maintenance_score = excluded.maintenance_score,
        signal_confidence_json = excluded.signal_confidence_json,
        calculated_at = excluded.calculated_at`
    ).bind(
      metrics.projectId,
      metrics.stars30dDelta,
      metrics.commits30d,
      metrics.releases180d,
      metrics.contributors90d,
      metrics.issueFirstResponseMedianHours,
      metrics.recentPushDays,
      metrics.gitScore,
      metrics.maintenanceScore,
      JSON.stringify(metrics.signalConfidence ?? {}),
      metrics.calculatedAt
    ),
    env.DB.prepare(
    `INSERT INTO agent_cards (
        project_id, project_kind, collection_json, category, difficulty, deployment_json, cloudflare_ready,
        use_cases_json, not_good_for_json, alternatives_json, summary_for_agent,
        classification_json, schema_version, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        project_kind = excluded.project_kind,
        collection_json = excluded.collection_json,
        category = excluded.category,
        difficulty = excluded.difficulty,
        deployment_json = excluded.deployment_json,
        cloudflare_ready = excluded.cloudflare_ready,
        use_cases_json = excluded.use_cases_json,
        not_good_for_json = excluded.not_good_for_json,
        alternatives_json = agent_cards.alternatives_json,
        summary_for_agent = excluded.summary_for_agent,
        classification_json = excluded.classification_json,
        schema_version = excluded.schema_version,
        generated_at = excluded.generated_at`
    ).bind(
      agentCard.projectId,
      agentCard.projectKind ?? "project",
      JSON.stringify(agentCard.collectionMetadata ?? {}),
      agentCard.category,
      agentCard.difficulty,
      JSON.stringify(agentCard.deployment),
      agentCard.cloudflareReady ? 1 : 0,
      JSON.stringify(agentCard.useCases),
      JSON.stringify(agentCard.notGoodFor),
      JSON.stringify(agentCard.alternatives),
      agentCard.summaryForAgent,
      JSON.stringify(agentCard.classification ?? {}),
      agentCard.schemaVersion,
      agentCard.generatedAt
    ),
    env.DB.prepare(
      `INSERT OR REPLACE INTO star_snapshots (
        project_id, stars, captured_at
      ) VALUES (?, ?, ?)`
    ).bind(project.id, project.stars, project.syncedAt)
  ];

  await env.DB.batch(statements);
}

export async function retireRenamedProjectKnowledge(env: Env, requestedRepository: string, canonicalRepository: string): Promise<boolean> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to retire renamed project knowledge.");
  }

  const requested = requestedRepository.trim();
  const canonical = canonicalRepository.trim();
  if (!requested || !canonical || requested.toLowerCase() === canonical.toLowerCase()) {
    return false;
  }

  const retiredAt = new Date().toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM star_snapshots WHERE lower(project_id) = lower(?)").bind(requested),
    env.DB.prepare("DELETE FROM classification_overrides WHERE lower(project_id) = lower(?)").bind(requested),
    env.DB.prepare("DELETE FROM project_metrics WHERE lower(project_id) = lower(?)").bind(requested),
    env.DB.prepare("DELETE FROM agent_cards WHERE lower(project_id) = lower(?)").bind(requested),
    env.DB.prepare("DELETE FROM projects WHERE lower(id) = lower(?)").bind(requested),
    env.DB
      .prepare("UPDATE candidate_repositories SET status = 'failed', last_error = ? WHERE lower(repository) = lower(?)")
      .bind(`Repository renamed to ${canonical} during sync on ${retiredAt}`, requested)
  ]);

  return true;
}

export async function retireUnavailableProjectKnowledge(env: Env, repository: string, reason: string): Promise<void> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to retire unavailable project knowledge.");
  }

  const projectId = repository.trim();
  if (!projectId) {
    return;
  }

  const retiredAt = new Date().toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM star_snapshots WHERE lower(project_id) = lower(?)").bind(projectId),
    env.DB.prepare("DELETE FROM classification_overrides WHERE lower(project_id) = lower(?)").bind(projectId),
    env.DB.prepare("DELETE FROM project_metrics WHERE lower(project_id) = lower(?)").bind(projectId),
    env.DB.prepare("DELETE FROM agent_cards WHERE lower(project_id) = lower(?)").bind(projectId),
    env.DB.prepare("DELETE FROM projects WHERE lower(id) = lower(?)").bind(projectId),
    env.DB
      .prepare("UPDATE candidate_repositories SET status = 'unavailable', last_error = ? WHERE lower(repository) = lower(?)")
      .bind(`Repository unavailable during sync on ${retiredAt}: ${reason}`, projectId)
  ]);
}

export async function updateProjectAlternatives(
  env: Env,
  updates: Array<{ projectId: string; alternatives: Alternative[] }>
): Promise<number> {
  if (!env.DB) {
    throw new Error("D1 binding DB is required to update alternatives.");
  }

  if (updates.length === 0) {
    return 0;
  }

  await env.DB.batch(
    updates.map((update) =>
      env.DB!.prepare("UPDATE agent_cards SET alternatives_json = ? WHERE project_id = ?").bind(
        JSON.stringify(update.alternatives),
        update.projectId
      )
    )
  );

  return updates.length;
}
