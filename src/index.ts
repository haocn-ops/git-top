import { handleApi } from "./api";
import { renderBadge, renderOgImage } from "./assets";
import { renderExplorer, renderGraph } from "./explorer";
import { renderProjectGraphPage } from "./graph-page";
import { errorJson } from "./http";
import { renderCollectionLandingPage, renderCompareLandingPage, renderTopicLandingPage } from "./landing-pages";
import { handleMcp } from "./mcp";
import { openApiDocument } from "./openapi";
import { renderProjectPage } from "./project-page";
import {
  canonicalHostRedirect,
  renderDocsPage,
  renderLlmsFullTxt,
  renderLlmsTxt,
  renderRobotsTxt,
  renderSecurityTxt,
  renderSitemapXml,
  withSiteHeaders
} from "./site";
import { scheduledSyncLimit, syncGithubProjects } from "./sync";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const response = await routeRequest(request, env, url);
    return withSiteHeaders(response);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncGithubProjects(env, { limit: scheduledSyncLimit, trigger: "cron", signalDepth: "lite" }));
  }
};

async function routeRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const canonicalRedirect = canonicalHostRedirect(request, url);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const legacyRedirect = legacyConsoleRedirect(url);
  if (legacyRedirect) {
    return legacyRedirect;
  }

  if (url.pathname === "/robots.txt") {
    return renderRobotsTxt();
  }

  if (url.pathname === "/sitemap.xml") {
    return renderSitemapXml(env);
  }

  if (url.pathname === "/.well-known/security.txt") {
    return renderSecurityTxt();
  }

  if (url.pathname === "/llms.txt") {
    return renderLlmsTxt();
  }

  if (url.pathname === "/llms-full.txt") {
    return renderLlmsFullTxt();
  }

  if (url.pathname === "/docs" || url.pathname === "/api-docs") {
    return renderDocsPage();
  }

  if (url.pathname === "/openapi.json") {
    return new Response(JSON.stringify(openApiDocument, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }

  if (url.pathname === "/og.svg") {
    return renderOgImage(url.searchParams.get("title") ?? undefined, url.searchParams.get("subtitle") ?? undefined);
  }

  const badgeMatch = url.pathname.match(/^\/badge\/([^/]+)\/([^/]+)\.svg$/);
  if (badgeMatch) {
    return renderBadge(env, `${decodeURIComponent(badgeMatch[1])}/${decodeURIComponent(badgeMatch[2])}`);
  }

  const categoryLanding = url.pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryLanding) {
    return renderCollectionLandingPage(env, "category", decodeURIComponent(categoryLanding[1]));
  }

  const deploymentLanding = url.pathname.match(/^\/deployments\/([^/]+)$/);
  if (deploymentLanding) {
    return renderCollectionLandingPage(env, "deployment", decodeURIComponent(deploymentLanding[1]));
  }

  const compareLanding = url.pathname.match(/^\/compare\/(.+)$/);
  if (compareLanding) {
    const response = await renderCompareLandingPage(env, compareLanding[1]);
    if (response) {
      return response;
    }
  }

  const topicLanding = url.pathname.match(/^\/topics\/([^/]+)$/);
  if (topicLanding) {
    const response = await renderTopicLandingPage(env, decodeURIComponent(topicLanding[1]));
    if (response) {
      return response;
    }
  }

  if (url.pathname === "/" || url.pathname === "/explorer" || url.pathname === "/projects") {
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
}

function legacyConsoleRedirect(url: URL): Response | null {
  const target = legacyConsoleRedirects[url.pathname];
  if (!target) {
    return null;
  }

  const redirectUrl = new URL(target, url);
  return Response.redirect(redirectUrl, 302);
}

const legacyConsoleRedirects: Record<string, string> = {
  "/register": "/projects",
  "/users": "/projects",
  "/tenants": "/projects",
  "/settings": "/projects",
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
  if (
    ["api", "mcp", "graph", "explorer", "docs", "api-docs", "categories", "deployments", "compare", "topics", "badge", "og.svg", "openapi.json", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "favicon.ico"].includes(
      slug
    )
  ) {
    return null;
  }
  return slug;
}
