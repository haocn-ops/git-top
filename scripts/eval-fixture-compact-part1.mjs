export const compactGeneratedKnowledgeFixtureInputsPart1 = [
  {
    owner: "milvus-io",
    name: "milvus",
    description: "Vector database for embeddings and similarity search",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "Go",
    stars: 36000,
    readmeText: "Vector database and embedding database for ANN search. Docker and Kubernetes deployments are supported.",
    files: [
      "Dockerfile",
      "helmfile.yaml"
    ],
    expected: {
      category: "vector_database",
      deployments: [
        "docker",
        "kubernetes",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "chroma-core",
    name: "chroma",
    description: "Embedding database for AI applications",
    topics: [
      "embedding-database",
      "vector-search",
      "rag"
    ],
    language: "Python",
    stars: 22000,
    readmeText: "Embedding database and vector database for RAG applications. Install with pip install chromadb.",
    expected: {
      category: "vector_database",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "facebookresearch",
    name: "faiss",
    description: "Library for efficient similarity search and clustering of dense vectors",
    topics: [
      "ann-search",
      "vector-search",
      "embeddings"
    ],
    language: "C++",
    stars: 36000,
    readmeText: "Library for ANN search over embeddings and dense vectors.",
    expected: {
      category: "vector_database",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "helicone",
    name: "helicone",
    description: "Open source LLM observability and monitoring",
    topics: [
      "observability",
      "monitoring",
      "tracing"
    ],
    stars: 4000,
    readmeText: "LLM observability with tracing, monitoring, and Docker deployment.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "ai_observability",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "AgentOps-AI",
    name: "agentops",
    description: "AI agent observability, tracing, and monitoring",
    topics: [
      "observability",
      "agents",
      "tracing"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Agent observability with tracing and monitoring for AI systems. Install with pip install agentops.",
    expected: {
      category: "ai_observability",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "traceloop",
    name: "openllmetry",
    description: "OpenTelemetry observability for LLM applications",
    topics: [
      "observability",
      "tracing",
      "opentelemetry"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "LLM observability and tracing using OpenTelemetry.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "activepieces",
    name: "activepieces",
    description: "Workflow automation platform for connecting apps and AI agents",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    stars: 18000,
    readmeText: "Workflow automation and orchestration with Docker compose deployment.",
    files: [
      "docker-compose.yml"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "windmill-labs",
    name: "windmill",
    description: "Workflow automation and developer platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Rust",
    stars: 16000,
    readmeText: "Workflow automation, orchestration, and scripts. Docker and Kubernetes deployment supported.",
    files: [
      "Dockerfile",
      "helmfile.yaml"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "kubernetes",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "triggerdotdev",
    name: "trigger.dev",
    description: "Workflow automation and background job orchestration",
    topics: [
      "workflow",
      "automation",
      "jobs"
    ],
    stars: 12000,
    readmeText: "Workflow automation and orchestration for background jobs. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "FlowiseAI",
    name: "Flowise",
    description: "Workflow automation for building LLM apps and agent flows",
    topics: [
      "workflow",
      "automation",
      "agents"
    ],
    stars: 35000,
    readmeText: "Low-code workflow automation and orchestration for LLM apps. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "cline",
    name: "cline",
    description: "Coding agent and developer assistant in the IDE",
    topics: [
      "coding-agent",
      "developer-assistant",
      "ide"
    ],
    stars: 45000,
    readmeText: "Coding agent and developer assistant for IDE workflows.",
    expected: {
      category: "coding_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "aider-ai",
    name: "aider",
    description: "AI pair programming coding agent",
    topics: [
      "coding-agent",
      "developer",
      "assistant"
    ],
    language: "Python",
    stars: 38000,
    readmeText: "Coding agent and developer assistant for local software development. Install with pip install aider-chat.",
    expected: {
      category: "coding_agent",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "openai",
    name: "codex",
    description: "Coding agent for developer workflows",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    language: "Rust",
    stars: 45000,
    readmeText: "Coding agent and developer assistant for local code changes.",
    expected: {
      category: "coding_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "continuedev",
    name: "continue",
    description: "Open-source code assistant and coding agent",
    topics: [
      "coding-agent",
      "developer-assistant",
      "ide"
    ],
    stars: 26000,
    readmeText: "Developer assistant and coding agent for IDE workflows.",
    expected: {
      category: "coding_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "browser-use",
    name: "web-ui",
    description: "Web UI for browser-use browser agents",
    topics: [
      "browser-use",
      "browser-agent",
      "web-automation"
    ],
    language: "Python",
    stars: 16000,
    readmeText: "Browser agent UI for browser automation using Playwright.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "Skyvern-AI",
    name: "skyvern",
    description: "Browser automation agent for web workflows",
    topics: [
      "browser",
      "browser-automation",
      "agent"
    ],
    language: "Python",
    stars: 15000,
    readmeText: "Browser automation and web agent workflows. Docker compose deployment supported.",
    files: [
      "docker-compose.yml"
    ],
    expected: {
      category: "browser_agent",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "firecrawl",
    name: "firecrawl",
    description: "Browser automation and web data extraction for AI agents",
    topics: [
      "browser",
      "web-automation",
      "agent"
    ],
    stars: 30000,
    readmeText: "Browser automation and web agent data extraction. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "browser_agent",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "steel-dev",
    name: "steel-browser",
    description: "Browser automation infrastructure for AI agents",
    topics: [
      "browser",
      "browser-automation",
      "agent"
    ],
    stars: 7000,
    readmeText: "Browser automation infrastructure for web agents.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "567-labs",
    name: "instructor",
    description: "Prompt tooling for structured LLM outputs",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    language: "Python",
    stars: 11000,
    readmeText: "Prompt tooling and structured output generation. Install with pip install instructor.",
    expected: {
      category: "prompt_tooling",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "microsoft",
    name: "promptflow",
    description: "Prompt tooling and evaluation workflows",
    topics: [
      "prompt",
      "workflow",
      "evaluation"
    ],
    language: "Python",
    stars: 10000,
    readmeText: "Prompt management and prompt tooling for LLM application workflows.",
    expected: {
      category: "prompt_tooling",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "NVIDIA-NeMo",
    name: "Guardrails",
    description: "Prompt management and guardrails for LLM applications",
    topics: [
      "prompt",
      "guardrails",
      "llm"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "Prompt management and guardrails for LLM apps. Install as a Python library.",
    expected: {
      category: "prompt_tooling",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "lmstudio-ai",
    name: "lms",
    description: "Local LLM runtime and inference server",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    stars: 7000,
    readmeText: "Local LLM runtime for private inference and serving models.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "mudler",
    name: "LocalAI",
    description: "Local LLM inference server and OpenAI compatible runtime",
    topics: [
      "local-llm",
      "inference",
      "openai-compatible"
    ],
    language: "Go",
    stars: 35000,
    readmeText: "Local LLM inference server and model serving with Docker support.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "ggml-org",
    name: "llama.cpp",
    description: "Local LLM inference runtime for GGUF models",
    topics: [
      "local-llm",
      "gguf",
      "inference"
    ],
    language: "C++",
    stars: 85000,
    readmeText: "Local LLM runtime for GGUF inference and model serving.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "open-webui",
    name: "open-webui",
    description: "AI app template and web UI for local LLMs",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    language: "Svelte",
    stars: 70000,
    readmeText: "AI app template and starter web UI. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "vercel",
    name: "ai-chatbot",
    description: "AI chatbot app template and starter",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    stars: 18000,
    readmeText: "AI chatbot template and starter deployed on Vercel.",
    files: [
      "vercel.json"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "vercel",
        "serverless",
        "local"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "BuilderIO",
    name: "gpt-crawler",
    description: "AI app template and crawler starter",
    topics: [
      "template",
      "starter",
      "crawler"
    ],
    stars: 20000,
    readmeText: "Starter template for AI apps and crawlers. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "lm-sys",
    name: "FastChat",
    description: "LLM evaluation benchmark and model serving",
    topics: [
      "evaluation",
      "benchmark",
      "llm"
    ],
    language: "Python",
    stars: 38000,
    readmeText: "LLM evaluation and benchmark workflows for model comparisons.",
    expected: {
      category: "llm_eval",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "confident-ai",
    name: "deepeval",
    description: "LLM evaluation framework and benchmark tooling",
    topics: [
      "evaluation",
      "benchmark",
      "testing"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "LLM eval framework for testing and benchmark workflows. Install with pip install deepeval.",
    expected: {
      category: "llm_eval",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "openai",
    name: "evals",
    description: "LLM eval and benchmark registry",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 16000,
    readmeText: "Evaluation and benchmark framework for LLM behavior.",
    expected: {
      category: "llm_eval",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "langgenius",
    name: "dify",
    description: "Workflow automation platform for LLM apps",
    topics: [
      "workflow",
      "automation",
      "llm"
    ],
    stars: 110000,
    readmeText: "Workflow automation and orchestration for LLM applications. Docker compose deployment supported.",
    files: [
      "docker-compose.yml"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "CrewAIInc",
    name: "crewAI",
    description: "Agent framework for multiagent orchestration",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 40000,
    readmeText: "Agent framework for multiagent orchestration. Install with pip install crewai.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "microsoft",
    name: "autogen",
    description: "Agent framework for multiagent applications",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 48000,
    readmeText: "Agent framework for multiagent conversation and tool calling.",
    expected: {
      category: "agent_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "langchain-ai",
    name: "langgraph",
    description: "Agent framework for graph-based tool calling workflows",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    language: "Python",
    stars: 18000,
    readmeText: "Agent framework for graph workflows, agents, and tool calling. Install with pip install langgraph.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "supabase",
    name: "mcp",
    description: "MCP server for Supabase tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    stars: 6000,
    readmeText: "Model Context Protocol server for connecting Supabase tools to agents.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "github",
    name: "github-mcp-server",
    description: "MCP server for GitHub developer tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    language: "Go",
    stars: 20000,
    readmeText: "Model Context Protocol server exposing GitHub tools to agents.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "mongodb-js",
    name: "mongodb-mcp-server",
    description: "MCP server for MongoDB tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    stars: 4000,
    readmeText: "Model Context Protocol server for MongoDB tools and database workflows.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "Kong",
    name: "kong",
    description: "OpenAI compatible LLM gateway and proxy",
    topics: [
      "gateway",
      "proxy",
      "router"
    ],
    language: "Lua",
    stars: 40000,
    readmeText: "Gateway proxy and router for APIs with OpenAI compatible LLM gateway patterns. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "llm_gateway",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "open-webui",
    name: "pipelines",
    description: "OpenAI compatible LLM gateway and router",
    topics: [
      "gateway",
      "proxy",
      "router"
    ],
    stars: 8000,
    readmeText: "LLM gateway proxy and router for OpenAI compatible providers.",
    expected: {
      category: "llm_gateway",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "openai",
    name: "openai-agents-python",
    description: "Agent framework for Python tool calling agents",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    language: "Python",
    stars: 15000,
    readmeText: "Agent framework for building Python agents with tool calling. Install with pip install openai-agents.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "camel-ai",
    name: "camel",
    description: "Agent framework for multiagent systems",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 12000,
    readmeText: "Agent framework for multiagent research and tool calling.",
    expected: {
      category: "agent_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "pydantic",
    name: "pydantic-ai",
    description: "Agent framework for Python applications",
    topics: [
      "agent-framework",
      "agents",
      "python"
    ],
    language: "Python",
    stars: 18000,
    readmeText: "Agent framework for building Python agents with structured outputs. Install with pip install pydantic-ai.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "livekit",
    name: "agents",
    description: "Agent framework for realtime voice and multimodal agents",
    topics: [
      "agent-framework",
      "agents",
      "realtime"
    ],
    stars: 9000,
    readmeText: "Agent framework for realtime voice agents and tool calling.",
    expected: {
      category: "agent_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "modelcontextprotocol",
    name: "typescript-sdk",
    description: "Model Context Protocol SDK for MCP servers",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "sdk"
    ],
    stars: 9000,
    readmeText: "Model Context Protocol SDK for building MCP server integrations.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "modelcontextprotocol",
    name: "python-sdk",
    description: "Model Context Protocol Python SDK for MCP servers",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "sdk"
    ],
    language: "Python",
    stars: 7000,
    readmeText: "Model Context Protocol SDK for building MCP server integrations in Python.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "cloudflare",
    name: "mcp-server-cloudflare",
    description: "MCP server for Cloudflare tools and APIs",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "cloudflare"
    ],
    stars: 5000,
    readmeText: "Model Context Protocol server for Cloudflare tools. Cloudflare Workers deployment examples are available.",
    files: [
      "wrangler.toml",
      "package.json"
    ],
    expected: {
      category: "mcp_server",
      deployments: [
        "cloudflare",
        "serverless",
        "local"
      ],
      cloudflareReady: true
    }
  },
  {
    owner: "example",
    name: "cloudflare-python-agent",
    description: "Python agent framework with Cloudflare Workers deployment notes",
    topics: [
      "agents",
      "cloudflare",
      "python"
    ],
    language: "Python",
    stars: 1800,
    readmeText: "Python agent framework with Cloudflare Workers deployment notes, but the runtime depends on Python packages, filesystem access, and native extension support.",
    expected: {
      category: "agent_framework",
      projectKind: "project",
      deployments: [
        "cloudflare",
        "serverless",
        "local"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "example",
    name: "cloudflare-docker-gateway",
    description: "LLM gateway with Cloudflare deployment examples",
    topics: [
      "gateway",
      "cloudflare",
      "docker"
    ],
    stars: 1600,
    readmeText: "OpenAI compatible LLM gateway with Cloudflare Workers examples, but production deployment requires a Docker daemon and Postgres.",
    files: [
      "Dockerfile",
      "docker-compose.yml"
    ],
    expected: {
      category: "llm_gateway",
      projectKind: "project",
      deployments: [
        "docker",
        "cloudflare",
        "serverless",
        "local"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "docker",
    name: "mcp-gateway",
    description: "MCP gateway for connecting agents to tool servers",
    topics: [
      "mcp",
      "gateway",
      "tools"
    ],
    language: "Go",
    stars: 5000,
    readmeText: "Model Context Protocol gateway for MCP server routing. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "mcp_server",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "deepset-ai",
    name: "haystack",
    description: "RAG framework for retrieval augmented generation",
    topics: [
      "rag",
      "retrieval-augmented",
      "llm"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "RAG framework and data framework for retrieval augmented generation. Install with pip install haystack-ai.",
    expected: {
      category: "rag_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "infiniflow",
    name: "ragflow",
    description: "RAG framework and document retrieval platform",
    topics: [
      "rag",
      "retrieval",
      "documents"
    ],
    language: "Python",
    stars: 40000,
    readmeText: "RAG framework for document indexing and retrieval. Docker compose deployment supported.",
    files: [
      "docker-compose.yml"
    ],
    expected: {
      category: "rag_framework",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "mem0ai",
    name: "mem0",
    description: "Memory and retrieval framework for AI agents",
    topics: [
      "rag",
      "retrieval",
      "memory"
    ],
    language: "Python",
    stars: 35000,
    readmeText: "RAG and memory framework for agents with retrieval over user context. Install with pip install mem0ai.",
    expected: {
      category: "rag_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "microsoft",
    name: "graphrag",
    description: "Graph RAG framework for retrieval augmented generation",
    topics: [
      "rag",
      "retrieval",
      "graph"
    ],
    language: "Python",
    stars: 25000,
    readmeText: "Graph RAG framework for indexing and retrieval augmented generation.",
    expected: {
      category: "rag_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "lancedb",
    name: "lancedb",
    description: "Vector database for AI applications",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "Python",
    stars: 8000,
    readmeText: "Vector database and embedding database for ANN search. Install with pip install lancedb.",
    expected: {
      category: "vector_database",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "pgvector",
    name: "pgvector",
    description: "Vector database extension for Postgres",
    topics: [
      "vector-database",
      "embeddings",
      "postgres"
    ],
    language: "C",
    stars: 16000,
    readmeText: "Embedding database and vector database extension for Postgres.",
    expected: {
      category: "vector_database",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "marqo-ai",
    name: "marqo",
    description: "Vector database and neural search engine",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "Python",
    stars: 6000,
    readmeText: "Vector database for embedding search. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "vector_database",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "songquanpeng",
    name: "one-api",
    description: "OpenAI compatible LLM gateway and proxy",
    topics: [
      "gateway",
      "proxy",
      "openai-compatible"
    ],
    language: "Go",
    stars: 25000,
    readmeText: "OpenAI compatible gateway proxy and router for LLM providers. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "llm_gateway",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "danny-avila",
    name: "LibreChat",
    description: "OpenAI compatible LLM gateway and chat app",
    topics: [
      "gateway",
      "proxy",
      "chat"
    ],
    stars: 30000,
    readmeText: "OpenAI compatible gateway proxy for multiple model providers with Docker deployment.",
    files: [
      "docker-compose.yml"
    ],
    expected: {
      category: "llm_gateway",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "openai",
    name: "simple-evals",
    description: "LLM evaluation and benchmark examples",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 6000,
    readmeText: "Evaluation and benchmark examples for LLMs.",
    expected: {
      category: "llm_eval",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "EleutherAI",
    name: "lm-evaluation-harness",
    description: "LLM evaluation benchmark harness",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 10000,
    readmeText: "Evaluation and benchmark harness for language models. Install as a Python library.",
    expected: {
      category: "llm_eval",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "UKGovernmentBEIS",
    name: "inspect_ai",
    description: "LLM evaluation framework and benchmark tooling",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "LLM eval framework for benchmark and safety evaluation workflows. Install with pip install inspect-ai.",
    expected: {
      category: "llm_eval",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "braintrustdata",
    name: "autoevals",
    description: "LLM eval library for automated evaluation",
    topics: [
      "eval",
      "evaluation",
      "testing"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "LLM eval library and benchmark utilities. Install with pip install autoevals.",
    expected: {
      category: "llm_eval",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "guidance-ai",
    name: "guidance",
    description: "Prompt tooling for structured generation",
    topics: [
      "prompt",
      "structured-output",
      "generation"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "Prompt tooling for structured output and constrained generation. Install with pip install guidance.",
    expected: {
      category: "prompt_tooling",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "BoundaryML",
    name: "baml",
    description: "Prompt tooling for structured LLM outputs",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    stars: 6000,
    readmeText: "Prompt tooling and structured output generation for LLM apps.",
    expected: {
      category: "prompt_tooling",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "comet-ml",
    name: "opik",
    description: "LLM observability, tracing, and monitoring",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "LLM observability with tracing and monitoring. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "ai_observability",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "wandb",
    name: "weave",
    description: "AI observability and tracing",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 7000,
    readmeText: "LLM observability, tracing, and monitoring for AI apps.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "openlit",
    name: "openlit",
    description: "OpenTelemetry observability for AI applications",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "AI observability with OpenTelemetry tracing and monitoring.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "langwatch",
    name: "langwatch",
    description: "LLM observability and monitoring platform",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    stars: 2500,
    readmeText: "LLM observability platform with tracing and monitoring.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "inngest",
    name: "inngest",
    description: "Workflow automation and durable execution platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Go",
    stars: 10000,
    readmeText: "Workflow automation and orchestration for durable functions. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "kestra-io",
    name: "kestra",
    description: "Workflow automation and orchestration platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Java",
    stars: 18000,
    readmeText: "Workflow automation and orchestration with Docker deployment.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "workflow_automation",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "PrefectHQ",
    name: "prefect",
    description: "Workflow automation and orchestration for data pipelines",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "Workflow automation and orchestration for data workflows. Install with pip install prefect.",
    expected: {
      category: "workflow_automation",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "dagster-io",
    name: "dagster",
    description: "Workflow automation and orchestration platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Python",
    stars: 14000,
    readmeText: "Workflow automation and orchestration platform. Install with pip install dagster.",
    expected: {
      category: "workflow_automation",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "lobehub",
    name: "lobehub",
    description: "AI app template and chatbot starter",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    stars: 60000,
    readmeText: "AI app template and starter for chatbot applications. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "run-llama",
    name: "create-llama",
    description: "AI app template and starter for LlamaIndex apps",
    topics: [
      "template",
      "starter",
      "rag"
    ],
    stars: 5000,
    readmeText: "AI app template and starter for RAG applications.",
    expected: {
      category: "ai_app_template",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "Azure-Samples",
    name: "azure-search-openai-demo",
    description: "RAG app template and starter",
    topics: [
      "template",
      "starter",
      "rag"
    ],
    language: "Python",
    stars: 8000,
    readmeText: "AI app template and starter for RAG with Azure Search and OpenAI.",
    expected: {
      category: "ai_app_template",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "SWE-agent",
    name: "SWE-agent",
    description: "Coding agent for software engineering tasks",
    topics: [
      "coding-agent",
      "developer-assistant",
      "software-engineering"
    ],
    language: "Python",
    stars: 16000,
    readmeText: "Coding agent and developer assistant for software engineering tasks.",
    expected: {
      category: "coding_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "TabbyML",
    name: "tabby",
    description: "Coding agent and code assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "ide"
    ],
    language: "Rust",
    stars: 32000,
    readmeText: "Coding agent and developer assistant for IDE code completion. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "coding_agent",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "plandex-ai",
    name: "plandex",
    description: "Coding agent for planning and code changes",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    language: "Go",
    stars: 14000,
    readmeText: "Coding agent and developer assistant for planning code changes.",
    expected: {
      category: "coding_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "browserbase",
    name: "stagehand",
    description: "Browser automation framework for AI agents",
    topics: [
      "browserbase",
      "browser-automation",
      "agent"
    ],
    stars: 16000,
    readmeText: "Browser automation and web agent framework using Playwright.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "lightpanda-io",
    name: "browser",
    description: "Browser automation runtime for AI agents",
    topics: [
      "browser",
      "browser-automation",
      "web-agent"
    ],
    language: "Zig",
    stars: 14000,
    readmeText: "Browser automation runtime for web agent workflows.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "nanobrowser",
    name: "nanobrowser",
    description: "Browser automation agent for web tasks",
    topics: [
      "browser",
      "browser-agent",
      "web-automation"
    ],
    stars: 9000,
    readmeText: "Browser agent and browser automation for web tasks.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "microsoft",
    name: "playwright",
    description: "Browser automation framework",
    topics: [
      "browser",
      "browser-automation",
      "playwright"
    ],
    stars: 75000,
    readmeText: "Browser automation framework for reliable web automation.",
    expected: {
      category: "browser_agent",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "xorbitsai",
    name: "inference",
    description: "Local LLM inference server",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "Local LLM runtime and inference server for serving models.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "oobabooga",
    name: "textgen",
    description: "Local LLM runtime and web UI",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 45000,
    readmeText: "Local LLM runtime for model serving and private inference.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "EricLBuehler",
    name: "mistral.rs",
    description: "Local LLM inference runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Rust",
    stars: 7000,
    readmeText: "Local LLM inference server and model serving runtime.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "sgl-project",
    name: "sglang",
    description: "Local LLM inference server and runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 18000,
    readmeText: "Local LLM inference server for model serving. Docker supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "Arize-ai",
    name: "openinference",
    description: "AI observability tracing instrumentation",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "AI observability tracing instrumentation for LLM applications.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "pydantic",
    name: "logfire",
    description: "AI observability, tracing, and monitoring",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Observability, tracing, and monitoring for Python and AI applications.",
    expected: {
      category: "ai_observability",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "vercel",
    name: "ai",
    description: "AI app template and SDK for building chatbot apps",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    stars: 18000,
    readmeText: "AI app starter SDK and templates for chat applications deployed on Vercel.",
    files: [
      "vercel.json"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "vercel",
        "serverless",
        "local"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "vercel",
    name: "chatbot",
    description: "AI chatbot app template and starter",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    stars: 12000,
    readmeText: "AI chatbot template and starter app for Vercel deployment.",
    files: [
      "vercel.json"
    ],
    expected: {
      category: "ai_app_template",
      deployments: [
        "vercel",
        "serverless",
        "local"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "CopilotKit",
    name: "CopilotKit",
    description: "AI app template and starter for in-app agents",
    topics: [
      "template",
      "starter",
      "agents"
    ],
    stars: 18000,
    readmeText: "AI app template and starter components for in-app agents.",
    expected: {
      category: "ai_app_template",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "stackblitz",
    name: "bolt.new",
    description: "AI app template and starter for app generation",
    topics: [
      "template",
      "starter",
      "app"
    ],
    stars: 30000,
    readmeText: "AI app template and starter for generating applications.",
    expected: {
      category: "ai_app_template",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "ag2ai",
    name: "ag2",
    description: "Agent framework for multiagent applications",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 8000,
    readmeText: "Agent framework for multiagent orchestration and tool calling.",
    expected: {
      category: "agent_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "langroid",
    name: "langroid",
    description: "Agent framework for tool calling applications",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "Agent framework for building tool calling agents. Install with pip install langroid.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "mastra-ai",
    name: "mastra",
    description: "Agent framework for TypeScript applications",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    stars: 12000,
    readmeText: "Agent framework for TypeScript agents, tools, and workflows.",
    expected: {
      category: "agent_framework",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "google",
    name: "adk-python",
    description: "Agent framework for Python agents",
    topics: [
      "agent-framework",
      "agents",
      "python"
    ],
    language: "Python",
    stars: 10000,
    readmeText: "Agent framework for Python agents and tool calling. Install with pip install google-adk.",
    expected: {
      category: "agent_framework",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "letta-ai",
    name: "letta",
    description: "Agent framework with memory for AI agents",
    topics: [
      "agent-framework",
      "agents",
      "memory"
    ],
    language: "Python",
    stars: 18000,
    readmeText: "Agent framework for memory-enabled agents. Docker deployment supported.",
    files: [
      "Dockerfile"
    ],
    expected: {
      category: "agent_framework",
      deployments: [
        "docker",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "modelcontextprotocol",
    name: "inspector",
    description: "MCP server inspector and development tool",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    stars: 6000,
    readmeText: "Model Context Protocol inspector for MCP server development.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "idosal",
    name: "git-mcp",
    description: "MCP server for Git repository tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "git"
    ],
    stars: 5000,
    readmeText: "Model Context Protocol server for Git repository tools.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "redis",
    name: "mcp-redis",
    description: "MCP server for Redis tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "redis"
    ],
    stars: 3000,
    readmeText: "Model Context Protocol server for Redis tools.",
    expected: {
      category: "mcp_server",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  }
];
