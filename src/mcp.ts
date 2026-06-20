import {
  findAlternatives,
  getProjectKnowledge,
  listProjectKnowledge,
  recommendProjects,
  searchProjects
} from "./db";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { errorJson, json, stringifyApiJson } from "./http";
import { toProjectKnowledgeView } from "./project-view";
import type { Env, ProjectKnowledge } from "./types";

interface RpcRequest {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const tools = [
  {
    name: "search_projects",
    description: "Search Git.Top projects by query, category, deployment, difficulty, language, or Cloudflare readiness.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string" },
        deployment: { type: "string" },
        difficulty: { type: "string" },
        language: { type: "string" },
        cloudflare_ready: { type: "boolean" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_project",
    description: "Return structured Git.Top knowledge for a project, including overview, alternatives, deployments, quality score, and agent score.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_alternatives",
    description: "Find alternative projects for a given GitHub owner/name project id.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number" }
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
        project_id: { type: "string" }
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
        project_id: { type: "string" }
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
        limit: { type: "number" }
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
        limit: { type: "number" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_project_card",
    description: "Return the complete Agent Card for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" }
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
        limit: { type: "number" }
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
        deployment: { type: "string" }
      },
      required: ["project_ids"]
    }
  }
];

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    return json({ name: "git-top", tools });
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

  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const result = await callTool(name, args, env);
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
    const projects = await searchProjects(env, {
      q: stringArg(args.query),
      category: stringArg(args.category),
      deployment: stringArg(args.deployment),
      difficulty: stringArg(args.difficulty),
      language: stringArg(args.language),
      cloudflareReady: boolArg(args.cloudflare_ready),
      limit: numberArg(args.limit)
    });

    return {
      projects: projects.map(toProjectKnowledgeView)
    };
  }

  if (name === "get_project") {
    const project = await getProjectKnowledge(env, stringArg(args.project_id) ?? "");
    return {
      project: project ? toProjectKnowledgeView(project) : null
    };
  }

  if (name === "recommend_project") {
    const constraints = objectArg(args.constraints);
    return {
      recommendations: await recommendProjects(env, {
        useCase: stringArg(args.use_case),
        deployment: stringArg(constraints.deployment),
        difficulty: stringArg(constraints.difficulty),
        language: stringArg(constraints.language),
        cloudflareReady: boolArg(constraints.cloudflare_ready),
        limit: numberArg(args.limit)
      })
    };
  }

  if (name === "find_alternatives" || name === "get_alternatives") {
    return {
      alternatives: (await findAlternatives(env, stringArg(args.project_id) ?? "", numberArg(args.limit))).map(toProjectKnowledgeView)
    };
  }

  if (name === "get_project_card") {
    const project = await getProjectKnowledge(env, stringArg(args.project_id) ?? "");
    return {
      project_id: stringArg(args.project_id),
      agent_card: project?.agentCard ?? null,
      metrics: project?.metrics ?? null
    };
  }

  if (name === "get_deployment") {
    const project = await getProjectKnowledge(env, stringArg(args.project_id) ?? "");
    return {
      project_id: stringArg(args.project_id),
      deployments: project?.agentCard.deployment ?? [],
      cloudflare_ready: project?.agentCard.cloudflareReady ?? false
    };
  }

  if (name === "get_quality_score") {
    const project = await getProjectKnowledge(env, stringArg(args.project_id) ?? "");
    const view = project ? toProjectKnowledgeView(project) : null;
    return {
      project_id: stringArg(args.project_id),
      quality_score: view?.qualityScore ?? null,
      agent_score: view?.agentScore ?? null,
      quality_signals: view?.qualitySignals ?? null
    };
  }

  if (name === "get_project_graph") {
    return {
      graph: buildKnowledgeGraph(await listProjectKnowledge(env), stringArg(args.project_id), numberArg(args.limit) ?? 24)
    };
  }

  if (name === "compare_projects") {
    const ids = arrayArg(args.project_ids);
    const projects = await Promise.all(ids.map((id) => getProjectKnowledge(env, String(id))));
    const foundProjects = projects.filter(isProjectKnowledge);
    return compareProjectKnowledge(foundProjects, { deployment: stringArg(args.deployment) });
  }

  return {
    error: {
      code: "unknown_tool",
      message: `Unknown tool: ${name}`
    }
  };
}

function rpcResult(id: RpcRequest["id"], result: unknown): Response {
  return json({
    jsonrpc: "2.0",
    id: id ?? null,
    result
  });
}

function rpcError(id: RpcRequest["id"], code: number, message: string): Response {
  return json(
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

function objectArg(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayArg(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isProjectKnowledge(value: ProjectKnowledge | null): value is ProjectKnowledge {
  return value !== null;
}
