import { handleApi } from "./api";
import { renderExplorer, renderGraph } from "./explorer";
import { renderProjectGraphPage } from "./graph-page";
import { errorJson } from "./http";
import { handleMcp } from "./mcp";
import { renderProjectPage } from "./project-page";
import { scheduledSyncLimit, syncGithubProjects } from "./sync";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const legacyRedirect = legacyConsoleRedirect(url);
    if (legacyRedirect) {
      return legacyRedirect;
    }

    if (url.pathname === "/" || url.pathname === "/explorer") {
      return renderExplorer();
    }

    if (url.pathname === "/graph") {
      return renderGraph();
    }

    const graphProjectId = graphProjectIdFromPath(url.pathname);
    if (graphProjectId) {
      const response = await renderProjectGraphPage(env, graphProjectId);
      if (response) {
        return response;
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env);
    }

    const projectId = projectIdFromPath(url.pathname);
    if (projectId) {
      const response = await renderProjectPage(env, projectId);
      if (response) {
        return response;
      }
    }

    return errorJson(404, "not_found", "Route not found.");
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncGithubProjects(env, { limit: scheduledSyncLimit, trigger: "cron", signalDepth: "lite" }));
  }
};

function legacyConsoleRedirect(url: URL): Response | null {
  const target = legacyConsoleRedirects[url.pathname];
  if (!target) {
    return null;
  }

  const redirectUrl = new URL(target, url);
  return Response.redirect(redirectUrl, 302);
}

const legacyConsoleRedirects: Record<string, string> = {
  "/register": "/explorer",
  "/users": "/explorer",
  "/tenants": "/explorer",
  "/settings": "/explorer",
  "/reports": "/graph"
};

function graphProjectIdFromPath(pathname: string): string | null {
  const ownerRepoMatch = pathname.match(/^\/graph\/([^/]+)\/([^/]+)$/);
  if (ownerRepoMatch) {
    return `${decodeURIComponent(ownerRepoMatch[1])}/${decodeURIComponent(ownerRepoMatch[2])}`;
  }

  const slugMatch = pathname.match(/^\/graph\/([^/]+)$/);
  return slugMatch ? decodeURIComponent(slugMatch[1]) : null;
}

function projectIdFromPath(pathname: string): string | null {
  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/([^/]+)$/);
  if (projectMatch) {
    return `${decodeURIComponent(projectMatch[1])}/${decodeURIComponent(projectMatch[2])}`;
  }

  const shortMatch = pathname.match(/^\/([a-z0-9][a-z0-9._-]{1,80})$/i);
  if (!shortMatch) {
    return null;
  }

  const slug = decodeURIComponent(shortMatch[1]);
  if (["api", "mcp", "graph", "explorer", "favicon.ico"].includes(slug)) {
    return null;
  }
  return slug;
}
