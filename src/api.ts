import {
  findAlternatives,
  getProjectKnowledge,
  getHealth,
  getSyncStatus,
  getTrending,
  listProjectKnowledge,
  recommendProjects,
  searchProjects,
  updateProjectAlternatives
} from "./db";
import { generateAlternativesForAll } from "./alternatives";
import { defaultSeedRepositories } from "./github";
import { errorJson, json, parseBool, parseLimit, rawJson } from "./http";
import { toProjectKnowledgeView } from "./project-view";
import { buildQualityReport } from "./quality";
import { agentCardJsonSchema, projectKnowledgeJsonSchema, projectV2JsonSchema } from "./schema";
import { syncGithubProjects } from "./sync";
import type { Env } from "./types";

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

    const result = generateAlternativesForAll(await listProjectKnowledge(env));
    const updated = await updateProjectAlternatives(env, result.updates);

    return json(
      {
        updated,
        updates: result.updates
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
    return json(buildQualityReport(await listProjectKnowledge(env)), {
      headers: {
        "cache-control": "no-store"
      }
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

  if (path === "/api/search") {
    const results = await searchProjects(env, {
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      deployment: url.searchParams.get("deployment") ?? undefined,
      difficulty: url.searchParams.get("difficulty") ?? undefined,
      cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
      language: url.searchParams.get("language") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({
      query: Object.fromEntries(url.searchParams.entries()),
      projects: results.map(toProjectKnowledgeView)
    });
  }

  if (path === "/api/trending") {
    const results = await getTrending(env, {
      category: url.searchParams.get("category") ?? undefined,
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({ projects: results.map(toProjectKnowledgeView) });
  }

  if (path === "/api/recommend") {
    const recommendations = await recommendProjects(env, {
      useCase: url.searchParams.get("use_case") ?? undefined,
      deployment: url.searchParams.get("deployment") ?? undefined,
      difficulty: url.searchParams.get("difficulty") ?? undefined,
      language: url.searchParams.get("language") ?? undefined,
      cloudflareReady: parseBool(url.searchParams.get("cloudflare_ready")),
      limit: parseLimit(url.searchParams.get("limit"))
    });

    return json({
      query: Object.fromEntries(url.searchParams.entries()),
      recommendations
    });
  }

  const categoryMatch = path.match(/^\/api\/category\/([^/]+)$/);
  if (categoryMatch) {
    const projects = await searchProjects(env, {
      category: decodeURIComponent(categoryMatch[1]),
      limit: parseLimit(url.searchParams.get("limit"))
    });
    return json({ projects });
  }

  const projectMatch = path.match(/^\/api\/project\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    const id = `${decodeURIComponent(projectMatch[1])}/${decodeURIComponent(projectMatch[2])}`;
    const project = await getProjectKnowledge(env, id);
    if (!project) {
      return errorJson(404, "project_not_found", `Project ${id} was not found.`);
    }
    return json(toProjectKnowledgeView(project));
  }

  const alternativesMatch = path.match(/^\/api\/alternatives\/([^/]+)\/([^/]+)$/);
  if (alternativesMatch) {
    const id = `${decodeURIComponent(alternativesMatch[1])}/${decodeURIComponent(alternativesMatch[2])}`;
    const alternatives = await findAlternatives(env, id, parseLimit(url.searchParams.get("limit")));
    return json({ alternatives: alternatives.map(toProjectKnowledgeView) });
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
