export const mockD1ProjectId = "mock/d1-agent";

export function mockD1Env(options = {}) {
  const config = typeof options === "string" ? { mode: options } : options;
  return {
    DB: {
      prepare(sql) {
        return new MockStatement(sql, [], config);
      }
    }
  };
}

class MockStatement {
  constructor(sql, bindings = [], config = {}) {
    this.sql = sql;
    this.bindings = bindings;
    this.config = {
      mode: "rows",
      cursor: 0,
      rawProjectCount: null,
      starSnapshot: null,
      syncRuns: [],
      knowledge: null,
      classificationOverrides: [],
      ...config
    };
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
    return {
      results: []
    };
  }

  async first() {
    if (this.config.mode === "error") {
      throw new Error("mock d1 failure");
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
    if (this.sql.includes("COUNT(*) AS count FROM projects")) {
      return {
        count: this.config.mode === "empty" ? 0 : this.config.rawProjectCount ?? this.config.knowledge?.length ?? 1
      };
    }
    if (this.sql.includes("FROM sync_state")) {
      return {
        value: String(this.config.cursor)
      };
    }
    if (this.sql.includes("FROM star_snapshots")) {
      return this.config.starSnapshot;
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
    if (this.sql.includes("classification_overrides")) {
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
    return {
      success: true
    };
  }
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
