import {
  describeSearchResult,
  findAlternativesFromList,
  findRelatedProjectsFromList,
  getProjectKnowledgeFromList,
  recommendProjectList,
  searchProjectList
} from "./project-search";
import { buildAgentMap } from "./agent-map";
import { buildAlternativesDecision, generateAlternativeMatches, toAlternativeMatchView } from "./alternatives";
import { buildAtlasEcosystemView, findAtlasEcosystem, listAtlasEcosystems } from "./atlas-page";
import { buildPublicBenchmarkReportFromInputs } from "./benchmark";
import type { ProjectKnowledgeResult } from "./knowledge-source";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { normalizeGrpRequest, runGrpQuery } from "./grp";
import { errorJson, json, rawJson, stringifyApiJson } from "./http";
import { buildProjectSummary, toProjectKnowledgeView, withRelatedProjects } from "./project-view";
import { buildProjectScoreExplanation } from "./score";
import { buildLowConfidenceReviewReport, buildQualityReport } from "./quality";
import { getKnowledgeForSourcePolicy } from "./source-policy";
import { buildTrendsView } from "./trends";
import { buildTrustGate } from "./trust-gate";
import { buildAgentWorkflow } from "./workflow";
import { resolveProject } from "./project-aliases";
import type { Env, ProjectKnowledge } from "./types";

interface RpcRequest {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface ToolErrorResult {
  toolError: {
    code: number;
    message: string;
  };
}

const tools = [
  {
    name: "search_projects",
    description:
      "Search Git.Top projects by query, category, deployment, difficulty, language, or Cloudflare readiness. Results include project_kind and collection_metadata for resource hubs and curated collections.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string" },
        deployment: { type: "string" },
        difficulty: { type: "string" },
        language: { type: "string" },
        cloudflare_ready: { type: "boolean" },
        ranking: {
          type: "string",
          enum: ["browse"],
          description: "Optional browse ranking for broad category/deployment discovery with larger limits. Defaults to exact-intent search ranking."
        },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "get_trust_gate",
    description:
      "Return the Trust Gate production-readiness decision before agents cite or recommend projects with high confidence.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_quality_report",
    description:
      "Return the corpus quality and coverage report with release score, data trust score, risk level, coverage, issue summary, and review queue size.",
    inputSchema: {
      type: "object",
      properties: {
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "get_public_benchmark",
    description:
      "Return the public trust benchmark with eval hit rates, explanation coverage, data trust, review queue size, known limitations, and source links.",
    inputSchema: {
      type: "object",
      properties: {
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "get_project",
    description:
      "Return structured Git.Top knowledge for a project or collection, including the compact agent summary, overview, alternatives, deployments, quality score, agent score, project_kind, and collection_metadata when applicable.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Canonical owner/repo identifier or a Git.Top product alias such as claude-code or cursor. The repo field may also contain owner/repo."
        },
        owner: { type: "string", description: "GitHub owner; use with repo when project_id is omitted." },
        repo: { type: "string", description: "GitHub repository name, or owner/repo when owner is omitted." },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      anyOf: [{ required: ["project_id"] }, { required: ["repo"] }, { required: ["owner", "repo"] }]
    }
  },
  {
    name: "get_alternatives",
    description: "Find alternative projects for a canonical owner/name project id or Git.Top product alias.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_related_projects",
    description: "Find adjacent projects connected by category, deployment, dependencies, topics, or use cases. Use this for ecosystem exploration rather than direct replacements.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_deployment",
    description: "Return deployment options and Cloudflare readiness for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_quality_score",
    description: "Return quality score, agent score, and underlying quality signals for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "recommend_project",
    description: "Recommend open source projects for a concrete agent use case and constraints.",
    inputSchema: {
      type: "object",
      properties: {
        use_case: { type: "string" },
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
        },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["use_case"]
    }
  },
  {
    name: "get_trends",
    description: "Return corpus-level Git.Top trends across categories, deployments, languages, rising projects, and agent briefing notes.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum trend buckets and rising projects to return."
        },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "get_agent_workflow",
    description: "Return a structured Git.Top workflow that guides an agent from trends to recommendations, graph, alternatives, score, compare, and trust checks.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", description: "Natural-language selection goal." },
        use_case: { type: "string", description: "Concrete project use case." },
        project_id: { type: "string", description: "Optional focus project or product alias." },
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
        },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "get_atlas",
    description: "Return Git.Top Atlas ecosystem maps with stats, exploration paths, comparison paths, graph nodes, edges, representative projects, and next journey links.",
    inputSchema: {
      type: "object",
      properties: {
        ecosystem: {
          type: "string",
          description: "Optional Atlas ecosystem id such as cloudflare, agents, mcp, rag, or browser-ai. Omit to return all curated ecosystems."
        },
        limit: {
          type: "number",
          description: "Maximum projects per ecosystem."
        },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "find_alternatives",
    description: "Find alternative projects for a canonical owner/name project id or Git.Top product alias.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        reason: { type: "string" },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_project_card",
    description:
      "Return the complete Agent Card for a project, including project_kind and collection_metadata for collection-style repositories.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_project_graph",
    description: "Return graph nodes and edges for project relationships, alternatives, deployments, use cases, and dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        limit: { type: "number" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      }
    }
  },
  {
    name: "compare_projects",
    description: "Compare projects by deployment, maintenance, difficulty, Cloudflare readiness, and use case fit.",
    inputSchema: {
      type: "object",
      properties: {
        project_ids: {
          type: "array",
          items: { type: "string" }
        },
        criteria: {
          type: "array",
          items: { type: "string" }
        },
        deployment: { type: "string" },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["project_ids"]
    }
  },
  {
    name: "git_top_grp_query",
    description: "Run Git.Top Graph Reasoning Protocol over the open-source knowledge graph to produce project sets, paths, stacks, alternatives, and explanations.",
    inputSchema: {
      type: "object",
      properties: {
        goal: { type: "string" },
        mode: {
          type: "string",
          enum: ["plan", "compare", "find", "compose"]
        },
        constraints: {
          type: "object",
          properties: {
            deploy: {
              type: "array",
              items: { type: "string" }
            },
            license: { type: "string" },
            complexity: {
              type: "string",
              enum: ["low", "medium", "high"]
            },
            agent_ready: { type: "boolean" },
            language: { type: "string" },
            category: { type: "string" }
          }
        },
        context: {
          type: "object",
          properties: {
            previous_selected_projects: {
              type: "array",
              items: { type: "string" }
            },
            current_stack: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        require_d1: {
          type: "boolean",
          description: "Fail closed unless the tool result is backed by D1 instead of seed fallback."
        }
      },
      required: ["goal"]
    }
  }
];

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    const agentMap = buildAgentMap();
    return json({
      name: "git-top",
      title: "Git.Top GitHub Knowledge Layer for AI Agents",
      description:
        "Agent-native open source project intelligence with trust-first discovery, search, project lookup, alternatives, deployment signals, quality scores, and graph reasoning.",
      protocolVersion: "2025-06-18",
      endpoint: "/mcp",
      docsUrl: "https://git.top/docs",
      openapiUrl: "https://git.top/openapi.json",
      apiOpenapiUrl: "https://git.top/api/openapi.json",
      schemaUrl: "https://git.top/api/schema/project.v2",
      healthUrl: "https://git.top/api/health",
      trustUrl: "https://git.top/api/trust",
      qualityUrl: "https://git.top/api/quality",
      agentMapUrl: "https://git.top/api/agent-map",
      agentMap,
      agentApi: {
        openapiUrl: "https://git.top/api/openapi.json",
        responseContract: {
          toolContentType: "application/json",
          toolContentBlock: "content[0].text",
          parseInstruction: "Parse JSON-RPC tools/call result.content text blocks as JSON before reading metadata or fields.",
          strictSourceArgument: "Pass require_d1: true on tools that read project knowledge when seed fallback should fail closed.",
          strictSourceError: { code: -32003, message: "D1-backed knowledge is required, but current source is seed." }
        },
        structuredPostEndpoints: [
          {
            path: "/api/project",
            method: "POST",
            description: "Fetch one project knowledge record with related projects, scores, evidence, and metadata.",
            bodyExample: { project_id: "cloudflare/agents", related_limit: 8 }
          },
          {
            path: "/api/recommend",
            method: "POST",
            description: "Recommend projects from a use case and structured constraints.",
            bodyExample: {
              use_case: "build Cloudflare-ready agent workflows",
              constraints: { deployment: "cloudflare", category: "agent_framework", license: "MIT", cloudflare_ready: true },
              limit: 5
            }
          },
          {
            path: "/api/workflow",
            method: "POST",
            description: "Return an agent selection workflow across trends, recommendations, graph, alternatives, score, compare, and trust checks.",
            bodyExample: {
              intent: "choose a Cloudflare-ready agent framework",
              constraints: { deployment: "cloudflare", category: "agent_framework", cloudflare_ready: true },
              limit: 5
            }
          },
          {
            path: "/api/compare",
            method: "POST",
            description: "Compare a shortlist of projects by deployment fit, maintenance, quality, and agent score.",
            bodyExample: { project_ids: ["cloudflare/agents", "langchain-ai/langchain"], deployment: "cloudflare" }
          },
          {
            path: "/api/alternatives",
            method: "POST",
            description: "Find alternatives for a known project with similarity scores and match signals.",
            bodyExample: { project_id: "langchain-ai/langchain", limit: 12 }
          },
          {
            path: "/api/related",
            method: "POST",
            description: "Find adjacent ecosystem projects connected by category, deployment, dependency, topics, or use cases.",
            bodyExample: { project_id: "cloudflare/agents", limit: 8 }
          },
          {
            path: "/api/score",
            method: "POST",
            description: "Explain a project's Git.Top Score with weighted dimensions, evidence, and related scores.",
            bodyExample: { project_id: "cloudflare/agents" }
          },
          {
            path: "/api/graph",
            method: "POST",
            description: "Fetch a project knowledge graph with grouped alternatives, related projects, dependencies, deployments, and use cases.",
            bodyExample: { project_id: "cloudflare/agents", limit: 24 }
          },
          {
            path: "/api/grp/query",
            method: "POST",
            description: "Run Graph Reasoning Protocol for graph-grounded planning, comparison, discovery, or stack composition.",
            bodyExample: {
              goal: "compose a Cloudflare-ready coding agent stack",
              mode: "compose",
              constraints: { deploy: ["cloudflare"], agent_ready: true }
            }
          }
        ],
        readEndpoints: [
          {
            path: "/api/trends",
            method: "GET",
            description: "Inspect corpus-level category, deployment, language, rising-project, and agent-briefing trend signals.",
            bodyExample: null
          },
          {
            path: "/api/trust",
            method: "GET",
            description: "Inspect the production-readiness Trust Gate before high-confidence recommendations.",
            bodyExample: null
          },
          {
            path: "/api/benchmark",
            method: "GET",
            description: "Inspect public eval health, explanation coverage, data trust, review queue, and known limitations.",
            bodyExample: null
          }
        ]
      },
      quickstart: [
      "GET /api/trust or call get_trust_gate before high-confidence production recommendations.",
      "GET /api/benchmark or call get_public_benchmark when you need citable eval health, explanation coverage, and known limitations.",
      "GET /api/health to confirm system availability, then rely on metadata.source=d1 for production recommendations.",
      "Use agent_map.short_path first, then expand into agent_map.reference_path when you need the fuller discovery surface.",
        "Use structured POST endpoints under agent_api.structured_post_endpoints for project, recommendation, comparison, alternatives, graph, and GRP requests.",
        "Call tools/list to inspect available MCP tools.",
        "Call search_projects with query, category, deployment, and limit.",
        "Call get_project or compare_projects before presenting a final recommendation.",
        "Cite metadata, classification evidence, and quality_signal_confidence in high-confidence answers."
      ],
      examples: {
        toolsList: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {}
        },
        searchProjects: {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "search_projects",
            arguments: {
              query: "cloudflare agent framework",
              limit: 5
            }
          }
        },
        structuredRecommend: {
          method: "POST",
          url: "https://git.top/api/recommend",
          body: {
            use_case: "build Cloudflare-ready agent workflows",
            constraints: {
              deployment: "cloudflare",
              category: "agent_framework",
              cloudflare_ready: true
            },
            limit: 5
          }
        },
        publicBenchmark: {
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "get_public_benchmark",
            arguments: {
              require_d1: true
            }
          }
        }
      },
      tools
    });
  }

  if (request.method !== "POST") {
    return errorJson(405, "method_not_allowed", "MCP endpoint supports GET and POST.");
  }

  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, { tools });
  }

  if (body.method === "initialize") {
    return rpcResult(body.id, {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: "git-top",
        title: "Git.Top GitHub Knowledge Layer for AI Agents",
        version: "0.1.0"
      }
    });
  }

  if (body.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const result = await callTool(name, args, env);
    if (isToolErrorResult(result)) {
      return rpcError(body.id ?? null, result.toolError.code, result.toolError.message);
    }
    return rpcResult(body.id, {
      content: [
        {
          type: "text",
          text: stringifyApiJson(result)
        }
      ]
    });
  }

  return rpcError(body.id ?? null, -32601, "Method not found");
}

async function callTool(name: string, args: Record<string, unknown>, env: Env): Promise<unknown> {
  if (name === "search_projects") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const filters = {
      q: stringArg(args.query),
      category: stringArg(args.category),
      deployment: stringArg(args.deployment),
      difficulty: stringArg(args.difficulty),
      language: stringArg(args.language),
      cloudflareReady: boolArg(args.cloudflare_ready),
      ranking: stringArg(args.ranking),
      limit: numberArg(args.limit)
    };
    const projects = searchProjectList(knowledge.projects, filters);

    return {
      projects: projects.map(toProjectKnowledgeView),
      search: describeSearchResult(knowledge.projects, filters, projects.length),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const projectId = projectIdArg(args);
    const resolution = resolveMcpProject(knowledge.projects, projectId);
    const project = resolution?.project ?? null;
    const related = resolution ? findRelatedProjectsFromList(knowledge.projects, resolution.resolvedId, 8) : [];
    const projectView = project ? withRelatedProjects(toProjectKnowledgeView(project), related) : null;
    return {
      project_id: projectId || null,
      project: projectView,
      summary: projectView ? buildProjectSummary(projectView) : null,
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      metadata: knowledge.metadata
    };
  }

  if (name === "recommend_project") {
    const constraints = objectArg(args.constraints);
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      recommendations: recommendProjectList(knowledge.projects, {
        useCase: stringArg(args.use_case),
        deployment: stringArg(constraints.deployment),
        difficulty: stringArg(constraints.difficulty),
        language: stringArg(constraints.language),
        category: stringArg(constraints.category),
        license: stringArg(constraints.license),
        cloudflareReady: boolArg(constraints.cloudflare_ready),
        limit: numberArg(args.limit)
      }),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_trends") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      ...buildTrendsView(knowledge.projects, numberArg(args.limit) ?? 8),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_agent_workflow") {
    const constraints = objectArg(args.constraints);
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      ...buildAgentWorkflow(knowledge.projects, {
        intent: stringArg(args.intent),
        useCase: stringArg(args.use_case),
        projectId: stringArg(args.project_id),
        deployment: stringArg(constraints.deployment),
        difficulty: stringArg(constraints.difficulty),
        language: stringArg(constraints.language),
        category: stringArg(constraints.category),
        license: stringArg(constraints.license),
        cloudflareReady: boolArg(constraints.cloudflare_ready),
        limit: numberArg(args.limit)
      }),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_atlas") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const limit = numberArg(args.limit) ?? 8;
    const ecosystemId = stringArg(args.ecosystem);
    if (ecosystemId) {
      const ecosystem = findAtlasEcosystem(ecosystemId);
      if (!ecosystem) {
        return {
          toolError: {
            code: -32602,
            message: `Unknown Atlas ecosystem: ${ecosystemId}`
          }
        };
      }
      return {
        ecosystem: buildAtlasEcosystemView(knowledge.projects, ecosystem, limit),
        available_ecosystems: listAtlasEcosystems().map((item) => item.id),
        metadata: knowledge.metadata
      };
    }
    return {
      ecosystems: listAtlasEcosystems().map((ecosystem) => buildAtlasEcosystemView(knowledge.projects, ecosystem, limit)),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_quality_report") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      ...buildQualityReport(knowledge.projects),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_public_benchmark") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return buildPublicBenchmarkReportFromInputs(
      buildQualityReport(knowledge.projects),
      buildLowConfidenceReviewReport(knowledge.projects),
      knowledge.metadata,
      new Date().toISOString()
    );
  }

  if (name === "get_trust_gate") {
    return buildTrustGate(env);
  }

  if (name === "find_alternatives" || name === "get_alternatives") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    const project = resolution?.project ?? null;
    const matches = project ? generateAlternativeMatches(project, knowledge.projects, numberArg(args.limit) ?? 5) : [];
    const decision = project ? buildAlternativesDecision(project, matches) : null;
    return {
      project: project ? toProjectKnowledgeView(project) : null,
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      summary: decision?.summary ?? null,
      stats: decision?.stats ?? null,
      nextActions: decision?.nextActions ?? [],
      comparisonLinks: decision?.comparisonLinks ?? null,
      alternatives: matches.map((match) => toProjectKnowledgeView(match.project)),
      alternativeMatches: matches.map(toAlternativeMatchView),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_related_projects") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    return {
      project: resolution ? toProjectKnowledgeView(resolution.project) : null,
      related: resolution ? findRelatedProjectsFromList(knowledge.projects, resolution.resolvedId, numberArg(args.limit)).map(toProjectKnowledgeView) : [],
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_card") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    const project = resolution?.project ?? null;
    return {
      project_id: stringArg(args.project_id),
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      agent_card: project ? withDefaultAgentCardClassification(project.agentCard) : null,
      metrics: project?.metrics ?? null,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_deployment") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    const project = resolution?.project ?? null;
    return {
      project_id: stringArg(args.project_id),
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      deployments: project?.agentCard.deployment ?? [],
      cloudflare_ready: project?.agentCard.cloudflareReady ?? false,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_quality_score") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    const project = resolution?.project ?? null;
    const view = project ? toProjectKnowledgeView(project) : null;
    const scoreExplanation = project ? buildProjectScoreExplanation(project) : null;
    return {
      project_id: stringArg(args.project_id),
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      git_top_score: view?.gitTopScore ?? null,
      git_top_score_breakdown: view?.gitTopScoreBreakdown ?? null,
      score_explanation: scoreExplanation,
      quality_score: view?.qualityScore ?? null,
      agent_score: view?.agentScore ?? null,
      quality_signals: view?.qualitySignals ?? null,
      agent_score_breakdown: view?.agentScoreBreakdown ?? null,
      score_page: view ? `https://git.top/score/${view.repo}` : null,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_graph") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = stringArg(args.project_id) ? resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "") : null;
    return {
      graph: buildKnowledgeGraph(knowledge.projects, resolution?.resolvedId ?? stringArg(args.project_id), numberArg(args.limit) ?? 24),
      resolved_from: resolution ? mcpResolvedFrom(resolution) : null,
      metadata: knowledge.metadata
    };
  }

  if (name === "compare_projects") {
    const ids = arrayArg(args.project_ids);
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const foundProjects = ids
      .map((id) => getProjectKnowledgeFromList(knowledge.projects, String(id)))
      .filter(isProjectKnowledge);
    return {
      ...compareProjectKnowledge(foundProjects, { deployment: stringArg(args.deployment) }),
      requested_project_ids: ids.map(String),
      order: ids.length > 0 ? "input" : "default_score",
      metadata: knowledge.metadata
    };
  }

  if (name === "git_top_grp_query") {
    const parsed = normalizeGrpRequest(args);
    if (!parsed.ok) {
      return {
        toolError: {
          code: -32602,
          message: parsed.message
        }
      };
    }
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const result = runGrpQuery(knowledge.projects, parsed.request);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        dataSource: knowledge.metadata
      }
    };
  }

  return {
    toolError: {
      code: -32601,
      message: `Unknown tool: ${name}`
    }
  };
}

async function requireKnowledgeSource(env: Env, args: Record<string, unknown>): Promise<ProjectKnowledgeResult | ToolErrorResult> {
  const policy = await getKnowledgeForSourcePolicy(env, { requireD1: boolArg(args.require_d1) === true });
  if (policy.ok) {
    return policy.knowledge;
  }

  return {
    toolError: {
      code: -32003,
      message: policy.failure.message
    }
  };
}

function isToolErrorResult(value: unknown): value is ToolErrorResult {
  return Boolean(value && typeof value === "object" && "toolError" in value);
}

function rpcResult(id: RpcRequest["id"], result: unknown): Response {
  return rawJson({
    jsonrpc: "2.0",
    id: id ?? null,
    result
  });
}

function rpcError(id: RpcRequest["id"], code: number, message: string): Response {
  return rawJson(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message }
    },
    { status: 400 }
  );
}

function stringArg(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberArg(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boolArg(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function projectIdArg(args: Record<string, unknown>): string {
  const projectId = stringArg(args.project_id);
  if (projectId) {
    return projectId;
  }
  const repo = stringArg(args.repo);
  const owner = stringArg(args.owner);
  if (owner && repo && !repo.includes("/")) {
    return `${owner}/${repo}`;
  }
  return repo ?? "";
}

function resolveMcpProject(projects: ProjectKnowledge[], id: string): NonNullable<ReturnType<typeof resolveProject>> | null {
  return id ? resolveProject(projects, id) : null;
}

function mcpResolvedFrom(resolution: NonNullable<ReturnType<typeof resolveProject>>): { requested_id: string; resolved_id: string; resolution: "direct" | "alias" } {
  return {
    requested_id: resolution.requestedId,
    resolved_id: resolution.resolvedId,
    resolution: resolution.resolution
  };
}

function objectArg(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayArg(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isProjectKnowledge(value: ProjectKnowledge | null): value is ProjectKnowledge {
  return value !== null;
}

function withDefaultAgentCardClassification(card: ProjectKnowledge["agentCard"]): ProjectKnowledge["agentCard"] {
  return {
    ...card,
    classification: {
      category: card.classification?.category ?? { confidence: "low", evidence: [] },
      deployment: card.classification?.deployment ?? { confidence: "low", evidence: [] },
      difficulty: card.classification?.difficulty ?? { confidence: "low", evidence: [] },
      cloudflareReady: card.classification?.cloudflareReady ?? { confidence: "low", evidence: [] }
    }
  };
}
