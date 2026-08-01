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
import { buildFeedbackProposal, parseFeedbackProposal } from "./feedback-proposals";
import { listProjectChanges, maxProjectChangesPageSize } from "./change-feed";
import type { ProjectKnowledgeResult } from "./knowledge-source";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { normalizeGrpRequest, runGrpQuery } from "./grp";
import { mcpGrpResponse, parseMcpGrpResponseProfile } from "./grp-mcp-profile";
import { errorJson, json, rawJson, stringifyApiJson } from "./http";
import { buildProjectSummary, toProjectKnowledgeView, withRelatedProjects } from "./project-view";
import { parseProjectResponseProfile, projectProfileView } from "./project-profiles";
import { buildProjectScoreExplanation } from "./score";
import { buildLowConfidenceReviewReport, buildQualityReport } from "./quality";
import { getKnowledgeForSourcePolicy, getSearchKnowledgeForSourcePolicy } from "./source-policy";
import { buildTrendsView } from "./trends";
import { buildTrustGate } from "./trust-gate";
import { buildAgentWorkflow } from "./workflow";
import { resolveProject } from "./project-aliases";
import { buildCursorPage, pageQueryKey, PageCursorError, resolvePageOffset } from "./page-cursor";
import {
  campaignSourceFromRequest,
  clientFromRequest,
  normalizeClientName,
  normalizeClientVersion,
  recordAdoptionEvent,
  responseSizeBucket,
  type AdoptionResultClass
} from "./adoption-analytics";
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

const projectNotFoundCode = -32005;

export type McpProfile = "core" | "full";

const coreToolNames = new Set([
  "search_projects",
  "get_project",
  "recommend_project",
  "compare_projects",
  "get_agent_workflow"
]);

const toolLimitMaximums: Record<string, number> = {
  search_projects: 100,
  get_project_changes: maxProjectChangesPageSize,
  get_alternatives: 20,
  get_related_projects: 100,
  recommend_project: 100,
  get_trends: 12,
  get_agent_workflow: 20,
  get_atlas: 20,
  find_alternatives: 20,
  get_project_graph: 80
};

function limitSchema(maximum: number, description?: string) {
  return {
    type: "integer",
    minimum: 1,
    maximum,
    ...(description ? { description } : {})
  };
}

const tools = [
  {
    name: "search_projects",
    description:
      "Search Git.Top projects by query, category, deployment, difficulty, language, or Cloudflare readiness. Results include project_kind and collection_metadata for resource hubs and curated collections. On large corpora, inspect metadata.candidate_retrieval and metadata.truncated before treating broad results as exhaustive.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms, such as openai, cloudflare agent framework, or browser automation. Leave cursor empty for a new search."
        },
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
        limit: limitSchema(toolLimitMaximums.search_projects),
        cursor: { type: "string", description: "Opaque next_cursor from a previous search_projects result." },
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
      description: "Provide project_id, repo, or both owner and repo. The runtime validates that one supported project reference is present.",
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
      additionalProperties: false
    }
  },
  {
    name: "get_projects_batch",
    description: "Fetch 1 to 20 canonical owner/repo projects in one snapshot-consistent call using compact, decision, or evidence response profiles.",
    inputSchema: {
      type: "object",
      properties: {
        project_ids: { type: "array", minItems: 1, maxItems: 20, items: { type: "string" } },
        profile: { type: "string", enum: ["compact", "decision", "evidence"], default: "compact" },
        require_d1: { type: "boolean", description: "Fail closed unless the tool result is backed by D1 instead of seed fallback." }
      },
      required: ["project_ids"]
    }
  },
  {
    name: "get_project_changes",
    description: "Read the D1-backed project change feed with opaque cursor pagination, deletion tombstones, and an explicit 30-day retention contract.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: { type: "string", description: "Opaque next_cursor returned by a previous call." },
        since: { type: "string", description: "Optional ISO-8601 lower bound." },
        limit: limitSchema(toolLimitMaximums.get_project_changes)
      }
    }
  },
  {
    name: "propose_project_feedback",
    description: "Validate and normalize a structured correction proposal without mutating Git.Top knowledge. Authorized persistence uses POST /api/feedback/proposals with FEEDBACK_SECRET.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        feedback_type: { type: "string", enum: ["classification", "alternative", "metadata", "stale", "other"] },
        proposed: { type: "object" },
        evidence: { type: "array", minItems: 1, maxItems: 10, items: { type: "object" } },
        rationale: { type: "string" },
        source_agent: { type: "string" },
        source_url: { type: "string" }
      },
      required: ["project_id", "feedback_type", "proposed", "evidence", "rationale"]
    }
  },
  {
    name: "get_alternatives",
    description: "Find alternative projects for a canonical owner/name project id or Git.Top product alias.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Canonical owner/repo id or Git.Top product alias." },
        limit: limitSchema(toolLimitMaximums.get_alternatives),
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
        limit: limitSchema(toolLimitMaximums.get_related_projects),
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
        limit: limitSchema(toolLimitMaximums.recommend_project),
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
        limit: limitSchema(toolLimitMaximums.get_trends, "Maximum trend buckets and rising projects to return."),
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
        limit: limitSchema(toolLimitMaximums.get_agent_workflow),
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
        limit: limitSchema(toolLimitMaximums.get_atlas, "Maximum projects per ecosystem."),
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
        limit: limitSchema(toolLimitMaximums.find_alternatives),
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
        limit: limitSchema(toolLimitMaximums.get_project_graph),
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
    description: "Run Git.Top Graph Reasoning Protocol over the open-source knowledge graph. Returns a bounded compact response by default; request the full profile only when the complete graph is required.",
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
        profile: {
          type: "string",
          enum: ["compact", "full"],
          default: "compact",
          description: "Response size profile. Compact preserves decision fields and provenance while bounding graph payloads; full returns the complete GRP result."
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

// All exposed tools are read-only lookups or bounded computations. Keep the
// annotations explicit so directory reviewers and clients can apply the
// correct approval policy without inferring behavior from descriptions.
const annotatedTools = tools.map((tool) => ({
  ...tool,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false
  }
}));

export async function handleMcp(request: Request, env: Env, options: { profile?: McpProfile } = {}): Promise<Response> {
  const requestStartedAt = Date.now();
  const profile = options.profile ?? "full";
  const availableTools = profile === "core" ? annotatedTools.filter((tool) => coreToolNames.has(tool.name)) : annotatedTools;
  const endpoint = profile === "core" ? "/mcp/core" : "/mcp";

  if (request.method === "GET") {
    const agentMap = buildAgentMap();
    return json({
      name: "git-top",
      title: "Git.Top GitHub Knowledge Layer for AI Agents",
      description:
        "Agent-native open source project intelligence with trust-first discovery, search, project lookup, alternatives, deployment signals, quality scores, and graph reasoning.",
      protocolVersion: "2025-06-18",
      endpoint,
      profile,
      profiles: {
        core: { endpoint: "/mcp/core", toolCount: coreToolNames.size, purpose: "Focused project selection with the smallest useful tool surface." },
        full: { endpoint: "/mcp", toolCount: tools.length, purpose: "Complete discovery, graph, quality, governance, and reasoning surface." }
      },
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
          strictSourceError: { code: -32003, message: "D1-backed knowledge is required, but current source is seed." },
          projectNotFoundError: { code: projectNotFoundCode, messageTemplate: "Project <id> was not found.", singularTools: ["get_project", "get_alternatives", "find_alternatives", "get_related_projects", "get_project_card", "get_deployment", "get_quality_score", "get_project_graph"] },
          batchProjectLimit: 20,
          projectProfiles: ["compact", "decision", "evidence"],
          changeFeed: { cursor: "opaque", retentionDays: 30, tombstones: true },
          feedbackPolicy: { validatePublicly: true, persistenceAuth: "FEEDBACK_SECRET", reviewRequired: true, mutatesKnowledgeDirectly: false },
          listPagination: { cursor: "opaque", snapshotBound: true, staleCursorError: -32004, tools: ["search_projects"] }
        },
        structuredPostEndpoints: [
          {
            path: "/api/project",
            method: "POST",
            description: "Fetch one project knowledge record with related projects, scores, evidence, and metadata.",
            bodyExample: { project_id: "cloudflare/agents", related_limit: 8 }
          },
          {
            path: "/api/projects",
            method: "POST",
            description: "Fetch up to 20 canonical projects from one snapshot with compact, decision, or evidence profiles.",
            bodyExample: { project_ids: ["cloudflare/agents", "openai/codex"], profile: "decision" }
          },
          {
            path: "/api/feedback/proposals",
            method: "POST",
            description: "Validate structured evidence-backed corrections; FEEDBACK_SECRET is required before persistence and admin review remains mandatory.",
            bodyExample: { project_id: "cloudflare/agents", feedback_type: "classification", proposed: { category: "agent_framework" }, evidence: [{ url: "https://github.com/cloudflare/agents", field: "README" }], rationale: "The README explicitly describes an agent framework." }
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
            path: "/api/changes",
            method: "GET",
            description: "Consume project additions, updates, score or classification changes, and deletion tombstones with cursor pagination.",
            bodyExample: null
          },
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
      "Keep metadata.snapshot_id consistent across multi-tool decisions and restart dependent steps when the snapshot changes.",
      "Use get_projects_batch for snapshot-consistent reads and get_project_changes for incremental cache updates and deletion tombstones.",
      "Continue search_projects with page.next_cursor; restart without a cursor when error -32004 reports a changed snapshot.",
      "Treat error -32005 as a missing singular project; use get_projects_batch when partial success and missing[] are preferred.",
      "Use propose_project_feedback to normalize evidence-backed corrections; it validates only and never mutates trusted knowledge.",
      "Use agent_map.short_path first, then expand into agent_map.reference_path when you need the fuller discovery surface.",
        "Use structured POST endpoints under agent_api.structured_post_endpoints for project, recommendation, comparison, alternatives, graph, and GRP requests.",
        "Call tools/list to inspect available MCP tools.",
        "Call search_projects with query, category, deployment, and limit.",
        "Call get_project or compare_projects before presenting a final recommendation.",
        "Cite metadata.source, metadata.snapshot_id, classification evidence, and quality_signal_confidence in high-confidence answers."
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
      tools: availableTools
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
    const response = rpcResult(body.id, { tools: availableTools });
    recordAdoptionEvent(env, {
      name: "mcp_tools_list",
      profile,
      clientName: clientFromRequest(request),
      campaignSource: campaignSourceFromRequest(request),
      status: 200,
      durationMs: Date.now() - requestStartedAt,
      resultClass: "success",
      responseSizeBucket: responseSizeFromValue({ jsonrpc: "2.0", id: body.id ?? null, result: { tools: availableTools } })
    });
    return response;
  }

  if (body.method === "initialize") {
    const clientInfo = objectArg(body.params?.clientInfo);
    const response = rpcResult(body.id, {
      protocolVersion: "2025-06-18",
      instructions:
        "Use get_agent_workflow for guided project selection, then inspect metadata.source, evidence, confidence, and caveats before making high-confidence claims.",
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
    recordAdoptionEvent(env, {
      name: "mcp_initialize",
      profile,
      clientName: normalizeClientName(clientInfo.name) ?? clientFromRequest(request),
      clientVersion: normalizeClientVersion(clientInfo.version),
      campaignSource: campaignSourceFromRequest(request),
      status: 200,
      durationMs: Date.now() - requestStartedAt,
      resultClass: "success",
      responseSizeBucket: responseSizeFromValue({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "git-top" } }
      })
    });
    return response;
  }

  if (body.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    if (!availableTools.some((tool) => tool.name === name)) {
      recordAdoptionEvent(env, {
        name: "mcp_tool_call_completed",
        profile,
        clientName: clientFromRequest(request),
        campaignSource: campaignSourceFromRequest(request),
        operation: name,
        status: 400,
        resultClass: "client_error"
      });
      return rpcError(body.id ?? null, -32601, `Tool ${name} is not available in the ${profile} MCP profile.`);
    }
    const startedAt = Date.now();
    const result = await callTool(name, args, env);
    if (isToolErrorResult(result)) {
      recordAdoptionEvent(env, {
        name: "mcp_tool_call_completed",
        profile,
        clientName: clientFromRequest(request),
        campaignSource: campaignSourceFromRequest(request),
        operation: name,
        status: 400,
        durationMs: Date.now() - startedAt,
        resultClass: resultClassFromCode(result.toolError.code)
      });
      return rpcError(body.id ?? null, result.toolError.code, result.toolError.message);
    }
    const metadata = result && typeof result === "object" && "metadata" in result ? (result as { metadata?: { source?: unknown } }).metadata : undefined;
    const response = rpcResult(body.id, {
      content: [
        {
          type: "text",
          text: stringifyApiJson(result)
        }
      ]
    });
    const adoptionEvent = {
      name: "mcp_tool_call_completed",
      profile,
      clientName: clientFromRequest(request),
      campaignSource: campaignSourceFromRequest(request),
      operation: name,
      status: 200,
      durationMs: Date.now() - startedAt,
      resultClass: "success",
      source: metadata?.source === "d1" || metadata?.source === "seed" ? metadata.source : "unknown",
      responseSizeBucket: responseSizeFromValue(result)
    } as const;
    recordAdoptionEvent(env, adoptionEvent);
    if (name === "get_agent_workflow" || name === "git_top_grp_query") {
      recordAdoptionEvent(env, { ...adoptionEvent, name: "workflow_completed" });
    }
    return response;
  }

  return rpcError(body.id ?? null, -32601, "Method not found");
}

function responseSizeFromValue(value: unknown) {
  return responseSizeBucket(new TextEncoder().encode(JSON.stringify(value)).byteLength);
}

function resultClassFromCode(code: number): AdoptionResultClass {
  if (code === -32003) {
    return "strict_source_rejection";
  }
  if (code === -32004) {
    return "stale_cursor";
  }
  if (code === -32005) {
    return "not_found";
  }
  if (code >= -32099 && code <= -32000) {
    return "server_error";
  }
  return "client_error";
}

async function callTool(name: string, args: Record<string, unknown>, env: Env): Promise<unknown> {
  const limitError = validateToolLimit(name, args);
  if (limitError) {
    return limitError;
  }

  if (name === "search_projects") {
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
    const policy = await getSearchKnowledgeForSourcePolicy(env, filters, { requireD1: boolArg(args.require_d1) === true });
    if (!policy.ok) {
      return { toolError: { code: -32003, message: policy.failure.message } };
    }
    const knowledge = policy.knowledge;
    const limit = filters.limit ?? 20;
    const queryKey = await pageQueryKey("mcp:search_projects", filters);
    let offset: number;
    try {
      offset = resolvePageOffset(stringArg(args.cursor), knowledge.metadata.snapshotId, queryKey);
    } catch (error) {
      if (error instanceof PageCursorError) {
        return { toolError: { code: error.code === "stale_page_cursor" ? -32004 : -32602, message: error.message } };
      }
      throw error;
    }
    const projects = searchProjectList(knowledge.projects, { ...filters, offset, limit });
    const hasMore = searchProjectList(knowledge.projects, { ...filters, offset: offset + limit, limit: 1 }).length > 0;

    return {
      projects: projects.map(toProjectKnowledgeView),
      search: describeSearchResult(knowledge.projects, filters, projects.length),
      page: buildCursorPage({ offset, limit, hasMore, snapshotId: knowledge.metadata.snapshotId, queryKey }),
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
    if (!resolution) {
      return projectNotFoundError(projectId);
    }
    const project = resolution.project;
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

  if (name === "get_projects_batch") {
    const projectIds = arrayArg(args.project_ids);
    if (projectIds.length < 1 || projectIds.length > 20 || projectIds.some((value) => typeof value !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value))) {
      return { toolError: { code: -32602, message: "project_ids must contain 1 to 20 canonical owner/repo identifiers." } };
    }
    const profile = args.profile === undefined ? "compact" : parseProjectResponseProfile(args.profile);
    if (!profile) {
      return { toolError: { code: -32602, message: "profile must be compact, decision, or evidence." } };
    }
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const projects: unknown[] = [];
    const missing: string[] = [];
    for (const projectId of [...new Set(projectIds as string[])]) {
      const project = getProjectKnowledgeFromList(knowledge.projects, projectId);
      if (project) {
        projects.push(projectProfileView(project, profile));
      } else {
        missing.push(projectId);
      }
    }
    return { profile, projects, missing, metadata: knowledge.metadata };
  }

  if (name === "get_project_changes") {
    const limit = numberArg(args.limit);
    const policy = await getKnowledgeForSourcePolicy(env, { requireD1: true });
    if (!policy.ok) {
      return { toolError: { code: -32003, message: policy.failure.message } };
    }
    try {
      return {
        ...(await listProjectChanges(env, { cursor: stringArg(args.cursor), since: stringArg(args.since), limit })),
        metadata: policy.knowledge.metadata
      };
    } catch (error) {
      return { toolError: { code: -32602, message: error instanceof Error ? error.message : String(error) } };
    }
  }

  if (name === "propose_project_feedback") {
    const parsed = parseFeedbackProposal(args);
    if (!parsed.ok) {
      return { toolError: { code: -32602, message: parsed.message } };
    }
    return {
      proposal: await buildFeedbackProposal(parsed.input),
      persisted: false,
      review_required: true,
      submit: {
        method: "POST",
        url: "https://git.top/api/feedback/proposals",
        authorization: "Bearer FEEDBACK_SECRET is required for persistence."
      },
      mutation_policy: "This MCP tool validates only. Feedback never mutates project knowledge without administrator review."
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
    if (!resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
    const project = resolution.project;
    const matches = generateAlternativeMatches(project, knowledge.projects, numberArg(args.limit) ?? 5);
    const decision = buildAlternativesDecision(project, matches);
    return {
      project: toProjectKnowledgeView(project),
      resolved_from: mcpResolvedFrom(resolution),
      summary: decision.summary,
      stats: decision.stats,
      nextActions: decision.nextActions,
      comparisonLinks: decision.comparisonLinks,
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
    if (!resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
    return {
      project: toProjectKnowledgeView(resolution.project),
      related: findRelatedProjectsFromList(knowledge.projects, resolution.resolvedId, numberArg(args.limit)).map(toProjectKnowledgeView),
      resolved_from: mcpResolvedFrom(resolution),
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_card") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    if (!resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
    const project = resolution.project;
    return {
      project_id: stringArg(args.project_id),
      resolved_from: mcpResolvedFrom(resolution),
      agent_card: withDefaultAgentCardClassification(project.agentCard),
      metrics: project.metrics,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_deployment") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    if (!resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
    const project = resolution.project;
    return {
      project_id: stringArg(args.project_id),
      resolved_from: mcpResolvedFrom(resolution),
      deployments: project.agentCard.deployment,
      cloudflare_ready: project.agentCard.cloudflareReady,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_quality_score") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "");
    if (!resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
    const project = resolution.project;
    const view = toProjectKnowledgeView(project);
    const scoreExplanation = buildProjectScoreExplanation(project);
    return {
      project_id: stringArg(args.project_id),
      resolved_from: mcpResolvedFrom(resolution),
      git_top_score: view.gitTopScore,
      git_top_score_breakdown: view.gitTopScoreBreakdown,
      score_explanation: scoreExplanation,
      quality_score: view.qualityScore,
      agent_score: view.agentScore,
      quality_signals: view.qualitySignals,
      agent_score_breakdown: view.agentScoreBreakdown,
      score_page: `https://git.top/score/${view.repo}`,
      metadata: knowledge.metadata
    };
  }

  if (name === "get_project_graph") {
    const knowledge = await requireKnowledgeSource(env, args);
    if (isToolErrorResult(knowledge)) {
      return knowledge;
    }
    const resolution = stringArg(args.project_id) ? resolveMcpProject(knowledge.projects, stringArg(args.project_id) ?? "") : null;
    if (stringArg(args.project_id) && !resolution) {
      return projectNotFoundError(stringArg(args.project_id) ?? "");
    }
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
    const responseProfile = parseMcpGrpResponseProfile(args.profile);
    if (!responseProfile) {
      return {
        toolError: {
          code: -32602,
          message: "profile must be compact or full."
        }
      };
    }
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
    const profiledResult = mcpGrpResponse(result, responseProfile);
    return {
      ...profiledResult,
      metadata: {
        ...profiledResult.metadata,
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

function validateToolLimit(name: string, args: Record<string, unknown>): ToolErrorResult | null {
  const maximum = toolLimitMaximums[name];
  if (maximum === undefined || args.limit === undefined) {
    return null;
  }
  if (typeof args.limit !== "number" || !Number.isInteger(args.limit) || args.limit < 1 || args.limit > maximum) {
    return { toolError: { code: -32602, message: `limit must be an integer from 1 to ${maximum}.` } };
  }
  return null;
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

function projectNotFoundError(projectId: string): ToolErrorResult {
  return {
    toolError: {
      code: projectNotFoundCode,
      message: `Project ${projectId} was not found.`
    }
  };
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
