import {
  findAlternativesFromList,
  getProjectKnowledgeFromList,
  getHealth,
  listClassificationOverrides,
  getSyncStatus,
  getTrendingFromList,
  listProjectKnowledgeWithMeta,
  recommendProjectList,
  searchProjectList,
  upsertClassificationOverride,
  updateProjectAlternatives
} from "./db";
import { generateAlternativesForAll } from "./alternatives";
import { defaultSeedRepositories } from "./github";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { normalizeGrpRequest, runGrpQuery } from "./grp";
import { errorJson, json, parseBool, parseLimit, rawJson } from "./http";
import { toProjectKnowledgeView } from "./project-view";
import { buildQualityReport } from "./quality";
import { agentCardJsonSchema, projectKnowledgeJsonSchema, projectV2JsonSchema } from "./schema";
import { syncGithubProjects } from "./sync";
import type { AgentCard, Category, Deployment, Difficulty, Env } from "./types";

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/admin/sync") {
    if (request.method !== "POST") {
      return errorJson(405, "method_not_allowed", "Sync endpoint requires POST.");
    }

    if (!isAuthorizedAdmin(request, env)) {
      return errorJson(401, "unauthorized", "Missing or invalid admin authorization.");
    }

    let body: { repositories?: string[]; limit?: number; offset?: number } = {};
    try {
      body = (await request.json()) as { repositories?: string[]; limit?: number; offset?: number };
    } catch {
      body = {};
    }

    const result = await syncGithubProjects(env, {
      repositories: Array.isArray(body.repositories) ? body.repositories : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      offset: typeof body.offset === "number" ? body.offset : undefined,
      trigger: "admin"
    });

    return json(result, {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/admin/alternatives") {
    if (request.method !== "POST") {
      return errorJson(405, "method_not_allowed", "Alternatives refresh endpoint requires POST.");
    }

    if (!isAuthorizedAdmin(request, env)) {
      return errorJson(401, "unauthorized", "Missing or invalid admin authorization.");
    }

    const knowledge = await listProjectKnowledgeWithMeta(env);
    const result = generateAlternativesForAll(knowledge.projects);
    const updated = await updateProjectAlternatives(env, result.updates);

    return json(
      {
        updated,
        updates: result.updates,
        metadata: knowledge.metadata
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }

  if (path === "/api/admin/classification-overrides") {
    if (!["GET", "POST"].includes(request.method)) {
      return errorJson(405, "method_not_allowed", "Classification overrides endpoint supports GET and POST.");
    }

    if (!isAuthorizedAdmin(request, env)) {
      return errorJson(401, "unauthorized", "Missing or invalid admin authorization.");
    }

    if (request.method === "GET") {
      try {
        const overrides = await listClassificationOverrides(env, parseLimit(url.searchParams.get("limit")) ?? 100);
        return json(
          {
            overrides,
            count: overrides.length
          },
          {
            headers: {
              "cache-control": "no-store"
            }
          }
        );
      } catch (error) {
        return errorJson(500, "classification_override_read_failed", formatError(error));
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson(400, "invalid_json", "Classification override endpoint requires a valid JSON body.");
    }

    const parsed = parseClassificationOverrideInput(body);
    if (!parsed.ok) {
      return errorJson(400, "invalid_classification_override", parsed.message);
    }

    try {
      const override = await upsertClassificationOverride(env, parsed.input);
      return json(
        {
          override
        },
        {
          headers: {
            "cache-control": "no-store"
          }
        }
      );
    } catch (error) {
      return errorJson(500, "classification_override_write_failed", formatError(error));
    }
  }

  if (path === "/api/grp/query") {
    if (request.method !== "POST") {
      return errorJson(405, "method_not_allowed", "GRP query endpoint requires POST.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson(400, "invalid_json", "GRP query endpoint requires a valid JSON body.");
    }

    const parsed = normalizeGrpRequest(body);
    if (!parsed.ok) {
      return errorJson(400, "invalid_grp_request", parsed.message);
    }

    const knowledge = await listProjectKnowledgeWithMeta(env);
    const result = runGrpQuery(knowledge.projects, parsed.request);
    return json(
      {
        ...result,
        metadata: {
          ...result.metadata,
          dataSource: knowledge.metadata
        }
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }

  if (request.method !== "GET") {
    return errorJson(405, "method_not_allowed", "Only GET is supported for this endpoint.");
  }

  if (path === "/api/health") {
    return json(await getHealth(env), {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/sync/status") {
    return json(await getSyncStatus(env, defaultSeedRepositories), {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/quality") {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    return json({ ...buildQualityReport(knowledge.projects), metadata: knowledge.metadata }, {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/graph") {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    return json(
      {
        ...buildKnowledgeGraph(
          knowledge.projects,
          url.searchParams.get("repo") ?? undefined,
          parseLimit(url.searchParams.get("limit")) ?? 24
        ),
        metadata: knowledge.metadata
      }
    );
  }

  if (path === "/api/schema/agent-card.v1") {
    return rawJson(agentCardJsonSchema);
  }

  if (path === "/api/schema/project-knowledge.v1") {
    return rawJson(projectKnowledgeJsonSchema);
  }

  if (path === "/api/schema/project.v2") {
    return rawJson(projectV2JsonSchema);
  }

  if (path === "/api/search") {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const results = searchProjectList(knowledge.projects, {
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      deployment: url.searchParams.get("deployment") ?? undefined,
      difficulty: url.searchParams.get("difficulty") ?? undefined,
      cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
      language: url.searchParams.get("language") ?? undefined,
      ranking: url.searchParams.get("ranking") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({
      query: Object.fromEntries(url.searchParams.entries()),
      projects: results.map(toProjectKnowledgeView),
      knowledge: results,
      metadata: knowledge.metadata
    });
  }

  if (path === "/api/trending") {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const results = getTrendingFromList(knowledge.projects, {
      category: url.searchParams.get("category") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({ projects: results.map(toProjectKnowledgeView), knowledge: results, metadata: knowledge.metadata });
  }

  if (path === "/api/recommend") {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const recommendations = recommendProjectList(knowledge.projects, {
      useCase: url.searchParams.get("use_case") ?? undefined,
      deployment: url.searchParams.get("deployment") ?? undefined,
      difficulty: url.searchParams.get("difficulty") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
      cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({
      query: Object.fromEntries(url.searchParams.entries()),
      recommendations,
      metadata: knowledge.metadata
    });
  }

  if (path === "/api/compare") {
    const ids = (url.searchParams.get("repos") ?? url.searchParams.get("repo") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const projects =
      ids.length > 0
        ? knowledge.projects.filter((item) => ids.includes(item.project.id) || ids.includes(item.project.fullName))
        : knowledge.projects.slice(0, 3);
    return json({
      ...compareProjectKnowledge(projects, { deployment: url.searchParams.get("deployment") ?? undefined }),
      metadata: knowledge.metadata
    });
  }

  const categoryMatch = path.match(/^\/api\/category\/([^/]+)$/);
  if (categoryMatch) {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const projects = searchProjectList(knowledge.projects, {
      category: decodeURIComponent(categoryMatch[1]),
      limit: parseLimit(url.searchParams.get("limit"))
    });
    return json({ projects, metadata: knowledge.metadata });
  }

  const projectMatch = path.match(/^\/api\/project\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    const id = `${decodeURIComponent(projectMatch[1])}/${decodeURIComponent(projectMatch[2])}`;
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return json({ ...toProjectKnowledgeView(project), knowledge: project, metadata: knowledge.metadata });
  }

  const shortProjectMatch = path.match(/^\/api\/project\/([^/]+)$/);
  if (shortProjectMatch) {
    const id = decodeURIComponent(shortProjectMatch[1]);
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return json({ ...toProjectKnowledgeView(project), knowledge: project, metadata: knowledge.metadata });
  }

  const alternativesMatch = path.match(/^\/api\/alternatives\/([^/]+)\/([^/]+)$/);
  if (alternativesMatch) {
    const id = `${decodeURIComponent(alternativesMatch[1])}/${decodeURIComponent(alternativesMatch[2])}`;
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const alternatives = findAlternativesFromList(knowledge.projects, id, parseLimit(url.searchParams.get("limit")));
    return json({ alternatives: alternatives.map(toProjectKnowledgeView), metadata: knowledge.metadata });
  }

  const shortAlternativesMatch = path.match(/^\/api\/alternatives\/([^/]+)$/);
  if (shortAlternativesMatch) {
    const knowledge = await listProjectKnowledgeWithMeta(env);
    const alternatives = findAlternativesFromList(
      knowledge.projects,
      decodeURIComponent(shortAlternativesMatch[1]),
      parseLimit(url.searchParams.get("limit"))
    );
    return json({ alternatives: alternatives.map(toProjectKnowledgeView), metadata: knowledge.metadata });
  }

  return errorJson(404, "not_found", "Unknown API endpoint.");
}

function isAuthorizedAdmin(request: Request, env: Env): boolean {
  if (!env.SYNC_SECRET) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.SYNC_SECRET}`;
  return auth === expected;
}

type ClassificationOverrideParseResult =
  | {
      ok: true;
      input: Parameters<typeof upsertClassificationOverride>[1];
    }
  | {
      ok: false;
      message: string;
    };

function parseClassificationOverrideInput(body: unknown): ClassificationOverrideParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const projectId = stringField(data, "projectId") ?? stringField(data, "project_id");
  if (!projectId || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(projectId)) {
    return { ok: false, message: "project_id must be a GitHub owner/name repository id." };
  }

  const category = optionalEnum<Category>(data, "category", [
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
  ]);
  if (!category.ok) {
    return { ok: false, message: category.message };
  }

  const difficulty = optionalEnum<Difficulty>(data, "difficulty", ["beginner", "intermediate", "advanced"]);
  if (!difficulty.ok) {
    return { ok: false, message: difficulty.message };
  }

  const deployment = optionalStringArray(data, "deployment");
  if (!deployment.ok) {
    return { ok: false, message: deployment.message };
  }

  const cloudflareReady = optionalBoolean(data, "cloudflareReady", "cloudflare_ready");
  if (!cloudflareReady.ok) {
    return { ok: false, message: cloudflareReady.message };
  }

  const classification = data.classification === undefined ? null : (data.classification as AgentCard["classification"]);

  return {
    ok: true,
    input: {
      projectId,
      category: category.value,
      difficulty: difficulty.value,
      deployment: deployment.value as Deployment[] | null,
      cloudflareReady: cloudflareReady.value,
      classification,
      notes: stringField(data, "notes"),
      reviewedBy: stringField(data, "reviewedBy") ?? stringField(data, "reviewed_by"),
      reviewedAt: stringField(data, "reviewedAt") ?? stringField(data, "reviewed_at") ?? undefined
    }
  };
}

function stringField(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalEnum<T extends string>(
  data: Record<string, unknown>,
  key: string,
  values: readonly T[]
): { ok: true; value: T | null } | { ok: false; message: string } {
  const value = data[key];
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string" || !values.includes(value as T)) {
    return { ok: false, message: `${key} must be one of: ${values.join(", ")}.` };
  }
  return { ok: true, value: value as T };
}

function optionalStringArray(
  data: Record<string, unknown>,
  key: string
): { ok: true; value: string[] | null } | { ok: false; message: string } {
  const value = data[key];
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return { ok: false, message: `${key} must be an array of strings.` };
  }
  return { ok: true, value };
}

function optionalBoolean(
  data: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): { ok: true; value: boolean | null } | { ok: false; message: string } {
  const value = data[camelKey] ?? data[snakeKey];
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "boolean") {
    return { ok: false, message: `${snakeKey} must be a boolean.` };
  }
  return { ok: true, value };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
