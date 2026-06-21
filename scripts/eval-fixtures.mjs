import { generateAgentCard } from "../src/cards.ts";
import { calculateMetrics } from "../src/scoring.ts";
import { inferSeedCategory } from "./seed-category-hints.mjs";

export const generatedKnowledgeNow = "2026-06-20T00:00:00Z";

export const baseSignals = {
  readmeText: "",
  files: ["package.json"],
  commits30d: 30,
  releases180d: 2,
  contributors90d: 8,
  issueFirstResponseMedianHours: 24,
  signalConfidence: {
    commits30d: "complete",
    releases180d: "complete",
    contributors90d: "complete"
  }
};

export const generatedKnowledgeFixtures = [
  {
    repo: repoFixture({
      owner: "cloudflare",
      name: "agents",
      description: "Build and deploy AI agents on Cloudflare Workers",
      topics: ["agents", "cloudflare", "workers", "serverless"],
      stars: 5000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Cloudflare Workers agents with Durable Objects and serverless deployment.",
      files: ["wrangler.toml", "package.json"]
    },
    expected: {
      category: "agent_framework",
      deployments: ["cloudflare", "serverless"],
      cloudflareReady: true
    }
  },
  {
    repo: repoFixture({
      owner: "run-llama",
      name: "llama_index",
      description: "A data framework for LLM applications and RAG",
      topics: ["rag", "retrieval", "llm", "data"],
      language: "Python",
      stars: 38000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Retrieval augmented generation indexing for private data. Install with pip install llama-index."
    },
    expected: {
      category: "rag_framework",
      deployments: ["library_only", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "modelcontextprotocol",
      name: "servers",
      description: "Reference Model Context Protocol MCP server implementations",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 18000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Model Context Protocol server examples for connecting tools to agents."
    },
    expected: {
      category: "mcp_server",
      deployments: ["local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "browser-use",
      name: "browser-use",
      description: "Browser automation agent for web tasks",
      topics: ["browser", "agent", "playwright"],
      language: "Python",
      stars: 12000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Browser agent and web automation using Playwright. Docker support is available.",
      files: ["Dockerfile"]
    },
    expected: {
      category: "browser_agent",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "OpenHands",
      name: "OpenHands",
      description: "Autonomous coding agent and developer assistant",
      topics: ["coding-agent", "developer", "assistant"],
      language: "Python",
      stars: 45000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Autonomous coding agent for software development workflows. Docker compose deployment supported.",
      files: ["docker-compose.yml"]
    },
    expected: {
      category: "coding_agent",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "BerriAI",
      name: "litellm",
      description: "OpenAI compatible LLM gateway and proxy",
      topics: ["gateway", "proxy", "openai-compatible"],
      stars: 23000
    }),
    signals: {
      ...baseSignals,
      readmeText: "LiteLLM proxy gateway routes model providers with OpenAI compatible APIs. Docker supported.",
      files: ["Dockerfile"]
    },
    expected: {
      category: "llm_gateway",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "promptfoo",
      name: "promptfoo",
      description: "Evaluate and red-team prompts and LLM apps",
      topics: ["eval", "prompt", "testing"],
      stars: 9000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Prompt evaluation, red teaming, and benchmark workflows. Install with npm install promptfoo."
    },
    expected: {
      category: "llm_eval",
      deployments: ["library_only", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "dottxt-ai",
      name: "outlines",
      description: "Structured generation and prompt tooling",
      topics: ["prompt", "structured-output", "generation"],
      language: "Python",
      stars: 12000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Prompt tooling for structured generation. Install with pip install outlines."
    },
    expected: {
      category: "prompt_tooling",
      deployments: ["library_only", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "langfuse",
      name: "langfuse",
      description: "LLM observability, tracing, and monitoring",
      topics: ["observability", "tracing", "monitoring"],
      stars: 14000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Open source LLM observability with tracing, monitoring, and docker compose deployment.",
      files: ["docker-compose.yml"]
    },
    expected: {
      category: "ai_observability",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "ollama",
      name: "ollama",
      description: "Run local LLM models",
      topics: ["local-llm", "inference", "models"],
      language: "Go",
      stars: 130000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Run local LLMs and serve models for private inference."
    },
    expected: {
      category: "local_llm_runtime",
      deployments: ["local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "n8n-io",
      name: "n8n",
      description: "Workflow automation for connecting tools and services",
      topics: ["workflow", "automation", "orchestration"],
      stars: 100000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Workflow automation and orchestration with Docker deployment.",
      files: ["docker-compose.yml"]
    },
    expected: {
      category: "workflow_automation",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "qdrant",
      name: "qdrant",
      description: "Vector database for embeddings and semantic search",
      topics: ["vector-database", "embeddings", "search"],
      language: "Rust",
      stars: 26000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Vector database for embedding search. Docker and Kubernetes deployments are supported.",
      files: ["Dockerfile", "helmfile.yaml"]
    },
    expected: {
      category: "vector_database",
      deployments: ["docker", "kubernetes", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "mckaywrigley",
      name: "chatbot-ui",
      description: "AI chatbot app template and starter",
      topics: ["template", "starter", "chatbot"],
      stars: 30000
    }),
    signals: {
      ...baseSignals,
      readmeText: "A chatbot UI template and starter app deployed on Vercel.",
      files: ["vercel.json", "package.json"]
    },
    expected: {
      category: "ai_app_template",
      deployments: ["vercel", "serverless", "local"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "vllm-project",
      name: "vllm",
      description: "High-throughput inference server for LLM serving",
      topics: ["inference", "model-serving", "kubernetes"],
      language: "Python",
      stars: 60000
    }),
    signals: {
      ...baseSignals,
      readmeText: "High-throughput inference server for serving models with Docker and Kubernetes deployment.",
      files: ["Dockerfile", "helmfile.yaml"]
    },
    expected: {
      category: "local_llm_runtime",
      deployments: ["docker", "kubernetes", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "weaviate",
      name: "weaviate",
      description: "Vector database and embedding search engine",
      topics: ["vector-database", "embedding", "search"],
      language: "Go",
      stars: 15000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Vector database for embedding and ANN search. Docker compose and Kubernetes deployments are available.",
      files: ["docker-compose.yml", "helmfile.yaml"]
    },
    expected: {
      category: "vector_database",
      deployments: ["docker", "kubernetes", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "Portkey-AI",
      name: "gateway",
      description: "AI gateway, proxy, and router for LLM providers",
      topics: ["gateway", "proxy", "router"],
      stars: 9000
    }),
    signals: {
      ...baseSignals,
      readmeText: "OpenAI compatible gateway proxy and router for model providers. Docker deployment supported.",
      files: ["Dockerfile"]
    },
    expected: {
      category: "llm_gateway",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "Arize-ai",
      name: "phoenix",
      description: "AI observability tracing and monitoring",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 8000
    }),
    signals: {
      ...baseSignals,
      readmeText: "LLM observability, tracing, and monitoring for production AI systems. Docker supported.",
      files: ["Dockerfile"]
    },
    expected: {
      category: "ai_observability",
      deployments: ["docker", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "ComposioHQ",
      name: "composio",
      description: "Workflow automation and tool integrations for agents",
      topics: ["workflow", "automation", "tools"],
      stars: 28000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Workflow automation and orchestration for connecting tools and services to agents."
    },
    expected: {
      category: "workflow_automation",
      deployments: ["local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "guardrails-ai",
      name: "guardrails",
      description: "Prompt tooling and guardrails for structured LLM outputs",
      topics: ["prompt", "guardrails", "structured-output"],
      language: "Python",
      stars: 9000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Prompt tooling and guardrails for structured LLM outputs. Install with pip install guardrails-ai."
    },
    expected: {
      category: "prompt_tooling",
      deployments: ["library_only", "local", "cloud"],
      cloudflareReady: false
    }
  },
  {
    repo: repoFixture({
      owner: "microsoft",
      name: "playwright-mcp",
      description: "MCP server for browser automation with Playwright",
      topics: ["mcp", "browser", "playwright"],
      stars: 34000
    }),
    signals: {
      ...baseSignals,
      readmeText: "Model Context Protocol server for browser automation using Playwright."
    },
    expected: {
      category: "mcp_server",
      deployments: ["local", "cloud"],
      cloudflareReady: false
    }
  },
  ...compactFixtures([
    {
      owner: "milvus-io",
      name: "milvus",
      description: "Vector database for embeddings and similarity search",
      topics: ["vector-database", "embeddings", "search"],
      language: "Go",
      stars: 36000,
      readmeText: "Vector database and embedding database for ANN search. Docker and Kubernetes deployments are supported.",
      files: ["Dockerfile", "helmfile.yaml"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "kubernetes", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "chroma-core",
      name: "chroma",
      description: "Embedding database for AI applications",
      topics: ["embedding-database", "vector-search", "rag"],
      language: "Python",
      stars: 22000,
      readmeText: "Embedding database and vector database for RAG applications. Install with pip install chromadb.",
      expected: {
        category: "vector_database",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "facebookresearch",
      name: "faiss",
      description: "Library for efficient similarity search and clustering of dense vectors",
      topics: ["ann-search", "vector-search", "embeddings"],
      language: "C++",
      stars: 36000,
      readmeText: "Library for ANN search over embeddings and dense vectors.",
      expected: {
        category: "vector_database",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "helicone",
      name: "helicone",
      description: "Open source LLM observability and monitoring",
      topics: ["observability", "monitoring", "tracing"],
      stars: 4000,
      readmeText: "LLM observability with tracing, monitoring, and Docker deployment.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "AgentOps-AI",
      name: "agentops",
      description: "AI agent observability, tracing, and monitoring",
      topics: ["observability", "agents", "tracing"],
      language: "Python",
      stars: 5000,
      readmeText: "Agent observability with tracing and monitoring for AI systems. Install with pip install agentops.",
      expected: {
        category: "ai_observability",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "traceloop",
      name: "openllmetry",
      description: "OpenTelemetry observability for LLM applications",
      topics: ["observability", "tracing", "opentelemetry"],
      language: "Python",
      stars: 3000,
      readmeText: "LLM observability and tracing using OpenTelemetry.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "activepieces",
      name: "activepieces",
      description: "Workflow automation platform for connecting apps and AI agents",
      topics: ["workflow", "automation", "orchestration"],
      stars: 18000,
      readmeText: "Workflow automation and orchestration with Docker compose deployment.",
      files: ["docker-compose.yml"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "windmill-labs",
      name: "windmill",
      description: "Workflow automation and developer platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Rust",
      stars: 16000,
      readmeText: "Workflow automation, orchestration, and scripts. Docker and Kubernetes deployment supported.",
      files: ["Dockerfile", "helmfile.yaml"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "kubernetes", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "triggerdotdev",
      name: "trigger.dev",
      description: "Workflow automation and background job orchestration",
      topics: ["workflow", "automation", "jobs"],
      stars: 12000,
      readmeText: "Workflow automation and orchestration for background jobs. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "FlowiseAI",
      name: "Flowise",
      description: "Workflow automation for building LLM apps and agent flows",
      topics: ["workflow", "automation", "agents"],
      stars: 35000,
      readmeText: "Low-code workflow automation and orchestration for LLM apps. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "cline",
      name: "cline",
      description: "Coding agent and developer assistant in the IDE",
      topics: ["coding-agent", "developer-assistant", "ide"],
      stars: 45000,
      readmeText: "Coding agent and developer assistant for IDE workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "aider-ai",
      name: "aider",
      description: "AI pair programming coding agent",
      topics: ["coding-agent", "developer", "assistant"],
      language: "Python",
      stars: 38000,
      readmeText: "Coding agent and developer assistant for local software development. Install with pip install aider-chat.",
      expected: {
        category: "coding_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "codex",
      description: "Coding agent for developer workflows",
      topics: ["coding-agent", "developer-assistant", "cli"],
      language: "Rust",
      stars: 45000,
      readmeText: "Coding agent and developer assistant for local code changes.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "continuedev",
      name: "continue",
      description: "Open-source code assistant and coding agent",
      topics: ["coding-agent", "developer-assistant", "ide"],
      stars: 26000,
      readmeText: "Developer assistant and coding agent for IDE workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "browser-use",
      name: "web-ui",
      description: "Web UI for browser-use browser agents",
      topics: ["browser-use", "browser-agent", "web-automation"],
      language: "Python",
      stars: 16000,
      readmeText: "Browser agent UI for browser automation using Playwright.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Skyvern-AI",
      name: "skyvern",
      description: "Browser automation agent for web workflows",
      topics: ["browser", "browser-automation", "agent"],
      language: "Python",
      stars: 15000,
      readmeText: "Browser automation and web agent workflows. Docker compose deployment supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "browser_agent",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "firecrawl",
      name: "firecrawl",
      description: "Browser automation and web data extraction for AI agents",
      topics: ["browser", "web-automation", "agent"],
      stars: 30000,
      readmeText: "Browser automation and web agent data extraction. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "browser_agent",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "steel-dev",
      name: "steel-browser",
      description: "Browser automation infrastructure for AI agents",
      topics: ["browser", "browser-automation", "agent"],
      stars: 7000,
      readmeText: "Browser automation infrastructure for web agents.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "567-labs",
      name: "instructor",
      description: "Prompt tooling for structured LLM outputs",
      topics: ["prompt", "structured-output", "tooling"],
      language: "Python",
      stars: 11000,
      readmeText: "Prompt tooling and structured output generation. Install with pip install instructor.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "promptflow",
      description: "Prompt tooling and evaluation workflows",
      topics: ["prompt", "workflow", "evaluation"],
      language: "Python",
      stars: 10000,
      readmeText: "Prompt management and prompt tooling for LLM application workflows.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "NVIDIA-NeMo",
      name: "Guardrails",
      description: "Prompt management and guardrails for LLM applications",
      topics: ["prompt", "guardrails", "llm"],
      language: "Python",
      stars: 9000,
      readmeText: "Prompt management and guardrails for LLM apps. Install as a Python library.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lmstudio-ai",
      name: "lms",
      description: "Local LLM runtime and inference server",
      topics: ["local-llm", "inference", "model-serving"],
      stars: 7000,
      readmeText: "Local LLM runtime for private inference and serving models.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mudler",
      name: "LocalAI",
      description: "Local LLM inference server and OpenAI compatible runtime",
      topics: ["local-llm", "inference", "openai-compatible"],
      language: "Go",
      stars: 35000,
      readmeText: "Local LLM inference server and model serving with Docker support.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ggml-org",
      name: "llama.cpp",
      description: "Local LLM inference runtime for GGUF models",
      topics: ["local-llm", "gguf", "inference"],
      language: "C++",
      stars: 85000,
      readmeText: "Local LLM runtime for GGUF inference and model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-webui",
      name: "open-webui",
      description: "AI app template and web UI for local LLMs",
      topics: ["template", "starter", "chatbot"],
      language: "Svelte",
      stars: 70000,
      readmeText: "AI app template and starter web UI. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "vercel",
      name: "ai-chatbot",
      description: "AI chatbot app template and starter",
      topics: ["template", "starter", "chatbot"],
      stars: 18000,
      readmeText: "AI chatbot template and starter deployed on Vercel.",
      files: ["vercel.json"],
      expected: {
        category: "ai_app_template",
        deployments: ["vercel", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "BuilderIO",
      name: "gpt-crawler",
      description: "AI app template and crawler starter",
      topics: ["template", "starter", "crawler"],
      stars: 20000,
      readmeText: "Starter template for AI apps and crawlers. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lm-sys",
      name: "FastChat",
      description: "LLM evaluation benchmark and model serving",
      topics: ["evaluation", "benchmark", "llm"],
      language: "Python",
      stars: 38000,
      readmeText: "LLM evaluation and benchmark workflows for model comparisons.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "confident-ai",
      name: "deepeval",
      description: "LLM evaluation framework and benchmark tooling",
      topics: ["evaluation", "benchmark", "testing"],
      language: "Python",
      stars: 9000,
      readmeText: "LLM eval framework for testing and benchmark workflows. Install with pip install deepeval.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "evals",
      description: "LLM eval and benchmark registry",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 16000,
      readmeText: "Evaluation and benchmark framework for LLM behavior.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langgenius",
      name: "dify",
      description: "Workflow automation platform for LLM apps",
      topics: ["workflow", "automation", "llm"],
      stars: 110000,
      readmeText: "Workflow automation and orchestration for LLM applications. Docker compose deployment supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "CrewAIInc",
      name: "crewAI",
      description: "Agent framework for multiagent orchestration",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 40000,
      readmeText: "Agent framework for multiagent orchestration. Install with pip install crewai.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "autogen",
      description: "Agent framework for multiagent applications",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 48000,
      readmeText: "Agent framework for multiagent conversation and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langgraph",
      description: "Agent framework for graph-based tool calling workflows",
      topics: ["agent-framework", "agents", "tool-calling"],
      language: "Python",
      stars: 18000,
      readmeText: "Agent framework for graph workflows, agents, and tool calling. Install with pip install langgraph.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "supabase",
      name: "mcp",
      description: "MCP server for Supabase tools",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 6000,
      readmeText: "Model Context Protocol server for connecting Supabase tools to agents.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "github",
      name: "github-mcp-server",
      description: "MCP server for GitHub developer tools",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      language: "Go",
      stars: 20000,
      readmeText: "Model Context Protocol server exposing GitHub tools to agents.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mongodb-js",
      name: "mongodb-mcp-server",
      description: "MCP server for MongoDB tools",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 4000,
      readmeText: "Model Context Protocol server for MongoDB tools and database workflows.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Kong",
      name: "kong",
      description: "OpenAI compatible LLM gateway and proxy",
      topics: ["gateway", "proxy", "router"],
      language: "Lua",
      stars: 40000,
      readmeText: "Gateway proxy and router for APIs with OpenAI compatible LLM gateway patterns. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "llm_gateway",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-webui",
      name: "pipelines",
      description: "OpenAI compatible LLM gateway and router",
      topics: ["gateway", "proxy", "router"],
      stars: 8000,
      readmeText: "LLM gateway proxy and router for OpenAI compatible providers.",
      expected: {
        category: "llm_gateway",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "openai-agents-python",
      description: "Agent framework for Python tool calling agents",
      topics: ["agent-framework", "agents", "tool-calling"],
      language: "Python",
      stars: 15000,
      readmeText: "Agent framework for building Python agents with tool calling. Install with pip install openai-agents.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "camel-ai",
      name: "camel",
      description: "Agent framework for multiagent systems",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 12000,
      readmeText: "Agent framework for multiagent research and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "pydantic",
      name: "pydantic-ai",
      description: "Agent framework for Python applications",
      topics: ["agent-framework", "agents", "python"],
      language: "Python",
      stars: 18000,
      readmeText: "Agent framework for building Python agents with structured outputs. Install with pip install pydantic-ai.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "livekit",
      name: "agents",
      description: "Agent framework for realtime voice and multimodal agents",
      topics: ["agent-framework", "agents", "realtime"],
      stars: 9000,
      readmeText: "Agent framework for realtime voice agents and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "modelcontextprotocol",
      name: "typescript-sdk",
      description: "Model Context Protocol SDK for MCP servers",
      topics: ["mcp", "modelcontextprotocol", "sdk"],
      stars: 9000,
      readmeText: "Model Context Protocol SDK for building MCP server integrations.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "modelcontextprotocol",
      name: "python-sdk",
      description: "Model Context Protocol Python SDK for MCP servers",
      topics: ["mcp", "modelcontextprotocol", "sdk"],
      language: "Python",
      stars: 7000,
      readmeText: "Model Context Protocol SDK for building MCP server integrations in Python.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "cloudflare",
      name: "mcp-server-cloudflare",
      description: "MCP server for Cloudflare tools and APIs",
      topics: ["mcp", "modelcontextprotocol", "cloudflare"],
      stars: 5000,
      readmeText: "Model Context Protocol server for Cloudflare tools. Cloudflare Workers deployment examples are available.",
      files: ["wrangler.toml", "package.json"],
      expected: {
        category: "mcp_server",
        deployments: ["cloudflare", "serverless", "local"],
        cloudflareReady: true
      }
    },
    {
      owner: "example",
      name: "cloudflare-python-agent",
      description: "Python agent framework with Cloudflare Workers deployment notes",
      topics: ["agents", "cloudflare", "python"],
      language: "Python",
      stars: 1800,
      readmeText: "Python agent framework with Cloudflare Workers deployment notes, but the runtime depends on Python packages, filesystem access, and native extension support.",
      expected: {
        category: "agent_framework",
        projectKind: "project",
        deployments: ["cloudflare", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "example",
      name: "cloudflare-docker-gateway",
      description: "LLM gateway with Cloudflare deployment examples",
      topics: ["gateway", "cloudflare", "docker"],
      stars: 1600,
      readmeText: "OpenAI compatible LLM gateway with Cloudflare Workers examples, but production deployment requires a Docker daemon and Postgres.",
      files: ["Dockerfile", "docker-compose.yml"],
      expected: {
        category: "llm_gateway",
        projectKind: "project",
        deployments: ["docker", "cloudflare", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "docker",
      name: "mcp-gateway",
      description: "MCP gateway for connecting agents to tool servers",
      topics: ["mcp", "gateway", "tools"],
      language: "Go",
      stars: 5000,
      readmeText: "Model Context Protocol gateway for MCP server routing. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "mcp_server",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "deepset-ai",
      name: "haystack",
      description: "RAG framework for retrieval augmented generation",
      topics: ["rag", "retrieval-augmented", "llm"],
      language: "Python",
      stars: 20000,
      readmeText: "RAG framework and data framework for retrieval augmented generation. Install with pip install haystack-ai.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "infiniflow",
      name: "ragflow",
      description: "RAG framework and document retrieval platform",
      topics: ["rag", "retrieval", "documents"],
      language: "Python",
      stars: 40000,
      readmeText: "RAG framework for document indexing and retrieval. Docker compose deployment supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "rag_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mem0ai",
      name: "mem0",
      description: "Memory and retrieval framework for AI agents",
      topics: ["rag", "retrieval", "memory"],
      language: "Python",
      stars: 35000,
      readmeText: "RAG and memory framework for agents with retrieval over user context. Install with pip install mem0ai.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "graphrag",
      description: "Graph RAG framework for retrieval augmented generation",
      topics: ["rag", "retrieval", "graph"],
      language: "Python",
      stars: 25000,
      readmeText: "Graph RAG framework for indexing and retrieval augmented generation.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lancedb",
      name: "lancedb",
      description: "Vector database for AI applications",
      topics: ["vector-database", "embeddings", "search"],
      language: "Python",
      stars: 8000,
      readmeText: "Vector database and embedding database for ANN search. Install with pip install lancedb.",
      expected: {
        category: "vector_database",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "pgvector",
      name: "pgvector",
      description: "Vector database extension for Postgres",
      topics: ["vector-database", "embeddings", "postgres"],
      language: "C",
      stars: 16000,
      readmeText: "Embedding database and vector database extension for Postgres.",
      expected: {
        category: "vector_database",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "marqo-ai",
      name: "marqo",
      description: "Vector database and neural search engine",
      topics: ["vector-database", "embeddings", "search"],
      language: "Python",
      stars: 6000,
      readmeText: "Vector database for embedding search. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "songquanpeng",
      name: "one-api",
      description: "OpenAI compatible LLM gateway and proxy",
      topics: ["gateway", "proxy", "openai-compatible"],
      language: "Go",
      stars: 25000,
      readmeText: "OpenAI compatible gateway proxy and router for LLM providers. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "llm_gateway",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "danny-avila",
      name: "LibreChat",
      description: "OpenAI compatible LLM gateway and chat app",
      topics: ["gateway", "proxy", "chat"],
      stars: 30000,
      readmeText: "OpenAI compatible gateway proxy for multiple model providers with Docker deployment.",
      files: ["docker-compose.yml"],
      expected: {
        category: "llm_gateway",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "simple-evals",
      description: "LLM evaluation and benchmark examples",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 6000,
      readmeText: "Evaluation and benchmark examples for LLMs.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "EleutherAI",
      name: "lm-evaluation-harness",
      description: "LLM evaluation benchmark harness",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 10000,
      readmeText: "Evaluation and benchmark harness for language models. Install as a Python library.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "UKGovernmentBEIS",
      name: "inspect_ai",
      description: "LLM evaluation framework and benchmark tooling",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 5000,
      readmeText: "LLM eval framework for benchmark and safety evaluation workflows. Install with pip install inspect-ai.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "braintrustdata",
      name: "autoevals",
      description: "LLM eval library for automated evaluation",
      topics: ["eval", "evaluation", "testing"],
      language: "Python",
      stars: 4000,
      readmeText: "LLM eval library and benchmark utilities. Install with pip install autoevals.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "guidance-ai",
      name: "guidance",
      description: "Prompt tooling for structured generation",
      topics: ["prompt", "structured-output", "generation"],
      language: "Python",
      stars: 20000,
      readmeText: "Prompt tooling for structured output and constrained generation. Install with pip install guidance.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "BoundaryML",
      name: "baml",
      description: "Prompt tooling for structured LLM outputs",
      topics: ["prompt", "structured-output", "tooling"],
      stars: 6000,
      readmeText: "Prompt tooling and structured output generation for LLM apps.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "comet-ml",
      name: "opik",
      description: "LLM observability, tracing, and monitoring",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 9000,
      readmeText: "LLM observability with tracing and monitoring. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "wandb",
      name: "weave",
      description: "AI observability and tracing",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 7000,
      readmeText: "LLM observability, tracing, and monitoring for AI apps.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openlit",
      name: "openlit",
      description: "OpenTelemetry observability for AI applications",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 3000,
      readmeText: "AI observability with OpenTelemetry tracing and monitoring.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langwatch",
      name: "langwatch",
      description: "LLM observability and monitoring platform",
      topics: ["observability", "tracing", "monitoring"],
      stars: 2500,
      readmeText: "LLM observability platform with tracing and monitoring.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "inngest",
      name: "inngest",
      description: "Workflow automation and durable execution platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Go",
      stars: 10000,
      readmeText: "Workflow automation and orchestration for durable functions. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "kestra-io",
      name: "kestra",
      description: "Workflow automation and orchestration platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Java",
      stars: 18000,
      readmeText: "Workflow automation and orchestration with Docker deployment.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "PrefectHQ",
      name: "prefect",
      description: "Workflow automation and orchestration for data pipelines",
      topics: ["workflow", "automation", "orchestration"],
      language: "Python",
      stars: 20000,
      readmeText: "Workflow automation and orchestration for data workflows. Install with pip install prefect.",
      expected: {
        category: "workflow_automation",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "dagster-io",
      name: "dagster",
      description: "Workflow automation and orchestration platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Python",
      stars: 14000,
      readmeText: "Workflow automation and orchestration platform. Install with pip install dagster.",
      expected: {
        category: "workflow_automation",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lobehub",
      name: "lobehub",
      description: "AI app template and chatbot starter",
      topics: ["template", "starter", "chatbot"],
      stars: 60000,
      readmeText: "AI app template and starter for chatbot applications. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "run-llama",
      name: "create-llama",
      description: "AI app template and starter for LlamaIndex apps",
      topics: ["template", "starter", "rag"],
      stars: 5000,
      readmeText: "AI app template and starter for RAG applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Azure-Samples",
      name: "azure-search-openai-demo",
      description: "RAG app template and starter",
      topics: ["template", "starter", "rag"],
      language: "Python",
      stars: 8000,
      readmeText: "AI app template and starter for RAG with Azure Search and OpenAI.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "SWE-agent",
      name: "SWE-agent",
      description: "Coding agent for software engineering tasks",
      topics: ["coding-agent", "developer-assistant", "software-engineering"],
      language: "Python",
      stars: 16000,
      readmeText: "Coding agent and developer assistant for software engineering tasks.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "TabbyML",
      name: "tabby",
      description: "Coding agent and code assistant",
      topics: ["coding-agent", "developer-assistant", "ide"],
      language: "Rust",
      stars: 32000,
      readmeText: "Coding agent and developer assistant for IDE code completion. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "coding_agent",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "plandex-ai",
      name: "plandex",
      description: "Coding agent for planning and code changes",
      topics: ["coding-agent", "developer-assistant", "cli"],
      language: "Go",
      stars: 14000,
      readmeText: "Coding agent and developer assistant for planning code changes.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "browserbase",
      name: "stagehand",
      description: "Browser automation framework for AI agents",
      topics: ["browserbase", "browser-automation", "agent"],
      stars: 16000,
      readmeText: "Browser automation and web agent framework using Playwright.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lightpanda-io",
      name: "browser",
      description: "Browser automation runtime for AI agents",
      topics: ["browser", "browser-automation", "web-agent"],
      language: "Zig",
      stars: 14000,
      readmeText: "Browser automation runtime for web agent workflows.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "nanobrowser",
      name: "nanobrowser",
      description: "Browser automation agent for web tasks",
      topics: ["browser", "browser-agent", "web-automation"],
      stars: 9000,
      readmeText: "Browser agent and browser automation for web tasks.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "playwright",
      description: "Browser automation framework",
      topics: ["browser", "browser-automation", "playwright"],
      stars: 75000,
      readmeText: "Browser automation framework for reliable web automation.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "xorbitsai",
      name: "inference",
      description: "Local LLM inference server",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 9000,
      readmeText: "Local LLM runtime and inference server for serving models.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "oobabooga",
      name: "textgen",
      description: "Local LLM runtime and web UI",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 45000,
      readmeText: "Local LLM runtime for model serving and private inference.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "EricLBuehler",
      name: "mistral.rs",
      description: "Local LLM inference runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Rust",
      stars: 7000,
      readmeText: "Local LLM inference server and model serving runtime.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "sgl-project",
      name: "sglang",
      description: "Local LLM inference server and runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 18000,
      readmeText: "Local LLM inference server for model serving. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Arize-ai",
      name: "openinference",
      description: "AI observability tracing instrumentation",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 4000,
      readmeText: "AI observability tracing instrumentation for LLM applications.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "pydantic",
      name: "logfire",
      description: "AI observability, tracing, and monitoring",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 5000,
      readmeText: "Observability, tracing, and monitoring for Python and AI applications.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "vercel",
      name: "ai",
      description: "AI app template and SDK for building chatbot apps",
      topics: ["template", "starter", "chatbot"],
      stars: 18000,
      readmeText: "AI app starter SDK and templates for chat applications deployed on Vercel.",
      files: ["vercel.json"],
      expected: {
        category: "ai_app_template",
        deployments: ["vercel", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "vercel",
      name: "chatbot",
      description: "AI chatbot app template and starter",
      topics: ["template", "starter", "chatbot"],
      stars: 12000,
      readmeText: "AI chatbot template and starter app for Vercel deployment.",
      files: ["vercel.json"],
      expected: {
        category: "ai_app_template",
        deployments: ["vercel", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "CopilotKit",
      name: "CopilotKit",
      description: "AI app template and starter for in-app agents",
      topics: ["template", "starter", "agents"],
      stars: 18000,
      readmeText: "AI app template and starter components for in-app agents.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "stackblitz",
      name: "bolt.new",
      description: "AI app template and starter for app generation",
      topics: ["template", "starter", "app"],
      stars: 30000,
      readmeText: "AI app template and starter for generating applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ag2ai",
      name: "ag2",
      description: "Agent framework for multiagent applications",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 8000,
      readmeText: "Agent framework for multiagent orchestration and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langroid",
      name: "langroid",
      description: "Agent framework for tool calling applications",
      topics: ["agent-framework", "agents", "tool-calling"],
      language: "Python",
      stars: 4000,
      readmeText: "Agent framework for building tool calling agents. Install with pip install langroid.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mastra-ai",
      name: "mastra",
      description: "Agent framework for TypeScript applications",
      topics: ["agent-framework", "agents", "tool-calling"],
      stars: 12000,
      readmeText: "Agent framework for TypeScript agents, tools, and workflows.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "google",
      name: "adk-python",
      description: "Agent framework for Python agents",
      topics: ["agent-framework", "agents", "python"],
      language: "Python",
      stars: 10000,
      readmeText: "Agent framework for Python agents and tool calling. Install with pip install google-adk.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "letta-ai",
      name: "letta",
      description: "Agent framework with memory for AI agents",
      topics: ["agent-framework", "agents", "memory"],
      language: "Python",
      stars: 18000,
      readmeText: "Agent framework for memory-enabled agents. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "modelcontextprotocol",
      name: "inspector",
      description: "MCP server inspector and development tool",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 6000,
      readmeText: "Model Context Protocol inspector for MCP server development.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "idosal",
      name: "git-mcp",
      description: "MCP server for Git repository tools",
      topics: ["mcp", "modelcontextprotocol", "git"],
      stars: 5000,
      readmeText: "Model Context Protocol server for Git repository tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "redis",
      name: "mcp-redis",
      description: "MCP server for Redis tools",
      topics: ["mcp", "modelcontextprotocol", "redis"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Redis tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "upstash",
      name: "mcp-server",
      description: "MCP server for Upstash tools",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Upstash tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "stanfordnlp",
      name: "dspy",
      description: "RAG and prompt optimization framework",
      topics: ["rag", "retrieval", "optimization"],
      language: "Python",
      stars: 28000,
      readmeText: "RAG framework for retrieval augmented generation and optimization. Install with pip install dspy.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "unstructured-io",
      name: "unstructured",
      description: "Data framework for RAG document processing",
      topics: ["rag", "retrieval", "documents"],
      language: "Python",
      stars: 12000,
      readmeText: "Data framework for document processing, indexing, and RAG retrieval. Install with pip install unstructured.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langflow-ai",
      name: "langflow",
      description: "RAG framework and visual builder for LLM apps",
      topics: ["rag", "retrieval", "workflow"],
      language: "Python",
      stars: 60000,
      readmeText: "RAG framework and visual builder for retrieval augmented generation. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "rag_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "opensearch-project",
      name: "OpenSearch",
      description: "Vector database and search engine",
      topics: ["vector-database", "ann-search", "search"],
      language: "Java",
      stars: 11000,
      readmeText: "Vector database and ANN search capabilities for embedding search. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "vespa-engine",
      name: "vespa",
      description: "Vector database and search platform",
      topics: ["vector-database", "ann-search", "search"],
      language: "Java",
      stars: 7000,
      readmeText: "Vector database and ANN search platform for embeddings. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "unum-cloud",
      name: "usearch",
      description: "Vector database and ANN search library",
      topics: ["vector-database", "ann-search", "embeddings"],
      language: "C++",
      stars: 9000,
      readmeText: "Vector database and ANN search library for embeddings.",
      expected: {
        category: "vector_database",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mlc-ai",
      name: "mlc-llm",
      description: "Local LLM inference runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 20000,
      readmeText: "Local LLM runtime and inference server for serving models.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "nomic-ai",
      name: "gpt4all",
      description: "Local LLM runtime for private inference",
      topics: ["local-llm", "inference", "models"],
      language: "C++",
      stars: 70000,
      readmeText: "Local LLM runtime for private inference and model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "janhq",
      name: "jan",
      description: "Local LLM runtime and app",
      topics: ["local-llm", "inference", "models"],
      stars: 35000,
      readmeText: "Local LLM runtime for private inference and model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "onnxruntime-genai",
      description: "Local LLM inference runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "C++",
      stars: 4000,
      readmeText: "Local LLM runtime for generative AI model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Giskard-AI",
      name: "giskard-oss",
      description: "LLM evaluation and testing framework",
      topics: ["eval", "evaluation", "testing"],
      language: "Python",
      stars: 4000,
      readmeText: "LLM evaluation and benchmark testing framework. Install with pip install giskard.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "vibrantlabsai",
      name: "ragas",
      description: "LLM evaluation framework for RAG",
      topics: ["eval", "evaluation", "rag"],
      language: "Python",
      stars: 9000,
      readmeText: "LLM eval framework and benchmark metrics for RAG systems. Install with pip install ragas.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "NVIDIA",
      name: "garak",
      description: "LLM evaluation and red-team benchmark",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 5000,
      readmeText: "LLM evaluation and red-team benchmark framework.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ianarawjo",
      name: "ChainForge",
      description: "Prompt tooling for comparing LLM prompts",
      topics: ["prompt", "prompt-engineering", "tooling"],
      stars: 4000,
      readmeText: "Prompt tooling and prompt engineering interface for comparing prompts.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mirascope",
      name: "mirascope",
      description: "Prompt tooling for structured LLM applications",
      topics: ["prompt", "structured-output", "tooling"],
      language: "Python",
      stars: 3000,
      readmeText: "Prompt tooling for structured output and prompt engineering. Install with pip install mirascope.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lmnr-ai",
      name: "lmnr",
      description: "LLM observability and tracing platform",
      topics: ["observability", "tracing", "monitoring"],
      stars: 3000,
      readmeText: "LLM observability with tracing and monitoring.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "elizaOS",
      name: "eliza",
      description: "Agent framework for social and autonomous agents",
      topics: ["agent-framework", "agents", "multiagent"],
      stars: 20000,
      readmeText: "Agent framework for autonomous agents and tool calling. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "agno-agi",
      name: "agno",
      description: "Agent framework for building AI agents",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 20000,
      readmeText: "Agent framework for building agents with tools and memory. Install with pip install agno.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "swarm",
      description: "Agent framework for multiagent orchestration",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 25000,
      readmeText: "Agent framework for lightweight multiagent orchestration.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "huggingface",
      name: "smolagents",
      description: "Agent framework for lightweight tool calling agents",
      topics: ["agent-framework", "agents", "tool-calling"],
      language: "Python",
      stars: 20000,
      readmeText: "Agent framework for lightweight agents and tool calling. Install with pip install smolagents.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "stripe",
      name: "ai",
      description: "MCP server and AI tools for Stripe",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      stars: 5000,
      readmeText: "Model Context Protocol server and tools for Stripe integrations.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "PrefectHQ",
      name: "fastmcp",
      description: "MCP server framework",
      topics: ["mcp", "modelcontextprotocol", "server"],
      language: "Python",
      stars: 10000,
      readmeText: "Model Context Protocol server framework for building MCP servers. Install with pip install fastmcp.",
      expected: {
        category: "mcp_server",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "googleapis",
      name: "mcp-toolbox",
      description: "MCP server toolbox for APIs",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      language: "Go",
      stars: 3000,
      readmeText: "Model Context Protocol server toolbox for API integrations.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "browserless",
      name: "browserless",
      description: "Browser automation infrastructure",
      topics: ["browser", "browser-automation", "playwright"],
      stars: 10000,
      readmeText: "Browser automation infrastructure for Playwright and browser workflows. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "browser_agent",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "apify",
      name: "crawlee",
      description: "Browser automation and web crawling framework",
      topics: ["browser", "browser-automation", "crawler"],
      stars: 15000,
      readmeText: "Browser automation and web crawling framework for agent workflows.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "puppeteer",
      name: "puppeteer",
      description: "Browser automation framework",
      topics: ["browser", "browser-automation", "puppeteer"],
      stars: 90000,
      readmeText: "Browser automation framework for controlling browsers in web automation.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "anomalyco",
      name: "opencode",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 15000,
      readmeText: "Coding agent and developer assistant for local software development.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "google-gemini",
      name: "gemini-cli",
      description: "Coding agent and developer assistant CLI",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 20000,
      readmeText: "Coding agent and developer assistant for CLI workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "QwenLM",
      name: "qwen-code",
      description: "Coding agent for developer workflows",
      topics: ["coding-agent", "developer-assistant", "cli"],
      language: "Python",
      stars: 12000,
      readmeText: "Coding agent and developer assistant for local code tasks.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "aaif-goose",
      name: "goose",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "tools"],
      language: "Rust",
      stars: 12000,
      readmeText: "Coding agent and developer assistant with tool calling.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "bentoml",
      name: "OpenLLM",
      description: "Local LLM inference server",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 12000,
      readmeText: "Local LLM inference server and model serving runtime. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ggml-org",
      name: "whisper.cpp",
      description: "Local inference runtime for speech models",
      topics: ["local-llm", "inference", "gguf"],
      language: "C++",
      stars: 45000,
      readmeText: "Local inference runtime for GGUF and speech model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "NVIDIA",
      name: "TensorRT-LLM",
      description: "Local LLM inference server and runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "C++",
      stars: 14000,
      readmeText: "Local LLM inference runtime for model serving with Docker deployment.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "exo-explore",
      name: "exo",
      description: "Local LLM runtime for distributed inference",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 25000,
      readmeText: "Local LLM runtime for private and distributed inference.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "openevals",
      description: "LLM evaluation framework",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 3000,
      readmeText: "LLM eval framework and benchmark utilities. Install with pip install openevals.",
      expected: {
        category: "llm_eval",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "truera",
      name: "trulens",
      description: "LLM evaluation and observability framework",
      topics: ["eval", "evaluation", "observability"],
      language: "Python",
      stars: 4000,
      readmeText: "LLM evaluation framework for testing and benchmark workflows.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "TypeChat",
      description: "Prompt tooling for structured outputs",
      topics: ["prompt", "structured-output", "tooling"],
      stars: 8000,
      readmeText: "Prompt tooling for structured output and type-safe generation.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "567-labs",
      name: "instructor-js",
      description: "Prompt tooling for structured LLM outputs in JavaScript",
      topics: ["prompt", "structured-output", "tooling"],
      stars: 3000,
      readmeText: "Prompt tooling for structured outputs in JavaScript.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langsmith-sdk",
      description: "LLM observability tracing SDK",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 3000,
      readmeText: "LLM observability SDK for tracing and monitoring.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-telemetry",
      name: "opentelemetry-js",
      description: "Observability tracing SDK for JavaScript",
      topics: ["observability", "tracing", "monitoring"],
      stars: 5000,
      readmeText: "Observability tracing and monitoring SDK for JavaScript.",
      expected: {
        category: "ai_observability",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "SigNoz",
      name: "signoz",
      description: "Observability tracing and monitoring platform",
      topics: ["observability", "tracing", "monitoring"],
      language: "Go",
      stars: 25000,
      readmeText: "Observability, tracing, and monitoring platform. Docker deployment supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "apache",
      name: "airflow",
      description: "Workflow automation and orchestration platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Python",
      stars: 40000,
      readmeText: "Workflow automation and orchestration for data pipelines. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "temporalio",
      name: "sdk-python",
      description: "Workflow automation SDK for durable orchestration",
      topics: ["workflow", "automation", "orchestration"],
      language: "Python",
      stars: 3000,
      readmeText: "Workflow automation SDK for durable orchestration. Install with pip install temporalio.",
      expected: {
        category: "workflow_automation",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "GoogleCloudPlatform",
      name: "agent-starter-pack",
      description: "AI app template and starter for agents",
      topics: ["template", "starter", "agents"],
      language: "Python",
      stars: 4000,
      readmeText: "AI app template and starter pack for building agents.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "supabase-community",
      name: "vercel-ai-chatbot",
      description: "AI chatbot app template and starter",
      topics: ["template", "starter", "chatbot"],
      stars: 3000,
      readmeText: "AI chatbot template and starter app for Vercel.",
      files: ["vercel.json"],
      expected: {
        category: "ai_app_template",
        deployments: ["vercel", "serverless", "local"],
        cloudflareReady: false
      }
    },
    {
      owner: "OpenBMB",
      name: "ChatDev",
      description: "Agent framework for collaborative software development agents",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 25000,
      readmeText: "Agent framework for collaborative agents and multiagent software workflows.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "agentscope-ai",
      name: "agentscope",
      description: "Agent framework for building multi-agent applications",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 9000,
      readmeText: "Agent framework for building multi-agent applications. Install with pip install agentscope.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "humanlayer",
      name: "humanlayer",
      description: "Agent framework for human-in-the-loop tool calling",
      topics: ["agent-framework", "agents", "tool-calling"],
      stars: 5000,
      readmeText: "Agent framework for human-in-the-loop agents and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "modelcontextprotocol",
      name: "registry",
      description: "Model Context Protocol registry for MCP servers",
      topics: ["mcp", "modelcontextprotocol", "registry"],
      stars: 6000,
      readmeText: "Model Context Protocol registry for discovering MCP server packages.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "awslabs",
      name: "mcp",
      description: "Model Context Protocol MCP servers for AWS",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 8000,
      readmeText: "Model Context Protocol server implementations for AWS services.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langchain-mcp-adapters",
      description: "MCP adapters for LangChain agents",
      topics: ["mcp", "modelcontextprotocol", "agents"],
      language: "Python",
      stars: 5000,
      readmeText: "Model Context Protocol adapters for connecting MCP servers to agents.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "playwright-python",
      description: "Browser automation library for Python",
      topics: ["browser", "browser-automation", "playwright"],
      language: "Python",
      stars: 13000,
      readmeText: "Browser automation for controlling browsers with Playwright. Install with pip install playwright.",
      expected: {
        category: "browser_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "SeleniumHQ",
      name: "selenium",
      description: "Browser automation framework",
      topics: ["browser", "browser-automation", "selenium"],
      language: "Java",
      stars: 30000,
      readmeText: "Browser automation framework for controlling browsers in automated workflows.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "scrapy",
      name: "scrapy",
      description: "Browser automation and web crawling framework",
      topics: ["browser", "browser-automation", "crawler"],
      language: "Python",
      stars: 55000,
      readmeText: "Browser automation and web crawling framework. Install with pip install scrapy.",
      expected: {
        category: "browser_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "smol-ai",
      name: "developer",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "agent"],
      stars: 12000,
      readmeText: "Coding agent and developer assistant for software development workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "The-PR-Agent",
      name: "pr-agent",
      description: "Coding agent and developer assistant for pull requests",
      topics: ["coding-agent", "developer-assistant", "pull-request"],
      language: "Python",
      stars: 9000,
      readmeText: "Coding agent and developer assistant for reviewing pull requests. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "coding_agent",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "e2b-dev",
      name: "E2B",
      description: "Coding agent sandbox for developer workflows",
      topics: ["coding-agent", "developer-assistant", "sandbox"],
      stars: 10000,
      readmeText: "Coding agent sandbox and developer assistant runtime for code execution.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "jina-ai",
      name: "reader",
      description: "RAG data framework for retrieval and document reading",
      topics: ["rag", "retrieval", "reader"],
      language: "Python",
      stars: 8000,
      readmeText: "RAG data framework for retrieval augmented generation and document reading.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "markitdown",
      description: "RAG document conversion framework for indexing",
      topics: ["rag", "indexing", "documents"],
      language: "Python",
      stars: 60000,
      readmeText: "RAG document conversion framework for indexing files before retrieval.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "neuml",
      name: "txtai",
      description: "RAG framework for indexing and semantic search",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 10000,
      readmeText: "RAG framework for indexing, retrieval, and semantic search. Install with pip install txtai.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "tensorchord",
      name: "pgvecto.rs",
      description: "Vector database extension for Postgres",
      topics: ["vector-database", "embeddings", "postgres"],
      language: "Rust",
      stars: 3000,
      readmeText: "Vector database extension for embeddings and similarity search in Postgres.",
      expected: {
        category: "vector_database",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "supabase",
      name: "vecs",
      description: "Vector database client for embeddings",
      topics: ["vector-database", "embeddings", "postgres"],
      language: "Python",
      stars: 3000,
      readmeText: "Vector database client for embeddings and similarity search. Install with pip install vecs.",
      expected: {
        category: "vector_database",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "epsilla-cloud",
      name: "vectordb",
      description: "Vector database for embeddings and similarity search",
      topics: ["vector-database", "embeddings", "search"],
      language: "Python",
      stars: 3000,
      readmeText: "Vector database for embeddings and ANN search. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mozilla-ai",
      name: "llamafile",
      description: "Local LLM inference server",
      topics: ["local-llm", "inference", "model-serving"],
      language: "C++",
      stars: 25000,
      readmeText: "Local LLM inference server for running models locally.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openvinotoolkit",
      name: "openvino.genai",
      description: "Local LLM inference runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "C++",
      stars: 3000,
      readmeText: "Local LLM inference runtime for model serving. Install with pip install openvino-genai.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "abetlen",
      name: "llama-cpp-python",
      description: "Local LLM inference server for llama.cpp",
      topics: ["local-llm", "inference", "gguf"],
      language: "Python",
      stars: 20000,
      readmeText: "Local LLM inference server and Python bindings for GGUF models. Install with pip install llama-cpp-python.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "openai-openapi",
      description: "OpenAI compatible gateway schema and API proxy definitions",
      topics: ["gateway", "proxy", "openai-compatible"],
      stars: 5000,
      readmeText: "OpenAI compatible gateway schema for proxy and router integrations.",
      expected: {
        category: "llm_gateway",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "token-js",
      name: "token.js",
      description: "OpenAI compatible LLM gateway and router",
      topics: ["gateway", "router", "openai-compatible"],
      stars: 3000,
      readmeText: "OpenAI compatible LLM gateway and router for model providers. Install with npm install token.js.",
      expected: {
        category: "llm_gateway",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "whylabs",
      name: "langkit",
      description: "LLM evaluation and monitoring toolkit",
      topics: ["eval", "evaluation", "monitoring"],
      language: "Python",
      stars: 3000,
      readmeText: "LLM evaluation toolkit for testing and monitoring model behavior.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "stanford-crfm",
      name: "helm",
      description: "LLM evaluation benchmark framework",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 5000,
      readmeText: "LLM evaluation benchmark framework for model evaluation.",
      expected: {
        category: "llm_eval",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "eth-sri",
      name: "lmql",
      description: "Prompt tooling for structured generation",
      topics: ["prompt", "structured-output", "tooling"],
      language: "Python",
      stars: 4000,
      readmeText: "Prompt tooling for structured generation and prompt engineering.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "noamgat",
      name: "lm-format-enforcer",
      description: "Prompt tooling for structured output enforcement",
      topics: ["prompt", "structured-output", "tooling"],
      language: "Python",
      stars: 3000,
      readmeText: "Prompt tooling for structured output and format enforcement. Install with pip install lm-format-enforcer.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-telemetry",
      name: "opentelemetry-python",
      description: "Observability tracing SDK for Python",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 5000,
      readmeText: "Observability tracing and monitoring SDK for Python. Install with pip install opentelemetry-api.",
      expected: {
        category: "ai_observability",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "grafana",
      name: "tempo",
      description: "Observability tracing backend",
      topics: ["observability", "tracing", "monitoring"],
      language: "Go",
      stars: 5000,
      readmeText: "Observability tracing and monitoring backend. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "pydantic",
      name: "logfire",
      description: "Observability tracing and monitoring platform",
      topics: ["observability", "tracing", "monitoring"],
      language: "Python",
      stars: 5000,
      readmeText: "Observability tracing and monitoring platform. Install with pip install logfire.",
      expected: {
        category: "ai_observability",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "temporalio",
      name: "samples-python",
      description: "Workflow automation examples for durable orchestration",
      topics: ["workflow", "automation", "orchestration"],
      language: "Python",
      stars: 3000,
      readmeText: "Workflow automation examples for durable orchestration.",
      expected: {
        category: "workflow_automation",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "camunda",
      name: "camunda",
      description: "Workflow automation and orchestration platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Java",
      stars: 4000,
      readmeText: "Workflow automation and orchestration platform. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "run-llama",
      name: "create-llama",
      description: "AI app template and starter for LlamaIndex",
      topics: ["template", "starter", "rag"],
      stars: 3000,
      readmeText: "AI app template and starter for building LlamaIndex applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "generative-ai-for-beginners",
      description: "AI app template and starter course",
      topics: ["template", "starter", "generative-ai"],
      stars: 90000,
      readmeText: "AI app template and starter materials for generative AI applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "prefecthq",
      name: "marvin",
      description: "Agent framework for AI engineering workflows",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 6000,
      readmeText: "Agent framework for building AI agents with tools. Install with pip install marvin.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langgraphjs",
      description: "Agent framework for durable agent workflows",
      topics: ["agent-framework", "agents", "workflow"],
      stars: 6000,
      readmeText: "Agent framework for durable agents and multiagent workflows. Install with npm install langgraph.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "julep-ai",
      name: "julep",
      description: "Agent framework for stateful AI agents",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 8000,
      readmeText: "Agent framework for stateful agents and tool calling. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mcp-use",
      name: "mcp-use",
      description: "Model Context Protocol MCP client and server utilities",
      topics: ["mcp", "modelcontextprotocol", "tools"],
      language: "Python",
      stars: 5000,
      readmeText: "Model Context Protocol server utilities for connecting MCP tools to agents.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "wonderwhy-er",
      name: "DesktopCommanderMCP",
      description: "MCP server for desktop automation",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 4000,
      readmeText: "Model Context Protocol server for desktop automation tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "docker",
      name: "mcp-registry",
      description: "MCP server registry",
      topics: ["mcp", "modelcontextprotocol", "registry"],
      language: "Go",
      stars: 3000,
      readmeText: "Model Context Protocol registry for MCP server discovery.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lavague-ai",
      name: "LaVague",
      description: "Browser automation agent for web tasks",
      topics: ["browser", "browser-automation", "agent"],
      language: "Python",
      stars: 7000,
      readmeText: "Browser automation agent for controlling web pages with Playwright.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "reworkd",
      name: "tarsier",
      description: "Browser automation library for web agents",
      topics: ["browser", "browser-automation", "agent"],
      language: "Python",
      stars: 3000,
      readmeText: "Browser automation for web agents and Playwright workflows.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "unclecode",
      name: "crawl4ai",
      description: "Browser automation crawler for AI agents",
      topics: ["browser", "browser-automation", "crawler"],
      language: "Python",
      stars: 40000,
      readmeText: "Browser automation and crawler framework for AI agents. Install with pip install crawl4ai.",
      expected: {
        category: "browser_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "sweepai",
      name: "sweep",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "agent"],
      language: "Python",
      stars: 7000,
      readmeText: "Coding agent and developer assistant for software development.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "codebuffai",
      name: "codebuff",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 4000,
      readmeText: "Coding agent and developer assistant for local code tasks. Install with npm install codebuff.",
      expected: {
        category: "coding_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "open-swe",
      description: "Coding agent for software engineering tasks",
      topics: ["coding-agent", "developer-assistant", "agent"],
      language: "Python",
      stars: 3000,
      readmeText: "Coding agent and developer assistant for software engineering workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "deepset-ai",
      name: "haystack-core-integrations",
      description: "RAG framework integrations for retrieval",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 3000,
      readmeText: "RAG framework integrations for retrieval augmented generation and indexing.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "neo4j-labs",
      name: "llm-graph-builder",
      description: "RAG framework for graph retrieval",
      topics: ["rag", "retrieval", "indexing"],
      stars: 4000,
      readmeText: "RAG framework for graph indexing and retrieval augmented generation.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "getzep",
      name: "zep",
      description: "RAG framework for memory and retrieval",
      topics: ["rag", "retrieval", "memory"],
      language: "Go",
      stars: 3000,
      readmeText: "RAG framework for memory, indexing, and retrieval augmented generation. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "rag_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "neo4j",
      name: "neo4j",
      description: "Vector database and graph database for embeddings",
      topics: ["vector-database", "embeddings", "search"],
      language: "Java",
      stars: 15000,
      readmeText: "Vector database support for embeddings and similarity search. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "redis",
      name: "redis",
      description: "Vector database support for embeddings",
      topics: ["vector-database", "embeddings", "search"],
      language: "C",
      stars: 70000,
      readmeText: "Vector database indexing for embeddings and similarity search. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "postgresml",
      name: "postgresml",
      description: "Vector database and machine learning extension for Postgres",
      topics: ["vector-database", "embeddings", "postgres"],
      language: "Rust",
      stars: 6000,
      readmeText: "Vector database workflows for embeddings and ANN search. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "vector_database",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "LMCache",
      name: "LMCache",
      description: "Local LLM inference cache and runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 3000,
      readmeText: "Local LLM inference runtime for serving models with cache acceleration.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "kserve",
      name: "kserve",
      description: "Local LLM inference server and model serving runtime",
      topics: ["local-llm", "inference", "kubernetes"],
      language: "Go",
      stars: 6000,
      readmeText: "Local LLM inference server and model serving runtime for Kubernetes.",
      files: ["helmfile.yaml"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["kubernetes", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ollama",
      name: "ollama-python",
      description: "Local LLM client library for Ollama",
      topics: ["local-llm", "inference", "models"],
      language: "Python",
      stars: 5000,
      readmeText: "Local LLM library for running and serving models with Ollama. Install with pip install ollama.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-webui",
      name: "mcpo",
      description: "OpenAI compatible gateway and proxy for MCP tools",
      topics: ["gateway", "proxy", "openai-compatible"],
      language: "Python",
      stars: 5000,
      readmeText: "OpenAI compatible gateway proxy for routing model and tool requests. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "llm_gateway",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "aici",
      description: "Prompt tooling for structured generation",
      topics: ["prompt", "structured-output", "tooling"],
      language: "Rust",
      stars: 3000,
      readmeText: "Prompt tooling for structured generation and constrained decoding.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "aurelio-labs",
      name: "semantic-router",
      description: "Prompt tooling for routing LLM requests",
      topics: ["prompt", "router", "tooling"],
      language: "Python",
      stars: 3000,
      readmeText: "Prompt tooling and routing for semantic LLM requests. Install with pip install semantic-router.",
      expected: {
        category: "prompt_tooling",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "algorithmicsuperintelligence",
      name: "optillm",
      description: "Prompt tooling for LLM optimization",
      topics: ["prompt", "tooling", "optimization"],
      language: "Python",
      stars: 3000,
      readmeText: "Prompt tooling for LLM optimization and prompt engineering.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "open-telemetry",
      name: "opentelemetry-collector-contrib",
      description: "Observability tracing and monitoring collector",
      topics: ["observability", "tracing", "monitoring"],
      language: "Go",
      stars: 4000,
      readmeText: "Observability tracing and monitoring collector. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "jaegertracing",
      name: "jaeger",
      description: "Observability tracing and monitoring platform",
      topics: ["observability", "tracing", "monitoring"],
      language: "Go",
      stars: 20000,
      readmeText: "Observability tracing and monitoring platform. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_observability",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langfuse",
      name: "langfuse-js",
      description: "LLM observability tracing SDK for JavaScript",
      topics: ["observability", "tracing", "monitoring"],
      stars: 3000,
      readmeText: "LLM observability SDK for tracing and monitoring. Install with npm install langfuse.",
      expected: {
        category: "ai_observability",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "conductor-oss",
      name: "conductor",
      description: "Workflow automation and orchestration platform",
      topics: ["workflow", "automation", "orchestration"],
      language: "Java",
      stars: 12000,
      readmeText: "Workflow automation and orchestration platform. Docker deployment supported.",
      files: ["Dockerfile"],
      expected: {
        category: "workflow_automation",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "n8n-io",
      name: "self-hosted-ai-starter-kit",
      description: "Workflow automation starter kit",
      topics: ["workflow", "automation", "starter"],
      stars: 9000,
      readmeText: "Workflow automation starter kit for self-hosted AI workflows. Docker Compose supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "openai-cookbook",
      description: "AI app template and starter examples",
      topics: ["template", "starter", "cookbook"],
      language: "Python",
      stars: 65000,
      readmeText: "AI app template and starter examples for building AI applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "GoogleCloudPlatform",
      name: "generative-ai",
      description: "AI app template and starter examples",
      topics: ["template", "starter", "generative-ai"],
      language: "Python",
      stars: 12000,
      readmeText: "AI app template and starter examples for generative AI applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "aws-samples",
      name: "amazon-bedrock-samples",
      description: "AI app template and starter examples",
      topics: ["template", "starter", "generative-ai"],
      language: "Python",
      stars: 5000,
      readmeText: "AI app template and starter examples for Amazon Bedrock applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "lastmile-ai",
      name: "mcp-agent",
      description: "Agent framework for MCP-enabled agents",
      topics: ["agent-framework", "agents", "mcp"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework for building MCP-enabled agents and tool calling.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "MCP-UI-Org",
      name: "mcp-ui",
      description: "Model Context Protocol MCP UI components",
      topics: ["mcp", "modelcontextprotocol", "ui"],
      stars: 3000,
      readmeText: "Model Context Protocol UI for MCP server tools and resources.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "browserbase",
      name: "mcp-server-browserbase",
      description: "MCP server for browser automation",
      topics: ["mcp", "browser", "browser-automation"],
      stars: 3000,
      readmeText: "Model Context Protocol server for browser automation with Browserbase.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "google-github-actions",
      name: "run-gemini-cli",
      description: "Coding agent and developer assistant action",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 3000,
      readmeText: "Coding agent and developer assistant workflow for running Gemini CLI.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "llm-d",
      name: "llm-d",
      description: "Local LLM inference server and model serving runtime",
      topics: ["local-llm", "inference", "kubernetes"],
      language: "Go",
      stars: 3000,
      readmeText: "Local LLM inference server and model serving runtime for Kubernetes deployments.",
      files: ["helmfile.yaml"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["kubernetes", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langchainjs",
      description: "Agent framework for JavaScript LLM applications",
      topics: ["agent-framework", "agents", "tool-calling"],
      stars: 15000,
      readmeText: "Agent framework for JavaScript agents and tool calling. Install with npm install langchain.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "google",
      name: "adk-samples",
      description: "Agent framework samples for building AI agents",
      topics: ["agent-framework", "agents", "samples"],
      language: "Python",
      stars: 4000,
      readmeText: "Agent framework samples for building AI agents with tools.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "magentic-ui",
      description: "Agent framework UI for autonomous agents",
      topics: ["agent-framework", "agents", "ui"],
      language: "Python",
      stars: 6000,
      readmeText: "Agent framework UI for autonomous agents and multiagent workflows. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "2FastLabs",
      name: "agent-squad",
      description: "Agent framework for multiagent orchestration",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework for multiagent orchestration and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "TaskingAI",
      name: "TaskingAI",
      description: "Agent framework for building AI agents",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 4000,
      readmeText: "Agent framework for building AI agents with tools and memory. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "mcp",
      description: "Model Context Protocol MCP servers and tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 6000,
      readmeText: "Model Context Protocol server tools and resources.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "supermemoryai",
      name: "supermemory-mcp",
      description: "MCP server for memory tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for memory tools and resources.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "apify",
      name: "apify-mcp-server",
      description: "MCP server for Apify tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Apify browser and automation tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "openai-cua-sample-app",
      description: "Browser automation sample app for computer use agents",
      topics: ["browser", "browser-automation", "agent"],
      stars: 3000,
      readmeText: "Browser automation sample app for web agents and computer use workflows.",
      expected: {
        category: "browser_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "tinyfish-io",
      name: "agentql",
      description: "Browser automation framework for web agents",
      topics: ["browser", "browser-automation", "agent"],
      stars: 4000,
      readmeText: "Browser automation framework for web agents. Install with npm install agentql.",
      expected: {
        category: "browser_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "winfunc",
      name: "opcode",
      description: "Coding agent and developer assistant",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 3000,
      readmeText: "Coding agent and developer assistant for local code workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "github",
      name: "spec-kit",
      description: "Coding agent toolkit for developer workflows",
      topics: ["coding-agent", "developer-assistant", "spec"],
      stars: 4000,
      readmeText: "Coding agent toolkit and developer assistant workflow for software specs.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "TransformerOptimus",
      name: "SuperAGI",
      description: "Agent framework for autonomous AI agents",
      topics: ["agent-framework", "agents", "autonomous"],
      language: "Python",
      stars: 16000,
      readmeText: "Agent framework for autonomous AI agents and tool calling. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Significant-Gravitas",
      name: "AutoGPT",
      description: "Agent framework for autonomous AI agents",
      topics: ["agent-framework", "agents", "autonomous"],
      language: "Python",
      stars: 170000,
      readmeText: "Agent framework for autonomous AI agents and tool calling. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "semantic-kernel",
      description: "Agent framework for AI orchestration",
      topics: ["agent-framework", "agents", "orchestration"],
      language: "C#",
      stars: 25000,
      readmeText: "Agent framework for AI agents, orchestration, and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "stanford-oval",
      name: "storm",
      description: "RAG framework for retrieval and writing",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 25000,
      readmeText: "RAG framework for retrieval augmented generation and document writing.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "kernel-memory",
      description: "RAG framework for memory and retrieval",
      topics: ["rag", "retrieval", "indexing"],
      language: "C#",
      stars: 6000,
      readmeText: "RAG framework for memory, indexing, and retrieval augmented generation.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "run-llama",
      name: "llama_deploy",
      description: "RAG framework for deploying retrieval workflows",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 3000,
      readmeText: "RAG framework for deploying retrieval augmented generation workflows.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Chainlit",
      name: "chainlit",
      description: "RAG framework for building retrieval apps",
      topics: ["rag", "retrieval", "app"],
      language: "Python",
      stars: 10000,
      readmeText: "RAG framework for building retrieval augmented generation applications. Install with pip install chainlit.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "streamlit",
      name: "streamlit",
      description: "RAG framework for building data apps",
      topics: ["rag", "retrieval", "app"],
      language: "Python",
      stars: 40000,
      readmeText: "RAG framework for building retrieval augmented generation apps. Install with pip install streamlit.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "zilliztech",
      name: "attu",
      description: "Vector database management UI for embeddings",
      topics: ["vector-database", "embeddings", "search"],
      stars: 3000,
      readmeText: "Vector database UI for embeddings and similarity search.",
      expected: {
        category: "vector_database",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "timescale",
      name: "python-vector",
      description: "Vector database client for embeddings",
      topics: ["vector-database", "embeddings", "postgres"],
      language: "Python",
      stars: 3000,
      readmeText: "Vector database client for embeddings and similarity search. Install with pip install timescale-vector.",
      expected: {
        category: "vector_database",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ollama",
      name: "ollama-js",
      description: "Local LLM client library for Ollama",
      topics: ["local-llm", "inference", "models"],
      stars: 4000,
      readmeText: "Local LLM library for running and serving models with Ollama. Install with npm install ollama.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "bentoml",
      name: "BentoML",
      description: "Local LLM inference server and model serving runtime",
      topics: ["local-llm", "inference", "model-serving"],
      language: "Python",
      stars: 8000,
      readmeText: "Local LLM inference server and model serving runtime. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ray-project",
      name: "ray",
      description: "Local LLM inference server and distributed runtime",
      topics: ["local-llm", "inference", "distributed"],
      language: "Python",
      stars: 40000,
      readmeText: "Local LLM inference runtime and distributed model serving.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "bigscience-workshop",
      name: "promptsource",
      description: "Prompt tooling for prompt management",
      topics: ["prompt", "prompt-management", "tooling"],
      language: "Python",
      stars: 3000,
      readmeText: "Prompt tooling for prompt management and prompt engineering.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ag-ui-protocol",
      name: "ag-ui",
      description: "Prompt tooling protocol for agent UI",
      topics: ["prompt", "tooling", "agent-ui"],
      stars: 3000,
      readmeText: "Prompt tooling protocol for agent UI and structured output.",
      expected: {
        category: "prompt_tooling",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "traceloop",
      name: "openllmetry-js",
      description: "LLM observability tracing SDK for JavaScript",
      topics: ["observability", "tracing", "monitoring"],
      stars: 3000,
      readmeText: "LLM observability SDK for tracing and monitoring. Install with npm install openllmetry.",
      expected: {
        category: "ai_observability",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "ogx-ai",
      name: "ogx",
      description: "Agent framework for building AI agents",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework for building AI agents with tools and memory.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langgraph-swarm-py",
      description: "Agent framework for swarm agents",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework for swarm agents and multiagent orchestration.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langgraph-supervisor-py",
      description: "Agent framework for supervisor agents",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework for supervisor agents and multiagent orchestration.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langchain-ai",
      name: "langmem",
      description: "Agent framework memory library",
      topics: ["agent-framework", "agents", "memory"],
      language: "Python",
      stars: 3000,
      readmeText: "Agent framework memory library for agents and tool calling. Install with pip install langmem.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "a2aproject",
      name: "A2A",
      description: "Agent framework protocol for agent-to-agent workflows",
      topics: ["agent-framework", "agents", "protocol"],
      stars: 3000,
      readmeText: "Agent framework protocol for agent-to-agent communication and multiagent workflows.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "humanlayer",
      name: "12-factor-agents",
      description: "Agent framework patterns for reliable agents",
      topics: ["agent-framework", "agents", "patterns"],
      stars: 5000,
      readmeText: "Agent framework patterns for reliable agents and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "huggingface",
      name: "agents-course",
      description: "Agent framework course for building agents",
      topics: ["agent-framework", "agents", "course"],
      language: "Python",
      stars: 12000,
      readmeText: "Agent framework course for building agents with tools.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "TencentEdgeOne",
      name: "edgeone-pages-mcp",
      description: "MCP server for EdgeOne Pages",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for EdgeOne Pages deployment tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "punkpeye",
      name: "awesome-mcp-servers",
      description: "MCP server directory and examples",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server directory with MCP server examples.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "wong2",
      name: "awesome-mcp-servers",
      description: "MCP server directory and examples",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server directory with MCP server examples.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "superagent-ai",
      name: "superagent",
      description: "Agent framework for AI agents",
      topics: ["agent-framework", "agents", "tools"],
      language: "Python",
      stars: 6000,
      readmeText: "Agent framework for building AI agents and tool calling. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "agent_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "yoheinakajima",
      name: "babyagi",
      description: "Agent framework for autonomous task agents",
      topics: ["agent-framework", "agents", "autonomous"],
      language: "Python",
      stars: 20000,
      readmeText: "Agent framework for autonomous task agents and tool calling.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "FoundationAgents",
      name: "MetaGPT",
      description: "Agent framework for multiagent software teams",
      topics: ["agent-framework", "agents", "multiagent"],
      language: "Python",
      stars: 60000,
      readmeText: "Agent framework for multiagent software teams. Install with pip install metagpt.",
      expected: {
        category: "agent_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "getzep",
      name: "graphiti",
      description: "RAG framework for graph memory and retrieval",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 8000,
      readmeText: "RAG framework for graph memory, indexing, and retrieval augmented generation.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "pathwaycom",
      name: "llm-app",
      description: "RAG framework for retrieval applications",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 3000,
      readmeText: "RAG framework for retrieval augmented generation applications. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "rag_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Cinnamon",
      name: "kotaemon",
      description: "RAG framework for document retrieval",
      topics: ["rag", "retrieval", "documents"],
      language: "Python",
      stars: 20000,
      readmeText: "RAG framework for document retrieval augmented generation. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "rag_framework",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "run-llama",
      name: "llama_cloud_services",
      description: "RAG framework for retrieval cloud services",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 3000,
      readmeText: "RAG framework for retrieval augmented generation and indexing services.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "llmware-ai",
      name: "llmware",
      description: "RAG framework for enterprise retrieval",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 12000,
      readmeText: "RAG framework for retrieval augmented generation and document indexing. Install with pip install llmware.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "supermemoryai",
      name: "supermemory",
      description: "RAG framework for memory and retrieval",
      topics: ["rag", "retrieval", "memory"],
      stars: 6000,
      readmeText: "RAG framework for memory, indexing, and retrieval augmented generation.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "gradio-app",
      name: "gradio",
      description: "RAG framework for building AI apps",
      topics: ["rag", "retrieval", "app"],
      language: "Python",
      stars: 40000,
      readmeText: "RAG framework for building retrieval augmented generation apps. Install with pip install gradio.",
      expected: {
        category: "rag_framework",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "mlc-ai",
      name: "web-llm",
      description: "Local LLM inference runtime for web browsers",
      topics: ["local-llm", "inference", "models"],
      stars: 15000,
      readmeText: "Local LLM inference runtime for running models in web browsers. Install with npm install @mlc-ai/web-llm.",
      expected: {
        category: "local_llm_runtime",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "semantic-kernel-starters",
      description: "AI app template and starter for Semantic Kernel",
      topics: ["template", "starter", "agents"],
      stars: 3000,
      readmeText: "AI app template and starter for building Semantic Kernel agent applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "HumanSignal",
      name: "label-studio",
      description: "LLM evaluation and labeling platform",
      topics: ["eval", "evaluation", "benchmark"],
      language: "Python",
      stars: 20000,
      readmeText: "LLM evaluation and labeling platform for model evaluation. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "llm_eval",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "langgenius",
      name: "dify-official-plugins",
      description: "Workflow automation plugins for AI apps",
      topics: ["workflow", "automation", "plugins"],
      stars: 3000,
      readmeText: "Workflow automation plugins for AI application orchestration.",
      expected: {
        category: "workflow_automation",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "microsoft",
      name: "ai-agents-for-beginners",
      description: "Agent framework starter course for AI agents",
      topics: ["agent-framework", "agents", "starter"],
      stars: 3000,
      readmeText: "Agent framework starter course for building AI agents with tools.",
      expected: {
        category: "agent_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "run-llama",
      name: "rags",
      description: "RAG framework for retrieval augmented generation",
      topics: ["rag", "retrieval", "indexing"],
      language: "Python",
      stars: 3000,
      readmeText: "RAG framework for retrieval augmented generation and indexing.",
      expected: {
        category: "rag_framework",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openfaas",
      name: "faas",
      description: "Local LLM inference server runtime",
      topics: ["local-llm", "inference", "serverless"],
      language: "Go",
      stars: 25000,
      readmeText: "Local LLM inference server and model serving runtime for serverless deployments. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "local_llm_runtime",
        deployments: ["docker", "serverless", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "anthropics",
      name: "claude-cookbooks",
      description: "AI app template and cookbook examples",
      topics: ["template", "starter", "cookbook"],
      language: "Python",
      stars: 8000,
      readmeText: "AI app template and cookbook examples for building AI applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "google-gemini",
      name: "cookbook",
      description: "AI app template and cookbook examples",
      topics: ["template", "starter", "cookbook"],
      language: "Python",
      stars: 12000,
      readmeText: "AI app template and cookbook examples for building AI applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "openai",
      name: "openai-cs-agents-demo",
      description: "AI app template and starter for customer support agents",
      topics: ["template", "starter", "agents"],
      stars: 3000,
      readmeText: "AI app template and starter demo for customer support agents.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "coleam00",
      name: "ottomator-agents",
      description: "AI app template and starter for agents",
      topics: ["template", "starter", "agents"],
      language: "Python",
      stars: 3000,
      readmeText: "AI app template and starter collection for agent applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "coleam00",
      name: "Archon",
      description: "AI app template and starter for agent workflows",
      topics: ["template", "starter", "agents"],
      language: "Python",
      stars: 3000,
      readmeText: "AI app template and starter for agent workflows. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "apache",
      name: "answer",
      description: "AI app template and starter for question answering",
      topics: ["template", "starter", "answer"],
      language: "Go",
      stars: 14000,
      readmeText: "AI app template and starter for question answering applications. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "fastapi",
      name: "full-stack-fastapi-template",
      description: "AI app template and starter",
      topics: ["template", "starter", "full-stack"],
      language: "Python",
      stars: 30000,
      readmeText: "AI app template and starter for full-stack applications. Docker Compose supported.",
      files: ["docker-compose.yml"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Nutlope",
      name: "llamacoder",
      description: "AI app template and starter for code generation",
      topics: ["template", "starter", "coding"],
      stars: 5000,
      readmeText: "AI app template and starter for code generation applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "abi",
      name: "screenshot-to-code",
      description: "AI app template and starter for screenshot to code",
      topics: ["template", "starter", "coding"],
      stars: 70000,
      readmeText: "AI app template and starter for screenshot to code generation. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "BuilderIO",
      name: "ai-shell",
      description: "Coding agent and developer assistant shell",
      topics: ["coding-agent", "developer-assistant", "cli"],
      stars: 3000,
      readmeText: "Coding agent and developer assistant shell for local developer workflows. Install with npm install ai-shell.",
      expected: {
        category: "coding_agent",
        deployments: ["library_only", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "firecrawl",
      name: "firecrawl-mcp-server",
      description: "MCP server for Firecrawl tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Firecrawl browser and crawling tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "exa-labs",
      name: "exa-mcp-server",
      description: "MCP server for Exa search tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Exa search tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "upstash",
      name: "context7",
      description: "MCP server for documentation context",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for documentation context tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "charmbracelet",
      name: "crush",
      description: "Coding agent and developer assistant CLI",
      topics: ["coding-agent", "developer-assistant", "cli"],
      language: "Go",
      stars: 3000,
      readmeText: "Coding agent and developer assistant CLI for local code workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "github",
      name: "awesome-copilot",
      description: "Coding agent resource collection for Copilot workflows",
      topics: ["coding-agent", "developer-assistant", "resources"],
      stars: 30000,
      readmeText: "Coding agent and developer assistant resource collection for Copilot workflows.",
      expected: {
        category: "coding_agent",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "e2b-dev",
      name: "awesome-ai-agents",
      description: "AI app template and resource collection for agents",
      topics: ["template", "starter", "agents"],
      stars: 28000,
      readmeText: "AI app template and resource collection for building agent applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "patchy631",
      name: "ai-engineering-hub",
      description: "AI app template and engineering resource collection",
      topics: ["template", "starter", "ai-engineering"],
      stars: 3000,
      readmeText: "AI app template and resource collection for AI engineering projects.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "Shubhamsaboo",
      name: "awesome-llm-apps",
      description: "AI app template and LLM app resource collection",
      topics: ["template", "starter", "llm-apps"],
      language: "Python",
      stars: 100000,
      readmeText: "AI app template and resource collection for building LLM applications.",
      expected: {
        category: "ai_app_template",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "wasp-lang",
      name: "open-saas",
      description: "AI app template and starter for SaaS applications",
      topics: ["template", "starter", "saas"],
      stars: 3000,
      readmeText: "AI app template and starter for SaaS applications. Docker supported.",
      files: ["Dockerfile"],
      expected: {
        category: "ai_app_template",
        deployments: ["docker", "local", "cloud"],
        cloudflareReady: false
      }
    },
    {
      owner: "comet-ml",
      name: "opik-mcp",
      description: "MCP server for Opik observability tools",
      topics: ["mcp", "modelcontextprotocol", "server"],
      stars: 3000,
      readmeText: "Model Context Protocol server for Opik observability tools.",
      expected: {
        category: "mcp_server",
        deployments: ["local", "cloud"],
        cloudflareReady: false
      }
    }
  ])
];

export function buildGeneratedKnowledgeFixtures(now = generatedKnowledgeNow) {
  return generatedKnowledgeFixtures.map((fixture) => ({
    fixture,
    knowledge: knowledgeFromFixture(fixture, now)
  }));
}

export function buildGeneratedKnowledgeFixturesForSeed(seedRepositories, now = generatedKnowledgeNow) {
  const fixturesById = new Map(generatedKnowledgeFixtures.map((fixture) => [fixture.repo.full_name.toLowerCase(), fixture]));
  const fixtures = [...generatedKnowledgeFixtures];

  for (const repository of seedRepositories) {
    const normalized = repository.toLowerCase();
    if (!fixturesById.has(normalized)) {
      const fixture = seedRepositoryFixture(repository);
      fixturesById.set(normalized, fixture);
      fixtures.push(fixture);
    }
  }

  return fixtures.map((fixture) => ({
    fixture,
    knowledge: knowledgeFromFixture(fixture, now)
  }));
}

function knowledgeFromFixture(fixture, now) {
  return {
    project: projectFromRepo(fixture.repo, now),
    agentCard: generateAgentCard(fixture.repo, fixture.signals, now),
    metrics: calculateMetrics(fixture.repo, fixture.signals, now, {
      signalConfidence: fixture.signals.signalConfidence
    })
  };
}

function seedRepositoryFixture(repository) {
  const [owner, name] = repository.split("/");
  const category = inferSeedCategory(repository, "other");
  const deployment = inferredDeployment(repository, category);
  const topics = topicWords(repository, category, deployment);
  const readmeText = seedReadmeText(repository, category, deployment);
  return {
    repo: repoFixture({
      owner,
      name,
      description: descriptionFor(repository, category),
      topics,
      language: languageFor(repository),
      stars: starsForCategory(category)
    }),
    signals: {
      ...baseSignals,
      readmeText,
      files: filesForDeployment(deployment),
      signalConfidence: {
        commits30d: "estimated",
        releases180d: "estimated",
        contributors90d: "estimated"
      }
    },
    expected: {
      category,
      deployments: deployment,
      cloudflareReady: deployment.includes("cloudflare") && category === "agent_framework"
    }
  };
}

function compactFixtures(items) {
  return items.map(({ readmeText, files = ["package.json"], expected, ...repo }) => ({
    repo: repoFixture(repo),
    signals: {
      ...baseSignals,
      readmeText,
      files
    },
    expected
  }));
}

function inferredDeployment(repository, category) {
  const normalized = repository.toLowerCase();
  const deployments = new Set(["local"]);

  if (normalized.includes("cloudflare")) {
    deployments.add("cloudflare");
    deployments.add("serverless");
  }
  if (normalized.includes("vercel") || normalized.includes("bolt.new")) {
    deployments.add("vercel");
    deployments.add("serverless");
  }
  if (["vector_database", "workflow_automation", "local_llm_runtime", "llm_gateway", "ai_observability"].includes(category)) {
    deployments.add("docker");
    deployments.add("cloud");
  }
  if (["agent_framework", "rag_framework", "prompt_tooling", "llm_eval", "mcp_server", "coding_agent"].includes(category)) {
    deployments.add("library_only");
    deployments.add("cloud");
  }
  if (category === "ai_app_template") {
    deployments.add("serverless");
    deployments.add("cloud");
  }

  return Array.from(deployments);
}

function topicWords(repository, category, deployment) {
  const words = repository
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  return Array.from(new Set([...words, category.replaceAll("_", "-"), ...category.split("_"), ...deployment]));
}

function seedReadmeText(repository, category, deployment) {
  const phrases = {
    agent_framework: "agent framework with agents, tool calling, and orchestration",
    coding_agent: "coding agent and developer assistant for software workflows",
    browser_agent: "browser automation and web agent workflows",
    rag_framework: "RAG framework for retrieval augmented generation and indexing",
    vector_database: "vector database for embeddings and semantic search",
    llm_gateway: "OpenAI compatible LLM gateway, proxy, and router",
    llm_eval: "LLM evaluation, benchmark, and testing workflows",
    prompt_tooling: "prompt tooling, guardrails, and structured output workflows",
    workflow_automation: "workflow automation and orchestration",
    local_llm_runtime: "local LLM runtime and inference serving",
    ai_app_template: "AI app template and starter project",
    mcp_server: "Model Context Protocol MCP server and tool integration",
    ai_observability: "LLM observability, tracing, and monitoring",
    other: "AI project metadata for Git.Top evaluation"
  };
  const deploymentHints = [];
  if (deployment.includes("docker")) {
    deploymentHints.push("Docker deployment supported");
  }
  if (deployment.includes("cloudflare")) {
    deploymentHints.push("Cloudflare Workers deployment path");
  }
  if (deployment.includes("vercel")) {
    deploymentHints.push("Vercel deployment path");
  }
  if (deployment.includes("library_only")) {
    deploymentHints.push("install as a library with package managers");
  }
  return `${repository} is a ${phrases[category] ?? phrases.other}. ${deploymentHints.join(". ")}.`;
}

function filesForDeployment(deployment) {
  const files = new Set(["package.json"]);
  if (deployment.includes("docker")) {
    files.add("Dockerfile");
  }
  if (deployment.includes("cloudflare")) {
    files.add("wrangler.toml");
  }
  if (deployment.includes("vercel")) {
    files.add("vercel.json");
  }
  return Array.from(files);
}

function descriptionFor(repository, category) {
  return `${repository} is indexed as ${category.replaceAll("_", " ")} for Git.Top generated knowledge fixtures.`;
}

function languageFor(repository) {
  const normalized = repository.toLowerCase();
  if (normalized.includes("python") || normalized.includes("llama") || normalized.includes("haystack") || normalized.includes("qdrant-client")) {
    return "Python";
  }
  if (normalized.includes("js") || normalized.includes("typescript") || normalized.includes("vercel") || normalized.includes("openai-guardrails-js")) {
    return "TypeScript";
  }
  if (normalized.includes("go-client") || normalized.includes("gateway")) {
    return "Go";
  }
  return "TypeScript";
}

function starsForCategory(category) {
  const stars = {
    agent_framework: 18000,
    coding_agent: 16000,
    browser_agent: 14000,
    rag_framework: 15000,
    vector_database: 13000,
    llm_gateway: 11000,
    llm_eval: 9000,
    prompt_tooling: 9000,
    workflow_automation: 12000,
    local_llm_runtime: 15000,
    ai_app_template: 10000,
    mcp_server: 10000,
    ai_observability: 9000,
    other: 3000
  };
  return stars[category] ?? stars.other;
}

export function repoFixture({ owner, name, description, topics, language = "TypeScript", stars }) {
  return {
    id: 1,
    name,
    full_name: `${owner}/${name}`,
    owner: {
      login: owner
    },
    html_url: `https://github.com/${owner}/${name}`,
    homepage: null,
    description,
    language,
    topics,
    license: {
      spdx_id: "MIT"
    },
    stargazers_count: stars,
    forks_count: 100,
    open_issues_count: 10,
    default_branch: "main",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: generatedKnowledgeNow,
    pushed_at: generatedKnowledgeNow
  };
}

export function projectFromRepo(repo, syncedAt) {
  return {
    id: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    githubUrl: repo.html_url,
    homepageUrl: repo.homepage,
    description: repo.description,
    language: repo.language,
    topics: repo.topics,
    license: repo.license.spdx_id,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    syncedAt
  };
}
