import { baseSignals, repoFixture } from "./eval-fixture-core.mjs";

export const explicitGeneratedKnowledgeFixtures = [
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
];
