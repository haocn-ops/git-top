import { getGithubRequestCache, touchGithubRequestCache, upsertGithubRequestCache } from "./github-cache-store";
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

interface GithubResponse<T> {
  data: T;
  headers: Headers;
}

export interface GithubRequestMetrics {
  total: number;
  conditional: number;
  cacheHits: number;
  cacheMisses: number;
  revalidated: number;
}

export interface GithubSignalOptions {
  maxCommitPages?: number;
  maxReleasePages?: number;
  maxContributorPages?: number;
  includeIssueFirstResponse?: boolean;
}

export class GithubApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string) {
    super(`GitHub API ${status} for ${path}`);
    this.name = "GithubApiError";
    this.status = status;
    this.path = path;
  }
}

export class GithubClient {
  private readonly env: Env;
  private readonly metrics: GithubRequestMetrics = {
    total: 0,
    conditional: 0,
    cacheHits: 0,
    cacheMisses: 0,
    revalidated: 0
  };

  constructor(env: Env) {
    this.env = env;
  }

  async getRepository(fullName: string): Promise<GithubRepository> {
    return this.request<GithubRepository>(`/repos/${fullName}`);
  }

  async getSignals(repo: GithubRepository, options: GithubSignalOptions = {}): Promise<GithubRepoSignals> {
    const commitPages = options.maxCommitPages ?? maxCommitPages;
    const releasePages = options.maxReleasePages ?? maxReleasePages;
    const contributorPages = options.maxContributorPages ?? maxContributorPages;
    const includeIssueFirstResponse = options.includeIssueFirstResponse ?? true;
    const [readmeText, files, commits30d, releases180d, contributors90d, issueFirstResponseMedianHours] =
      await Promise.all([
        this.getReadmeText(repo.full_name),
        this.getRootFiles(repo.full_name),
        this.countCommits(repo.full_name, 30, commitPages),
        this.countReleases(repo.full_name, 180, releasePages),
        this.countContributors(repo.full_name, contributorPages),
        includeIssueFirstResponse ? this.getIssueFirstResponseMedianHours(repo.full_name) : Promise.resolve(null)
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

  getRequestMetrics(): GithubRequestMetrics {
    return {
      ...this.metrics
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

  private async countCommits(fullName: string, days: number, pages: number): Promise<PagedCount> {
    try {
      const since = daysAgo(days);
      return this.countPaged<GithubCommit>(
        `/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=100`,
        pages
      );
    } catch {
      return unknownPagedCount();
    }
  }

  private async countReleases(fullName: string, days: number, pages: number): Promise<PagedCount> {
    try {
      const cutoff = Date.parse(daysAgo(days));
      let count = 0;
      const result = await this.forEachPage<GithubRelease>(`/repos/${fullName}/releases?per_page=100`, pages, (releases) => {
        const recent = releases.filter((release) => release.published_at && Date.parse(release.published_at) >= cutoff);
        count += recent.length;
        return recent.length === releases.length;
      });
      return {
        count,
        complete: result.complete
      };
    } catch {
      return unknownPagedCount();
    }
  }

  private async countContributors(fullName: string, pages: number): Promise<PagedCount> {
    try {
      return this.countPaged<GithubContributor>(`/repos/${fullName}/contributors?per_page=100`, pages);
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

  private async requestWithHeaders<T>(path: string): Promise<GithubResponse<T>> {
    const headers = new Headers({
      accept: "application/vnd.github+json",
      "user-agent": "git-top-worker"
    });

    if (this.env.GITHUB_TOKEN) {
      headers.set("authorization", `Bearer ${this.env.GITHUB_TOKEN}`);
    }

    const cached = await getGithubRequestCache(this.env, path);
    if (cached?.etag) {
      headers.set("if-none-match", cached.etag);
    }
    if (cached?.lastModified) {
      headers.set("if-modified-since", cached.lastModified);
    }

    this.metrics.total += 1;
    if (cached) {
      this.metrics.conditional += 1;
    }

    const response = await fetch(`${githubApiBase}${path}`, { headers });
    if (response.status === 304 && cached) {
      this.metrics.cacheHits += 1;
      await touchGithubRequestCache(this.env, path);
      return {
        data: JSON.parse(cached.bodyJson) as T,
        headers: response.headers
      };
    }
    if (!response.ok) {
      throw new GithubApiError(response.status, path);
    }
    if (cached) {
      this.metrics.revalidated += 1;
    } else {
      this.metrics.cacheMisses += 1;
    }
    const data = await response.json<T>();
    await upsertGithubRequestCache(this.env, {
      cacheKey: path,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      bodyJson: JSON.stringify(data),
      status: response.status
    });
    return {
      data,
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
