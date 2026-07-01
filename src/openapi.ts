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
    "/api/trust": {
      get: {
        summary: "Fetch the production-readiness Trust Gate for high-confidence agent recommendations.",
        responses: { "200": { description: "Trust Gate decision with checks, agent policy, health, sync, quality, and metadata" } }
      }
    },
    "/api/agent-map": {
      get: {
        summary: "Map Git.Top concepts to human pages, REST endpoints, MCP tools, output fields, trust fields, and recommended use.",
        responses: { "200": { description: "Agent surface map for REST, MCP, and human page discovery" } }
      }
    },
    "/api/roadmap": {
      get: {
        summary: "Inspect Git.Top 2.0 product roadmap progress, shipped surfaces, active work, human pages, REST endpoints, and MCP coverage.",
        responses: { "200": { description: "Product roadmap with completion, phases, shipped work, next milestones, agent use guidance, pages, APIs, and MCP tools" } }
      }
    },
    "/api/quickstart": {
      get: {
        summary: "Fetch the Git.Top Agent Quickstart with REST, MCP, GRP, command examples, trust fields, and output pattern.",
        responses: { "200": { description: "Agent quickstart with ordered steps, Atlas journey guidance, endpoint examples, inspection fields, trust policy, and answer pattern" } }
      }
    },
    "/api/recipes": {
      get: {
        summary: "Fetch executable Git.Top agent recipes for common project selection, alternatives, comparison, graph, Atlas journeys, quality, and GRP tasks.",
        responses: { "200": { description: "Agent recipes with use cases, outcomes, ordered REST steps, Atlas comparison path examples, command examples, inspection fields, and trust checks" } }
      }
    },
    "/api/examples": {
      get: {
        summary: "Fetch copyable REST, MCP, and GRP examples for common agent workflows.",
        responses: { "200": { description: "Agent API examples with commands, inspection fields, trust checks, and next actions" } }
      }
    },
    "/api/journeys": {
      get: {
        summary: "Fetch Atlas exploration journeys that connect ecosystems to recommendations, graph, alternatives, compare, score, and Agent Map surfaces.",
        parameters: [queryParam("limit", "Maximum projects per ecosystem used to build journey links")],
        responses: { "200": { description: "Atlas journeys with ecosystem ids, ordered steps, ecosystem-specific comparison paths, human page links, API links, stats, and metadata" } }
      }
    },
    "/api/search": {
      get: {
        summary: "Search project knowledge by query, category, deployment, difficulty, language, project type, confidence, and Cloudflare readiness.",
        parameters: [
          queryParam("q", "Search query"),
          queryParam("category", "Project category"),
          queryParam("deployment", "Deployment target"),
          queryParam("difficulty", "Difficulty level"),
          queryParam("language", "Primary language"),
          queryParam("project_kind", "Project type: project or collection"),
          queryParam("min_confidence", "Minimum classification confidence: low, medium, or high"),
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
        summary: "Fetch a project knowledge record with agent summary, related projects, scores, and metadata.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Project knowledge view plus summary, full knowledge, and metadata" }, "404": { description: "Project not found" } }
      }
    },
    "/api/project/{project}": {
      get: {
        summary: "Fetch a project knowledge record with agent summary by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [
          pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"),
          queryParam("related_limit", "Maximum related project count"),
          queryParam("require_d1", "Fail closed unless D1-backed data is available")
        ],
        responses: { "200": { description: "Project knowledge view plus summary, full knowledge, related projects, resolved_from, and metadata" }, "404": { description: "Project not found" } }
      }
    },
    "/api/project": {
      post: {
        summary: "Fetch a project knowledge record with agent summary from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProjectLookupRequest" }
            }
          }
        },
        responses: { "200": { description: "Project knowledge view plus summary, full knowledge, and metadata" }, "400": { description: "Invalid project lookup request" }, "404": { description: "Project not found" } }
      }
    },
    "/api/trending": {
      get: {
        summary: "List trending projects from the loaded knowledge set.",
        parameters: [queryParam("category", "Optional category filter"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Trending projects" } }
      }
    },
    "/api/trends": {
      get: {
        summary: "Inspect corpus-level open-source trends by category, deployment, language, and project momentum.",
        parameters: [queryParam("limit", "Maximum bucket and project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Trend summary with stats, trend_signals, buckets, rising_projects, agent_briefing, and metadata" } }
      }
    },
    "/api/recommend": {
      get: {
        summary: "Recommend projects for an agent use case and constraints.",
        parameters: [
          queryParam("use_case", "Use case text"),
          queryParam("deployment", "Deployment target"),
          queryParam("category", "Project category"),
          queryParam("license", "License SPDX id or license text"),
          queryParam("difficulty", "Difficulty level"),
          queryParam("language", "Primary language"),
          queryParam("cloudflare_ready", "Boolean Cloudflare readiness filter"),
          queryParam("limit", "Maximum result count"),
          queryParam("require_d1", "Fail closed unless D1-backed data is available")
        ],
        responses: { "200": { description: "Recommendations with fit profiles, adoption plans, risk flags, reasons, and tradeoffs" } }
      },
      post: {
        summary: "Recommend projects from a structured JSON body with optional nested constraints.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecommendationRequest" }
            }
          }
        },
        responses: { "200": { description: "Recommendations with fit profiles, adoption plans, risk flags, constraints, ranking signals, and tradeoffs" }, "400": { description: "Invalid recommendation request" } }
      }
    },
    "/api/workflow": {
      get: {
        summary: "Return an agent selection workflow across trends, recommendations, graph, alternatives, score, compare, and trust checks.",
        parameters: [
          queryParam("intent", "Natural-language selection goal"),
          queryParam("use_case", "Concrete project use case"),
          queryParam("project_id", "Optional focus project or Git.Top product alias"),
          queryParam("deployment", "Deployment target"),
          queryParam("category", "Project category"),
          queryParam("license", "License SPDX id or license text"),
          queryParam("difficulty", "Difficulty level"),
          queryParam("language", "Primary language"),
          queryParam("cloudflare_ready", "Boolean Cloudflare readiness filter"),
          queryParam("limit", "Maximum recommendation count"),
          queryParam("require_d1", "Fail closed unless D1-backed data is available")
        ],
        responses: { "200": { description: "Guided workflow with recommended_sequence, shortlist, trend_context, agent_map, trust_policy, and metadata" } }
      },
      post: {
        summary: "Return an agent selection workflow from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkflowRequest" }
            }
          }
        },
        responses: { "200": { description: "Guided workflow with recommended_sequence, shortlist, trend_context, agent_map, trust_policy, and metadata" }, "400": { description: "Invalid workflow request" } }
      }
    },
    "/api/compare": {
      get: {
        summary: "Compare projects by deployment, maintenance, quality, agent score, decision matrix, and next actions.",
        parameters: [queryParam("repos", "Comma-separated owner/repo list"), queryParam("deployment", "Deployment preference"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Comparison matrix with summary, stats, decision_matrix, next_actions, and winner reasoning" } }
      },
      post: {
        summary: "Compare projects from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CompareRequest" }
            }
          }
        },
        responses: { "200": { description: "Comparison matrix with summary, stats, decision_matrix, next_actions, and winner reasoning" }, "400": { description: "Invalid compare request" } }
      }
    },
    "/api/alternatives/{owner}/{repo}": {
      get: {
        summary: "Find alternatives for a project with summary, stats, next actions, similarity scores, and match signals.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Alternative project list with summary, stats, next_actions, comparison_links, similarity scores, and match signals" } }
      }
    },
    "/api/alternatives/{project}": {
      get: {
        summary: "Find alternatives by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Alternative project list with resolved_from, summary, stats, next_actions, comparison_links, similarity scores, and match signals" }, "404": { description: "Project not found" } }
      }
    },
    "/api/alternatives": {
      post: {
        summary: "Find alternatives for a project from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AlternativesRequest" }
            }
          }
        },
        responses: { "200": { description: "Alternative project list with summary, stats, next_actions, comparison_links, similarity scores, and match signals" }, "400": { description: "Invalid alternatives request" }, "404": { description: "Project not found" } }
      }
    },
    "/api/related/{owner}/{repo}": {
      get: {
        summary: "Find related ecosystem projects connected by category, deployment, dependency, topics, or use cases.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Related project list" } }
      }
    },
    "/api/related/{project}": {
      get: {
        summary: "Find related ecosystem projects by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Related project list with project context, resolved_from, and metadata" }, "404": { description: "Project not found" } }
      }
    },
    "/api/related": {
      post: {
        summary: "Find related ecosystem projects from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RelatedRequest" }
            }
          }
        },
        responses: { "200": { description: "Related project list with project context and metadata" }, "400": { description: "Invalid related projects request" }, "404": { description: "Project not found" } }
      }
    },
    "/api/score/{owner}/{repo}": {
      get: {
        summary: "Explain a project's Git.Top Score with weighted dimensions, adoption guidance, risk flags, next actions, related scores, evidence, and links.",
        parameters: [pathParam("owner", "GitHub owner or single-segment project alias when using /api/score/{project}"), pathParam("repo", "GitHub repository name"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Project score explanation with adoption guidance, risk flags, and next actions" }, "404": { description: "Project not found" } }
      }
    },
    "/api/score/{project}": {
      get: {
        summary: "Explain a project's Git.Top Score by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Project score explanation with resolved_from, dimensions, adoption guidance, risk flags, next actions, evidence, and metadata" }, "404": { description: "Project not found" } }
      }
    },
    "/api/score": {
      post: {
        summary: "Explain a project's Git.Top Score from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScoreRequest" }
            }
          }
        },
        responses: { "200": { description: "Project score explanation with dimensions, adoption guidance, risk flags, next actions, evidence, and metadata" }, "400": { description: "Invalid score request" }, "404": { description: "Project not found" } }
      }
    },
    "/api/graph": {
      get: {
        summary: "Return project relationship graph nodes, edges, stats, summary, next actions, project context, and relationship groups.",
        parameters: [queryParam("repo", "Optional focus repository or Git.Top product alias such as claude-code"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Knowledge graph with graph_stats, summary, next_actions, alternatives, related projects, dependencies, deployment targets, and use cases when focused on a project" } }
      },
      post: {
        summary: "Return a project relationship graph from a structured JSON body.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GraphRequest" }
            }
          }
        },
        responses: { "200": { description: "Knowledge graph with project context, graph_stats, summary, next_actions, and relationship groups" }, "400": { description: "Invalid graph request" } }
      }
    },
    "/api/atlas": {
      get: {
        summary: "List Atlas ecosystem maps with stats, exploration paths, comparison paths, concept/project nodes, edges, representative projects, and Agent API links.",
        parameters: [queryParam("limit", "Maximum projects per ecosystem"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Atlas ecosystem list with stats, exploration_paths, recommendation links, map.nodes, and map.edges" } }
      }
    },
    "/api/atlas/{ecosystem}": {
      get: {
        summary: "Fetch one Atlas ecosystem map with stats, exploration paths, comparison paths, concept/project nodes, edges, representative projects, and Agent API links.",
        parameters: [pathParam("ecosystem", "Atlas ecosystem id"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Atlas ecosystem with stats, exploration_paths, recommendation links, map.nodes, and map.edges" }, "404": { description: "Atlas ecosystem not found" } }
      }
    },
    "/api/graph/{owner}/{repo}": {
      get: {
        summary: "Return project relationship graph nodes, edges, stats, summary, next actions, project context, and relationship groups for one project.",
        parameters: [pathParam("owner", "GitHub owner or single-segment project alias when using /api/graph/{project}"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Focused project knowledge graph with graph_stats, summary, next_actions, grouped alternatives, related projects, dependencies, deployment targets, and use cases" } }
      }
    },
    "/api/graph/{project}": {
      get: {
        summary: "Return a focused project relationship graph by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Focused project knowledge graph with resolved_from, graph_stats, summary, next_actions, grouped alternatives, related projects, dependencies, deployment targets, and use cases" }, "404": { description: "Project not found" } }
      }
    },
    "/api/quality": {
      get: {
        summary: "Inspect release score, data trust score, confidence, coverage, and risk.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Quality report with backward-compatible score, release_score, data_trust_score, score_summary, coverage, and risk fields" } }
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
    "/api/governance/summary": {
      get: {
        summary: "Inspect automated operations and data-governance run summary.",
        responses: { "200": { description: "Governance run summary" } }
      }
    },
    "/api/governance/runs": {
      get: {
        summary: "List recent automated operations and data-governance runs.",
        parameters: [queryParam("task", "Optional governance task identifier"), queryParam("limit", "Maximum run count")],
        responses: { "200": { description: "Governance run history" } }
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
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": { description: "Graph-grounded project set, plan, comparison, or stack" } }
      }
    },
    "/api/admin/discovery": {
      post: {
        summary: "Discover and sync new candidate repositories from GitHub search.",
        security: [{ syncSecret: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  max_candidates: {
                    type: "integer",
                    minimum: 1,
                    maximum: 5,
                    description: "Maximum number of new candidates to sync in this run."
                  },
                  search_index: {
                    type: "integer",
                    description: "Optional deterministic index for the rotating discovery query."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Candidate discovery result and recorded governance run" },
          "401": { description: "Missing or invalid admin authorization" },
          "405": { description: "Candidate discovery requires POST" }
        }
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
    "/api/admin/governance/runs": {
      post: {
        summary: "Record an automated governance run result.",
        security: [{ syncSecret: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GovernanceRunInput" }
            }
          }
        },
        responses: {
          "200": { description: "Persisted governance run" },
          "400": { description: "Invalid governance run payload" },
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
      },
      RecommendationRequest: {
        type: "object",
        properties: {
          use_case: { type: "string" },
          useCase: { type: "string" },
          deployment: { type: "string" },
          category: { type: "string" },
          license: { type: "string" },
          difficulty: { type: "string" },
          language: { type: "string" },
          cloudflare_ready: { type: "boolean" },
          limit: { type: "integer" },
          constraints: {
            type: "object",
            properties: {
              deployment: { type: "string" },
              category: { type: "string" },
              license: { type: "string" },
              difficulty: { type: "string" },
              language: { type: "string" },
              cloudflare_ready: { type: "boolean" }
            }
          }
        }
      },
      WorkflowRequest: {
        type: "object",
        properties: {
          intent: { type: "string" },
          goal: { type: "string" },
          use_case: { type: "string" },
          useCase: { type: "string" },
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" },
          deployment: { type: "string" },
          category: { type: "string" },
          license: { type: "string" },
          difficulty: { type: "string" },
          language: { type: "string" },
          cloudflare_ready: { type: "boolean" },
          limit: { type: "integer" },
          constraints: {
            type: "object",
            properties: {
              deployment: { type: "string" },
              category: { type: "string" },
              license: { type: "string" },
              difficulty: { type: "string" },
              language: { type: "string" },
              cloudflare_ready: { type: "boolean" }
            }
          }
        }
      },
      CompareRequest: {
        type: "object",
        properties: {
          project_ids: { type: "array", items: { type: "string" } },
          projects: { type: "array", items: { type: "string" } },
          repos: {
            oneOf: [
              { type: "string", description: "Comma-separated owner/repo list." },
              { type: "array", items: { type: "string" } }
            ]
          },
          deployment: { type: "string" }
        }
      },
      AlternativesRequest: {
        type: "object",
        required: ["project_id"],
        properties: {
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" },
          limit: { type: "integer" }
        }
      },
      ProjectLookupRequest: {
        type: "object",
        required: ["project_id"],
        properties: {
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" },
          related_limit: { type: "integer" }
        }
      },
      ProjectSummary: {
        type: "object",
        required: ["tl_dr", "purpose", "inputs", "outputs", "good_for", "not_good_for", "deployment", "alternatives"],
        properties: {
          tl_dr: { type: "string", description: "One-sentence project overview for agents." },
          purpose: { type: "string", description: "Longer agent-facing project purpose." },
          install: { type: ["string", "null"], description: "Conservative install or setup hint when Git.Top can infer one." },
          inputs: { type: "array", items: { type: "string" } },
          outputs: { type: "array", items: { type: "string" } },
          good_for: { type: "array", items: { type: "string" } },
          not_good_for: { type: "array", items: { type: "string" } },
          deployment: { type: "array", items: { type: "string" } },
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
          }
        }
      },
      RelatedRequest: {
        type: "object",
        required: ["project_id"],
        properties: {
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" },
          limit: { type: "integer" }
        }
      },
      ScoreRequest: {
        type: "object",
        required: ["project_id"],
        properties: {
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" }
        }
      },
      GraphRequest: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          projectId: { type: "string" },
          repo: { type: "string" },
          focus: { type: "string" },
          limit: { type: "integer" }
        }
      },
      GovernanceRunInput: {
        type: "object",
        required: ["task", "status"],
        properties: {
          id: { type: "string" },
          task: { type: "string", description: "Short governance task identifier." },
          status: { type: "string", enum: ["success", "failed", "running", "skipped"] },
          trigger: { type: "string", enum: ["github_actions", "cron", "admin", "manual"] },
          started_at: { type: "string", format: "date-time" },
          finished_at: { type: "string", format: "date-time" },
          duration_ms: { type: "integer" },
          summary: { type: "object" },
          report_url: { type: "string" },
          error: { type: "string" }
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
