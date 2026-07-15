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
  isPublicCorsPath,
  withSiteHeaders
} from "./site";
import { syncGithubProjects } from "./sync";
import {
  scheduledCandidateLimit,
  scheduledRefreshLimit,
  shouldRunScheduledCandidateDiscovery
} from "./sync-policy";
import { buildSyncPrioritySummary } from "./sync-priority";
import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { runScheduledGovernance } from "./scheduled-governance";
import { pruneOperationalData } from "./storage-maintenance";
import { refreshAlternativesIncremental } from "./derived-refresh";
import { sendOperationsAlert } from "./operations-alert";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const response = await routeRequest(request, env, url);
    return withSiteHeaders(response, request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledMaintenance(env));
  }
};

async function runScheduledMaintenance(env: Env): Promise<void> {
  const now = new Date();
  let planningReady = false;
  let overdueCount = 0;
  let refreshDueCount = 0;
  let capacityHeadroom = 0;
  let runDiscovery = false;
  let discoveredProjectCount = 0;

  await runMaintenanceSteps(env, [
    { task: "scheduled:storage-maintenance", run: () => pruneOperationalData(env) },
    {
      task: "scheduled:refresh-planning",
      run: async () => {
        const knowledge = await listProjectKnowledgeWithMeta(env);
        if (knowledge.metadata.source !== "d1") {
          throw new Error(`Refresh planning expected D1, got ${knowledge.metadata.source}: ${knowledge.metadata.reason}`);
        }
        const priority = buildSyncPrioritySummary(knowledge.projects, now.toISOString(), 50);
        overdueCount = Object.values(priority.staleCounts).reduce((sum, count) => sum + count, 0);
        refreshDueCount = Object.values(priority.refreshDueCounts).reduce((sum, count) => sum + count, 0);
        capacityHeadroom = priority.capacity.headroom;
        runDiscovery = shouldRunScheduledCandidateDiscovery({
          hourUtc: now.getUTCHours(),
          overdueCount,
          refreshDueCount,
          capacityHeadroom
        });
        planningReady = true;
        return { overdue_count: overdueCount, refresh_due_count: refreshDueCount, capacity_headroom: capacityHeadroom, run_discovery: runDiscovery };
      }
    },
    {
      task: "scheduled:candidate-discovery",
      run: async () => {
        if (!runDiscovery) {
          return {
            skipped: true,
            reason: !planningReady ? "refresh_planning_unavailable" : overdueCount > 0 ? "overdue_refresh_backlog" : refreshDueCount >= 7 ? "refresh_due_backlog" : "not_daily_discovery_window",
            overdue_count: overdueCount,
            refresh_due_count: refreshDueCount,
            capacity_headroom: capacityHeadroom
          };
        }
        const result = await discoverAndSyncCandidateProjects(env, { trigger: "cron", maxCandidates: scheduledCandidateLimit });
        if (result.failed.length > 0) {
          throw new Error(`Candidate discovery failed: ${result.failed[0].error}`);
        }
        discoveredProjectCount = result.selected.length;
        return result;
      }
    },
    {
      task: "scheduled:project-refresh",
      run: async () => {
        const result = await syncGithubProjects(env, {
          limit: Math.max(1, scheduledRefreshLimit - discoveredProjectCount),
          trigger: "cron",
          signalDepth: "lite"
        });
        if (result.failed.length > 0) {
          throw new Error(`Scheduled project refresh failed: ${result.failed[0].repository} ${result.failed[0].error}`);
        }
        return result;
      }
    },
    { task: "derived:alternatives-progress", run: () => refreshAlternativesIncremental(env) },
    { task: "scheduled:governance", run: () => runScheduledGovernance(env) }
  ]);
}

export async function runMaintenanceSteps(
  env: Env,
  steps: Array<{ task: string; run: () => Promise<unknown> }>
): Promise<void> {
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      await sendOperationsAlert(env, {
        task: step.task,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

async function routeRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const canonicalRedirect = canonicalHostRedirect(request, url);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  if (request.method === "OPTIONS" && isPublicCorsPath(url.pathname)) {
    return new Response(null, { status: 204 });
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

  if (url.pathname === "/security.txt" || url.pathname === "/.well-known/security.txt") {
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
