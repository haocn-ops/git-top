import { handleApi } from "./api";
import { renderExplorer, renderGraph } from "./explorer";
import { errorJson } from "./http";
import { handleMcp } from "./mcp";
import { renderProjectPage } from "./project-page";
import { syncGithubProjects } from "./sync";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/explorer") {
      return renderExplorer();
    }

    if (url.pathname === "/graph") {
      return renderGraph();
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
    ctx.waitUntil(syncGithubProjects(env, { limit: 5, trigger: "cron" }));
  }
};

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
