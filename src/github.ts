import type { Env, GithubRepoSignals, GithubRepository } from "./types";
import seedRepositories from "../data/seed-repositories.json";

const githubApiBase = "https://api.github.com";

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

export class GithubClient {
  constructor(private readonly env: Env) {}

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
      commits30d,
      releases180d,
      contributors90d,
      issueFirstResponseMedianHours
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

  private async countCommits(fullName: string, days: number): Promise<number> {
    try {
      const since = daysAgo(days);
      const commits = await this.request<GithubCommit[]>(
        `/repos/${fullName}/commits?since=${encodeURIComponent(since)}&per_page=100`
      );
      return commits.length;
    } catch {
      return 0;
    }
  }

  private async countReleases(fullName: string, days: number): Promise<number> {
    try {
      const releases = await this.request<GithubRelease[]>(`/repos/${fullName}/releases?per_page=100`);
      const cutoff = Date.parse(daysAgo(days));
      return releases.filter((release) => release.published_at && Date.parse(release.published_at) >= cutoff).length;
    } catch {
      return 0;
    }
  }

  private async countContributors(fullName: string): Promise<number> {
    try {
      const contributors = await this.request<GithubContributor[]>(`/repos/${fullName}/contributors?per_page=100`);
      return contributors.length;
    } catch {
      return 0;
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
    return response.json<T>();
  }
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
