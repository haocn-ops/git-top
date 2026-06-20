import type { GithubRepoSignals, GithubRepository, ProjectMetrics } from "./types";

export function calculateMetrics(repo: GithubRepository, signals: GithubRepoSignals, now: string): ProjectMetrics {
  const stars30dDelta = estimateStars30dDelta(repo);
  const starGrowthScore = normalize(stars30dDelta, 1500);
  const commitScore = normalize(signals.commits30d, 200);
  const releaseScore = normalize(signals.releases180d, 12);
  const contributorScore = normalize(signals.contributors90d, 80);
  const issueResponseScore = issueResponseToScore(signals.issueFirstResponseMedianHours);
  const recentPushDays = repo.pushed_at ? daysSince(repo.pushed_at) : null;
  const recentPushScore = recentPushDays === null ? 0 : Math.max(0, 100 - recentPushDays * 4);

  const gitScore = weightedScore([
    [starGrowthScore, 0.4],
    [commitScore, 0.2],
    [releaseScore, 0.15],
    [contributorScore, 0.15],
    [issueResponseScore, 0.1]
  ]);

  const maintenanceScore = weightedScore([
    [commitScore, 0.3],
    [releaseScore, 0.25],
    [contributorScore, 0.2],
    [issueResponseScore, 0.15],
    [recentPushScore, 0.1]
  ]);

  return {
    projectId: repo.full_name,
    stars30dDelta,
    commits30d: signals.commits30d,
    releases180d: signals.releases180d,
    contributors90d: signals.contributors90d,
    issueFirstResponseMedianHours: signals.issueFirstResponseMedianHours,
    recentPushDays,
    gitScore,
    maintenanceScore,
    calculatedAt: now
  };
}

function estimateStars30dDelta(repo: GithubRepository): number {
  if (!repo.created_at) {
    return 0;
  }

  const ageDays = Math.max(1, daysSince(repo.created_at));
  const averageDailyStars = repo.stargazers_count / ageDays;
  return Math.round(averageDailyStars * 30);
}

function issueResponseToScore(hours: number | null): number {
  if (hours === null) {
    return 40;
  }
  if (hours <= 4) {
    return 100;
  }
  if (hours <= 24) {
    return 85;
  }
  if (hours <= 72) {
    return 65;
  }
  if (hours <= 168) {
    return 45;
  }
  return 20;
}

function normalize(value: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function weightedScore(parts: Array<[number, number]>): number {
  return Math.round(parts.reduce((total, [score, weight]) => total + score * weight, 0));
}

function daysSince(isoDate: string): number {
  const then = Date.parse(isoDate);
  if (!Number.isFinite(then)) {
    return 999;
  }
  return Math.max(0, Math.floor((Date.now() - then) / 1000 / 60 / 60 / 24));
}
