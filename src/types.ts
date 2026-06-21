export type Category =
  | "agent_framework"
  | "coding_agent"
  | "browser_agent"
  | "rag_framework"
  | "vector_database"
  | "llm_gateway"
  | "llm_eval"
  | "prompt_tooling"
  | "workflow_automation"
  | "local_llm_runtime"
  | "ai_app_template"
  | "mcp_server"
  | "ai_observability"
  | "other";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Deployment =
  | "local"
  | "docker"
  | "cloud"
  | "serverless"
  | "cloudflare"
  | "vercel"
  | "kubernetes"
  | "library_only";

export type ProjectKind = "project" | "collection";

export interface Project {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  githubUrl: string;
  homepageUrl: string | null;
  description: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  syncedAt: string;
}

export interface Alternative {
  project_id: string;
  reason: string;
}

export interface AgentCard {
  projectId: string;
  projectKind?: ProjectKind;
  collectionMetadata?: CollectionMetadata;
  category: Category;
  difficulty: Difficulty;
  deployment: Deployment[];
  cloudflareReady: boolean;
  useCases: string[];
  notGoodFor: string[];
  alternatives: Alternative[];
  summaryForAgent: string;
  classification?: {
    category?: ClassificationSignal;
    deployment?: ClassificationSignal;
    difficulty?: ClassificationSignal;
    cloudflareReady?: ClassificationSignal;
  };
  schemaVersion: "v1";
  generatedAt: string;
}

export interface CollectionMetadata {
  scope: "awesome_list" | "cookbook" | "starter_collection" | "integration_collection" | "resource_hub";
  curated: boolean;
  estimatedItems: number | null;
  freshness: "active" | "stale" | "unknown";
}

export interface ClassificationSignal {
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export interface ProjectMetrics {
  projectId: string;
  stars30dDelta: number;
  commits30d: number;
  releases180d: number;
  contributors90d: number;
  issueFirstResponseMedianHours: number | null;
  recentPushDays: number | null;
  gitScore: number;
  maintenanceScore: number;
  signalConfidence?: {
    stars30dDelta?: "snapshot" | "estimated";
    stars30dWindowDays?: number;
    commits30d?: "complete" | "partial" | "unknown";
    releases180d?: "complete" | "partial" | "unknown";
    contributors90d?: "complete" | "partial" | "unknown";
  };
  calculatedAt: string;
}

export interface ProjectKnowledge {
  project: Project;
  agentCard: AgentCard;
  metrics: ProjectMetrics;
}

export type SyncTrigger = "cron" | "admin" | "manual";

export interface SyncFailure {
  repository: string;
  error: string;
}

export interface SyncRun {
  id: string;
  trigger: SyncTrigger;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  offset: number;
  nextOffset: number;
  limit: number;
  syncedCount: number;
  failedCount: number;
  alternativesUpdated: number;
  synced: string[];
  failed: SyncFailure[];
}

export interface Env {
  DB?: D1Database;
  GITHUB_TOKEN?: string;
  SYNC_SECRET?: string;
}

export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  html_url: string;
  homepage: string | null;
  description: string | null;
  language: string | null;
  topics?: string[];
  license: {
    spdx_id: string | null;
  } | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string | null;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
}

export interface GithubRepoSignals {
  readmeText: string;
  files: string[];
  commits30d: number;
  releases180d: number;
  contributors90d: number;
  issueFirstResponseMedianHours: number | null;
  signalConfidence?: {
    commits30d: "complete" | "partial" | "unknown";
    releases180d: "complete" | "partial" | "unknown";
    contributors90d: "complete" | "partial" | "unknown";
  };
}
