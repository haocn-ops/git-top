import { handleApi } from "./api";
import { renderExplorer, renderGraph } from "./explorer";
import { errorJson } from "./http";
import { handleMcp } from "./mcp";
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

    return errorJson(404, "not_found", "Route not found.");
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncGithubProjects(env, { limit: 5, trigger: "cron" }));
  }
};
