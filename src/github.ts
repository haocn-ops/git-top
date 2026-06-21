import type { Env, GithubRepoSignals, GithubRepository } from "./types";
import seedRepositories from "../data/seed-repositories.json";

const githubApiBase = "https://api.github.com";
const maxCommitPages = 3;
const maxReleasePages = 5;
const maxContributorPages = 5;

export const defaultSeedRepositories = seedRepositories;

interface GithubContentItem {
  name: string;
  type: "file" | "dir" | string;
}

interface GithubReadme {
  content?: string;
  encoding?: string;
}

interface GithubCommit {
  sha: string;
}

interface GithubRelease {
  id: number;
  published_at: string | null;
}

interface GithubContributor {
  login: string;
}

interface GithubIssue {
  number: number;
  created_at: string;
  comments: number;
}

interface GithubComment {
  created_at: string;
}

type SignalConfidence = NonNullable<GithubRepoSignals["signalConfidence"]>;

interface PagedCount {
  count: number;
  complete: boolean;
}

export class GithubClient {
  private readonly env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async getRepository(fullName: string): Promise<GithubRepository> {
    return this.request<GithubRepository>(`/repos/${fullName}`);
  }

  async getSignals(repo: GithubRepository): Promise<GithubRepoSignals> {
    const [readmeText, files, commits30d, releases180d, contributors90d, issueFirstResponseMedianHours] =
      await Promise.all([
        this.getReadmeText(repo.full_name),
        this.getRootFiles(repo.full_name),
        this.countCommits(repo.full_name, 30),
        this.countReleases(repo.full_name, 180),
        this.countContributors(repo.full_name),
        this.getIssueFirstResponseMedianHours(repo.full_name)
      ]);

    return {
      readmeText,
      files,
      commits30d: commits30d.count,
      releases180d: releases180d.count,
      contributors90d: contributors90d.count,
      issueFirstResponseMedianHours,
      signalConfidence: {
        commits30d: confidenceFor(commits30d),
        releases180d: confidenceFor(releases180d),
        contributors90d: confidenceFor(contributors90d)
      }
    };
  }

  private async getReadmeText(fullName: string): Promise<string> {
    try {
      const readme = await this.request<GithubReadme>(`/repos/${fullName}/readme`);
      if (!readme.content || readme.encoding !== "base64") {
        return "";
      }
      return decodeBase64(readme.content).slice(0, 20000);
    } catch {
      return "";
    }
  }

  private async getRootFiles(fullName: string): Promise<string[]> {
    try {
      const items = await this.request<GithubContentItem[]>(`/repos/${fullName}/contents`);
      return items.filter((item) => item.type === "file").map((item) => item.name);
    } catch {
      return [];
    }
  }

  private async countCommits(fullName: string, days: number): Promise<PagedCount> {
    try {
      const since = daysAgo(days);
      return this.countPaged<GithubCommit>(
        `/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=100`,
        maxCommitPages
      );
    } catch {
      return unknownPagedCount();
    }
  }

  private async countReleases(fullName: string, days: number): Promise<PagedCount> {
    try {
      const cutoff = Date.parse(daysAgo(days));
      let count = 0;
      const pages = await this.forEachPage<GithubRelease>(`/repos/${fullName}/releases?per_page=100`, maxReleasePages, (releases) => {
        const recent = releases.filter((release) => release.published_at && Date.parse(release.published_at) >= cutoff);
        count += recent.length;
        return recent.length === releases.length;
      });
      return {
        count,
        complete: pages.complete
      };
    } catch {
      return unknownPagedCount();
    }
  }

  private async countContributors(fullName: string): Promise<PagedCount> {
    try {
      return this.countPaged<GithubContributor>(`/repos/${fullName}/contributors?per_page=100`, maxContributorPages);
    } catch {
      return unknownPagedCount();
    }
  }

  private async getIssueFirstResponseMedianHours(fullName: string): Promise<number | null> {
    try {
      const since = daysAgo(90);
      const issues = await this.request<GithubIssue[]>(
        `/repos/${fullName}/issues?state=all&since=${encodeURIComponent(since)}&per_page=10`
      );

      const responseHours: number[] = [];
      for (const issue of issues.filter((item) => item.comments > 0).slice(0, 5)) {
        const comments = await this.request<GithubComment[]>(
          `/repos/${fullName}/issues/${issue.number}/comments?per_page=1`
        );
        const firstComment = comments[0];
        if (!firstComment) {
          continue;
        }
        const diff = Date.parse(firstComment.created_at) - Date.parse(issue.created_at);
        if (diff > 0) {
          responseHours.push(diff / 1000 / 60 / 60);
        }
      }

      return median(responseHours);
    } catch {
      return null;
    }
  }

  private async request<T>(path: string): Promise<T> {
    return (await this.requestWithHeaders<T>(path)).data;
  }

  private async requestWithHeaders<T>(path: string): Promise<{ data: T; headers: Headers }> {
    const headers = new Headers({
      accept: "application/vnd.github+json",
      "user-agent": "git-top-worker"
    });

    if (this.env.GITHUB_TOKEN) {
      headers.set("authorization", `Bearer ${this.env.GITHUB_TOKEN}`);
    }

    const response = await fetch(`${githubApiBase}${path}`, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${path}`);
    }
    return {
      data: await response.json<T>(),
      headers: response.headers
    };
  }

  private async countPaged<T>(firstPath: string, maxPages: number): Promise<PagedCount> {
    let count = 0;
    const pages = await this.forEachPage<T>(firstPath, maxPages, (items) => {
      count += items.length;
      return true;
    });
    return {
      count,
      complete: pages.complete
    };
  }

  private async forEachPage<T>(
    firstPath: string,
    maxPages: number,
    visit: (items: T[]) => boolean
  ): Promise<{ complete: boolean }> {
    let nextPath: string | null = firstPath;
    let page = 0;

    while (nextPath && page < maxPages) {
      const response = await this.requestWithHeaders<T[]>(nextPath);
      page += 1;
      if (!visit(response.data)) {
        return { complete: true };
      }
      nextPath = nextPathFromLink(response.headers.get("link"));
    }

    return { complete: nextPath === null };
  }
}

function confidenceFor(result: PagedCount): SignalConfidence[keyof SignalConfidence] {
  if (result.count === 0 && !result.complete) {
    return "unknown";
  }
  return result.complete ? "complete" : "partial";
}

function unknownPagedCount(): PagedCount {
  return {
    count: 0,
    complete: false
  };
}

function nextPathFromLink(link: string | null): string | null {
  if (!link) {
    return null;
  }

  const next = link
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="next"'));

  const match = next?.match(/<([^>]+)>/);
  if (!match) {
    return null;
  }

  const url = new URL(match[1]);
  return `${url.pathname}${url.search}`;
}

function daysAgo(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function decodeBase64(value: string): string {
  const normalized = value.replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
