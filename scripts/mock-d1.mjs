export const mockD1ProjectId = "mock/d1-agent";

export function mockD1Env(options = {}) {
  const input = typeof options === "string" ? { mode: options } : options;
  const config = {
    mode: "rows",
    cursor: 0,
    syncState: {},
    rawProjectCount: null,
    starSnapshot: null,
    syncRuns: [],
    governanceRuns: [],
    githubRequestCache: [],
    candidateRepositories: [],
    projectChanges: [],
    feedbackProposals: [],
    knowledge: null,
    classificationOverrides: [],
    ...input
  };
  return {
    DB: {
      prepare(sql) {
        return new MockStatement(sql, [], config);
      },
      async batch(statements) {
        return Promise.all(statements.map((statement) => statement.run()));
      }
    }
  };
}

class MockStatement {
  constructor(sql, bindings = [], config = {}) {
    this.sql = sql;
    this.bindings = bindings;
    this.config = config;
  }

  bind(...bindings) {
    return new MockStatement(this.sql, bindings, this.config);
  }

    async all() {
      if (this.config.mode === "error") {
        throw new Error("mock d1 failure");
      }
      if (this.config.mode === "missing_optional_columns" && this.sql.includes("pm.signal_confidence_json")) {
        throw new Error("no such column: pm.signal_confidence_json");
      }
      if (this.sql.includes("FROM projects p")) {
        const rows = this.pageRows(this.rows());
        if (this.config.mode === "missing_optional_columns" && !this.sql.includes("calculated_at")) {
          const row = rows[0];
          if (row) {
            delete row.calculated_at;
          }
        }
        return {
          results: this.config.mode === "empty" ? [] : rows
        };
      }
    if (this.sql.includes("FROM sync_runs")) {
      return {
        results: this.config.syncRuns
      };
    }
    if (this.sql.includes("FROM classification_overrides")) {
      return {
        results: this.config.classificationOverrides
      };
    }
    if (this.sql.includes("FROM governance_runs")) {
      const task = this.sql.includes("WHERE task = ?") ? String(this.bindings[0]) : null;
      const rows = (task ? this.config.governanceRuns.filter((row) => row.task === task) : this.config.governanceRuns)
        .slice()
        .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
      if (this.sql.includes("LIMIT 1")) {
        return rows[0] ?? null;
      }
      return {
        results: rows.slice(0, Number(this.bindings[this.bindings.length - 1] ?? rows.length))
      };
    }
    if (this.sql.includes("FROM github_request_cache")) {
      return {
        results: this.config.githubRequestCache
      };
    }
    if (this.sql.includes("FROM candidate_repositories")) {
      return {
        results: this.config.candidateRepositories
      };
    }
    if (this.sql.includes("FROM project_changes")) {
      const [afterId, since, , limit] = this.bindings;
      const rows = this.config.projectChanges
        .filter((row) => Number(row.id) > Number(afterId ?? 0) && (!since || Date.parse(row.occurred_at) >= Date.parse(String(since))))
        .sort((a, b) => Number(a.id) - Number(b.id))
        .slice(0, Number(limit ?? this.config.projectChanges.length));
      return { results: rows };
    }
    if (this.sql.includes("FROM feedback_proposals")) {
      const status = this.sql.includes("WHERE status = ?") ? String(this.bindings[0]) : null;
      const limit = Number(this.bindings[this.bindings.length - 1] ?? this.config.feedbackProposals.length);
      return { results: this.config.feedbackProposals.filter((row) => !status || row.status === status).slice(0, limit) };
    }
    return {
      results: []
    };
  }

  async first() {
    if (this.config.mode === "error") {
      throw new Error("mock d1 failure");
    }
    if (this.sql.includes("AS cache_entries")) {
      return {
        cache_entries: this.config.githubRequestCache.length,
        cache_body_bytes: this.config.githubRequestCache.reduce((sum, row) => sum + Buffer.byteLength(row.body_json ?? ""), 0),
        star_snapshot_count: this.config.starSnapshot ? 1 : 0,
        sync_run_count: this.config.syncRuns.length,
        governance_run_count: this.config.governanceRuns.length,
        project_change_count: this.config.projectChanges.length,
        feedback_proposal_count: this.config.feedbackProposals.filter((row) => row.status === "proposed").length
      };
    }
    if (this.sql.includes("COUNT(*) AS count") && this.sql.includes("JOIN agent_cards") && this.sql.includes("JOIN project_metrics")) {
      return {
        count: this.config.mode === "empty" ? 0 : this.rows().length
      };
    }
    if (this.sql.includes("FROM projects") && this.sql.includes("lower(id) IN")) {
      const wanted = new Set(this.bindings.map((binding) => String(binding).toLowerCase()));
      const count = this.rows().filter((row) => wanted.has(String(row.id).toLowerCase()) || wanted.has(String(row.full_name).toLowerCase())).length;
      return {
        count: this.config.mode === "empty" ? 0 : count
      };
    }
    if (this.sql.includes("COUNT(*) AS count") && this.sql.includes("FROM projects")) {
      const latestSyncedAt = this.rows().reduce((latest, row) => !latest || Date.parse(row.synced_at) > Date.parse(latest) ? row.synced_at : latest, null);
      return {
        count: this.config.mode === "empty" ? 0 : this.config.rawProjectCount ?? this.config.knowledge?.length ?? 1,
        latest_synced_at: this.config.mode === "empty" ? null : latestSyncedAt
      };
    }
    if (this.sql.includes("FROM sync_state")) {
      const key = String(this.bindings[0]);
      if (key === "seed_cursor") {
        return { value: String(this.config.cursor) };
      }
      return Object.hasOwn(this.config.syncState, key) ? { value: String(this.config.syncState[key]) } : null;
    }
    if (this.sql.includes("FROM star_snapshots")) {
      return this.config.starSnapshot;
    }
    if (this.sql.includes("FROM github_request_cache")) {
      const key = String(this.bindings[0]);
      return this.config.githubRequestCache.find((row) => row.cache_key === key) ?? null;
    }
    if (this.sql.includes("FROM governance_runs")) {
      const task = this.sql.includes("WHERE task = ?") ? String(this.bindings[0]) : null;
      const rows = (task ? this.config.governanceRuns.filter((row) => row.task === task) : this.config.governanceRuns)
        .slice()
        .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
      return rows[0] ?? null;
    }
    if (this.sql.includes("FROM feedback_proposals")) {
      if (this.sql.includes("fingerprint = ?")) {
        return this.config.feedbackProposals.find((row) => row.fingerprint === this.bindings[0]) ?? null;
      }
      return this.config.feedbackProposals.find((row) => row.id === this.bindings[0]) ?? null;
    }
    return null;
  }

  rows() {
    return this.config.knowledge ? this.config.knowledge.map(projectKnowledgeToRow) : [projectKnowledgeRow(this.config.mode)];
  }

  pageRows(rows) {
    if (!this.sql.includes("LIMIT ? OFFSET ?")) {
      return rows;
    }
    const limit = Number(this.bindings[this.bindings.length - 2] ?? rows.length);
    const offset = Number(this.bindings[this.bindings.length - 1] ?? 0);
    return rows.slice(offset, offset + limit);
  }

  async run() {
    if (this.sql.trimStart().startsWith("DELETE")) {
      if (this.sql.includes("github_request_cache") && this.sql.includes("cache_key = ?")) {
        const cacheKey = String(this.bindings[0]);
        this.config.githubRequestCache = this.config.githubRequestCache.filter((row) => row.cache_key !== cacheKey);
      }
      return {
        success: true
      };
    }

    if (this.sql.includes("governance_runs")) {
      const [id, task, status, trigger, started_at, finished_at, duration_ms, summary_json, report_url, error, created_at] = this.bindings;
      const nextRow = {
        id,
        task,
        status,
        trigger,
        started_at,
        finished_at,
        duration_ms,
        summary_json,
        report_url,
        error,
        created_at
      };
      const index = this.config.governanceRuns.findIndex((row) => row.id === id);
      if (index >= 0) {
        this.config.governanceRuns[index] = nextRow;
      } else {
        this.config.governanceRuns.unshift(nextRow);
      }
    }
    if (this.sql.includes("INTO sync_state")) {
      const [key, value] = this.bindings;
      this.config.syncState[String(key)] = String(value);
      if (String(key) === "seed_cursor") {
        this.config.cursor = Number(value);
      }
    }
    if (this.sql.includes("INTO classification_overrides") || this.sql.includes("FROM classification_overrides")) {
      const [
        project_id,
        category,
        difficulty,
        deployment_json,
        cloudflare_ready,
        classification_json,
        notes,
        reviewed_by,
        reviewed_at,
        updated_at
      ] = this.bindings;
      const nextRow = {
        project_id,
        category,
        difficulty,
        deployment_json,
        cloudflare_ready,
        classification_json,
        notes,
        reviewed_by,
        reviewed_at,
        updated_at
      };
      const index = this.config.classificationOverrides.findIndex((row) => row.project_id === project_id);
      if (index >= 0) {
        this.config.classificationOverrides[index] = nextRow;
      } else {
        this.config.classificationOverrides.unshift(nextRow);
      }
    }
    if (this.sql.includes("INTO feedback_proposals")) {
      const [id, fingerprint, project_id, feedback_type, proposed_json, evidence_json, rationale, source_agent, source_url, status, created_at, updated_at, reviewed_by, reviewed_at, review_notes] = this.bindings;
      const nextRow = { id, fingerprint, project_id, feedback_type, proposed_json, evidence_json, rationale, source_agent, source_url, status, created_at, updated_at, reviewed_by, reviewed_at, review_notes };
      const index = this.config.feedbackProposals.findIndex((row) => row.fingerprint === fingerprint);
      if (index >= 0) this.config.feedbackProposals[index] = { ...this.config.feedbackProposals[index], ...nextRow };
      else this.config.feedbackProposals.unshift(nextRow);
    }
    if (this.sql.includes("UPDATE feedback_proposals")) {
      const [status, reviewed_by, reviewed_at, review_notes, updated_at, id] = this.bindings;
      const row = this.config.feedbackProposals.find((item) => item.id === id && item.status === "proposed");
      if (row) Object.assign(row, { status, reviewed_by, reviewed_at, review_notes, updated_at });
    }
    if (this.sql.includes("github_request_cache")) {
      if (this.sql.includes("UPDATE github_request_cache SET checked_at")) {
        const [checked_at, cache_key] = this.bindings;
        const row = this.config.githubRequestCache.find((item) => item.cache_key === cache_key);
        if (row) {
          row.checked_at = checked_at;
        }
      } else {
        const [cache_key, etag, last_modified, body_json, status, checked_at, updated_at] = this.bindings;
        const nextRow = {
          cache_key,
          etag,
          last_modified,
          body_json,
          status,
          checked_at,
          updated_at
        };
        const index = this.config.githubRequestCache.findIndex((row) => row.cache_key === cache_key);
        if (index >= 0) {
          this.config.githubRequestCache[index] = nextRow;
        } else {
          this.config.githubRequestCache.unshift(nextRow);
        }
      }
    }
    if (this.sql.includes("candidate_repositories")) {
      if (this.sql.includes("UPDATE candidate_repositories")) {
        const repository = String(this.bindings[this.bindings.length - 1]).toLowerCase();
        const row = this.config.candidateRepositories.find((item) => String(item.repository).toLowerCase() === repository);
        if (row) {
          if (this.sql.includes("status = 'synced'")) {
            row.status = "synced";
            row.last_synced_at = this.bindings[0];
            row.last_error = null;
          }
          if (this.sql.includes("status = 'failed'")) {
            row.status = "failed";
            row.last_error = this.bindings[0];
          }
        }
      } else {
        const [repository, category, source, source_query, stars, pushed_at, description, status, admission_json, first_seen_at, last_seen_at] = this.bindings;
        const nextRow = {
          repository,
          category,
          source,
          source_query,
          stars,
          pushed_at,
          description,
          status,
          admission_json,
          first_seen_at,
          last_seen_at,
          last_synced_at: null,
          last_error: null
        };
        const index = this.config.candidateRepositories.findIndex((row) => row.repository === repository);
        if (index >= 0) {
          this.config.candidateRepositories[index] = {
            ...this.config.candidateRepositories[index],
            ...nextRow
          };
        } else {
          this.config.candidateRepositories.unshift(nextRow);
        }
      }
    }
    return {
      success: true
    };
  }
}

export function githubRequestCacheRow(overrides = {}) {
  return {
    cache_key: "/repos/mock/d1-agent",
    etag: '"mock-etag"',
    last_modified: "Sat, 20 Jun 2026 00:00:00 GMT",
    body_json: JSON.stringify({
      full_name: mockD1ProjectId
    }),
    status: 200,
    checked_at: "2026-06-20T00:00:00Z",
    updated_at: "2026-06-20T00:00:00Z",
    ...overrides
  };
}

export function governanceRunRow(overrides = {}) {
  return {
    id: "governance_1",
    task: "daily-production-health",
    status: "success",
    trigger: "github_actions",
    started_at: "2026-06-24T00:00:00Z",
    finished_at: "2026-06-24T00:00:10Z",
    duration_ms: 10000,
    summary_json: JSON.stringify({ quality_score: 100, smoke_ok: true }),
    report_url: "https://github.com/example/actions/runs/1",
    error: null,
    created_at: "2026-06-24T00:00:11Z",
    ...overrides
  };
}

export function syncRunRow(overrides = {}) {
  return {
    id: "sync_1",
    trigger: "admin",
    started_at: "2026-06-20T00:00:00Z",
    finished_at: "2026-06-20T00:00:05Z",
    duration_ms: 5000,
    offset: 0,
    next_offset: 5,
    limit_value: 5,
    synced_count: 1,
    failed_count: 0,
    alternatives_updated: 0,
    synced_json: JSON.stringify([mockD1ProjectId]),
    failed_json: JSON.stringify([]),
    ...overrides
  };
}

function projectKnowledgeRow(mode = "rows") {
  const now = "2026-06-20T00:00:00Z";
  const row = {
    id: mockD1ProjectId,
    owner: "mock",
    name: "d1-agent",
    full_name: mockD1ProjectId,
    github_url: `https://github.com/${mockD1ProjectId}`,
    homepage_url: null,
    description: "Mock D1 Cloudflare agent framework",
    language: "TypeScript",
    topics_json: JSON.stringify(["agents", "cloudflare", "workers"]),
    license: "MIT",
    stars: 1234,
    forks: 56,
    open_issues: 7,
    default_branch: "main",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: now,
    pushed_at: now,
    synced_at: now,
    ac_project_id: mockD1ProjectId,
    project_kind: "project",
    collection_json: JSON.stringify({}),
    category: "agent_framework",
    difficulty: "beginner",
    deployment_json: JSON.stringify(["cloudflare", "serverless", "local"]),
    cloudflare_ready: 1,
    use_cases_json: JSON.stringify(["build test agents", "validate D1-backed routes"]),
    not_good_for_json: JSON.stringify(["seed fallback checks"]),
    alternatives_json: JSON.stringify([]),
    summary_for_agent: "Use mock/d1-agent to verify D1-backed API and MCP route behavior.",
    classification_json: JSON.stringify({
      category: {
        confidence: "high",
        evidence: ['Matched "agent framework" in metadata.']
      },
      deployment: {
        confidence: "high",
        evidence: ["Found wrangler.toml."]
      },
      difficulty: {
        confidence: "medium",
        evidence: ["Cloudflare deployment path suggests a guided serverless setup."]
      },
      cloudflareReady: {
        confidence: "high",
        evidence: ["Cloudflare deployment signal detected."]
      }
    }),
    schema_version: "v1",
    generated_at: now,
    pm_project_id: mockD1ProjectId,
    stars_30d_delta: 42,
    commits_30d: 12,
    releases_180d: 3,
    contributors_90d: 5,
    issue_first_response_median_hours: 8,
    recent_push_days: 1,
    git_score: 77,
    maintenance_score: 74,
    signal_confidence_json: JSON.stringify({
      stars30dDelta: "snapshot",
      stars30dWindowDays: 30,
      commits30d: "complete",
      releases180d: "complete",
      contributors90d: "complete"
    }),
    calculated_at: now
  };
  if (mode === "missing_optional_columns") {
    delete row.classification_json;
    delete row.signal_confidence_json;
  }
  return row;
}

function projectKnowledgeToRow(knowledge) {
  const { project, agentCard, metrics } = knowledge;
  return {
    id: project.id,
    owner: project.owner,
    name: project.name,
    full_name: project.fullName,
    github_url: project.githubUrl,
    homepage_url: project.homepageUrl,
    description: project.description,
    language: project.language,
    topics_json: JSON.stringify(project.topics),
    license: project.license,
    stars: project.stars,
    forks: project.forks,
    open_issues: project.openIssues,
    default_branch: project.defaultBranch,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    pushed_at: project.pushedAt,
    synced_at: project.syncedAt,
    ac_project_id: agentCard.projectId,
    project_kind: agentCard.projectKind ?? "project",
    collection_json: JSON.stringify(agentCard.collectionMetadata ?? {}),
    category: agentCard.category,
    difficulty: agentCard.difficulty,
    deployment_json: JSON.stringify(agentCard.deployment),
    cloudflare_ready: agentCard.cloudflareReady ? 1 : 0,
    use_cases_json: JSON.stringify(agentCard.useCases),
    not_good_for_json: JSON.stringify(agentCard.notGoodFor),
    alternatives_json: JSON.stringify(agentCard.alternatives),
    summary_for_agent: agentCard.summaryForAgent,
    classification_json: JSON.stringify(agentCard.classification ?? {}),
    schema_version: agentCard.schemaVersion,
    generated_at: agentCard.generatedAt,
    pm_project_id: metrics.projectId,
    stars_30d_delta: metrics.stars30dDelta,
    commits_30d: metrics.commits30d,
    releases_180d: metrics.releases180d,
    contributors_90d: metrics.contributors90d,
    issue_first_response_median_hours: metrics.issueFirstResponseMedianHours,
    recent_push_days: metrics.recentPushDays,
    git_score: metrics.gitScore,
    maintenance_score: metrics.maintenanceScore,
    signal_confidence_json: JSON.stringify(metrics.signalConfidence ?? {}),
    calculated_at: metrics.calculatedAt
  };
}
