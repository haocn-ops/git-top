import type { Category, Deployment, Difficulty, ProjectKind } from "./types";

export const categoryValues = [
  "agent_framework",
  "coding_agent",
  "browser_agent",
  "rag_framework",
  "vector_database",
  "llm_gateway",
  "llm_eval",
  "prompt_tooling",
  "workflow_automation",
  "local_llm_runtime",
  "ai_app_template",
  "mcp_server",
  "ai_observability",
  "other"
] as const satisfies readonly Category[];

export const difficultyValues = ["beginner", "intermediate", "advanced"] as const satisfies readonly Difficulty[];

export const deploymentValues = [
  "local",
  "docker",
  "cloud",
  "serverless",
  "cloudflare",
  "vercel",
  "kubernetes",
  "library_only"
] as const satisfies readonly Deployment[];

export const projectKindValues = ["project", "collection"] as const satisfies readonly ProjectKind[];

export const agentCardJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://git.top/schemas/agent-card.v1.json",
  title: "Git.Top Agent Card V1",
  type: "object",
  required: [
    "project_id",
    "category",
    "difficulty",
    "deployment",
    "cloudflare_ready",
    "use_cases",
    "not_good_for",
    "alternatives",
    "summary_for_agent",
    "schema_version",
    "generated_at"
  ],
  properties: {
    project_id: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
    project_kind: { type: "string", enum: projectKindValues, default: "project" },
    collection_metadata: { $ref: "#/$defs/collection_metadata" },
    category: { type: "string", enum: categoryValues },
    difficulty: { type: "string", enum: difficultyValues },
    deployment: {
      type: "array",
      items: { type: "string", enum: deploymentValues },
      minItems: 1,
      uniqueItems: true
    },
    cloudflare_ready: { type: "boolean" },
    use_cases: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1
    },
    not_good_for: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        required: ["project_id", "reason"],
        properties: {
          project_id: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
          reason: { type: "string", minLength: 1 }
        }
      }
    },
    summary_for_agent: { type: "string", minLength: 1 },
    classification: {
      type: "object",
      properties: {
        category: { $ref: "#/$defs/classification_signal" },
        deployment: { $ref: "#/$defs/classification_signal" },
        difficulty: { $ref: "#/$defs/classification_signal" },
        cloudflare_ready: { $ref: "#/$defs/classification_signal" }
      }
    },
    schema_version: { const: "v1" },
    generated_at: { type: "string", format: "date-time" }
  },
  $defs: {
    collection_metadata: {
      type: "object",
      required: ["scope", "curated", "estimated_items", "freshness"],
      properties: {
        scope: {
          type: "string",
          enum: ["awesome_list", "cookbook", "starter_collection", "integration_collection", "resource_hub"]
        },
        curated: { type: "boolean" },
        estimated_items: { type: ["integer", "null"], minimum: 0 },
        freshness: { type: "string", enum: ["active", "stale", "unknown"] }
      }
    },
    classification_signal: {
      type: "object",
      required: ["confidence", "evidence"],
      properties: {
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        evidence: { type: "array", items: { type: "string" } }
      }
    }
  }
} as const;

export const projectKnowledgeJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://git.top/schemas/project-knowledge.v1.json",
  title: "Git.Top Project Knowledge V1",
  type: "object",
  required: ["project", "agent_card", "metrics"],
  properties: {
    project: {
      type: "object",
      required: ["id", "owner", "name", "full_name", "github_url", "topics", "stars", "forks", "open_issues", "synced_at"],
      properties: {
        id: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
        owner: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        full_name: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
        github_url: { type: "string" },
        homepage_url: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        language: { type: ["string", "null"] },
        topics: { type: "array", items: { type: "string" } },
        license: { type: ["string", "null"] },
        stars: { type: "integer", minimum: 0 },
        forks: { type: "integer", minimum: 0 },
        open_issues: { type: "integer", minimum: 0 },
        synced_at: { type: "string", format: "date-time" }
      }
    },
    agent_card: agentCardJsonSchema,
    metrics: {
      type: "object",
      required: [
        "project_id",
        "stars_30d_delta",
        "commits_30d",
        "releases_180d",
        "contributors_90d",
        "git_score",
        "maintenance_score",
        "calculated_at"
      ],
      properties: {
        project_id: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
        stars_30d_delta: { type: "integer", minimum: 0 },
        commits_30d: { type: "integer", minimum: 0 },
        releases_180d: { type: "integer", minimum: 0 },
        contributors_90d: { type: "integer", minimum: 0 },
        issue_first_response_median_hours: { type: ["number", "null"], minimum: 0 },
        recent_push_days: { type: ["integer", "null"], minimum: 0 },
        git_score: { type: "integer", minimum: 0, maximum: 100 },
        maintenance_score: { type: "integer", minimum: 0, maximum: 100 },
        calculated_at: { type: "string", format: "date-time" }
      }
    }
  }
} as const;

export const projectV2JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://git.top/schemas/project.v2.json",
  title: "Git.Top Project Schema V2",
  type: "object",
  required: [
    "repo",
    "name",
    "category",
    "tags",
    "description",
    "alternatives",
    "dependencies",
    "deployments",
    "quality_score",
    "agent_score"
  ],
  properties: {
    repo: { type: "string", pattern: "^[^/\\s]+/[^/\\s]+$" },
    name: { type: "string", minLength: 1 },
    project_kind: { type: "string", enum: projectKindValues, default: "project" },
    collection_metadata: { $ref: "#/$defs/collection_metadata" },
    category: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    overview: { type: "string" },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        required: ["repo", "reason"],
        properties: {
          repo: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    dependencies: { type: "array", items: { type: "string" } },
    deployments: { type: "array", items: { type: "string", enum: deploymentValues } },
    use_cases: { type: "array", items: { type: "string" } },
    classification: {
      type: "object",
      properties: {
        category: { $ref: "#/$defs/classification_signal" },
        deployment: { $ref: "#/$defs/classification_signal" },
        difficulty: { $ref: "#/$defs/classification_signal" },
        cloudflare_ready: { $ref: "#/$defs/classification_signal" }
      }
    },
    quality_signals: {
      type: "object",
      properties: {
        stars: { type: "integer", minimum: 0 },
        recent_commits: { type: "integer", minimum: 0 },
        contributors: { type: "integer", minimum: 0 },
        issue_response_time_hours: { type: ["number", "null"], minimum: 0 },
        release_frequency_180d: { type: "integer", minimum: 0 }
      }
    },
    quality_signal_confidence: {
      type: "object",
      properties: {
        stars_30d_delta: { type: "string", enum: ["snapshot", "estimated"] },
        stars_30d_window_days: { type: "integer", minimum: 0 },
        commits_30d: { type: "string", enum: ["complete", "partial", "unknown"] },
        releases_180d: { type: "string", enum: ["complete", "partial", "unknown"] },
        contributors_90d: { type: "string", enum: ["complete", "partial", "unknown"] }
      }
    },
    quality_score: { type: "integer", minimum: 0, maximum: 100 },
    agent_score: { type: "integer", minimum: 0, maximum: 100 }
  },
  $defs: {
    collection_metadata: {
      type: "object",
      required: ["scope", "curated", "estimated_items", "freshness"],
      properties: {
        scope: {
          type: "string",
          enum: ["awesome_list", "cookbook", "starter_collection", "integration_collection", "resource_hub"]
        },
        curated: { type: "boolean" },
        estimated_items: { type: ["integer", "null"], minimum: 0 },
        freshness: { type: "string", enum: ["active", "stale", "unknown"] }
      }
    },
    classification_signal: {
      type: "object",
      required: ["confidence", "evidence"],
      properties: {
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        evidence: { type: "array", items: { type: "string" } }
      }
    }
  }
} as const;
