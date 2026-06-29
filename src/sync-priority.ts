import type { ProjectKnowledge } from "./types";

export type SyncTier = "hot" | "warm" | "cold";

export interface SyncPriorityItem {
  projectId: string;
  tier: SyncTier;
  staleDays: number;
  targetIntervalDays: number;
  priorityScore: number;
  reasons: string[];
}

export interface SyncPrioritySummary {
  generatedAt: string;
  policy: {
    hotTargetDays: number;
    warmTargetDays: number;
    coldTargetDays: number;
  };
  counts: Record<SyncTier, number>;
  staleCounts: Record<SyncTier, number>;
  oldestStaleDays: number;
  priorityPreview: SyncPriorityItem[];
}

const hotTargetDays = 1;
const warmTargetDays = 7;
const coldTargetDays = 30;

const hotCategories = new Set(["agent_framework", "coding_agent", "browser_agent", "mcp_server", "rag_framework"]);

export function buildSyncPrioritySummary(projects: ProjectKnowledge[], nowIso = new Date().toISOString(), limit = 10): SyncPrioritySummary {
  const items = projects.map((project) => classifySyncPriority(project, nowIso));
  const counts = emptyTierCounts();
  const staleCounts = emptyTierCounts();
  let oldestStaleDays = 0;

  for (const item of items) {
    counts[item.tier] += 1;
    if (item.staleDays > item.targetIntervalDays) {
      staleCounts[item.tier] += 1;
      oldestStaleDays = Math.max(oldestStaleDays, item.staleDays);
    }
  }

  return {
    generatedAt: nowIso,
    policy: {
      hotTargetDays,
      warmTargetDays,
      coldTargetDays
    },
    counts,
    staleCounts,
    oldestStaleDays,
    priorityPreview: items
      .filter((item) => item.staleDays > item.targetIntervalDays)
      .sort((a, b) => b.priorityScore - a.priorityScore || b.staleDays - a.staleDays || a.projectId.localeCompare(b.projectId))
      .slice(0, Math.max(1, Math.min(50, Math.trunc(limit))))
  };
}

export function selectPriorityRepositoryIds(
  projects: ProjectKnowledge[],
  allowedRepositories: string[],
  limit: number,
  nowIso = new Date().toISOString()
): string[] {
  if (limit <= 0 || projects.length === 0 || allowedRepositories.length === 0) {
    return [];
  }

  const allowed = new Map(allowedRepositories.map((repo) => [repo.toLowerCase(), repo]));
  return projects
    .map((project) => classifySyncPriority(project, nowIso))
    .filter((item) => item.staleDays > item.targetIntervalDays)
    .filter((item) => allowed.has(item.projectId.toLowerCase()))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.staleDays - a.staleDays || a.projectId.localeCompare(b.projectId))
    .slice(0, Math.max(1, Math.min(50, Math.trunc(limit))))
    .map((item) => allowed.get(item.projectId.toLowerCase())!);
}

export function classifySyncPriority(project: ProjectKnowledge, nowIso = new Date().toISOString()): SyncPriorityItem {
  const tier = tierForProject(project);
  const targetIntervalDays = targetDaysForTier(tier);
  const staleDays = daysSince(project.project.syncedAt, nowIso);
  const urgency = Math.max(0, staleDays - targetIntervalDays);
  const priorityScore = urgency * tierWeight(tier) + activityBoost(project);
  const reasons = reasonsForProject(project, tier, staleDays, targetIntervalDays);

  return {
    projectId: project.project.id,
    tier,
    staleDays,
    targetIntervalDays,
    priorityScore,
    reasons
  };
}

function tierForProject(project: ProjectKnowledge): SyncTier {
  if (
    project.metrics.stars30dDelta >= 100 ||
    project.metrics.gitScore >= 85 ||
    project.project.stars >= 50_000 ||
    project.agentCard.cloudflareReady ||
    hotCategories.has(project.agentCard.category)
  ) {
    return "hot";
  }

  if (project.metrics.stars30dDelta >= 20 || project.metrics.gitScore >= 70 || project.project.stars >= 5_000) {
    return "warm";
  }

  return "cold";
}

function targetDaysForTier(tier: SyncTier): number {
  if (tier === "hot") {
    return hotTargetDays;
  }
  if (tier === "warm") {
    return warmTargetDays;
  }
  return coldTargetDays;
}

function tierWeight(tier: SyncTier): number {
  if (tier === "hot") {
    return 100;
  }
  if (tier === "warm") {
    return 20;
  }
  return 5;
}

function activityBoost(project: ProjectKnowledge): number {
  return Math.min(100, project.metrics.stars30dDelta) + Math.min(50, Math.floor(project.metrics.gitScore / 2));
}

function reasonsForProject(project: ProjectKnowledge, tier: SyncTier, staleDays: number, targetIntervalDays: number): string[] {
  const reasons = [`${tier} tier target ${targetIntervalDays}d`, `${staleDays}d since sync`];
  if (project.metrics.stars30dDelta > 0) {
    reasons.push(`${project.metrics.stars30dDelta} stars in window`);
  }
  if (project.metrics.gitScore >= 70) {
    reasons.push(`git score ${project.metrics.gitScore}`);
  }
  if (project.agentCard.cloudflareReady) {
    reasons.push("Cloudflare ready");
  }
  return reasons.slice(0, 5);
}

function emptyTierCounts(): Record<SyncTier, number> {
  return {
    hot: 0,
    warm: 0,
    cold: 0
  };
}

function daysSince(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, Math.floor((end - start) / 1000 / 60 / 60 / 24));
}
