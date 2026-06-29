import {
  describeSearchResult,
  findAlternativesFromList,
  findRelatedProjectsFromList,
  getProjectKnowledgeFromList,
  getTrendingFromList,
  recommendProjectList,
  searchProjectList
} from "./project-search";
import { buildAlternativesDecision, generateAlternativeMatches, toAlternativeMatchView } from "./alternatives";
import { buildAtlasEcosystemView, findAtlasEcosystem, listAtlasEcosystems } from "./atlas-page";
import { getHealth } from "./health";
import { getSyncStatus } from "./db-sync-store";
import { listClassificationOverrides, updateProjectAlternatives, upsertClassificationOverride } from "./db-write-store";
import { generateAlternativesForAll } from "./alternatives";
import { defaultSeedRepositories } from "./github";
import { getGovernanceSummary, listGovernanceRuns, parseGovernanceRunInput, upsertGovernanceRun } from "./governance-store";
import { buildKnowledgeGraph, compareProjectKnowledge } from "./graph";
import { normalizeGrpRequest, runGrpQuery } from "./grp";
import { errorJson, json, parseBool, parseLimit, rawJson } from "./http";
import { openApiDocument } from "./openapi";
import { resolveProject } from "./project-aliases";
import { toProjectKnowledgeView, withRelatedProjects } from "./project-view";
import { buildLowConfidenceReviewReport, buildQualityReport } from "./quality";
import { agentCardJsonSchema, projectKnowledgeJsonSchema, projectV2JsonSchema } from "./schema";
import { buildProjectScoreExplanation } from "./score";
import { getKnowledgeForSourcePolicy } from "./source-policy";
import { syncGithubProjects } from "./sync";
import type { AgentCard, Category, Deployment, Difficulty, Env } from "./types";
import type { ProjectKnowledgeResult } from "./knowledge-source";

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

    let body: { repositories?: string[]; limit?: number; offset?: number; signalDepth?: string; signal_depth?: string } = {};
    try {
      body = (await request.json()) as { repositories?: string[]; limit?: number; offset?: number; signalDepth?: string; signal_depth?: string };
    } catch {
      body = {};
    }
    const signalDepth = parseSignalDepth(body.signalDepth ?? body.signal_depth);

    const result = await syncGithubProjects(env, {
      repositories: Array.isArray(body.repositories) ? body.repositories : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      offset: typeof body.offset === "number" ? body.offset : undefined,
      trigger: "admin",
      signalDepth
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

    const knowledgePolicy = await getKnowledgeForSourcePolicy(env);
    if (!knowledgePolicy.ok) {
      return sourcePolicyError(knowledgePolicy.failure);
    }
    const knowledge = knowledgePolicy.knowledge;
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

  if (path === "/api/admin/governance/runs") {
    if (request.method !== "POST") {
      return errorJson(405, "method_not_allowed", "Governance run recording endpoint requires POST.");
    }

    if (!isAuthorizedAdmin(request, env)) {
      return errorJson(401, "unauthorized", "Missing or invalid admin authorization.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson(400, "invalid_json", "Governance run endpoint requires a valid JSON body.");
    }

    const parsed = parseGovernanceRunInput(body);
    if (!parsed.ok) {
      return errorJson(400, "invalid_governance_run", parsed.message);
    }

    try {
      const run = await upsertGovernanceRun(env, parsed.input);
      return json(
        { run },
        {
          headers: {
            "cache-control": "no-store"
          }
        }
      );
    } catch (error) {
      return errorJson(500, "governance_run_write_failed", formatError(error));
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

    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
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

  if (path === "/api/recommend") {
    return handleRecommendApi(request, env);
  }

  if (path === "/api/compare") {
    return handleCompareApi(request, env);
  }

  if (path === "/api/alternatives") {
    return handleAlternativesApi(request, env);
  }

  if (path === "/api/graph") {
    return handleGraphApi(request, env);
  }

  if (path === "/api/project") {
    return handleProjectLookupApi(request, env);
  }

  if (path === "/api/related") {
    return handleRelatedApi(request, env);
  }

  if (path === "/api/score") {
    return handleScoreApi(request, env);
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

  if (path === "/api/governance/runs") {
    return json(
      {
        runs: await listGovernanceRuns(env, parseLimit(url.searchParams.get("limit")) ?? 25, url.searchParams.get("task") ?? undefined)
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }

  if (path === "/api/governance/summary") {
    return json(await getGovernanceSummary(env), {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/quality") {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    return json({ ...buildQualityReport(knowledge.projects), metadata: knowledge.metadata }, {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/quality/review") {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    return json({ ...buildLowConfidenceReviewReport(knowledge.projects), metadata: knowledge.metadata }, {
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  if (path === "/api/atlas") {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const limit = parseLimit(url.searchParams.get("limit")) ?? 8;
    return json({
      ecosystems: listAtlasEcosystems().map((ecosystem) => buildAtlasEcosystemView(knowledge.projects, ecosystem, limit)),
      metadata: knowledge.metadata
    });
  }

  const atlasMatch = path.match(/^\/api\/atlas\/([^/]+)$/);
  if (atlasMatch) {
    const ecosystem = findAtlasEcosystem(decodeURIComponent(atlasMatch[1]));
    if (!ecosystem) {
      return errorJson(404, "atlas_ecosystem_not_found", `Atlas ecosystem ${decodeURIComponent(atlasMatch[1])} was not found.`);
    }
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    return json({
      ecosystem: buildAtlasEcosystemView(knowledge.projects, ecosystem, parseLimit(url.searchParams.get("limit")) ?? 8),
      metadata: knowledge.metadata
    });
  }

  const graphOwnerRepoMatch = path.match(/^\/api\/graph\/([^/]+)\/([^/]+)$/);
  if (graphOwnerRepoMatch) {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const id = `${decodeURIComponent(graphOwnerRepoMatch[1])}/${decodeURIComponent(graphOwnerRepoMatch[2])}`;
    return json({
      ...buildKnowledgeGraph(knowledge.projects, id, parseLimit(url.searchParams.get("limit")) ?? 24),
      metadata: knowledge.metadata
    });
  }

  const graphShortMatch = path.match(/^\/api\/graph\/([^/]+)$/);
  if (graphShortMatch) {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    return json({
      ...buildKnowledgeGraph(knowledge.projects, decodeURIComponent(graphShortMatch[1]), parseLimit(url.searchParams.get("limit")) ?? 24),
      metadata: knowledge.metadata
    });
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

  if (path === "/api/openapi.json") {
    return rawJson(openApiDocument);
  }

  if (path === "/api/search") {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const filters = {
      q: url.searchParams.get("q") ?? url.searchParams.get("query") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      deployment: url.searchParams.get("deployment") ?? undefined,
      difficulty: url.searchParams.get("difficulty") ?? undefined,
      cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
      language: url.searchParams.get("language") ?? undefined,
      projectKind: url.searchParams.get("project_kind") ?? undefined,
      minConfidence: url.searchParams.get("min_confidence") ?? undefined,
      ranking: url.searchParams.get("ranking") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    };
    const results = searchProjectList(knowledge.projects, {
      ...filters
    });

    return json({
      query: Object.fromEntries(url.searchParams.entries()),
      projects: results.map(toProjectKnowledgeView),
      knowledge: results,
      search: describeSearchResult(knowledge.projects, filters, results.length),
      metadata: knowledge.metadata
    });
  }

  if (path === "/api/trending") {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const results = getTrendingFromList(knowledge.projects, {
      category: url.searchParams.get("category") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({ projects: results.map(toProjectKnowledgeView), knowledge: results, metadata: knowledge.metadata });
  }

  const categoryMatch = path.match(/^\/api\/category\/([^/]+)$/);
  if (categoryMatch) {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const projects = searchProjectList(knowledge.projects, {
      category: decodeURIComponent(categoryMatch[1]),
      limit: parseLimit(url.searchParams.get("limit"))
    });
    return json({ projects, metadata: knowledge.metadata });
  }

  const scoreMatch = path.match(/^\/api\/score\/([^/]+)\/([^/]+)$/);
  if (scoreMatch) {
    const id = `${decodeURIComponent(scoreMatch[1])}/${decodeURIComponent(scoreMatch[2])}`;
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return json({ ...buildProjectScoreExplanation(project), metadata: knowledge.metadata });
  }

  const shortScoreMatch = path.match(/^\/api\/score\/([^/]+)$/);
  if (shortScoreMatch) {
    const id = decodeURIComponent(shortScoreMatch[1]);
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return json({ ...buildProjectScoreExplanation(project), metadata: knowledge.metadata });
  }

  const projectMatch = path.match(/^\/api\/project\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    const id = `${decodeURIComponent(projectMatch[1])}/${decodeURIComponent(projectMatch[2])}`;
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return projectLookupResponse(project, knowledge.projects, parseLimit(url.searchParams.get("related_limit")) ?? 8, knowledge.metadata);
  }

  const shortProjectMatch = path.match(/^\/api\/project\/([^/]+)$/);
  if (shortProjectMatch) {
    const id = decodeURIComponent(shortProjectMatch[1]);
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return projectLookupResponse(project, knowledge.projects, parseLimit(url.searchParams.get("related_limit")) ?? 8, knowledge.metadata);
  }

  const relatedMatch = path.match(/^\/api\/related\/([^/]+)\/([^/]+)$/);
  if (relatedMatch) {
    const id = `${decodeURIComponent(relatedMatch[1])}/${decodeURIComponent(relatedMatch[2])}`;
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const related = findRelatedProjectsFromList(knowledge.projects, id, parseLimit(url.searchParams.get("limit")));
    return json({ related: related.map(toProjectKnowledgeView), metadata: knowledge.metadata });
  }

  const shortRelatedMatch = path.match(/^\/api\/related\/([^/]+)$/);
  if (shortRelatedMatch) {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const related = findRelatedProjectsFromList(knowledge.projects, decodeURIComponent(shortRelatedMatch[1]), parseLimit(url.searchParams.get("limit")));
    return json({ related: related.map(toProjectKnowledgeView), metadata: knowledge.metadata });
  }

  const alternativesMatch = path.match(/^\/api\/alternatives\/([^/]+)\/([^/]+)$/);
  if (alternativesMatch) {
    const id = `${decodeURIComponent(alternativesMatch[1])}/${decodeURIComponent(alternativesMatch[2])}`;
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const project = getProjectKnowledgeFromList(knowledge.projects, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return alternativesResponse(project, knowledge.projects, parseLimit(url.searchParams.get("limit")) ?? 5, knowledge.metadata);
  }

  const shortAlternativesMatch = path.match(/^\/api\/alternatives\/([^/]+)$/);
  if (shortAlternativesMatch) {
    const knowledge = await requireKnowledgeSource(request, env);
    if (knowledge instanceof Response) {
      return knowledge;
    }
    const id = decodeURIComponent(shortAlternativesMatch[1]);
    const resolution = resolveProject(knowledge.projects, id);
    if (!resolution) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return alternativesResponse(resolution.project, knowledge.projects, parseLimit(url.searchParams.get("limit")) ?? 5, knowledge.metadata, {
      requestedId: resolution.requestedId,
      resolvedId: resolution.resolvedId,
      resolution: resolution.resolution
    });
  }

  return errorJson(404, "not_found", "Unknown API endpoint.");
}

async function requireKnowledgeSource(request: Request, env: Env): Promise<ProjectKnowledgeResult | Response> {
  const policy = await getKnowledgeForSourcePolicy(env, { requireD1: requiresD1(request) });
  if (policy.ok) {
    return policy.knowledge;
  }

  return sourcePolicyError(policy.failure);
}

function sourcePolicyError(failure: { code: string; message: string; metadata: ProjectKnowledgeResult["metadata"] }): Response {
  return json(
    {
      error: {
        code: failure.code,
        message: failure.message,
        metadata: failure.metadata
      }
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}

async function handleGraphApi(request: Request, env: Env): Promise<Response> {
  if (!["GET", "POST"].includes(request.method)) {
    return errorJson(405, "method_not_allowed", "Graph endpoint supports GET and POST.");
  }

  const parsed = request.method === "POST" ? await parseGraphBody(request) : { ok: true as const, input: graphInputFromUrl(new URL(request.url)) };
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  return json({
    ...buildKnowledgeGraph(knowledge.projects, parsed.input.projectId, parsed.input.limit ?? 24),
    metadata: knowledge.metadata
  });
}

function graphInputFromUrl(url: URL): { projectId?: string; limit?: number } {
  return {
    projectId: url.searchParams.get("repo") ?? url.searchParams.get("project_id") ?? undefined,
    limit: parseLimit(url.searchParams.get("limit"))
  };
}

async function parseGraphBody(
  request: Request
): Promise<{ ok: true; input: { projectId?: string; limit?: number } } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: "Graph endpoint requires a valid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_graph_request", message: "Graph request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const limit = optionalNumberValue(data.limit);
  if (!limit.ok) {
    return { ok: false, code: "invalid_graph_request", message: "limit must be a number when provided." };
  }
  return {
    ok: true,
    input: {
      projectId: stringValue(data.projectId) ?? stringValue(data.project_id) ?? stringValue(data.repo) ?? stringValue(data.focus),
      limit: limit.value
    }
  };
}

async function handleProjectLookupApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return errorJson(405, "method_not_allowed", "Project lookup endpoint supports POST at /api/project or GET at /api/project/:project.");
  }

  const parsed = await parseProjectLookupBody(request);
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const project = getProjectKnowledgeFromList(knowledge.projects, parsed.input.projectId);
  if (!project) {
    return errorJson(404, "project_not_found", `Project ${parsed.input.projectId} was not found.`);
  }
  return projectLookupResponse(project, knowledge.projects, parsed.input.relatedLimit ?? 8, knowledge.metadata);
}

async function parseProjectLookupBody(
  request: Request
): Promise<{ ok: true; input: { projectId: string; relatedLimit?: number } } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: "Project lookup endpoint requires a valid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_project_request", message: "Project lookup request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const projectId = stringValue(data.projectId) ?? stringValue(data.project_id) ?? stringValue(data.repo);
  if (!projectId) {
    return { ok: false, code: "invalid_project_request", message: "project_id is required." };
  }
  const relatedLimit = optionalNumberValue(data.relatedLimit ?? data.related_limit);
  if (!relatedLimit.ok) {
    return { ok: false, code: "invalid_project_request", message: "related_limit must be a number when provided." };
  }
  return { ok: true, input: { projectId, relatedLimit: relatedLimit.value } };
}

function projectLookupResponse(
  project: NonNullable<ReturnType<typeof getProjectKnowledgeFromList>>,
  projects: ProjectKnowledgeResult["projects"],
  relatedLimit: number,
  metadata: ProjectKnowledgeResult["metadata"]
): Response {
  const related = findRelatedProjectsFromList(projects, project.project.id, relatedLimit);
  return json({ ...withRelatedProjects(toProjectKnowledgeView(project), related), knowledge: project, metadata });
}

async function handleRelatedApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return errorJson(405, "method_not_allowed", "Related projects endpoint supports POST at /api/related or GET at /api/related/:project.");
  }

  const parsed = await parseProjectLimitBody(request, "Related projects");
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const project = getProjectKnowledgeFromList(knowledge.projects, parsed.input.projectId);
  if (!project) {
    return errorJson(404, "project_not_found", `Project ${parsed.input.projectId} was not found.`);
  }
  const related = findRelatedProjectsFromList(knowledge.projects, project.project.id, parsed.input.limit);
  return json({
    project: toProjectKnowledgeView(project),
    related: related.map(toProjectKnowledgeView),
    metadata: knowledge.metadata
  });
}

async function handleScoreApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return errorJson(405, "method_not_allowed", "Score endpoint supports POST at /api/score or GET at /api/score/:project.");
  }

  const parsed = await parseProjectLimitBody(request, "Score");
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const project = getProjectKnowledgeFromList(knowledge.projects, parsed.input.projectId);
  if (!project) {
    return errorJson(404, "project_not_found", `Project ${parsed.input.projectId} was not found.`);
  }
  return json({ ...buildProjectScoreExplanation(project), metadata: knowledge.metadata });
}

async function parseProjectLimitBody(
  request: Request,
  label: string
): Promise<{ ok: true; input: { projectId: string; limit?: number } } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: `${label} endpoint requires a valid JSON body.` };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_project_request", message: `${label} request body must be an object.` };
  }

  const data = body as Record<string, unknown>;
  const projectId = stringValue(data.projectId) ?? stringValue(data.project_id) ?? stringValue(data.repo);
  if (!projectId) {
    return { ok: false, code: "invalid_project_request", message: "project_id is required." };
  }
  const limit = optionalNumberValue(data.limit);
  if (!limit.ok) {
    return { ok: false, code: "invalid_project_request", message: "limit must be a number when provided." };
  }
  return { ok: true, input: { projectId, limit: limit.value } };
}

async function handleAlternativesApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return errorJson(405, "method_not_allowed", "Alternatives endpoint supports POST at /api/alternatives or GET at /api/alternatives/:project.");
  }

  const parsed = await parseAlternativesBody(request);
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const project = getProjectKnowledgeFromList(knowledge.projects, parsed.input.projectId);
  if (!project) {
    return errorJson(404, "project_not_found", `Project ${parsed.input.projectId} was not found.`);
  }
  return alternativesResponse(project, knowledge.projects, parsed.input.limit ?? 5, knowledge.metadata);
}

async function parseAlternativesBody(
  request: Request
): Promise<{ ok: true; input: { projectId: string; limit?: number } } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: "Alternatives endpoint requires a valid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_alternatives_request", message: "Alternatives request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const projectId = stringValue(data.projectId) ?? stringValue(data.project_id) ?? stringValue(data.repo);
  if (!projectId) {
    return { ok: false, code: "invalid_alternatives_request", message: "project_id is required." };
  }
  const limit = optionalNumberValue(data.limit);
  if (!limit.ok) {
    return { ok: false, code: "invalid_alternatives_request", message: "limit must be a number when provided." };
  }
  return { ok: true, input: { projectId, limit: limit.value } };
}

function alternativesResponse(
  project: NonNullable<ReturnType<typeof getProjectKnowledgeFromList>>,
  projects: ProjectKnowledgeResult["projects"],
  limit: number,
  metadata: ProjectKnowledgeResult["metadata"],
  resolvedFrom?: { requestedId: string; resolvedId: string; resolution: "direct" | "alias" }
): Response {
  const matches = generateAlternativeMatches(project, projects, limit);
  const decision = buildAlternativesDecision(project, matches);
  return json({
    project: toProjectKnowledgeView(project),
    summary: decision.summary,
    stats: decision.stats,
    nextActions: decision.nextActions,
    comparisonLinks: decision.comparisonLinks,
    alternatives: matches.map((match) => toProjectKnowledgeView(match.project)),
    alternativeMatches: matches.map(toAlternativeMatchView),
    ...(resolvedFrom ? { resolvedFrom } : {}),
    metadata
  });
}

async function handleCompareApi(request: Request, env: Env): Promise<Response> {
  if (!["GET", "POST"].includes(request.method)) {
    return errorJson(405, "method_not_allowed", "Compare endpoint supports GET and POST.");
  }

  const parsed = request.method === "POST" ? await parseCompareBody(request) : { ok: true as const, input: compareInputFromUrl(new URL(request.url)) };
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const resolvedInputs = parsed.input.ids.map((id) => resolveProject(knowledge.projects, id));
  const projects =
    parsed.input.ids.length > 0
      ? resolvedInputs.map((resolution) => resolution?.project ?? null).filter(isProjectKnowledge)
      : knowledge.projects.slice(0, 3);

  return json({
    ...compareProjectKnowledge(projects, { deployment: parsed.input.deployment }),
    requested_repos: parsed.input.ids,
    resolved_repos: resolvedInputs
      .filter((resolution): resolution is NonNullable<typeof resolution> => resolution !== null)
      .map((resolution) => ({
        requestedId: resolution.requestedId,
        resolvedId: resolution.resolvedId,
        resolution: resolution.resolution
      })),
    order: parsed.input.ids.length > 0 ? "input" : "default_score",
    metadata: knowledge.metadata
  });
}

function compareInputFromUrl(url: URL): { ids: string[]; deployment?: string } {
  return {
    ids: splitProjectIds(url.searchParams.get("repos") ?? url.searchParams.get("repo") ?? ""),
    deployment: url.searchParams.get("deployment") ?? undefined
  };
}

async function parseCompareBody(
  request: Request
): Promise<{ ok: true; input: { ids: string[]; deployment?: string } } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: "Compare endpoint requires a valid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_compare_request", message: "Compare request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const ids = projectIdsValue(data.project_ids ?? data.projects ?? data.repos ?? data.repo);
  if (!ids.ok) {
    return { ok: false, code: "invalid_compare_request", message: "project_ids, projects, or repos must be an array of strings or a comma-separated string." };
  }

  return {
    ok: true,
    input: {
      ids: ids.value,
      deployment: stringValue(data.deployment)
    }
  };
}

function projectIdsValue(value: unknown): { ok: true; value: string[] } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }
  if (typeof value === "string") {
    return { ok: true, value: splitProjectIds(value) };
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return { ok: true, value: value.map((item) => item.trim()).filter(Boolean) };
  }
  return { ok: false };
}

function splitProjectIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function handleRecommendApi(request: Request, env: Env): Promise<Response> {
  if (!["GET", "POST"].includes(request.method)) {
    return errorJson(405, "method_not_allowed", "Recommendation endpoint supports GET and POST.");
  }

  const parsed = request.method === "POST" ? await parseRecommendationBody(request) : { ok: true as const, query: recommendationQueryFromUrl(new URL(request.url)) };
  if (!parsed.ok) {
    return errorJson(400, parsed.code, parsed.message);
  }

  const knowledge = await requireKnowledgeSource(request, env);
  if (knowledge instanceof Response) {
    return knowledge;
  }
  const recommendations = recommendProjectList(knowledge.projects, parsed.query);

  return json({
    query: parsed.query,
    recommendations,
    metadata: knowledge.metadata
  });
}

function recommendationQueryFromUrl(url: URL): Parameters<typeof recommendProjectList>[1] {
  return {
    useCase: url.searchParams.get("use_case") ?? undefined,
    deployment: url.searchParams.get("deployment") ?? undefined,
    difficulty: url.searchParams.get("difficulty") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    license: url.searchParams.get("license") ?? undefined,
    cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
    limit: parseLimit(url.searchParams.get("limit"))
  };
}

async function parseRecommendationBody(
  request: Request
): Promise<{ ok: true; query: Parameters<typeof recommendProjectList>[1] } | { ok: false; code: string; message: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, code: "invalid_json", message: "Recommendation endpoint requires a valid JSON body." };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_recommendation_request", message: "Recommendation request body must be an object." };
  }

  const data = body as Record<string, unknown>;
  const constraints = data.constraints && typeof data.constraints === "object" ? (data.constraints as Record<string, unknown>) : {};
  const cloudflareReady = optionalBooleanValue(data.cloudflareReady ?? data.cloudflare_ready ?? constraints.cloudflareReady ?? constraints.cloudflare_ready);
  if (!cloudflareReady.ok) {
    return { ok: false, code: "invalid_recommendation_request", message: "cloudflare_ready must be a boolean when provided." };
  }
  const limit = optionalNumberValue(data.limit);
  if (!limit.ok) {
    return { ok: false, code: "invalid_recommendation_request", message: "limit must be a number when provided." };
  }

  return {
    ok: true,
    query: {
      useCase: stringValue(data.useCase) ?? stringValue(data.use_case),
      deployment: stringValue(data.deployment) ?? stringValue(constraints.deployment),
      difficulty: stringValue(data.difficulty) ?? stringValue(constraints.difficulty),
      language: stringValue(data.language) ?? stringValue(constraints.language),
      category: stringValue(data.category) ?? stringValue(constraints.category),
      license: stringValue(data.license) ?? stringValue(constraints.license),
      cloudflareReady: cloudflareReady.value,
      limit: limit.value
    }
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalNumberValue(value: unknown): { ok: true; value?: number } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true };
  }
  return typeof value === "number" && Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

function optionalBooleanValue(value: unknown): { ok: true; value?: boolean } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true };
  }
  return typeof value === "boolean" ? { ok: true, value } : { ok: false };
}

function requiresD1(request: Request): boolean {
  const url = new URL(request.url);
  return parseBool(url.searchParams.get("require_d1")) === true;
}

function isAuthorizedAdmin(request: Request, env: Env): boolean {
  if (!env.SYNC_SECRET) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.SYNC_SECRET}`;
  return auth === expected;
}

function isProjectKnowledge(value: ReturnType<typeof getProjectKnowledgeFromList>): value is NonNullable<ReturnType<typeof getProjectKnowledgeFromList>> {
  return value !== null;
}

function parseSignalDepth(value: unknown): "full" | "lite" | undefined {
  return value === "full" || value === "lite" ? value : undefined;
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
