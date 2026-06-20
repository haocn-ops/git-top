import type { ProjectKnowledge } from "./types";

const now = "2026-06-16T00:00:00Z";

export const seedProjects: ProjectKnowledge[] = [
  {
    project: {
      id: "langchain-ai/langchain",
      owner: "langchain-ai",
      name: "langchain",
      fullName: "langchain-ai/langchain",
      githubUrl: "https://github.com/langchain-ai/langchain",
      homepageUrl: "https://www.langchain.com/",
      description: "Build context-aware reasoning applications",
      language: "Python",
      topics: ["agents", "llm", "rag", "tools"],
      license: "MIT",
      stars: 100000,
      forks: 16000,
      openIssues: 1000,
      defaultBranch: "master",
      createdAt: "2020-10-17T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: "langchain-ai/langchain",
      category: "agent_framework",
      difficulty: "intermediate",
      deployment: ["local", "docker", "cloud", "library_only"],
      cloudflareReady: false,
      useCases: ["build RAG applications", "orchestrate LLM tools", "prototype agent workflows"],
      notGoodFor: ["minimal single-file LLM scripts", "edge-only Cloudflare Workers deployment"],
      alternatives: [
        {
          project_id: "run-llama/llama_index",
          reason: "Better suited for data-centric RAG workflows."
        }
      ],
      summaryForAgent:
        "Use this when the user needs a broad Python framework for context-aware LLM applications with tools, retrieval, and workflow primitives.",
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: "langchain-ai/langchain",
      stars30dDelta: 2500,
      commits30d: 420,
      releases180d: 12,
      contributors90d: 180,
      issueFirstResponseMedianHours: 18,
      recentPushDays: 1,
      gitScore: 91,
      maintenanceScore: 86,
      calculatedAt: now
    }
  },
  {
    project: {
      id: "run-llama/llama_index",
      owner: "run-llama",
      name: "llama_index",
      fullName: "run-llama/llama_index",
      githubUrl: "https://github.com/run-llama/llama_index",
      homepageUrl: "https://www.llamaindex.ai/",
      description: "A data framework for LLM applications",
      language: "Python",
      topics: ["rag", "llm", "data", "agents"],
      license: "MIT",
      stars: 38000,
      forks: 5200,
      openIssues: 850,
      defaultBranch: "main",
      createdAt: "2022-11-02T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: "run-llama/llama_index",
      category: "rag_framework",
      difficulty: "intermediate",
      deployment: ["local", "docker", "cloud", "library_only"],
      cloudflareReady: false,
      useCases: ["build RAG systems", "connect private data to LLMs", "index documents for retrieval"],
      notGoodFor: ["pure browser-only apps", "edge-only runtime deployments"],
      alternatives: [
        {
          project_id: "langchain-ai/langchain",
          reason: "Broader agent and tool orchestration surface."
        }
      ],
      summaryForAgent:
        "Use this when the user needs a data-centric framework for indexing, retrieval, and RAG workflows.",
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: "run-llama/llama_index",
      stars30dDelta: 1200,
      commits30d: 360,
      releases180d: 18,
      contributors90d: 120,
      issueFirstResponseMedianHours: 22,
      recentPushDays: 1,
      gitScore: 88,
      maintenanceScore: 84,
      calculatedAt: now
    }
  },
  {
    project: {
      id: "modelcontextprotocol/servers",
      owner: "modelcontextprotocol",
      name: "servers",
      fullName: "modelcontextprotocol/servers",
      githubUrl: "https://github.com/modelcontextprotocol/servers",
      homepageUrl: "https://modelcontextprotocol.io/",
      description: "Reference implementations and community MCP servers",
      language: "TypeScript",
      topics: ["mcp", "agents", "tools", "typescript"],
      license: "MIT",
      stars: 18000,
      forks: 2200,
      openIssues: 320,
      defaultBranch: "main",
      createdAt: "2024-11-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: "modelcontextprotocol/servers",
      category: "mcp_server",
      difficulty: "beginner",
      deployment: ["local", "docker", "cloud"],
      cloudflareReady: false,
      useCases: ["connect agents to external tools", "study MCP server patterns", "bootstrap local MCP integrations"],
      notGoodFor: ["hosted project discovery APIs", "Cloudflare-native MCP deployment without adaptation"],
      alternatives: [],
      summaryForAgent:
        "Use this when the user needs MCP server examples or wants to connect an agent to files, APIs, or developer tools.",
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: "modelcontextprotocol/servers",
      stars30dDelta: 3200,
      commits30d: 140,
      releases180d: 8,
      contributors90d: 90,
      issueFirstResponseMedianHours: 30,
      recentPushDays: 1,
      gitScore: 89,
      maintenanceScore: 80,
      calculatedAt: now
    }
  },
  {
    project: {
      id: "cloudflare/agents",
      owner: "cloudflare",
      name: "agents",
      fullName: "cloudflare/agents",
      githubUrl: "https://github.com/cloudflare/agents",
      homepageUrl: "https://developers.cloudflare.com/agents/",
      description: "Build and deploy AI agents on Cloudflare",
      language: "TypeScript",
      topics: ["agents", "cloudflare", "workers", "serverless"],
      license: "Apache-2.0",
      stars: 5000,
      forks: 450,
      openIssues: 70,
      defaultBranch: "main",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: now,
      pushedAt: now,
      syncedAt: now
    },
    agentCard: {
      projectId: "cloudflare/agents",
      category: "agent_framework",
      difficulty: "beginner",
      deployment: ["cloudflare", "serverless"],
      cloudflareReady: true,
      useCases: ["build Cloudflare-native agents", "deploy stateful agents on Workers", "combine agents with Durable Objects"],
      notGoodFor: ["GPU-heavy local model serving", "Python-first agent stacks"],
      alternatives: [
        {
          project_id: "langchain-ai/langchain",
          reason: "Broader ecosystem and Python support."
        }
      ],
      summaryForAgent:
        "Use this when the user specifically wants to build and deploy agents on Cloudflare infrastructure.",
      schemaVersion: "v1",
      generatedAt: now
    },
    metrics: {
      projectId: "cloudflare/agents",
      stars30dDelta: 900,
      commits30d: 90,
      releases180d: 6,
      contributors90d: 30,
      issueFirstResponseMedianHours: 14,
      recentPushDays: 2,
      gitScore: 82,
      maintenanceScore: 78,
      calculatedAt: now
    }
  }
];
