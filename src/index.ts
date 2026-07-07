import { handleApi } from "./api";
import { renderAtlasEcosystemPage, renderAtlasPage } from "./atlas-page";
import { renderBadge, renderOgImage } from "./assets";
import { renderBenchmarkPage } from "./benchmark-page";
import { renderExplorer, renderGraph } from "./explorer";
import { renderProjectGraphPage } from "./graph-page";
import { errorJson } from "./http";
import { renderExamplesPage } from "./examples";
import { renderIntegrationsPage } from "./integrations-page";
import { renderJourneysPage } from "./journeys-page";
import {
  renderAlternativesIndexPage,
  renderAlternativesLandingPage,
  renderCollectionLandingPage,
  renderCompareIndexPage,
  renderCompareLandingPage,
  renderDiscoverPage,
  hasTopicLandingPage,
  renderTopicLandingPage
} from "./landing-pages";
import { handleMcp } from "./mcp";
import { openApiDocument } from "./openapi";
import { renderOperationsPage } from "./operations-page";
import { renderCoveragePage } from "./coverage-page";
import { renderProjectPage } from "./project-page";
import { renderQualityPage } from "./quality-page";
import { renderQualityReviewPage } from "./quality-review-page";
import { renderQuickstartPage } from "./quickstart";
import { renderRecipesPage } from "./recipes";
import { renderRecommendPage } from "./recommend-page";
import { renderRoadmapPage } from "./roadmap";
import { renderProjectScorePage } from "./score-page";
import { renderStatusPage } from "./status-page";
import { renderTrendsPage } from "./trends-page";
import { renderTrustGatePage } from "./trust-gate";
import { renderWorkflowPage } from "./workflow-page";
import { discoverAndSyncCandidateProjects } from "./candidate-discovery";
import {
  canonicalHostRedirect,
  renderA2aAgentCard,
  renderAgentManifest,
  renderAgentMarkdownIndex,
  renderAgentSkillDocument,
  renderAgentSkillsIndex,
  renderAgentSkills,
  renderApiCatalog,
  renderAuthMarkdown,
  renderDocsPage,
  renderLlmsFullTxt,
  renderLlmsTxt,
  renderMcpServerCard,
  renderRobotsTxt,
  renderSecurityTxt,
  renderSitemapXml,
  withSiteHeaders
} from "./site";
import { scheduledSyncLimit, syncGithubProjects } from "./sync";
import { runScheduledGovernance } from "./scheduled-governance";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const response = await routeRequest(request, env, url);
    return withSiteHeaders(response);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledMaintenance(env));
  }
};

async function runScheduledMaintenance(env: Env): Promise<void> {
  const discovery = await discoverAndSyncCandidateProjects(env, { trigger: "cron", maxCandidates: scheduledSyncLimit });
  const discoveryAttempts = Array.isArray(discovery.selected) ? discovery.selected.length : 0;
  const refreshLimit = Math.max(0, scheduledSyncLimit - discoveryAttempts);
  if (refreshLimit > 0) {
    await syncGithubProjects(env, { limit: refreshLimit, trigger: "cron", signalDepth: "lite" });
  }
  await runScheduledGovernance(env);
}

async function routeRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const canonicalRedirect = canonicalHostRedirect(request, url);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const legacyRedirect = legacyConsoleRedirect(url);
  if (legacyRedirect) {
    return legacyRedirect;
  }

  const canonicalProjectRedirect = legacyProjectPageRedirect(url);
  if (canonicalProjectRedirect) {
    return canonicalProjectRedirect;
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

  if (url.pathname === "/auth.md" || url.pathname === "/.well-known/auth.md") {
    return renderAuthMarkdown();
  }

  if (url.pathname === "/index.md" || url.pathname === "/docs.md") {
    return renderAgentMarkdownIndex();
  }

  if (url.pathname === "/agents.json" || url.pathname === "/.well-known/agents.json" || url.pathname === "/.well-known/agent.json") {
    return renderAgentManifest();
  }

  if (url.pathname === "/.well-known/agent-card.json") {
    return renderA2aAgentCard();
  }

  if (url.pathname === "/api-catalog.json" || url.pathname === "/.well-known/api-catalog.json" || url.pathname === "/.well-known/api-catalog") {
    return renderApiCatalog();
  }

  if (url.pathname === "/mcp.json" || url.pathname === "/.well-known/mcp.json" || url.pathname === "/.well-known/mcp") {
    return renderMcpServerCard();
  }

  if (url.pathname === "/skills.json" || url.pathname === "/.well-known/skills.json" || url.pathname === "/.well-known/agent-skills.json") {
    return renderAgentSkills();
  }

  if (url.pathname === "/.well-known/agent-skills/index.json" || url.pathname === "/.well-known/skills/index.json") {
    return renderAgentSkillsIndex();
  }

  const agentSkillMatch = url.pathname.match(/^\/\.well-known\/agent-skills\/([^/]+)\/SKILL\.md$/);
  if (agentSkillMatch) {
    const response = renderAgentSkillDocument(decodeURIComponent(agentSkillMatch[1]));
    if (response) {
      return response;
    }
  }

  if (url.pathname === "/llms.txt") {
    return renderLlmsTxt();
  }

  if (url.pathname === "/llms-full.txt") {
    return renderLlmsFullTxt();
  }

  if (url.pathname === "/docs" || url.pathname === "/api-docs") {
    if (wantsMarkdown(request)) {
      return renderAgentMarkdownIndex();
    }
    return renderDocsPage();
  }

  if (url.pathname === "/quality" || url.pathname === "/quality/review") {
    return url.pathname === "/quality/review" ? renderQualityReviewPage(env) : renderQualityPage(env);
  }

  if (url.pathname === "/coverage") {
    return renderCoveragePage(env);
  }

  if (url.pathname === "/status") {
    return renderStatusPage(env);
  }

  if (url.pathname === "/operations") {
    return renderOperationsPage(env);
  }

  if (url.pathname === "/trust") {
    return renderTrustGatePage(env);
  }

  if (url.pathname === "/benchmark") {
    return renderBenchmarkPage(env);
  }

  if (url.pathname === "/integrations") {
    return renderIntegrationsPage();
  }

  if (url.pathname === "/roadmap") {
    return renderRoadmapPage();
  }

  if (url.pathname === "/quickstart") {
    return renderQuickstartPage();
  }

  if (url.pathname === "/recipes") {
    return renderRecipesPage();
  }

  if (url.pathname === "/examples") {
    return renderExamplesPage();
  }

  if (url.pathname === "/journeys") {
    return renderJourneysPage(env);
  }

  if (url.pathname === "/atlas") {
    return renderAtlasPage(env);
  }

  const atlasEcosystemMatch = url.pathname.match(/^\/atlas\/([^/]+)$/);
  if (atlasEcosystemMatch) {
    const response = await renderAtlasEcosystemPage(env, decodeURIComponent(atlasEcosystemMatch[1]));
    if (response) {
      return response;
    }
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

  if (url.pathname === "/alternatives") {
    return renderAlternativesIndexPage(env);
  }

  const alternativesLanding = url.pathname.match(/^\/alternatives\/(.+)$/);
  if (alternativesLanding) {
    const response = await renderAlternativesLandingPage(env, alternativesLanding[1]);
    if (response) {
      return response;
    }
  }

  const topicLanding = url.pathname.match(/^\/topics\/([^/]+)$/);
  if (topicLanding) {
    if (request.method === "HEAD") {
      return new Response(null, {
        status: hasTopicLandingPage(decodeURIComponent(topicLanding[1])) ? 200 : 404,
        headers: {
          "cache-control": "public, max-age=180",
          "content-type": "text/html; charset=utf-8"
        }
      });
    }
    const response = await renderTopicLandingPage(env, decodeURIComponent(topicLanding[1]));
    if (response) {
      return response;
    }
  }

  if (url.pathname === "/" || url.pathname === "/explorer") {
    if (url.pathname === "/" && wantsMarkdown(request)) {
      return renderAgentMarkdownIndex();
    }
    return renderExplorer();
  }

  if (url.pathname === "/projects") {
    return renderExplorer({ page: "projects" });
  }

  if (url.pathname === "/discover") {
    return renderDiscoverPage(env);
  }

  if (url.pathname === "/recommend") {
    return renderRecommendPage(env, url);
  }

  if (url.pathname === "/workflow") {
    return renderWorkflowPage(env, url);
  }

  if (url.pathname === "/trends") {
    return renderTrendsPage(env);
  }

  if (url.pathname === "/compare") {
    return renderCompareIndexPage(env);
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

  const scoreProjectId = prefixedProjectIdFromPath(url.pathname, "score");
  if (scoreProjectId) {
    const response = await renderProjectScorePage(env, scoreProjectId);
    if (response) {
      return response;
    }
  }

  if (url.pathname === "/api/status") {
    const target = new URL("/api/health", url);
    target.search = url.search;
    return Response.redirect(target.toString(), 301);
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

function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return /\btext\/markdown\b/i.test(accept);
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

function legacyProjectPageRedirect(url: URL): Response | null {
  const projectMatch = url.pathname.match(/^\/project\/([^/]+)\/([^/]+)$/);
  if (!projectMatch) {
    return null;
  }

  const target = new URL(`/projects/${projectMatch[1]}/${projectMatch[2]}`, url);
  target.search = url.search;
  return Response.redirect(target.toString(), 301);
}

function graphProjectIdFromPath(pathname: string): string | null {
  const ownerRepoMatch = pathname.match(/^\/graph\/([^/]+)\/([^/]+)$/);
  if (ownerRepoMatch) {
    return `${decodeURIComponent(ownerRepoMatch[1])}/${decodeURIComponent(ownerRepoMatch[2])}`;
  }

  const slugMatch = pathname.match(/^\/graph\/([^/]+)$/);
  return slugMatch ? decodeURIComponent(slugMatch[1]) : null;
}

function prefixedProjectIdFromPath(pathname: string, prefix: string): string | null {
  const ownerRepoMatch = pathname.match(new RegExp(`^/${prefix}/([^/]+)/([^/]+)$`));
  if (ownerRepoMatch) {
    return `${decodeURIComponent(ownerRepoMatch[1])}/${decodeURIComponent(ownerRepoMatch[2])}`;
  }

  const slugMatch = pathname.match(new RegExp(`^/${prefix}/([^/]+)$`));
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
    ["api", "mcp", "graph", "atlas", "score", "explorer", "discover", "trends", "workflow", "docs", "api-docs", "quality", "coverage", "status", "trust", "benchmark", "operations", "integrations", "roadmap", "quickstart", "recipes", "examples", "journeys", "categories", "deployments", "compare", "alternatives", "topics", "badge", "og.svg", "openapi.json", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "auth.md", "index.md", "docs.md", "agents.json", "agent-card.json", "api-catalog.json", "mcp.json", "skills.json", "favicon.ico"].includes(
      slug
    )
  ) {
    return null;
  }
  return slug;
}
