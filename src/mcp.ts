import {
  describeSearchResult,
  findAlternativesFromList,
  getProjectKnowledgeFromList,
  recommendProjectList,
  searchProjectList
} from "./project-search";
import type { ProjectKnowledgeResult } from "./knowledge-source";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { normalizeGrpRequest, runGrpQuery } from "./grp";
import { errorJson, json, rawJson, stringifyApiJson } from "./http";
import { toProjectKnowledgeView } from "./project-view";
import { getKnowledgeForSourcePolicy } from "./source-policy";
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
    name: "get_project",
    description:
      "Return structured Git.Top knowledge for a project or collection, including overview, alternatives, deployments, quality score, agent score, project_kind, and collection_metadata when applicable.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Canonical owner/repo identifier. The repo field may also contain owner/repo."
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
    description: "Find alternative projects for a given GitHub owner/name project id.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
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
        project_id: { type: "string" },
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
        project_id: { type: "string" },
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
    name: "find_alternatives",
    description: "Find alternative projects for a given GitHub owner/name project id.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
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
        project_id: { type: "string" },
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
        project_id: { type: "string" },
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
    return json({
      name: "git-top",
      title: "Git.Top GitHub Knowledge Layer for AI Agents",
      description:
        "Agent-native open source project intelligence with search, project lookup, alternatives, deployment signals, quality scores, and graph reasoning.",
      protocolVersion: "2025-06-18",
      endpoint: "/mcp",
      docsUrl: "https://git.top/docs",
      openapiUrl: "https://git.top/openapi.json",
      apiOpenapiUrl: "https://git.top/api/openapi.json",
      schemaUrl: "https://git.top/api/schema/project.v2",
      healthUrl: "https://git.top/api/health",
      qualityUrl: "https://git.top/api/quality",
      quickstart: [
        "GET /api/health and verify metadata.source is d1 for production recommendations.",
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
    const project = getProjectKnowledgeFromList(knowledge.projects, projectId);
    return {
      project_id: projectId || null,
      project: project ? toProjectKnowledgeView(project) : null,
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
        cloudflareReady: boolArg(constraints.cloudflare_ready),
        limit: numberArg(args.limit)
      }),
      metadata: knowledge.metadata
    };
  }

  if (name === "find_alternatives" || name === "get_alternatives") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      alternatives: findAlternativesFromList(knowledge.projects, stringArg(args.project_id) ?? "", numberArg(args.limit)).map(
        toProjectKnowledgeView
      ),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_card") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, stringArg(args.project_id) ?? "");
    return {
      project_id: stringArg(args.project_id),
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
    const project = getProjectKnowledgeFromList(knowledge.projects, stringArg(args.project_id) ?? "");
    return {
      project_id: stringArg(args.project_id),
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
    const project = getProjectKnowledgeFromList(knowledge.projects, stringArg(args.project_id) ?? "");
    const view = project ? toProjectKnowledgeView(project) : null;
    return {
      project_id: stringArg(args.project_id),
      quality_score: view?.qualityScore ?? null,
      agent_score: view?.agentScore ?? null,
      quality_signals: view?.qualitySignals ?? null,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_graph") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    return {
      graph: buildKnowledgeGraph(knowledge.projects, stringArg(args.project_id), numberArg(args.limit) ?? 24),
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
