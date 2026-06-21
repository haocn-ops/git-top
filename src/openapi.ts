export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Git.Top Agent API",
    version: "0.1.0",
    description:
      "Agent-native GitHub project knowledge API for search, project lookup, alternatives, comparison, graph reasoning, quality, and schema discovery."
  },
  servers: [
    {
      url: "https://git.top",
      description: "Production"
    },
    {
      url: "http://localhost:8787",
      description: "Local Worker"
    }
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "Inspect D1 availability, project counts, and sync freshness.",
        responses: { "200": { description: "Health response" } }
      }
    },
    "/api/search": {
      get: {
        summary: "Search project knowledge by query, category, deployment, difficulty, language, and Cloudflare readiness.",
        parameters: [
          queryParam("q", "Search query"),
          queryParam("category", "Project category"),
          queryParam("deployment", "Deployment target"),
          queryParam("difficulty", "Difficulty level"),
          queryParam("language", "Primary language"),
          queryParam("cloudflare_ready", "Boolean Cloudflare readiness filter"),
          queryParam("ranking", "Use browse for broad category/deployment discovery"),
          queryParam("limit", "Maximum result count"),
          queryParam("require_d1", "Fail closed unless D1-backed data is available")
        ],
        responses: { "200": { description: "Project search results with metadata" } }
      }
    },
    "/api/project/{owner}/{repo}": {
      get: {
        summary: "Fetch a project knowledge record.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Project knowledge view plus full knowledge and metadata" }, "404": { description: "Project not found" } }
      }
    },
    "/api/trending": {
      get: {
        summary: "List trending projects from the loaded knowledge set.",
        parameters: [queryParam("category", "Optional category filter"), queryParam("limit", "Maximum result count")],
        responses: { "200": { description: "Trending projects" } }
      }
    },
    "/api/recommend": {
      get: {
        summary: "Recommend projects for an agent use case and constraints.",
        parameters: [
          queryParam("use_case", "Use case text"),
          queryParam("deployment", "Deployment target"),
          queryParam("difficulty", "Difficulty level"),
          queryParam("language", "Primary language"),
          queryParam("cloudflare_ready", "Boolean Cloudflare readiness filter"),
          queryParam("limit", "Maximum result count")
        ],
        responses: { "200": { description: "Recommendations with reasons and tradeoffs" } }
      }
    },
    "/api/compare": {
      get: {
        summary: "Compare projects by deployment, maintenance, quality, and agent score.",
        parameters: [queryParam("repos", "Comma-separated owner/repo list"), queryParam("deployment", "Deployment preference")],
        responses: { "200": { description: "Comparison matrix and winner reasoning" } }
      }
    },
    "/api/alternatives/{owner}/{repo}": {
      get: {
        summary: "Find alternatives for a project.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum result count")],
        responses: { "200": { description: "Alternative project list" } }
      }
    },
    "/api/graph": {
      get: {
        summary: "Return project relationship graph nodes and edges.",
        parameters: [queryParam("repo", "Optional focus repository"), queryParam("limit", "Maximum project count")],
        responses: { "200": { description: "Knowledge graph" } }
      }
    },
    "/api/quality": {
      get: {
        summary: "Inspect data quality, confidence, coverage, and risk.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Quality report" } }
      }
    },
    "/api/quality/review": {
      get: {
        summary: "Inspect low-confidence classification and collection review queue.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Low-confidence classification and collection review queue" } }
      }
    },
    "/api/sync/status": {
      get: {
        summary: "Inspect sync cursor progress, freshness, health, and recent failures.",
        responses: { "200": { description: "Sync status" } }
      }
    },
    "/api/schema/project.v2": {
      get: {
        summary: "Fetch the compact project response JSON Schema.",
        responses: { "200": { description: "Project schema" } }
      }
    },
    "/api/grp/query": {
      post: {
        summary: "Run Graph Reasoning Protocol over the knowledge graph.",
        responses: { "200": { description: "Graph-grounded project set, plan, comparison, or stack" } }
      }
    },
    "/api/admin/classification-overrides": {
      get: {
        summary: "List reviewed classification overrides.",
        security: [{ syncSecret: [] }],
        parameters: [queryParam("limit", "Maximum override count")],
        responses: { "200": { description: "Reviewed classification override ledger" }, "401": { description: "Missing or invalid admin authorization" } }
      },
      post: {
        summary: "Create or update a reviewed classification override.",
        security: [{ syncSecret: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClassificationOverrideInput" }
            }
          }
        },
        responses: {
          "200": { description: "Persisted classification override" },
          "400": { description: "Invalid classification override payload" },
          "401": { description: "Missing or invalid admin authorization" }
        }
      }
    },
    "/mcp": {
      get: {
        summary: "Discover Git.Top MCP tools, docs, quickstart, and JSON-RPC examples.",
        responses: { "200": { description: "MCP discovery" } }
      },
      post: {
        summary: "Call MCP tools/list or tools/call via JSON-RPC.",
        responses: { "200": { description: "JSON-RPC result" } }
      }
    }
  },
  components: {
    securitySchemes: {
      syncSecret: {
        type: "http",
        scheme: "bearer",
        description: "Admin endpoints require the SYNC_SECRET bearer token."
      }
    },
    schemas: {
      Metadata: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["d1", "seed"] },
          reason: { type: "string" },
          project_count: { type: "integer" },
          generated_at: { type: "string", format: "date-time" }
        }
      },
      ClassificationOverrideInput: {
        type: "object",
        required: ["project_id"],
        properties: {
          project_id: { type: "string", description: "GitHub owner/repo identifier." },
          category: {
            type: "string",
            enum: [
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
            ]
          },
          difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
          deployment: { type: "array", items: { type: "string" } },
          cloudflare_ready: { type: "boolean" },
          classification: { type: "object", description: "Optional classification evidence override." },
          notes: { type: "string" },
          reviewed_by: { type: "string" },
          reviewed_at: { type: "string", format: "date-time" }
        }
      }
    }
  }
} as const;

function queryParam(name: string, description: string) {
  return {
    name,
    in: "query",
    required: false,
    description,
    schema: { type: "string" }
  };
}

function pathParam(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string" }
  };
}
