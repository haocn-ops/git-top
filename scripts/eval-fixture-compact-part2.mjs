export const compactGeneratedKnowledgeFixtureInputsPart2 = [
  {
    owner: "upstash",
    name: "mcp-server",
    description: "MCP server for Upstash tools",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    stars: 3000,
    readmeText: "Model Context Protocol server for Upstash tools.",
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
    owner: "stanfordnlp",
    name: "dspy",
    description: "RAG and prompt optimization framework",
    topics: [
      "rag",
      "retrieval",
      "optimization"
    ],
    language: "Python",
    stars: 28000,
    readmeText: "RAG framework for retrieval augmented generation and optimization. Install with pip install dspy.",
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
    owner: "unstructured-io",
    name: "unstructured",
    description: "Data framework for RAG document processing",
    topics: [
      "rag",
      "retrieval",
      "documents"
    ],
    language: "Python",
    stars: 12000,
    readmeText: "Data framework for document processing, indexing, and RAG retrieval. Install with pip install unstructured.",
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
    owner: "langflow-ai",
    name: "langflow",
    description: "RAG framework and visual builder for LLM apps",
    topics: [
      "rag",
      "retrieval",
      "workflow"
    ],
    language: "Python",
    stars: 60000,
    readmeText: "RAG framework and visual builder for retrieval augmented generation. Docker supported.",
    files: [
      "Dockerfile"
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
    owner: "opensearch-project",
    name: "OpenSearch",
    description: "Vector database and search engine",
    topics: [
      "vector-database",
      "ann-search",
      "search"
    ],
    language: "Java",
    stars: 11000,
    readmeText: "Vector database and ANN search capabilities for embedding search. Docker deployment supported.",
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
    owner: "vespa-engine",
    name: "vespa",
    description: "Vector database and search platform",
    topics: [
      "vector-database",
      "ann-search",
      "search"
    ],
    language: "Java",
    stars: 7000,
    readmeText: "Vector database and ANN search platform for embeddings. Docker supported.",
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
    owner: "unum-cloud",
    name: "usearch",
    description: "Vector database and ANN search library",
    topics: [
      "vector-database",
      "ann-search",
      "embeddings"
    ],
    language: "C++",
    stars: 9000,
    readmeText: "Vector database and ANN search library for embeddings.",
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
    owner: "mlc-ai",
    name: "mlc-llm",
    description: "Local LLM inference runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 20000,
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
    owner: "nomic-ai",
    name: "gpt4all",
    description: "Local LLM runtime for private inference",
    topics: [
      "local-llm",
      "inference",
      "models"
    ],
    language: "C++",
    stars: 70000,
    readmeText: "Local LLM runtime for private inference and model serving.",
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
    owner: "janhq",
    name: "jan",
    description: "Local LLM runtime and app",
    topics: [
      "local-llm",
      "inference",
      "models"
    ],
    stars: 35000,
    readmeText: "Local LLM runtime for private inference and model serving.",
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
    owner: "microsoft",
    name: "onnxruntime-genai",
    description: "Local LLM inference runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "C++",
    stars: 4000,
    readmeText: "Local LLM runtime for generative AI model serving.",
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
    owner: "Giskard-AI",
    name: "giskard-oss",
    description: "LLM evaluation and testing framework",
    topics: [
      "eval",
      "evaluation",
      "testing"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "LLM evaluation and benchmark testing framework. Install with pip install giskard.",
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
    owner: "vibrantlabsai",
    name: "ragas",
    description: "LLM evaluation framework for RAG",
    topics: [
      "eval",
      "evaluation",
      "rag"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "LLM eval framework and benchmark metrics for RAG systems. Install with pip install ragas.",
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
    owner: "NVIDIA",
    name: "garak",
    description: "LLM evaluation and red-team benchmark",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "LLM evaluation and red-team benchmark framework.",
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
    owner: "ianarawjo",
    name: "ChainForge",
    description: "Prompt tooling for comparing LLM prompts",
    topics: [
      "prompt",
      "prompt-engineering",
      "tooling"
    ],
    stars: 4000,
    readmeText: "Prompt tooling and prompt engineering interface for comparing prompts.",
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
    owner: "mirascope",
    name: "mirascope",
    description: "Prompt tooling for structured LLM applications",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Prompt tooling for structured output and prompt engineering. Install with pip install mirascope.",
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
    owner: "lmnr-ai",
    name: "lmnr",
    description: "LLM observability and tracing platform",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    stars: 3000,
    readmeText: "LLM observability with tracing and monitoring.",
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
    owner: "elizaOS",
    name: "eliza",
    description: "Agent framework for social and autonomous agents",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    stars: 20000,
    readmeText: "Agent framework for autonomous agents and tool calling. Docker supported.",
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
    owner: "agno-agi",
    name: "agno",
    description: "Agent framework for building AI agents",
    topics: [
      "agent-framework",
      "agents",
      "tools"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "Agent framework for building agents with tools and memory. Install with pip install agno.",
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
    owner: "openai",
    name: "swarm",
    description: "Agent framework for multiagent orchestration",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 25000,
    readmeText: "Agent framework for lightweight multiagent orchestration.",
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
    owner: "huggingface",
    name: "smolagents",
    description: "Agent framework for lightweight tool calling agents",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "Agent framework for lightweight agents and tool calling. Install with pip install smolagents.",
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
    owner: "stripe",
    name: "ai",
    description: "MCP server and AI tools for Stripe",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    stars: 5000,
    readmeText: "Model Context Protocol server and tools for Stripe integrations.",
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
    owner: "PrefectHQ",
    name: "fastmcp",
    description: "MCP server framework",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "server"
    ],
    language: "Python",
    stars: 10000,
    readmeText: "Model Context Protocol server framework for building MCP servers. Install with pip install fastmcp.",
    expected: {
      category: "mcp_server",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "googleapis",
    name: "mcp-toolbox",
    description: "MCP server toolbox for APIs",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    language: "Go",
    stars: 3000,
    readmeText: "Model Context Protocol server toolbox for API integrations.",
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
    owner: "browserless",
    name: "browserless",
    description: "Browser automation infrastructure",
    topics: [
      "browser",
      "browser-automation",
      "playwright"
    ],
    stars: 10000,
    readmeText: "Browser automation infrastructure for Playwright and browser workflows. Docker supported.",
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
    owner: "apify",
    name: "crawlee",
    description: "Browser automation and web crawling framework",
    topics: [
      "browser",
      "browser-automation",
      "crawler"
    ],
    stars: 15000,
    readmeText: "Browser automation and web crawling framework for agent workflows.",
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
    owner: "puppeteer",
    name: "puppeteer",
    description: "Browser automation framework",
    topics: [
      "browser",
      "browser-automation",
      "puppeteer"
    ],
    stars: 90000,
    readmeText: "Browser automation framework for controlling browsers in web automation.",
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
    owner: "anomalyco",
    name: "opencode",
    description: "Coding agent and developer assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    stars: 15000,
    readmeText: "Coding agent and developer assistant for local software development.",
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
    owner: "google-gemini",
    name: "gemini-cli",
    description: "Coding agent and developer assistant CLI",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    stars: 20000,
    readmeText: "Coding agent and developer assistant for CLI workflows.",
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
    owner: "QwenLM",
    name: "qwen-code",
    description: "Coding agent for developer workflows",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    language: "Python",
    stars: 12000,
    readmeText: "Coding agent and developer assistant for local code tasks.",
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
    owner: "aaif-goose",
    name: "goose",
    description: "Coding agent and developer assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "tools"
    ],
    language: "Rust",
    stars: 12000,
    readmeText: "Coding agent and developer assistant with tool calling.",
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
    owner: "bentoml",
    name: "OpenLLM",
    description: "Local LLM inference server",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 12000,
    readmeText: "Local LLM inference server and model serving runtime. Docker supported.",
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
    name: "whisper.cpp",
    description: "Local inference runtime for speech models",
    topics: [
      "local-llm",
      "inference",
      "gguf"
    ],
    language: "C++",
    stars: 45000,
    readmeText: "Local inference runtime for GGUF and speech model serving.",
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
    owner: "NVIDIA",
    name: "TensorRT-LLM",
    description: "Local LLM inference server and runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "C++",
    stars: 14000,
    readmeText: "Local LLM inference runtime for model serving with Docker deployment.",
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
    owner: "exo-explore",
    name: "exo",
    description: "Local LLM runtime for distributed inference",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 25000,
    readmeText: "Local LLM runtime for private and distributed inference.",
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
    owner: "langchain-ai",
    name: "openevals",
    description: "LLM evaluation framework",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "LLM eval framework and benchmark utilities. Install with pip install openevals.",
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
    owner: "truera",
    name: "trulens",
    description: "LLM evaluation and observability framework",
    topics: [
      "eval",
      "evaluation",
      "observability"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "LLM evaluation framework for testing and benchmark workflows.",
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
    owner: "microsoft",
    name: "TypeChat",
    description: "Prompt tooling for structured outputs",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    stars: 8000,
    readmeText: "Prompt tooling for structured output and type-safe generation.",
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
    owner: "567-labs",
    name: "instructor-js",
    description: "Prompt tooling for structured LLM outputs in JavaScript",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    stars: 3000,
    readmeText: "Prompt tooling for structured outputs in JavaScript.",
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
    owner: "langchain-ai",
    name: "langsmith-sdk",
    description: "LLM observability tracing SDK",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "LLM observability SDK for tracing and monitoring.",
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
    owner: "open-telemetry",
    name: "opentelemetry-js",
    description: "Observability tracing SDK for JavaScript",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    stars: 5000,
    readmeText: "Observability tracing and monitoring SDK for JavaScript.",
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
    owner: "SigNoz",
    name: "signoz",
    description: "Observability tracing and monitoring platform",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Go",
    stars: 25000,
    readmeText: "Observability, tracing, and monitoring platform. Docker deployment supported.",
    files: [
      "docker-compose.yml"
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
    owner: "apache",
    name: "airflow",
    description: "Workflow automation and orchestration platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Python",
    stars: 40000,
    readmeText: "Workflow automation and orchestration for data pipelines. Docker supported.",
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
    owner: "temporalio",
    name: "sdk-python",
    description: "Workflow automation SDK for durable orchestration",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Workflow automation SDK for durable orchestration. Install with pip install temporalio.",
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
    owner: "GoogleCloudPlatform",
    name: "agent-starter-pack",
    description: "AI app template and starter for agents",
    topics: [
      "template",
      "starter",
      "agents"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "AI app template and starter pack for building agents.",
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
    owner: "supabase-community",
    name: "vercel-ai-chatbot",
    description: "AI chatbot app template and starter",
    topics: [
      "template",
      "starter",
      "chatbot"
    ],
    stars: 3000,
    readmeText: "AI chatbot template and starter app for Vercel.",
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
    owner: "OpenBMB",
    name: "ChatDev",
    description: "Agent framework for collaborative software development agents",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 25000,
    readmeText: "Agent framework for collaborative agents and multiagent software workflows.",
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
    owner: "agentscope-ai",
    name: "agentscope",
    description: "Agent framework for building multi-agent applications",
    topics: [
      "agent-framework",
      "agents",
      "multiagent"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "Agent framework for building multi-agent applications. Install with pip install agentscope.",
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
    owner: "humanlayer",
    name: "humanlayer",
    description: "Agent framework for human-in-the-loop tool calling",
    topics: [
      "agent-framework",
      "agents",
      "tool-calling"
    ],
    stars: 5000,
    readmeText: "Agent framework for human-in-the-loop agents and tool calling.",
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
    name: "registry",
    description: "Model Context Protocol registry for MCP servers",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "registry"
    ],
    stars: 6000,
    readmeText: "Model Context Protocol registry for discovering MCP server packages.",
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
    owner: "awslabs",
    name: "mcp",
    description: "Model Context Protocol MCP servers for AWS",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "server"
    ],
    stars: 8000,
    readmeText: "Model Context Protocol server implementations for AWS services.",
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
    owner: "langchain-ai",
    name: "langchain-mcp-adapters",
    description: "MCP adapters for LangChain agents",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "agents"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Model Context Protocol adapters for connecting MCP servers to agents.",
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
    owner: "microsoft",
    name: "playwright-python",
    description: "Browser automation library for Python",
    topics: [
      "browser",
      "browser-automation",
      "playwright"
    ],
    language: "Python",
    stars: 13000,
    readmeText: "Browser automation for controlling browsers with Playwright. Install with pip install playwright.",
    expected: {
      category: "browser_agent",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "SeleniumHQ",
    name: "selenium",
    description: "Browser automation framework",
    topics: [
      "browser",
      "browser-automation",
      "selenium"
    ],
    language: "Java",
    stars: 30000,
    readmeText: "Browser automation framework for controlling browsers in automated workflows.",
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
    owner: "scrapy",
    name: "scrapy",
    description: "Browser automation and web crawling framework",
    topics: [
      "browser",
      "browser-automation",
      "crawler"
    ],
    language: "Python",
    stars: 55000,
    readmeText: "Browser automation and web crawling framework. Install with pip install scrapy.",
    expected: {
      category: "browser_agent",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "smol-ai",
    name: "developer",
    description: "Coding agent and developer assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "agent"
    ],
    stars: 12000,
    readmeText: "Coding agent and developer assistant for software development workflows.",
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
    owner: "The-PR-Agent",
    name: "pr-agent",
    description: "Coding agent and developer assistant for pull requests",
    topics: [
      "coding-agent",
      "developer-assistant",
      "pull-request"
    ],
    language: "Python",
    stars: 9000,
    readmeText: "Coding agent and developer assistant for reviewing pull requests. Docker supported.",
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
    owner: "e2b-dev",
    name: "E2B",
    description: "Coding agent sandbox for developer workflows",
    topics: [
      "coding-agent",
      "developer-assistant",
      "sandbox"
    ],
    stars: 10000,
    readmeText: "Coding agent sandbox and developer assistant runtime for code execution.",
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
    owner: "jina-ai",
    name: "reader",
    description: "RAG data framework for retrieval and document reading",
    topics: [
      "rag",
      "retrieval",
      "reader"
    ],
    language: "Python",
    stars: 8000,
    readmeText: "RAG data framework for retrieval augmented generation and document reading.",
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
    owner: "microsoft",
    name: "markitdown",
    description: "RAG document conversion framework for indexing",
    topics: [
      "rag",
      "indexing",
      "documents"
    ],
    language: "Python",
    stars: 60000,
    readmeText: "RAG document conversion framework for indexing files before retrieval.",
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
    owner: "neuml",
    name: "txtai",
    description: "RAG framework for indexing and semantic search",
    topics: [
      "rag",
      "retrieval",
      "indexing"
    ],
    language: "Python",
    stars: 10000,
    readmeText: "RAG framework for indexing, retrieval, and semantic search. Install with pip install txtai.",
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
    owner: "tensorchord",
    name: "pgvecto.rs",
    description: "Vector database extension for Postgres",
    topics: [
      "vector-database",
      "embeddings",
      "postgres"
    ],
    language: "Rust",
    stars: 3000,
    readmeText: "Vector database extension for embeddings and similarity search in Postgres.",
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
    owner: "supabase",
    name: "vecs",
    description: "Vector database client for embeddings",
    topics: [
      "vector-database",
      "embeddings",
      "postgres"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Vector database client for embeddings and similarity search. Install with pip install vecs.",
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
    owner: "epsilla-cloud",
    name: "vectordb",
    description: "Vector database for embeddings and similarity search",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Vector database for embeddings and ANN search. Docker supported.",
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
    owner: "mozilla-ai",
    name: "llamafile",
    description: "Local LLM inference server",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "C++",
    stars: 25000,
    readmeText: "Local LLM inference server for running models locally.",
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
    owner: "openvinotoolkit",
    name: "openvino.genai",
    description: "Local LLM inference runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "C++",
    stars: 3000,
    readmeText: "Local LLM inference runtime for model serving. Install with pip install openvino-genai.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "abetlen",
    name: "llama-cpp-python",
    description: "Local LLM inference server for llama.cpp",
    topics: [
      "local-llm",
      "inference",
      "gguf"
    ],
    language: "Python",
    stars: 20000,
    readmeText: "Local LLM inference server and Python bindings for GGUF models. Install with pip install llama-cpp-python.",
    expected: {
      category: "local_llm_runtime",
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
    name: "openai-openapi",
    description: "OpenAI compatible gateway schema and API proxy definitions",
    topics: [
      "gateway",
      "proxy",
      "openai-compatible"
    ],
    stars: 5000,
    readmeText: "OpenAI compatible gateway schema for proxy and router integrations.",
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
    owner: "token-js",
    name: "token.js",
    description: "OpenAI compatible LLM gateway and router",
    topics: [
      "gateway",
      "router",
      "openai-compatible"
    ],
    stars: 3000,
    readmeText: "OpenAI compatible LLM gateway and router for model providers. Install with npm install token.js.",
    expected: {
      category: "llm_gateway",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "whylabs",
    name: "langkit",
    description: "LLM evaluation and monitoring toolkit",
    topics: [
      "eval",
      "evaluation",
      "monitoring"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "LLM evaluation toolkit for testing and monitoring model behavior.",
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
    owner: "stanford-crfm",
    name: "helm",
    description: "LLM evaluation benchmark framework",
    topics: [
      "eval",
      "evaluation",
      "benchmark"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "LLM evaluation benchmark framework for model evaluation.",
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
    owner: "eth-sri",
    name: "lmql",
    description: "Prompt tooling for structured generation",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    language: "Python",
    stars: 4000,
    readmeText: "Prompt tooling for structured generation and prompt engineering.",
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
    owner: "noamgat",
    name: "lm-format-enforcer",
    description: "Prompt tooling for structured output enforcement",
    topics: [
      "prompt",
      "structured-output",
      "tooling"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Prompt tooling for structured output and format enforcement. Install with pip install lm-format-enforcer.",
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
    owner: "open-telemetry",
    name: "opentelemetry-python",
    description: "Observability tracing SDK for Python",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Observability tracing and monitoring SDK for Python. Install with pip install opentelemetry-api.",
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
    owner: "grafana",
    name: "tempo",
    description: "Observability tracing backend",
    topics: [
      "observability",
      "tracing",
      "monitoring"
    ],
    language: "Go",
    stars: 5000,
    readmeText: "Observability tracing and monitoring backend. Docker supported.",
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
    owner: "temporalio",
    name: "samples-python",
    description: "Workflow automation examples for durable orchestration",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Workflow automation examples for durable orchestration.",
    expected: {
      category: "workflow_automation",
      deployments: [
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "camunda",
    name: "camunda",
    description: "Workflow automation and orchestration platform",
    topics: [
      "workflow",
      "automation",
      "orchestration"
    ],
    language: "Java",
    stars: 4000,
    readmeText: "Workflow automation and orchestration platform. Docker deployment supported.",
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
    owner: "microsoft",
    name: "generative-ai-for-beginners",
    description: "AI app template and starter course",
    topics: [
      "template",
      "starter",
      "generative-ai"
    ],
    stars: 90000,
    readmeText: "AI app template and starter materials for generative AI applications.",
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
    owner: "prefecthq",
    name: "marvin",
    description: "Agent framework for AI engineering workflows",
    topics: [
      "agent-framework",
      "agents",
      "tools"
    ],
    language: "Python",
    stars: 6000,
    readmeText: "Agent framework for building AI agents with tools. Install with pip install marvin.",
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
    owner: "langchain-ai",
    name: "langgraphjs",
    description: "Agent framework for durable agent workflows",
    topics: [
      "agent-framework",
      "agents",
      "workflow"
    ],
    stars: 6000,
    readmeText: "Agent framework for durable agents and multiagent workflows. Install with npm install langgraph.",
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
    owner: "julep-ai",
    name: "julep",
    description: "Agent framework for stateful AI agents",
    topics: [
      "agent-framework",
      "agents",
      "tools"
    ],
    language: "Python",
    stars: 8000,
    readmeText: "Agent framework for stateful agents and tool calling. Docker supported.",
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
    owner: "mcp-use",
    name: "mcp-use",
    description: "Model Context Protocol MCP client and server utilities",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "tools"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Model Context Protocol server utilities for connecting MCP tools to agents.",
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
    owner: "wonderwhy-er",
    name: "DesktopCommanderMCP",
    description: "MCP server for desktop automation",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "server"
    ],
    stars: 4000,
    readmeText: "Model Context Protocol server for desktop automation tools.",
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
    owner: "docker",
    name: "mcp-registry",
    description: "MCP server registry",
    topics: [
      "mcp",
      "modelcontextprotocol",
      "registry"
    ],
    language: "Go",
    stars: 3000,
    readmeText: "Model Context Protocol registry for MCP server discovery.",
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
    owner: "lavague-ai",
    name: "LaVague",
    description: "Browser automation agent for web tasks",
    topics: [
      "browser",
      "browser-automation",
      "agent"
    ],
    language: "Python",
    stars: 7000,
    readmeText: "Browser automation agent for controlling web pages with Playwright.",
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
    owner: "reworkd",
    name: "tarsier",
    description: "Browser automation library for web agents",
    topics: [
      "browser",
      "browser-automation",
      "agent"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Browser automation for web agents and Playwright workflows.",
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
    owner: "unclecode",
    name: "crawl4ai",
    description: "Browser automation crawler for AI agents",
    topics: [
      "browser",
      "browser-automation",
      "crawler"
    ],
    language: "Python",
    stars: 40000,
    readmeText: "Browser automation and crawler framework for AI agents. Install with pip install crawl4ai.",
    expected: {
      category: "browser_agent",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "sweepai",
    name: "sweep",
    description: "Coding agent and developer assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "agent"
    ],
    language: "Python",
    stars: 7000,
    readmeText: "Coding agent and developer assistant for software development.",
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
    owner: "codebuffai",
    name: "codebuff",
    description: "Coding agent and developer assistant",
    topics: [
      "coding-agent",
      "developer-assistant",
      "cli"
    ],
    stars: 4000,
    readmeText: "Coding agent and developer assistant for local code tasks. Install with npm install codebuff.",
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
    owner: "langchain-ai",
    name: "open-swe",
    description: "Coding agent for software engineering tasks",
    topics: [
      "coding-agent",
      "developer-assistant",
      "agent"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Coding agent and developer assistant for software engineering workflows.",
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
    owner: "deepset-ai",
    name: "haystack-core-integrations",
    description: "RAG framework integrations for retrieval",
    topics: [
      "rag",
      "retrieval",
      "indexing"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "RAG framework integrations for retrieval augmented generation and indexing.",
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
    owner: "neo4j-labs",
    name: "llm-graph-builder",
    description: "RAG framework for graph retrieval",
    topics: [
      "rag",
      "retrieval",
      "indexing"
    ],
    stars: 4000,
    readmeText: "RAG framework for graph indexing and retrieval augmented generation.",
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
    owner: "getzep",
    name: "zep",
    description: "RAG framework for memory and retrieval",
    topics: [
      "rag",
      "retrieval",
      "memory"
    ],
    language: "Go",
    stars: 3000,
    readmeText: "RAG framework for memory, indexing, and retrieval augmented generation. Docker supported.",
    files: [
      "Dockerfile"
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
    owner: "neo4j",
    name: "neo4j",
    description: "Vector database and graph database for embeddings",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "Java",
    stars: 15000,
    readmeText: "Vector database support for embeddings and similarity search. Docker supported.",
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
    owner: "redis",
    name: "redis",
    description: "Vector database support for embeddings",
    topics: [
      "vector-database",
      "embeddings",
      "search"
    ],
    language: "C",
    stars: 70000,
    readmeText: "Vector database indexing for embeddings and similarity search. Docker supported.",
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
    owner: "postgresml",
    name: "postgresml",
    description: "Vector database and machine learning extension for Postgres",
    topics: [
      "vector-database",
      "embeddings",
      "postgres"
    ],
    language: "Rust",
    stars: 6000,
    readmeText: "Vector database workflows for embeddings and ANN search. Docker supported.",
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
    owner: "LMCache",
    name: "LMCache",
    description: "Local LLM inference cache and runtime",
    topics: [
      "local-llm",
      "inference",
      "model-serving"
    ],
    language: "Python",
    stars: 3000,
    readmeText: "Local LLM inference runtime for serving models with cache acceleration.",
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
    owner: "kserve",
    name: "kserve",
    description: "Local LLM inference server and model serving runtime",
    topics: [
      "local-llm",
      "inference",
      "kubernetes"
    ],
    language: "Go",
    stars: 6000,
    readmeText: "Local LLM inference server and model serving runtime for Kubernetes.",
    files: [
      "helmfile.yaml"
    ],
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "kubernetes",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "ollama",
    name: "ollama-python",
    description: "Local LLM client library for Ollama",
    topics: [
      "local-llm",
      "inference",
      "models"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "Local LLM library for running and serving models with Ollama. Install with pip install ollama.",
    expected: {
      category: "local_llm_runtime",
      deployments: [
        "library_only",
        "local",
        "cloud"
      ],
      cloudflareReady: false
    }
  },
  {
    owner: "open-webui",
    name: "mcpo",
    description: "OpenAI compatible gateway and proxy for MCP tools",
    topics: [
      "gateway",
      "proxy",
      "openai-compatible"
    ],
    language: "Python",
    stars: 5000,
    readmeText: "OpenAI compatible gateway proxy for routing model and tool requests. Docker supported.",
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
  }
];
