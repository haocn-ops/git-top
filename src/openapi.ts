export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Git.Top Agent API",
    version: "0.1.0",
    description:
      "Agent-native GitHub project knowledge API for search, project lookup, alternatives, comparison, graph reasoning, quality, and schema discovery. High-confidence clients should inspect metadata.source, metadata.reason, trust fields, classification evidence, and quality_signal_confidence, and use require_d1=true when seed fallback should fail closed."
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
        responses: { "200": jsonResponse("Health response", "#/components/schemas/HealthResponse", healthExample()) }
      }
    },
    "/api/trust": {
      get: {
        summary: "Fetch the production-readiness Trust Gate for high-confidence agent recommendations.",
        responses: { "200": jsonResponse("Trust Gate decision with checks, agent policy, health, sync, quality, and metadata", "#/components/schemas/TrustGateResponse", trustGateExample()) }
      }
    },
    "/api/agent-map": {
      get: {
        summary: "Map Git.Top concepts to human pages, REST endpoints, MCP tools, output fields, trust fields, and recommended use.",
        responses: { "200": jsonResponse("Agent surface map for REST, MCP, and human page discovery", "#/components/schemas/AgentMapResponse") }
      }
    },
    "/api/roadmap": {
      get: {
        summary: "Inspect Git.Top 2.0 product roadmap progress, shipped surfaces, active work, human pages, REST endpoints, and MCP coverage.",
        responses: { "200": jsonResponse("Product roadmap with completion, phases, shipped work, next milestones, agent use guidance, pages, APIs, and MCP tools", "#/components/schemas/RoadmapResponse", roadmapExample()) }
      }
    },
    "/api/quickstart": {
      get: {
        summary: "Fetch the Git.Top Agent Quickstart with REST, MCP, GRP, command examples, trust fields, and output pattern.",
        responses: { "200": jsonResponse("Agent quickstart with ordered steps, Atlas journey guidance, endpoint examples, inspection fields, trust policy, and answer pattern", "#/components/schemas/QuickstartResponse", quickstartExample()) }
      }
    },
    "/api/recipes": {
      get: {
        summary: "Fetch executable Git.Top agent recipes for common project selection, alternatives, comparison, graph, Atlas journeys, quality, and GRP tasks.",
        responses: { "200": jsonResponse("Agent recipes with use cases, outcomes, ordered REST steps, Atlas comparison path examples, command examples, inspection fields, and trust checks", "#/components/schemas/RecipesResponse", recipesExample()) }
      }
    },
    "/api/examples": {
      get: {
        summary: "Fetch copyable REST, MCP, and GRP examples for common agent workflows.",
        responses: { "200": jsonResponse("Agent API examples with commands, inspection fields, trust checks, and next actions", "#/components/schemas/ExamplesResponse", examplesExample()) }
      }
    },
    "/api/journeys": {
      get: {
        summary: "Fetch Atlas exploration journeys that connect ecosystems to recommendations, graph, alternatives, compare, score, and Agent Map surfaces.",
        parameters: [queryParam("limit", "Maximum projects per ecosystem used to build journey links")],
        responses: { "200": jsonResponse("Atlas journeys with ecosystem ids, ordered steps, ecosystem-specific comparison paths, human page links, API links, stats, and metadata", "#/components/schemas/AtlasJourneysResponse") }
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
        responses: { "200": jsonResponse("Project search results with metadata", "#/components/schemas/SearchResponse", searchExample()) }
      }
    },
    "/api/project/{owner}/{repo}": {
      get: {
        summary: "Fetch a project knowledge record with agent summary, related projects, scores, and metadata.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Project knowledge view plus summary, full knowledge, and metadata", "#/components/schemas/ProjectResponse", projectExample()), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
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
        responses: { "200": jsonResponse("Project knowledge view plus summary, full knowledge, related projects, resolved_from, and metadata", "#/components/schemas/ProjectResponse"), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
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
        responses: {
          "200": jsonResponse("Project knowledge view plus summary, full knowledge, and metadata", "#/components/schemas/ProjectResponse"),
          "400": jsonResponse("Invalid project lookup request", "#/components/schemas/ErrorResponse"),
          "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/trending": {
      get: {
        summary: "List trending projects from the loaded knowledge set.",
        parameters: [queryParam("category", "Optional category filter"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Trending projects with metadata", "#/components/schemas/TrendingResponse", trendingExample()) }
      }
    },
    "/api/trends": {
      get: {
        summary: "Inspect corpus-level open-source trends by category, deployment, language, and project momentum.",
        parameters: [queryParam("limit", "Maximum bucket and project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Trend summary with stats, trend_signals, buckets, rising_projects, agent_briefing, and metadata", "#/components/schemas/TrendsResponse", trendsExample()) }
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
        responses: { "200": jsonResponse("Recommendations with fit profiles, adoption plans, risk flags, reasons, and tradeoffs", "#/components/schemas/RecommendationResponse") }
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
        responses: {
          "200": jsonResponse("Recommendations with fit profiles, adoption plans, risk flags, constraints, ranking signals, and tradeoffs", "#/components/schemas/RecommendationResponse", recommendationExample()),
          "400": jsonResponse("Invalid recommendation request", "#/components/schemas/ErrorResponse")
        }
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
        responses: { "200": jsonResponse("Guided workflow with recommended_sequence, shortlist, trend_context, agent_map, trust_policy, and metadata", "#/components/schemas/WorkflowResponse", workflowExample()) }
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
        responses: {
          "200": jsonResponse("Guided workflow with recommended_sequence, shortlist, trend_context, agent_map, trust_policy, and metadata", "#/components/schemas/WorkflowResponse"),
          "400": jsonResponse("Invalid workflow request", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/compare": {
      get: {
        summary: "Compare projects by deployment, maintenance, quality, agent score, decision matrix, and next actions.",
        parameters: [queryParam("repos", "Comma-separated owner/repo list"), queryParam("deployment", "Deployment preference"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Comparison matrix with summary, stats, decision_matrix, next_actions, and winner reasoning", "#/components/schemas/CompareResponse", compareExample()) }
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
        responses: {
          "200": jsonResponse("Comparison matrix with summary, stats, decision_matrix, next_actions, and winner reasoning", "#/components/schemas/CompareResponse"),
          "400": jsonResponse("Invalid compare request", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/alternatives/{owner}/{repo}": {
      get: {
        summary: "Find alternatives for a project with summary, stats, next actions, similarity scores, and match signals.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Alternative project list with summary, stats, next_actions, comparison_links, similarity scores, and match signals", "#/components/schemas/AlternativesResponse", alternativesExample()) }
      }
    },
    "/api/alternatives/{project}": {
      get: {
        summary: "Find alternatives by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Alternative project list with resolved_from, summary, stats, next_actions, comparison_links, similarity scores, and match signals", "#/components/schemas/AlternativesResponse"), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
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
        responses: {
          "200": jsonResponse("Alternative project list with summary, stats, next_actions, comparison_links, similarity scores, and match signals", "#/components/schemas/AlternativesResponse"),
          "400": jsonResponse("Invalid alternatives request", "#/components/schemas/ErrorResponse"),
          "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/related/{owner}/{repo}": {
      get: {
        summary: "Find related ecosystem projects connected by category, deployment, dependency, topics, or use cases.",
        parameters: [pathParam("owner", "GitHub owner"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Related project list", "#/components/schemas/RelatedResponse") }
      }
    },
    "/api/related/{project}": {
      get: {
        summary: "Find related ecosystem projects by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum result count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Related project list with project context, resolved_from, and metadata", "#/components/schemas/RelatedResponse"), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
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
        responses: {
          "200": jsonResponse("Related project list with project context and metadata", "#/components/schemas/RelatedResponse"),
          "400": jsonResponse("Invalid related projects request", "#/components/schemas/ErrorResponse"),
          "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/score/{owner}/{repo}": {
      get: {
        summary: "Explain a project's Git.Top Score with weighted dimensions, adoption guidance, risk flags, next actions, related scores, evidence, and links.",
        parameters: [pathParam("owner", "GitHub owner or single-segment project alias when using /api/score/{project}"), pathParam("repo", "GitHub repository name"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Project score explanation with adoption guidance, risk flags, and next actions", "#/components/schemas/ScoreResponse", scoreExample()), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
      }
    },
    "/api/score/{project}": {
      get: {
        summary: "Explain a project's Git.Top Score by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Project score explanation with resolved_from, dimensions, adoption guidance, risk flags, next actions, evidence, and metadata", "#/components/schemas/ScoreResponse"), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
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
        responses: {
          "200": jsonResponse("Project score explanation with dimensions, adoption guidance, risk flags, next actions, evidence, and metadata", "#/components/schemas/ScoreResponse"),
          "400": jsonResponse("Invalid score request", "#/components/schemas/ErrorResponse"),
          "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/graph": {
      get: {
        summary: "Return project relationship graph nodes, edges, stats, summary, next actions, project context, and relationship groups.",
        parameters: [queryParam("repo", "Optional focus repository or Git.Top product alias such as claude-code"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Knowledge graph with graph_stats, summary, next_actions, alternatives, related projects, dependencies, deployment targets, and use cases when focused on a project", "#/components/schemas/GraphResponse", graphExample()) }
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
        responses: {
          "200": jsonResponse("Knowledge graph with project context, graph_stats, summary, next_actions, and relationship groups", "#/components/schemas/GraphResponse"),
          "400": jsonResponse("Invalid graph request", "#/components/schemas/ErrorResponse")
        }
      }
    },
    "/api/atlas": {
      get: {
        summary: "List Atlas ecosystem maps with stats, exploration paths, comparison paths, concept/project nodes, edges, representative projects, and Agent API links.",
        parameters: [queryParam("limit", "Maximum projects per ecosystem"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Atlas ecosystem list with stats, exploration_paths, recommendation links, map.nodes, and map.edges", "#/components/schemas/AtlasResponse") }
      }
    },
    "/api/atlas/{ecosystem}": {
      get: {
        summary: "Fetch one Atlas ecosystem map with stats, exploration paths, comparison paths, concept/project nodes, edges, representative projects, and Agent API links.",
        parameters: [pathParam("ecosystem", "Atlas ecosystem id"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Atlas ecosystem with stats, exploration_paths, recommendation links, map.nodes, and map.edges", "#/components/schemas/AtlasResponse"), "404": jsonResponse("Atlas ecosystem not found", "#/components/schemas/ErrorResponse") }
      }
    },
    "/api/graph/{owner}/{repo}": {
      get: {
        summary: "Return project relationship graph nodes, edges, stats, summary, next actions, project context, and relationship groups for one project.",
        parameters: [pathParam("owner", "GitHub owner or single-segment project alias when using /api/graph/{project}"), pathParam("repo", "GitHub repository name"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Focused project knowledge graph with graph_stats, summary, next_actions, grouped alternatives, related projects, dependencies, deployment targets, and use cases", "#/components/schemas/GraphResponse") }
      }
    },
    "/api/graph/{project}": {
      get: {
        summary: "Return a focused project relationship graph by short slug, encoded owner/repo, or Git.Top product alias.",
        parameters: [pathParam("project", "Project slug, encoded owner/repo id, or product alias such as claude-code"), queryParam("limit", "Maximum project count"), queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Focused project knowledge graph with resolved_from, graph_stats, summary, next_actions, grouped alternatives, related projects, dependencies, deployment targets, and use cases", "#/components/schemas/GraphResponse"), "404": jsonResponse("Project not found", "#/components/schemas/ErrorResponse") }
      }
    },
    "/api/quality": {
      get: {
        summary: "Inspect release score, data trust score, confidence, coverage, and risk.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Quality report with backward-compatible score, release_score, data_trust_score, score_summary, coverage, and risk fields", "#/components/schemas/QualityReportResponse") }
      }
    },
    "/api/quality/review": {
      get: {
        summary: "Inspect low-confidence classification and collection review queue.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Low-confidence classification and collection review queue", "#/components/schemas/QualityReviewResponse", qualityReviewExample()) }
      }
    },
    "/api/benchmark": {
      get: {
        summary: "Inspect public recommendation, explanation, data trust, review queue, and limitation benchmark metrics.",
        parameters: [queryParam("require_d1", "Fail closed unless D1-backed data is available")],
        responses: { "200": jsonResponse("Public trust benchmark summary with eval health, explanation coverage, data coverage, review queue, and known limitations", "#/components/schemas/BenchmarkResponse", benchmarkExample()) }
      }
    },
    "/api/sync/status": {
      get: {
        summary: "Inspect sync cursor progress, freshness, health, and recent failures.",
        responses: { "200": jsonResponse("Sync status", "#/components/schemas/SyncStatusResponse") }
      }
    },
    "/api/governance/summary": {
      get: {
        summary: "Inspect automated operations and data-governance run summary.",
        responses: { "200": jsonResponse("Governance run summary", "#/components/schemas/GovernanceSummaryResponse") }
      }
    },
    "/api/governance/runs": {
      get: {
        summary: "List recent automated operations and data-governance runs.",
        parameters: [queryParam("task", "Optional governance task identifier"), queryParam("limit", "Maximum run count")],
        responses: { "200": jsonResponse("Governance run history", "#/components/schemas/GovernanceRunsResponse") }
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GrpRequest" }
            }
          }
        },
        responses: { "200": jsonResponse("Graph-grounded project set, plan, comparison, or stack", "#/components/schemas/GrpResponse", grpExample()) }
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
        responses: { "200": jsonResponse("MCP discovery", "#/components/schemas/McpDiscoveryResponse", mcpDiscoveryExample()) }
      },
      post: {
        summary: "Call MCP tools/list or tools/call via JSON-RPC.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/McpJsonRpcRequest" },
              examples: {
                toolsList: {
                  summary: "List Git.Top MCP tools",
                  value: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }
                },
                toolCall: {
                  summary: "Call a Git.Top MCP tool",
                  value: {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/call",
                    params: {
                      name: "search_projects",
                      arguments: { query: "cloudflare agent framework", require_d1: true, limit: 5 }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": jsonResponse("JSON-RPC success result. For tools/call, parse result.content[0].text as JSON before reading metadata or result fields.", "#/components/schemas/McpJsonRpcSuccessResponse", mcpJsonRpcSuccessExample()),
          "202": { description: "Accepted JSON-RPC notification with no response body, used for notifications/initialized." },
          "400": jsonResponse("JSON-RPC error result for invalid JSON, unsupported methods, unknown tools, invalid arguments, or strict D1 failures.", "#/components/schemas/McpJsonRpcErrorResponse", mcpJsonRpcErrorExample())
        }
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
        description:
          "Common provenance envelope for agent-facing responses. Agents should require source=d1 for high-confidence production claims and disclose seed fallback.",
        properties: {
          source: { type: "string", enum: ["d1", "seed"] },
          reason: { type: "string" },
          project_count: { type: "integer" },
          generated_at: { type: "string", format: "date-time" },
          loaded_project_limit: {
            type: "integer",
            description: "Maximum D1 knowledge rows loaded into the bounded ranking set when present."
          },
          truncated: {
            type: "boolean",
            description: "Whether the D1-backed ranking set reached the load limit and may omit additional indexed rows."
          },
          warnings: {
            type: "array",
            items: { type: "string" },
            description: "Fallback, count, freshness, or trust caveats that agents should account for before citing results."
          }
        }
      },
      ErrorResponse: {
        type: "object",
        description: "Common API error envelope.",
        properties: {
          error: { type: "string" },
          code: {
            type: "string",
            description: "Stable machine-readable error code when available, such as d1_required."
          },
          message: { type: "string" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        }
      },
      HealthResponse: {
        type: "object",
        description: "Health and source-preflight response. Agents should inspect db, metadata.source, sync_freshness, and project counts before trusting recommendations.",
        required: ["ok", "db", "project_count", "raw_project_count", "knowledge_ready_project_count", "sync_health", "sync_freshness", "metadata"],
        properties: {
          ok: { type: "boolean" },
          db: { type: "string", enum: ["available", "missing", "error"] },
          project_count: { type: "integer" },
          raw_project_count: { type: "integer" },
          knowledge_ready_project_count: { type: "integer" },
          sync_health: { type: "string" },
          sync_freshness: { type: "string" },
          last_successful_sync_at: { type: ["string", "null"], format: "date-time" },
          hours_since_successful_sync: { type: ["number", "null"] },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      TrustGateResponse: {
        type: "object",
        description: "Production-readiness gate for high-confidence agent recommendations.",
        required: ["decision", "production_ready", "checks", "required_for_high_confidence", "agent_policy", "health", "sync", "quality", "metadata"],
        properties: {
          name: { type: "string" },
          positioning: { type: "string" },
          decision: { type: "string", enum: ["allow", "caution", "block"] },
          summary: { type: "string" },
          production_ready: { type: "boolean" },
          checks: { type: "array", items: { $ref: "#/components/schemas/TrustGateCheck" } },
          required_for_high_confidence: { type: "array", items: { type: "string" } },
          agent_policy: { $ref: "#/components/schemas/TrustGateAgentPolicy" },
          health: { $ref: "#/components/schemas/HealthResponse" },
          sync: { type: "object", additionalProperties: true },
          quality: { $ref: "#/components/schemas/QualityReportResponse" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      TrustGateCheck: {
        type: "object",
        required: ["id", "label", "status", "observed", "requirement"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          status: { type: "string", enum: ["pass", "warn", "fail"] },
          observed: { type: "string" },
          requirement: { type: "string" }
        }
      },
      TrustGateAgentPolicy: {
        type: "object",
        properties: {
          high_confidence_use: { type: "string" },
          caution_use: { type: "string" },
          block_use: { type: "string" },
          cite: { type: "array", items: { type: "string" } },
          disclose_when: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      ProjectCard: {
        type: "object",
        description: "Compact project card used in search, recommendations, comparison, alternatives, and related project lists.",
        required: ["project_id", "repo", "name"],
        properties: {
          project_id: { type: "string" },
          repo: { type: "string" },
          name: { type: "string" },
          github_url: { type: "string" },
          homepage_url: { type: ["string", "null"] },
          language: { type: ["string", "null"] },
          license: { type: ["string", "null"] },
          project_kind: { type: "string", enum: ["project", "collection"] },
          collection_metadata: { type: "object", additionalProperties: true },
          category: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          overview: { type: "string" },
          deployments: { type: "array", items: { type: "string" } },
          difficulty: { type: "string" },
          cloudflare_ready: { type: "boolean" },
          git_top_score: { type: "number" },
          quality_score: { type: "number" },
          agent_score: { type: "number" },
          score: { type: "number" },
          classification: { type: "object", additionalProperties: true },
          quality_signal_confidence: { $ref: "#/components/schemas/QualitySignalConfidence" },
          summary: { $ref: "#/components/schemas/ProjectSummary" },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" }
        },
        additionalProperties: true
      },
      NormalizedEvidence: {
        type: "object",
        description: "Normalized evidence package for agent citation and caveat handling.",
        properties: {
          classification: { type: "object", additionalProperties: true },
          quality_signal_confidence: { $ref: "#/components/schemas/QualitySignalConfidence" },
          source_fields: { type: "array", items: { type: "string" } },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          last_verified_at: { type: ["string", "null"], format: "date-time" }
        },
        additionalProperties: true
      },
      QualitySignalConfidence: {
        type: "object",
        description: "Completeness hints for GitHub-derived score inputs. Agents should avoid overclaiming partial or unknown signals.",
        properties: {
          stars_30d_delta: { type: "string", enum: ["snapshot", "estimated"] },
          stars_30d_window_days: { type: "integer" },
          commits_30d: { type: "string", enum: ["complete", "partial", "unknown"] },
          releases_180d: { type: "string", enum: ["complete", "partial", "unknown"] },
          contributors_90d: { type: "string", enum: ["complete", "partial", "unknown"] }
        },
        additionalProperties: true
      },
      SearchResponse: {
        type: "object",
        required: ["query", "search", "projects", "metadata"],
        properties: {
          query: { type: "object", additionalProperties: true },
          search: {
            type: "object",
            properties: {
              applied_filters: { type: "object", additionalProperties: true },
              known_filter_values: { type: "object", additionalProperties: true },
              empty_reason: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } }
            },
            additionalProperties: true
          },
          projects: { type: "array", items: { $ref: "#/components/schemas/ProjectCard" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      TrendingResponse: {
        type: "object",
        required: ["projects", "metadata"],
        properties: {
          projects: { type: "array", items: { $ref: "#/components/schemas/ProjectCard" } },
          query: { type: "object", additionalProperties: true },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      TrendsResponse: {
        type: "object",
        required: ["summary", "stats", "trend_signals", "metadata"],
        properties: {
          summary: { type: "string" },
          stats: { type: "object", additionalProperties: true },
          trend_signals: { type: "array", items: { type: "object", additionalProperties: true } },
          categories: { type: "array", items: { type: "object", additionalProperties: true } },
          deployments: { type: "array", items: { type: "object", additionalProperties: true } },
          languages: { type: "array", items: { type: "object", additionalProperties: true } },
          rising_projects: { type: "array", items: { $ref: "#/components/schemas/ProjectCard" } },
          agent_briefing: { type: "array", items: { type: "string" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      ProjectResponse: {
        type: "object",
        description: "Full project lookup response. Agents should read summary first, then classification, quality_signal_confidence, metadata, and related evidence before citing claims.",
        required: ["project_id", "repo", "summary", "knowledge", "metadata"],
        properties: {
          project_id: { type: "string" },
          repo: { type: "string" },
          resolved_from: { type: "object", additionalProperties: true },
          summary: { $ref: "#/components/schemas/ProjectSummary" },
          project: { $ref: "#/components/schemas/ProjectCard" },
          knowledge: { type: "object", additionalProperties: true },
          related: {
            type: "array",
            items: {
              type: "object",
              properties: {
                repo: { type: "string" },
                reason: { type: "string" }
              },
              additionalProperties: true
            }
          },
          score: { type: "number" },
          git_top_score: { type: "number" },
          quality_score: { type: "number" },
          agent_score: { type: "number" },
          classification: { type: "object", additionalProperties: true },
          quality_signal_confidence: { $ref: "#/components/schemas/QualitySignalConfidence" },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      RecommendationResponse: {
        type: "object",
        required: ["query", "recommendations", "metadata"],
        properties: {
          query: { type: "object", additionalProperties: true },
          recommendations: { type: "array", items: { $ref: "#/components/schemas/Recommendation" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      Recommendation: {
        allOf: [
          { $ref: "#/components/schemas/ProjectCard" },
          {
            type: "object",
            properties: {
              decision_summary: { type: "string" },
              reasons: { type: "array", items: { type: "string" } },
              tradeoffs: { type: "array", items: { type: "string" } },
              fit_profile: { type: "object", additionalProperties: true },
              adoption_plan: { type: "array", items: { type: "string" } },
              risk_flags: { type: "array", items: { type: "string" } },
              matched_constraints: { type: "object", additionalProperties: true },
              unmatched_constraints: { type: "object", additionalProperties: true },
              ranking_signals: { type: "object", additionalProperties: { type: "number" } },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              confidence_reason: { type: "string" },
              evidence: {
                allOf: [
                  { $ref: "#/components/schemas/NormalizedEvidence" },
                  {
                    type: "object",
                    properties: {
                      recommendation_reasons: { type: "array", items: { type: "string" } },
                      ranking_signals: { type: "object", additionalProperties: { type: "number" } },
                      matched_constraints: { type: "object", additionalProperties: true },
                      unmatched_constraints: { type: "object", additionalProperties: true }
                    },
                    additionalProperties: true
                  }
                ]
              },
              caveats: { type: "array", items: { type: "string" } },
              source_fields: { type: "array", items: { type: "string" } },
              last_verified_at: { type: ["string", "null"], format: "date-time" },
              next_actions: { type: "array", items: { $ref: "#/components/schemas/NextAction" } }
            },
            additionalProperties: true
          }
        ]
      },
      CompareResponse: {
        type: "object",
        required: ["projects", "project_ids", "decision_matrix", "summary", "metadata"],
        properties: {
          requested_repos: { type: "array", items: { type: "string" } },
          resolved_repos: { type: "array", items: { type: "object", additionalProperties: true } },
          project_ids: { type: "array", items: { type: "string" } },
          order: { type: "string" },
          context: { type: "object", additionalProperties: true },
          summary: { type: "string" },
          stats: { type: "object", additionalProperties: true },
          projects: { type: "array", items: { $ref: "#/components/schemas/ProjectCard" } },
          decision_matrix: {
            type: "array",
            items: {
              type: "object",
              properties: {
                repo: { type: "string" },
                recommendation: { type: "string" },
                tradeoffs: { type: "array", items: { type: "string" } }
              },
              additionalProperties: true
            }
          },
          winner: { type: "object", additionalProperties: true },
          reasoning: { type: "array", items: { type: "string" } },
          next_actions: { type: "array", items: { $ref: "#/components/schemas/NextAction" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      NextAction: {
        type: "object",
        properties: {
          label: { type: "string" },
          href: { type: "string" },
          kind: { type: "string" }
        },
        additionalProperties: true
      },
      QualityReportResponse: {
        type: "object",
        description: "Corpus quality and trust report. release_score is the release gate; data_trust_score and risk_level describe corpus trust.",
        required: ["score", "release_score", "data_trust_score", "risk_level", "risk_summary", "coverage", "metadata"],
        properties: {
          score: { type: "number" },
          release_score: { type: "number" },
          data_trust_score: { type: "number" },
          score_summary: {
            type: "object",
            properties: {
              release_score_meaning: { type: "string" },
              data_trust_score_meaning: { type: "string" },
              risk_level_meaning: { type: "string" }
            },
            additionalProperties: true
          },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          risk_summary: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["low", "medium", "high"] },
              reasons: { type: "array", items: { type: "string" } },
              low_confidence_classification_rate: { type: "number" },
              collection_review_rate: { type: "number" },
              stale_project_rate: { type: "number" },
              stale_collection_rate: { type: "number" }
            },
            additionalProperties: true
          },
          improvement_plan: { type: "array", items: { type: "object", additionalProperties: true } },
          project_count: { type: "integer" },
          issue_count: { type: "integer" },
          error_count: { type: "integer" },
          warning_count: { type: "integer" },
          category_distribution: { type: "object", additionalProperties: { type: "integer" } },
          coverage: { type: "object", additionalProperties: true },
          issues: { type: "array", items: { type: "object", additionalProperties: true } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      QualityReviewResponse: {
        type: "object",
        description: "Low-confidence classification and collection review queue for data governance.",
        required: ["project_count", "review_count", "items", "metadata"],
        properties: {
          project_count: { type: "integer" },
          review_count: { type: "integer" },
          low_signal_count: { type: "integer" },
          medium_signal_count: { type: "integer" },
          category_counts: { type: "object", additionalProperties: { type: "integer" } },
          items: { type: "array", items: { type: "object", additionalProperties: true } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      BenchmarkResponse: {
        type: "object",
        description: "Public benchmark summary for agents and users evaluating Git.Top recommendation health and trust limits.",
        required: ["name", "evaluation", "explanations", "data_coverage", "review_queue", "known_limitations", "metadata"],
        properties: {
          name: { type: "string" },
          positioning: { type: "string" },
          summary: { type: "string" },
          generated_at: { type: "string", format: "date-time" },
          evaluation: {
            type: "object",
            properties: {
              top1_hit_rate: { type: "number" },
              top3_hit_rate: { type: "number" },
              category_accuracy: { type: "number" },
              deployment_accuracy: { type: "number" },
              cloudflare_readiness_accuracy: { type: "number" },
              unacceptable_hit_count: { type: "integer" },
              review_focus: { type: "array", items: { type: "object", additionalProperties: true } },
              source_report: { type: "string" }
            },
            additionalProperties: true
          },
          explanations: {
            type: "object",
            properties: {
              checks: { type: "integer" },
              passed: { type: "integer" },
              failed: { type: "integer" },
              coverage: { type: "number" },
              source_report: { type: "string" }
            },
            additionalProperties: true
          },
          data_coverage: { type: "object", additionalProperties: true },
          review_queue: { type: "object", additionalProperties: true },
          known_limitations: { type: "array", items: { type: "string" } },
          recommended_use: { type: "array", items: { type: "string" } },
          links: { type: "object", additionalProperties: { type: "string" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      RoadmapResponse: {
        type: "object",
        required: ["positioning", "completion", "phases", "agent_use"],
        properties: {
          positioning: { type: "string" },
          summary: { type: "string" },
          completion: { type: "number" },
          current_focus: { type: "array", items: { type: "string" } },
          phases: { type: "array", items: { type: "object", additionalProperties: true } },
          agent_use: { type: "array", items: { type: "string" } },
          pages: { type: "array", items: { type: "string" } },
          api_endpoints: { type: "array", items: { type: "string" } },
          mcp_tools: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      QuickstartResponse: {
        type: "object",
        required: ["positioning", "steps", "output_pattern", "trust_policy"],
        properties: {
          positioning: { type: "string" },
          production_endpoints: { type: "object", additionalProperties: true },
          steps: { type: "array", items: { type: "object", additionalProperties: true } },
          output_pattern: { type: "array", items: { type: "string" } },
          trust_policy: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      RecipesResponse: {
        type: "object",
        required: ["positioning", "recipes"],
        properties: {
          positioning: { type: "string" },
          recipes: { type: "array", items: { type: "object", additionalProperties: true } },
          trust_policy: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      ExamplesResponse: {
        type: "object",
        required: ["positioning", "examples"],
        properties: {
          positioning: { type: "string" },
          examples: { type: "array", items: { type: "object", additionalProperties: true } },
          trust_policy: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      SyncStatusResponse: {
        type: "object",
        required: ["health", "freshness"],
        properties: {
          health: { type: "string" },
          freshness: { type: "string" },
          cursor: { type: "object", additionalProperties: true },
          latest_success: { type: "object", additionalProperties: true },
          recent_failures: { type: "array", items: { type: "object", additionalProperties: true } },
          derived: { type: "object", additionalProperties: true }
        },
        additionalProperties: true
      },
      GovernanceSummaryResponse: {
        type: "object",
        properties: {
          latest_runs: { type: "array", items: { type: "object", additionalProperties: true } },
          tasks: { type: "array", items: { type: "object", additionalProperties: true } },
          missing_tasks: { type: "array", items: { type: "object", additionalProperties: true } },
          health: { type: "object", additionalProperties: true }
        },
        additionalProperties: true
      },
      GovernanceRunsResponse: {
        type: "object",
        required: ["runs"],
        properties: {
          runs: { type: "array", items: { type: "object", additionalProperties: true } }
        },
        additionalProperties: true
      },
      WorkflowResponse: {
        type: "object",
        description: "Guided agent workflow from trust preflight through trends, recommendations, graph, alternatives, score, compare, and final citation.",
        required: ["input", "recommended_sequence", "shortlist", "trend_context", "agent_map", "trust_policy", "metadata"],
        properties: {
          positioning: { type: "string" },
          summary: { type: "string" },
          input: { type: "object", additionalProperties: true },
          recommended_sequence: { type: "array", items: { $ref: "#/components/schemas/WorkflowStep" } },
          shortlist: { type: "array", items: { $ref: "#/components/schemas/Recommendation" } },
          trend_context: { type: "object", additionalProperties: true },
          agent_map: { $ref: "#/components/schemas/AgentMapResponse" },
          trust_policy: { type: "object", additionalProperties: true },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      WorkflowStep: {
        type: "object",
        properties: {
          step: { type: "integer" },
          label: { type: "string" },
          url: { type: "string" },
          method: { type: "string" },
          mcp_tool: { type: "string" },
          inspect: { type: "array", items: { type: "string" } }
        },
        additionalProperties: true
      },
      AlternativesResponse: {
        type: "object",
        required: ["project", "alternative_matches", "metadata"],
        properties: {
          project: { $ref: "#/components/schemas/ProjectCard" },
          resolved_from: { type: "object", additionalProperties: true },
          summary: { type: "string" },
          stats: { type: "object", additionalProperties: true },
          alternatives: { type: "array", items: { type: "object", additionalProperties: true } },
          alternative_matches: { type: "array", items: { $ref: "#/components/schemas/AlternativeMatch" } },
          next_actions: { type: "array", items: { $ref: "#/components/schemas/NextAction" } },
          comparison_links: { type: "object", additionalProperties: { type: "string" } },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      AlternativeMatch: {
        allOf: [
          { $ref: "#/components/schemas/ProjectCard" },
          {
            type: "object",
            properties: {
              similarity_score: { type: "number" },
              alternative_reason: { type: "string" },
              replacement_type: { type: "string", enum: ["same_use_case", "same_category", "same_deployment", "ecosystem_adjacent"] },
              fit_summary: { type: "string" },
              adoption_notes: { type: "array", items: { type: "string" } },
              replacement_risk: { type: "string", enum: ["low", "medium", "high"] },
              match_signals: { type: "object", additionalProperties: true },
              evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
              caveats: { type: "array", items: { type: "string" } },
              confidence_reason: { type: "string" },
              source_fields: { type: "array", items: { type: "string" } },
              last_verified_at: { type: ["string", "null"], format: "date-time" }
            },
            additionalProperties: true
          }
        ]
      },
      RelatedResponse: {
        type: "object",
        required: ["related", "metadata"],
        properties: {
          project: { $ref: "#/components/schemas/ProjectCard" },
          resolved_from: { type: "object", additionalProperties: true },
          related: {
            type: "array",
            items: {
              allOf: [
                { $ref: "#/components/schemas/ProjectCard" },
                {
                  type: "object",
                  properties: {
                    reason: { type: "string" }
                  },
                  additionalProperties: true
                }
              ]
            }
          },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      GraphResponse: {
        type: "object",
        required: ["nodes", "edges", "graph_stats", "metadata"],
        properties: {
          focus: { type: "string" },
          resolved_from: { type: "object", additionalProperties: true },
          project: { $ref: "#/components/schemas/GraphProjectContext" },
          summary: { type: "string" },
          graph_stats: { type: "object", additionalProperties: true },
          next_actions: { type: "array", items: { $ref: "#/components/schemas/NextAction" } },
          relationship_groups: { type: "object", additionalProperties: true },
          nodes: { type: "array", items: { $ref: "#/components/schemas/GraphNode" } },
          edges: { type: "array", items: { $ref: "#/components/schemas/GraphEdge" } },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      GraphProjectContext: {
        type: "object",
        properties: {
          repo: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          maintainer: { type: "string" },
          license: { type: ["string", "null"] },
          language: { type: ["string", "null"] },
          recent_activity: { type: "string" }
        },
        additionalProperties: true
      },
      GraphNode: {
        type: "object",
        required: ["id", "label", "kind"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          kind: { type: "string", enum: ["project", "category", "deployment", "use_case", "dependency"] },
          score: { type: "number" },
          repo: { type: "string" }
        },
        additionalProperties: true
      },
      GraphEdge: {
        type: "object",
        required: ["source", "target", "kind", "weight"],
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          kind: { type: "string", enum: ["alternative", "related", "category", "deployment", "use_case", "dependency"] },
          reason: { type: "string" },
          weight: { type: "number" }
        },
        additionalProperties: true
      },
      ScoreResponse: {
        type: "object",
        required: ["project_id", "score", "git_top_score", "dimensions", "score_confidence", "metadata"],
        properties: {
          project: { $ref: "#/components/schemas/ProjectCard" },
          project_id: { type: "string" },
          resolved_from: { type: "object", additionalProperties: true },
          score: { type: "number" },
          git_top_score: { type: "number" },
          quality_score: { type: "number" },
          agent_score: { type: "number" },
          git_top_score_breakdown: { type: "object", additionalProperties: { type: "number" } },
          dimensions: { type: "array", items: { $ref: "#/components/schemas/ScoreDimension" } },
          summary: { type: "string" },
          adoption_guidance: { type: "string" },
          risk_flags: { type: "array", items: { type: "string" } },
          score_confidence: { $ref: "#/components/schemas/ScoreConfidence" },
          strongest_dimension: { $ref: "#/components/schemas/ScoreDimension" },
          weakest_dimension: { $ref: "#/components/schemas/ScoreDimension" },
          related_scores: { type: "object", additionalProperties: true },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" },
          links: { type: "object", additionalProperties: { type: "string" } },
          next_actions: { type: "array", items: { $ref: "#/components/schemas/NextAction" } },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      ScoreDimension: {
        type: "object",
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          score: { type: "number" },
          weight: { type: "number" },
          contribution: { type: "number" },
          explanation: { type: "string" }
        },
        additionalProperties: true
      },
      ScoreConfidence: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["high", "medium", "low"] },
          summary: { type: "string" },
          reasons: { type: "array", items: { type: "string" } },
          evidence_checklist: { type: "array", items: { type: "object", additionalProperties: true } },
          citation_guidance: { type: "string" }
        },
        additionalProperties: true
      },
      AtlasResponse: {
        type: "object",
        properties: {
          ecosystems: { type: "array", items: { $ref: "#/components/schemas/AtlasEcosystem" } },
          ecosystem: { $ref: "#/components/schemas/AtlasEcosystem" },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      AtlasEcosystem: {
        type: "object",
        required: ["id", "name", "projects", "stats", "map", "links"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          projects: { type: "array", items: { $ref: "#/components/schemas/ProjectCard" } },
          stats: { type: "object", additionalProperties: true },
          exploration_paths: { type: "array", items: { $ref: "#/components/schemas/NextAction" } },
          exploration_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
          comparison_paths: { type: "array", items: { type: "object", additionalProperties: true } },
          map: { $ref: "#/components/schemas/GraphResponse" },
          links: { type: "object", additionalProperties: { type: "string" } }
        },
        additionalProperties: true
      },
      AtlasJourneysResponse: {
        type: "object",
        required: ["journeys", "comparison_paths", "stats", "metadata"],
        properties: {
          name: { type: "string" },
          positioning: { type: "string" },
          journeys: { type: "array", items: { type: "object", additionalProperties: true } },
          comparison_paths: { type: "array", items: { type: "object", additionalProperties: true } },
          stats: { type: "object", additionalProperties: true },
          metadata: { $ref: "#/components/schemas/Metadata" }
        },
        additionalProperties: true
      },
      AgentMapResponse: {
        type: "object",
        required: ["surfaces", "short_path", "reference_path", "trust_policy"],
        properties: {
          name: { type: "string" },
          positioning: { type: "string" },
          purpose: { type: "string" },
          production_base_url: { type: "string" },
          rest_base_url: { type: "string" },
          mcp_endpoint: { type: "string" },
          openapi_url: { type: "string" },
          schema_url: { type: "string" },
          llms_url: { type: "string" },
          llms_full_url: { type: "string" },
          short_path: { type: "array", items: { $ref: "#/components/schemas/AgentPathStep" } },
          reference_path: { type: "array", items: { $ref: "#/components/schemas/AgentPathStep" } },
          core_surfaces: { type: "array", items: { type: "object", additionalProperties: true } },
          recommended_agent_flow: { type: "array", items: { type: "string" } },
          surfaces: { type: "array", items: { type: "object", additionalProperties: true } },
          trust_policy: { type: "object", additionalProperties: true }
        },
        additionalProperties: true
      },
      AgentPathStep: {
        type: "object",
        properties: {
          step: { type: "integer" },
          concept: { type: "string" },
          rest: { type: "array", items: { type: "string" } },
          mcp_tools: { type: "array", items: { type: "string" } },
          inspect: { type: "array", items: { type: "string" } },
          trust_fields: { type: "array", items: { type: "string" } },
          use_when: { type: "string" }
        },
        additionalProperties: true
      },
      GrpResponse: {
        type: "object",
        description: "Graph Reasoning Protocol result for planning, composing, comparing, or finding project sets.",
        properties: {
          solution_paths: { type: "array", items: { type: "object", additionalProperties: true } },
          recommended_stack: { type: "array", items: { type: "object", additionalProperties: true } },
          nodes: { type: "array", items: { type: "object", additionalProperties: true } },
          edges: { type: "array", items: { type: "object", additionalProperties: true } },
          explanation: { type: "array", items: { type: "string" } },
          decomposition: { type: "object", additionalProperties: true },
          confidence: { type: "string" },
          evidence: { $ref: "#/components/schemas/NormalizedEvidence" },
          caveats: { type: "array", items: { type: "string" } },
          confidence_reason: { type: "string" },
          source_fields: { type: "array", items: { type: "string" } },
          last_verified_at: { type: ["string", "null"], format: "date-time" },
          metadata: { type: "object", additionalProperties: true }
        },
        additionalProperties: true
      },
      GrpRequest: {
        type: "object",
        description: "Graph Reasoning Protocol request for project planning, comparison, discovery, or stack composition.",
        required: ["goal"],
        properties: {
          goal: {
            type: "string",
            description: "Natural-language project selection, comparison, planning, or stack-composition goal."
          },
          mode: {
            type: "string",
            enum: ["plan", "compare", "find", "compose"],
            default: "plan",
            description: "Reasoning mode. Defaults to plan when omitted."
          },
          constraints: {
            type: "object",
            properties: {
              deploy: { type: "array", items: { type: "string" } },
              license: { type: "string" },
              complexity: { type: "string", enum: ["low", "medium", "high"] },
              agent_ready: { type: "boolean" },
              language: { type: "string" },
              category: { type: "string" }
            },
            additionalProperties: true
          },
          context: {
            type: "object",
            properties: {
              previous_selected_projects: { type: "array", items: { type: "string" } },
              current_stack: { type: "array", items: { type: "string" } }
            },
            additionalProperties: true
          }
        },
        additionalProperties: true
      },
      McpDiscoveryResponse: {
        type: "object",
        description: "GET /mcp discovery response for agents before JSON-RPC tool calls.",
        required: ["endpoint", "tools"],
        properties: {
          endpoint: { type: "string" },
          docs_url: { type: "string" },
          schema_url: { type: "string" },
          health_url: { type: "string" },
          quality_url: { type: "string" },
          agent_map_url: { type: "string" },
          quickstart: { type: "object", additionalProperties: true },
          examples: { type: "array", items: { type: "object", additionalProperties: true } },
          agent_map: { $ref: "#/components/schemas/AgentMapResponse" },
          tools: { type: "array", items: { type: "object", additionalProperties: true } }
        },
        additionalProperties: true
      },
      McpJsonRpcRequest: {
        type: "object",
        description: "JSON-RPC 2.0 request accepted by POST /mcp.",
        required: ["jsonrpc", "method"],
        properties: {
          jsonrpc: { type: "string", const: "2.0" },
          id: {
            oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
            description: "Client-chosen request id returned unchanged in success or error responses. Omit for JSON-RPC notifications."
          },
          method: {
            type: "string",
            enum: ["initialize", "notifications/initialized", "tools/list", "tools/call"],
            description: "Supported JSON-RPC method."
          },
          params: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tool name for tools/call." },
              arguments: {
                type: "object",
                description: "Tool arguments. Pass require_d1=true for high-confidence D1-backed reads.",
                additionalProperties: true
              }
            },
            additionalProperties: true
          }
        },
        additionalProperties: true
      },
      McpJsonRpcSuccessResponse: {
        type: "object",
        description:
          "JSON-RPC 2.0 success response. initialize returns server capabilities, tools/list returns tool metadata, and tools/call returns MCP content blocks; Git.Top serializes structured tool payloads as JSON text in result.content[0].text.",
        required: ["jsonrpc", "id", "result"],
        properties: {
          jsonrpc: { type: "string", const: "2.0" },
          id: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
          result: {
            anyOf: [
              {
                type: "object",
                description: "initialize result.",
                properties: {
                  protocolVersion: { type: "string" },
                  capabilities: { type: "object", additionalProperties: true },
                  serverInfo: { type: "object", additionalProperties: true }
                },
                additionalProperties: true
              },
              {
                type: "object",
                description: "tools/list result.",
                properties: {
                  tools: { type: "array", items: { type: "object", additionalProperties: true } }
                },
                additionalProperties: true
              },
              {
                type: "object",
                description: "tools/call result. Parse text content as JSON.",
                required: ["content"],
                properties: {
                  content: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["type", "text"],
                      properties: {
                        type: { type: "string", enum: ["text"] },
                        text: {
                          type: "string",
                          description: "JSON string containing the structured tool result, usually with metadata.source and metadata.reason."
                        }
                      },
                      additionalProperties: true
                    }
                  }
                },
                additionalProperties: true
              }
            ]
          }
        },
        additionalProperties: true
      },
      McpJsonRpcErrorResponse: {
        type: "object",
        description: "JSON-RPC 2.0 error response. Strict D1 failures use code -32003.",
        required: ["jsonrpc", "id", "error"],
        properties: {
          jsonrpc: { type: "string", const: "2.0" },
          id: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "integer",
                description: "JSON-RPC error code. Common values include -32700 parse error, -32601 method/tool not found, -32602 invalid params, and -32003 D1 required."
              },
              message: { type: "string" }
            },
            additionalProperties: true
          }
        },
        additionalProperties: true
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

function jsonResponse(description: string, schemaRef: string, example?: unknown) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: schemaRef },
        ...(example === undefined ? {} : { example })
      }
    }
  };
}

function metadataExample() {
  return {
    source: "d1",
    reason: "d1_query",
    project_count: 500,
    generated_at: "2026-07-04T00:00:00.000Z"
  };
}

function projectCardExample() {
  return {
    project_id: "cloudflare/agents",
    repo: "cloudflare/agents",
    name: "agents",
    github_url: "https://github.com/cloudflare/agents",
    language: "TypeScript",
    license: "MIT",
    project_kind: "project",
    category: ["agent_framework"],
    description: "Build and deploy AI agents on Cloudflare Workers.",
    deployments: ["cloudflare", "serverless"],
    difficulty: "intermediate",
    cloudflare_ready: true,
    git_top_score: 86,
    quality_score: 82,
    agent_score: 90,
    quality_signal_confidence: {
      stars_30d_delta: "snapshot",
      commits_30d: "complete",
      releases_180d: "partial",
      contributors_90d: "complete"
    },
    evidence: {
      source_fields: ["agent_card.classification", "metrics"],
      caveats: [],
      confidence_reason: "Evidence is usable for comparison.",
      last_verified_at: "2026-07-04T00:00:00.000Z"
    },
    caveats: [],
    confidence_reason: "Evidence is usable for comparison.",
    source_fields: ["agent_card.classification", "metrics"],
    last_verified_at: "2026-07-04T00:00:00.000Z"
  };
}

function healthExample() {
  return {
    ok: true,
    db: "available",
    project_count: 500,
    raw_project_count: 500,
    knowledge_ready_project_count: 500,
    sync_health: "healthy",
    sync_freshness: "fresh",
    last_successful_sync_at: "2026-07-04T00:00:00.000Z",
    hours_since_successful_sync: 1,
    metadata: metadataExample()
  };
}

function trustGateExample() {
  return {
    name: "Git.Top Trust Gate",
    decision: "allow",
    production_ready: true,
    checks: [
      {
        id: "d1-source",
        label: "D1-backed source",
        status: "pass",
        observed: "available / d1",
        requirement: "db=available and metadata.source=d1"
      }
    ],
    required_for_high_confidence: ["metadata.source=d1", "db=available", "sync_freshness=fresh"],
    agent_policy: {
      cite: ["metadata.source", "sync_freshness", "data_trust_score"],
      disclose_when: ["seed fallback is active", "sync is stale or degraded"]
    },
    health: healthExample(),
    sync: { health: "healthy", freshness: "fresh" },
    quality: qualityExample(),
    metadata: metadataExample()
  };
}

function qualityExample() {
  return {
    score: 96,
    release_score: 96,
    data_trust_score: 82,
    score_summary: {
      release_score_meaning: "Release gate score.",
      data_trust_score_meaning: "Corpus trust score.",
      risk_level_meaning: "Risk level summarizes corpus confidence."
    },
    risk_level: "low",
    risk_summary: {
      level: "low",
      reasons: [],
      low_confidence_classification_rate: 0.04,
      collection_review_rate: 0.02,
      stale_project_rate: 0.01,
      stale_collection_rate: 0
    },
    coverage: {
      covered_categories: 14,
      total_categories: 14,
      missing_categories: []
    },
    metadata: metadataExample()
  };
}

function searchExample() {
  return {
    query: { q: "cloudflare agent framework", limit: 3, require_d1: true },
    search: {
      applied_filters: { q: "cloudflare agent framework" },
      known_filter_values: { project_kind: ["project", "collection"], min_confidence: ["low", "medium", "high"] }
    },
    projects: [projectCardExample()],
    metadata: metadataExample()
  };
}

function trendingExample() {
  return {
    projects: [projectCardExample()],
    metadata: metadataExample()
  };
}

function trendsExample() {
  return {
    summary: "Agent frameworks and MCP projects are leading current corpus demand.",
    stats: { project_count: 500, category_count: 14 },
    trend_signals: [{ label: "Cloudflare-ready agents", strength: "high" }],
    categories: [{ category: "agent_framework", count: 48 }],
    deployments: [{ deployment: "cloudflare", count: 36 }],
    languages: [{ language: "TypeScript", count: 120 }],
    rising_projects: [projectCardExample()],
    agent_briefing: ["Use Trust Gate before high-confidence recommendations."],
    metadata: metadataExample()
  };
}

function projectExample() {
  return {
    project_id: "cloudflare/agents",
    repo: "cloudflare/agents",
    summary: {
      tl_dr: "Cloudflare Workers-native agent runtime.",
      purpose: "Build stateful tool-using agents on Cloudflare infrastructure.",
      install: "Follow the repository README for package setup.",
      inputs: ["task prompt", "tools", "state"],
      outputs: ["agent runs", "tool calls"],
      good_for: ["Cloudflare-native agents"],
      not_good_for: ["Python-only local stacks"],
      deployment: ["cloudflare"],
      alternatives: [{ repo: "langchain-ai/langgraph", reason: "Broader graph workflow ecosystem." }]
    },
    project: projectCardExample(),
    knowledge: { project: { full_name: "cloudflare/agents" } },
    related: [{ repo: "cloudflare/workers-sdk", reason: "Shared Cloudflare deployment target." }],
    classification: {
      category: { value: "agent_framework", confidence: "high", evidence: ["Repository topics and README mention agents."] }
    },
    quality_signal_confidence: projectCardExample().quality_signal_confidence,
    evidence: {
      classification: {
        category: { value: "agent_framework", confidence: "high", evidence: ["Repository topics and README mention agents."] }
      },
      quality_signal_confidence: projectCardExample().quality_signal_confidence,
      source_fields: ["project.description", "agent_card.classification", "metrics"],
      caveats: [],
      confidence_reason: "Classification evidence and quality signals are usable for shortlist reasoning.",
      last_verified_at: "2026-07-04T00:00:00.000Z"
    },
    caveats: [],
    confidence_reason: "Classification evidence and quality signals are usable for shortlist reasoning.",
    source_fields: ["project.description", "agent_card.classification", "metrics"],
    last_verified_at: "2026-07-04T00:00:00.000Z",
    metadata: metadataExample()
  };
}

function recommendationExample() {
  return {
    query: {
      use_case: "build Cloudflare-ready agent workflows",
      deployment: "cloudflare",
      category: "agent_framework",
      limit: 3
    },
    recommendations: [
      {
        ...projectCardExample(),
        decision_summary: "Best first pick for Cloudflare Workers-native agent workflows.",
        reasons: ["Matches deployment=cloudflare", "Agent framework category match"],
        tradeoffs: ["Less suitable for Python-only local stacks"],
        fit_profile: { primary_fit: "Cloudflare-native agent runtime" },
        adoption_plan: ["Inspect project", "Check score", "Compare alternatives"],
        risk_flags: [],
        matched_constraints: { deployment: "cloudflare", category: "agent_framework" },
        unmatched_constraints: [],
        ranking_signals: { use_case_match: 0.92, deployment_fit: 1 },
        confidence: "high",
        confidence_reason: "High confidence because deployment and category constraints match.",
        evidence: {
          source_fields: ["recommendation.ranking_signals", "agent_card.classification", "metrics"],
          caveats: [],
          confidence_reason: "High confidence because deployment and category constraints match.",
          last_verified_at: "2026-07-04T00:00:00.000Z"
        },
        caveats: [],
        source_fields: ["recommendation.ranking_signals", "agent_card.classification", "metrics"],
        last_verified_at: "2026-07-04T00:00:00.000Z",
        next_actions: [{ label: "Inspect graph", href: "/api/graph/cloudflare/agents", kind: "graph" }]
      }
    ],
    metadata: metadataExample()
  };
}

function benchmarkExample() {
  return {
    name: "Git.Top Public Trust Benchmark",
    positioning: "The Knowledge Graph of Open Source",
    summary: "Recommendation eval top-3 hit rate is 1; explanation checks are 12/12; data trust is 82/100 with 12 review queue items.",
    generated_at: "2026-07-04T00:00:00.000Z",
    evaluation: {
      generated_at: "2026-06-30T00:08:13.734Z",
      evaluated_cases: 28,
      top1_hit_rate: 0.929,
      top3_hit_rate: 1,
      category_accuracy: 1,
      deployment_accuracy: 1,
      cloudflare_readiness_accuracy: 1,
      unacceptable_hit_count: 0,
      review_focus: [{ id: "search-coding-agent", issue: "top-1 miss", expected: ["openai/codex"], observed: ["smol-ai/developer"] }],
      source_report: "docs/EVAL_QUALITY.md"
    },
    explanations: {
      generated_at: "2026-07-04T02:51:39.580Z",
      checks: 12,
      passed: 12,
      failed: 0,
      coverage: 1,
      source_report: "docs/EVAL_EXPLANATIONS.md"
    },
    data_coverage: {
      project_count: 500,
      category_coverage: "14/14",
      low_confidence_classification_rate: 0.04,
      data_trust_score: 82,
      release_score: 96,
      risk_level: "low"
    },
    review_queue: {
      review_count: 12,
      low_signal_count: 18,
      top_impact_score: 88,
      top_items: [{ project_id: "cloudflare/agents", category: "agent_framework", impact_score: 88 }]
    },
    known_limitations: ["Eval quality is a CI-safe baseline over curated cases and generated fixtures."],
    recommended_use: ["Use top_3_hit_rate, explanation coverage, data_trust_score, and review_queue before high-confidence production recommendations."],
    links: {
      html: "/benchmark",
      api: "/api/benchmark",
      quality: "/api/quality",
      review: "/api/quality/review",
      trust: "/api/trust"
    },
    metadata: metadataExample()
  };
}

function roadmapExample() {
  return {
    positioning: "The Knowledge Graph of Open Source",
    summary: "Git.Top is expanding agent-native project selection surfaces.",
    completion: 92,
    current_focus: ["agent-api", "quality"],
    phases: [{ id: "agent-api", status: "shipped", progress: 100, api_endpoints: ["/api/agent-map"] }],
    agent_use: ["Use /api/agent-map to choose the right surface."],
    pages: ["/docs", "/trust", "/benchmark"],
    api_endpoints: ["/api/agent-map", "/api/benchmark"],
    mcp_tools: ["get_project", "get_public_benchmark"]
  };
}

function quickstartExample() {
  return {
    positioning: "The Knowledge Graph of Open Source",
    production_endpoints: { rest: "https://git.top", mcp: "https://git.top/mcp" },
    steps: [{ id: "trust", rest: "GET /api/trust", inspect: ["decision", "metadata.source"] }],
    output_pattern: ["Cite metadata.source and evidence fields."],
    trust_policy: ["Use require_d1=true for fail-closed production reads."]
  };
}

function recipesExample() {
  return {
    positioning: "The Knowledge Graph of Open Source",
    recipes: [{ id: "choose-cloudflare-agent-framework", outcome: "Shortlist Cloudflare-ready agent frameworks.", steps: [{ endpoint: "/api/recommend" }] }],
    trust_policy: ["Check /api/trust before high-confidence recommendations."]
  };
}

function examplesExample() {
  return {
    positioning: "The Knowledge Graph of Open Source",
    examples: [{ id: "health-gate", endpoint: "/api/health", command: "curl https://git.top/api/health", trust_checks: ["metadata.source"] }],
    trust_policy: ["Inspect metadata.source before citing results."]
  };
}

function qualityReviewExample() {
  return {
    project_count: 500,
    review_count: 12,
    low_signal_count: 18,
    medium_signal_count: 24,
    category_counts: { agent_framework: 3 },
    items: [{ project_id: "cloudflare/agents", category: "agent_framework", impact_score: 88, suggested_action: "Review classification evidence." }],
    metadata: metadataExample()
  };
}

function workflowExample() {
  return {
    input: {
      intent: "choose a Cloudflare-ready agent framework",
      constraints: { deployment: "cloudflare", category: "agent_framework" }
    },
    recommended_sequence: [
      { step: 1, label: "Trust preflight", url: "/api/trust", method: "GET", inspect: ["decision", "metadata.source"] },
      { step: 2, label: "Recommend", url: "/api/recommend?deployment=cloudflare&category=agent_framework", method: "GET", mcp_tool: "recommend_project" }
    ],
    shortlist: recommendationExample().recommendations,
    trend_context: { top_categories: ["agent_framework", "mcp_server"] },
    agent_map: { short_path: [], reference_path: [], surfaces: [], trust_policy: { high_confidence_source: "metadata.source=d1" } },
    trust_policy: { production_check: "Use require_d1=true for high-confidence recommendations." },
    metadata: metadataExample()
  };
}

function compareExample() {
  return {
    requested_repos: ["cloudflare/agents", "langchain-ai/langchain"],
    resolved_repos: [{ requested_id: "cloudflare/agents", resolved_id: "cloudflare/agents", resolution: "canonical" }],
    project_ids: ["cloudflare/agents", "langchain-ai/langchain"],
    order: "input",
    context: { deployment: "cloudflare" },
    summary: "cloudflare/agents is the strongest Cloudflare deployment fit.",
    stats: { candidate_count: 2, highest_agent_score: 90 },
    projects: [projectCardExample()],
    decision_matrix: [
      {
        repo: "cloudflare/agents",
        strengths: ["Cloudflare-ready"],
        tradeoffs: ["Smaller ecosystem than LangChain"],
        next_step: "Inspect graph and score evidence."
      }
    ],
    winner: { repo: "cloudflare/agents" },
    reasoning: ["Deployment fit favors cloudflare/agents."],
    next_actions: [{ label: "Score winner", href: "/api/score/cloudflare/agents", kind: "score" }],
    metadata: metadataExample()
  };
}

function alternativesExample() {
  const evidence = {
    source_fields: ["agent_card.classification", "alternative.match_signals", "alternative.similarity_score", "alternative.replacement_type"],
    caveats: ["Compare deployment, language, and dependency fit before switching."],
    confidence_reason: "Top alternative has 81/100 similarity with same category evidence.",
    last_verified_at: "2026-07-04T00:00:00.000Z"
  };
  return {
    project: projectCardExample(),
    summary: "Alternatives for Cloudflare-native agent workflows.",
    stats: { candidate_count: 5, average_similarity: 0.76 },
    alternatives: [{ repo: "langchain-ai/langgraph", reason: "Graph-based agent workflow alternative." }],
    alternative_matches: [
      {
        ...projectCardExample(),
        project_id: "langchain-ai/langgraph",
        repo: "langchain-ai/langgraph",
        name: "langgraph",
        similarity_score: 0.81,
        alternative_reason: "Similar agent workflow category.",
        replacement_type: "same_category",
        fit_summary: "Better for Python graph workflows.",
        adoption_notes: ["Compare runtime and deployment requirements."],
        replacement_risk: "medium",
        match_signals: { category_overlap: true },
        evidence,
        caveats: evidence.caveats,
        confidence_reason: evidence.confidence_reason,
        source_fields: evidence.source_fields,
        last_verified_at: evidence.last_verified_at
      }
    ],
    next_actions: [{ label: "Compare alternatives", href: "/api/compare?repos=cloudflare/agents,langchain-ai/langgraph", kind: "compare" }],
    comparison_links: { compare: "/api/compare?repos=cloudflare/agents,langchain-ai/langgraph" },
    evidence,
    caveats: evidence.caveats,
    confidence_reason: evidence.confidence_reason,
    source_fields: evidence.source_fields,
    last_verified_at: evidence.last_verified_at,
    metadata: metadataExample()
  };
}

function graphExample() {
  const evidence = {
    source_fields: ["agent_card.classification", "graph.nodes", "graph.edges", "graph.relationship_groups"],
    caveats: [],
    confidence_reason: "cloudflare/agents graph is grounded in indexed alternatives, related projects, deployments, dependencies, and use cases.",
    last_verified_at: "2026-07-04T00:00:00.000Z"
  };
  return {
    focus: "cloudflare/agents",
    project: {
      repo: "cloudflare/agents",
      name: "agents",
      description: "Build AI agents on Cloudflare.",
      maintainer: "cloudflare",
      license: "MIT",
      language: "TypeScript",
      recent_activity: "fresh"
    },
    summary: "Focused graph for cloudflare/agents.",
    graph_stats: { node_count: 4, edge_count: 3, relationship_counts: { related: 1, deployment: 1, category: 1 } },
    relationship_groups: {
      alternatives: [{ repo: "langchain-ai/langgraph", reason: "Agent workflow alternative." }],
      related: [{ repo: "cloudflare/workers-sdk", reason: "Shared deployment target." }],
      dependencies: ["workers"],
      deployment_targets: ["cloudflare"],
      use_cases: ["stateful agents"]
    },
    nodes: [
      { id: "cloudflare/agents", label: "agents", kind: "project", repo: "cloudflare/agents", score: 90 },
      { id: "deployment:cloudflare", label: "cloudflare", kind: "deployment" }
    ],
    edges: [{ source: "cloudflare/agents", target: "deployment:cloudflare", kind: "deployment", weight: 96 }],
    evidence,
    caveats: evidence.caveats,
    confidence_reason: evidence.confidence_reason,
    source_fields: evidence.source_fields,
    last_verified_at: evidence.last_verified_at,
    metadata: metadataExample()
  };
}

function grpExample() {
  const evidence = {
    source_fields: ["grp.request", "grp.decomposition", "grp.seeds", "grp.nodes", "grp.edges", "grp.solution_paths", "grp.recommended_stack"],
    caveats: [],
    confidence_reason: "GRP result is grounded in retrieved seed projects, graph nodes, and relationship or path evidence.",
    last_verified_at: "2026-07-04T00:00:00.000Z"
  };
  return {
    intent: "find a Cloudflare-ready agent framework",
    mode: "find",
    result_type: "project_set",
    sub_goals: ["cloudflare", "agent framework"],
    nodes: [{ id: "cloudflare/agents", label: "agents", kind: "project", score: { final_score: 92 }, reasons: ["Matches Cloudflare deployment."] }],
    edges: [{ source: "cloudflare/agents", target: "deployment:cloudflare", kind: "deployment", weight: 92, reason: "Deployment compatibility." }],
    solution_paths: [],
    recommended_stack: [],
    alternatives: [],
    explanation: ["GRP interpreted the goal as find a Cloudflare-ready agent framework."],
    evidence,
    caveats: evidence.caveats,
    confidence_reason: evidence.confidence_reason,
    source_fields: evidence.source_fields,
    last_verified_at: evidence.last_verified_at,
    metadata: {
      version: "grp.v1",
      generated_at: "2026-07-04T00:00:00.000Z",
      candidate_count: 1,
      max_depth: 2,
      data_source: metadataExample()
    }
  };
}

function scoreExample() {
  return {
    project: projectCardExample(),
    project_id: "cloudflare/agents",
    score: 86,
    git_top_score: 86,
    quality_score: 82,
    agent_score: 90,
    dimensions: [{ key: "agent_readability", label: "Agent Readability", score: 92, weight: 16, contribution: 14.7 }],
    summary: "cloudflare/agents scores 86/100.",
    adoption_guidance: "Strong candidate for shortlist inclusion.",
    risk_flags: [],
    score_confidence: {
      level: "high",
      summary: "Score evidence is strong enough for shortlist ranking.",
      reasons: ["All score evidence checks are strong."],
      evidence_checklist: [{ signal: "Classification evidence", status: "strong" }],
      citation_guidance: "Cite metadata.source, weakest_dimension, risk_flags, and score_confidence.level."
    },
    strongest_dimension: { key: "agent_readability", label: "Agent Readability", score: 92 },
    weakest_dimension: { key: "stability", label: "Stability", score: 74 },
    evidence: {
      deployments: ["cloudflare"],
      quality_signal_confidence: projectCardExample().quality_signal_confidence,
      source_fields: ["agent_card.classification", "metrics"],
      caveats: [],
      confidence_reason: "Score evidence is strong enough for shortlist ranking.",
      last_verified_at: "2026-07-04T00:00:00.000Z"
    },
    caveats: [],
    confidence_reason: "Score evidence is strong enough for shortlist ranking.",
    source_fields: ["agent_card.classification", "metrics"],
    last_verified_at: "2026-07-04T00:00:00.000Z",
    links: { compare_api: "/api/compare?repos=cloudflare/agents" },
    next_actions: [{ label: "Compare shortlist", href: "/api/compare?repos=cloudflare/agents", kind: "compare" }],
    metadata: metadataExample()
  };
}

function mcpDiscoveryExample() {
  return {
    endpoint: "https://git.top/mcp",
    docs_url: "https://git.top/docs",
    schema_url: "https://git.top/api/schema/project.v2",
    health_url: "https://git.top/api/health",
    quality_url: "https://git.top/api/quality",
    agent_map_url: "https://git.top/api/agent-map",
    quickstart: { first_step: "Call tools/list, then use require_d1 for high-confidence reads." },
    agent_map: { short_path: [], reference_path: [], surfaces: [], trust_policy: { high_confidence_source: "metadata.source=d1" } },
    tools: [
      {
        name: "search_projects",
        description: "Search Git.Top projects.",
        inputSchema: { type: "object", properties: { query: { type: "string" }, require_d1: { type: "boolean" } } }
      }
    ]
  };
}

function mcpJsonRpcSuccessExample() {
  return {
    jsonrpc: "2.0",
    id: 2,
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            projects: [projectCardExample()],
            metadata: metadataExample()
          })
        }
      ]
    }
  };
}

function mcpJsonRpcErrorExample() {
  return {
    jsonrpc: "2.0",
    id: 2,
    error: {
      code: -32003,
      message: "D1-backed knowledge is required, but current source is seed."
    }
  };
}

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
