export interface AgentDecisionExample {
  id: string;
  title: string;
  userRequest: string;
  shortestRestPath: string[];
  shortestMcpPath: string[];
  expectedFields: string[];
  exampleFinalAnswer: string;
  verification: {
    scope: "local_d1";
    verifiedAt: string;
    snapshotId: string;
    source: "d1";
  };
  externalEvidence?: Array<{
    source: "github_api";
    subject: string;
    verifiedAt: string;
    url: string;
    facts: string[];
  }>;
  nextAction: string;
}

const localVerification = {
  scope: "local_d1" as const,
  verifiedAt: "2026-07-31",
  snapshotId: "d1:504:2026-06-20T00:00:00Z",
  source: "d1" as const
};

export function buildAgentDecisionExamples(): AgentDecisionExample[] {
  return [
    {
      id: "choose-cloudflare-agent-framework",
      title: "Choose an agent framework for Cloudflare Workers",
      userRequest: "Choose an open-source agent framework that can run on Cloudflare Workers and explain the evidence.",
      shortestRestPath: ["GET /api/trust", "POST /api/workflow", "GET /api/project/cloudflare/agents"],
      shortestMcpPath: ["get_agent_workflow", "get_project"],
      expectedFields: ["shortlist", "decision_summary", "classification", "caveats", "metadata.source"],
      exampleFinalAnswer: "For this Cloudflare-specific target, cloudflare/agents is the current shortlist match with high recommendation confidence and matched deployment, category, and Cloudflare-readiness constraints. The project record says it is designed for Cloudflare-native, stateful agents. Caveat: classification and several quality signals are low-confidence or partial, so verify the deployment guide and run a Workers proof of concept before adoption.",
      verification: localVerification,
      nextAction: "Inspect the repository deployment instructions and compare a proof of concept against any non-Workers runtime requirement."
    },
    {
      id: "compare-local-coding-agents",
      title: "Compare two coding agents for local use",
      userRequest: "Compare Codex and OpenCode for a local coding-agent workflow.",
      shortestRestPath: ["GET /api/trust", "POST /api/compare"],
      shortestMcpPath: ["compare_projects"],
      expectedFields: ["context", "decision_matrix", "winner", "reasoning", "metadata.snapshot_id"],
      exampleFinalAnswer: "For the local-deployment context in this snapshot, openai/codex ranks ahead of anomalyco/opencode. Both match the local preference. Caveat: both carry a 24/100 maintenance signal in the current comparison. Treat Codex as the contextual leader, not a universal winner, and inspect recent releases and issue activity for both before choosing.",
      verification: localVerification,
      nextAction: "Run the same representative repository task in both clients and compare tool reliability, edit quality, and operational cost."
    },
    {
      id: "check-unfamiliar-dependency",
      title: "Check an unfamiliar dependency before adding it",
      userRequest: "Should I add cloudflare/agents to a Python-first agent stack?",
      shortestRestPath: ["GET /api/trust", "GET /api/project/cloudflare/agents"],
      shortestMcpPath: ["get_project"],
      expectedFields: ["summary.good_for", "summary.not_good_for", "classification", "quality_signal_confidence", "caveats"],
      exampleFinalAnswer: "Do not select cloudflare/agents by default for a Python-first stack. Its strongest fit is Cloudflare-native, stateful agents on Workers, while the project summary explicitly lists Python-first stacks as a poor fit. Caveat: the current record has incomplete classification and quality evidence, so confirm language and integration requirements in the upstream repository before ruling it in or out.",
      verification: localVerification,
      nextAction: "Confirm whether the application can use a TypeScript Workers boundary; otherwise compare a Python-native framework."
    },
    {
      id: "find-langchain-alternative",
      title: "Find a credible LangChain alternative",
      userRequest: "Find maintained alternatives to LangChain and distinguish direct replacements from adjacent options.",
      shortestRestPath: ["GET /api/trust", "GET /api/alternatives/langchain", "POST /api/compare"],
      shortestMcpPath: ["get_alternatives", "compare_projects"],
      expectedFields: ["alternative_matches", "fit_summary", "replacement_risk", "caveats", "metadata.source"],
      exampleFinalAnswer: "superagent-ai/superagent is the top direct alternative in this snapshot, with 93/100 similarity and low replacement risk. TransformerOptimus/SuperAGI is another direct-category candidate. run-llama/llama_index is adjacent rather than drop-in because its category differs. Caveat: estimated activity signals and API compatibility still need upstream verification.",
      verification: localVerification,
      nextAction: "Compare the top direct candidate with LangChain against the exact integrations, deployment model, and migration surface you use."
    },
    {
      id: "choose-docker-vector-database",
      title: "Choose a vector database for Docker",
      userRequest: "Recommend a vector database that can be self-hosted with Docker.",
      shortestRestPath: ["GET /api/trust", "POST /api/recommend", "POST /api/compare"],
      shortestMcpPath: ["recommend_project", "compare_projects"],
      expectedFields: ["recommendations", "matched_constraints", "risk_flags", "confidence", "caveats"],
      exampleFinalAnswer: "Redis and Milvus are tied at 62/100 in this Docker-constrained snapshot, with Qdrant close behind at 61/100; all are medium-confidence exploration candidates. Do not choose from score alone. Each carries a weak maintenance warning in the indexed evidence and is unsuitable for edge-only Workers deployment without adaptation.",
      verification: localVerification,
      nextAction: "Compare operational footprint, filtering requirements, scale, backup model, and client-language support before running a workload benchmark."
    },
    {
      id: "replace-archived-python-agent-framework",
      title: "Replace an archived Python agent framework",
      userRequest: "Find a maintained replacement for the archived microsoft/TaskWeaver project for local Python tool execution.",
      shortestRestPath: ["GET /api/trust", "POST /api/recommend", "GET /api/project/langchain-ai/langchain", "POST /api/compare"],
      shortestMcpPath: ["recommend_project", "get_project", "compare_projects"],
      expectedFields: ["recommendations", "matched_constraints", "confidence", "classification", "caveats", "metadata.snapshot_id", "external_evidence"],
      exampleFinalAnswer: "GitHub reports microsoft/TaskWeaver as archived. For a local Python agent-framework replacement, Git.Top ranks langchain-ai/langchain first at 65/100 with medium confidence, followed by pydantic/pydantic-ai at 45/100 with medium confidence. Caveat: this is not a drop-in compatibility claim; LangChain's indexed classification is low-confidence and the candidates need API, tool-execution, and migration testing against the TaskWeaver workload.",
      verification: localVerification,
      externalEvidence: [
        {
          source: "github_api",
          subject: "microsoft/TaskWeaver",
          verifiedAt: "2026-07-31",
          url: "https://api.github.com/repos/microsoft/TaskWeaver",
          facts: ["archived=true", "disabled=false"]
        }
      ],
      nextAction: "List the TaskWeaver APIs and execution behaviors in use, then run the same tool task in LangChain and Pydantic AI before selecting a migration target."
    },
    {
      id: "choose-local-llm-runtime",
      title: "Choose a local LLM runtime",
      userRequest: "Choose among Ollama, llama.cpp, and GPT4All for a local inference workflow.",
      shortestRestPath: ["GET /api/trust", "GET /api/search", "POST /api/compare", "GET /api/project/ollama/ollama"],
      shortestMcpPath: ["search_projects", "compare_projects", "get_project"],
      expectedFields: ["projects", "decision_matrix", "winner", "classification", "quality_signal_confidence", "caveats", "metadata.snapshot_id"],
      exampleFinalAnswer: "For the local-deployment context in this snapshot, ollama/ollama is the contextual winner over ggml-org/llama.cpp and nomic-ai/gpt4all. All three have a 79/100 Git.Top score and a 24/100 maintenance signal; llama.cpp has the strongest indexed category confidence. Caveat: the comparison does not model hardware, quantization, model-format, or throughput requirements, so Ollama is a workflow starting point rather than a universal runtime winner.",
      verification: localVerification,
      nextAction: "Benchmark the same model and prompt set on target hardware, including memory use, startup time, throughput, model-format support, and API compatibility."
    },
    {
      id: "choose-github-automation-mcp-server",
      title: "Choose an MCP server for GitHub automation",
      userRequest: "Choose an MCP server for repository and pull-request automation on GitHub.",
      shortestRestPath: ["GET /api/trust", "GET /api/search", "GET /api/project/github/github-mcp-server"],
      shortestMcpPath: ["search_projects", "get_project"],
      expectedFields: ["projects", "project_id", "summary", "classification", "git_top_score", "quality_score", "caveats", "metadata.source"],
      exampleFinalAnswer: "github/github-mcp-server is the exact-purpose candidate in this snapshot: its indexed description is an MCP server for GitHub developer tools, its MCP-server classification is high-confidence, and its Git.Top score is 79/100. Caveat: its quality score is 43/100, maintenance signal is 24/100, and the generic recommender gives this exact use case low confidence. Prefer it for a proof of concept because of purpose fit, then validate authentication scopes and every mutation tool before operational use.",
      verification: localVerification,
      nextAction: "Connect it with a least-privilege test token and verify read-only repository queries before testing issue or pull-request mutations in a disposable repository."
    },
    {
      id: "assemble-rag-stack-with-observability",
      title: "Assemble a RAG stack with observability",
      userRequest: "Draft a self-hosted Docker RAG stack with observability and provide citable trust evidence.",
      shortestRestPath: ["GET /api/trust", "POST /api/grp/query", "GET /api/project/run-llama/llama_index", "GET /api/project/SigNoz/signoz"],
      shortestMcpPath: ["get_trust_gate", "git_top_grp_query", "get_project"],
      expectedFields: ["decision", "checks", "solution_paths", "recommended_stack", "stack_roles", "tradeoffs", "metadata.data_source", "caveats"],
      exampleFinalAnswer: "Use the GRP result only as an architecture draft: LlamaIndex fills the memory role, LangChain the agent-core role, Docker the runtime, and SigNoz the observability role. The leading path scores 72/100. Do not present this as production-ready: the Trust Gate is block because sync and hot-corpus freshness fail, and the bounded graph reports missing or weak protocol, tool-execution, and LLM-access coverage.",
      verification: localVerification,
      nextAction: "Pin one project per required role, verify supported integrations and licenses upstream, then build a traced ingestion-and-retrieval proof of concept before re-running the trust gate."
    },
    {
      id: "distinguish-collection-from-project",
      title: "Distinguish a collection from an executable project",
      userRequest: "Can I adopt run-llama/awesome-rag as my RAG runtime, or should I use LlamaIndex?",
      shortestRestPath: ["GET /api/trust", "GET /api/project/run-llama/awesome-rag", "GET /api/project/run-llama/llama_index", "POST /api/compare"],
      shortestMcpPath: ["get_project", "compare_projects"],
      expectedFields: ["project_kind", "collection_metadata", "summary.install", "decision_matrix", "winner", "caveats", "metadata.source"],
      exampleFinalAnswer: "Do not adopt run-llama/awesome-rag as a runtime. Git.Top identifies it as a curated collection with an estimated 100 items and no direct install step. For an executable local RAG project, run-llama/llama_index wins the comparison and carries a 91/100 agent score and 88/100 quality score. Caveat: the collection remains useful for discovery, but its 80/100 Git.Top score is not runtime suitability and should not be compared as if it were an installable library.",
      verification: localVerification,
      nextAction: "Use the collection to expand the shortlist, then evaluate LlamaIndex and other executable candidates against ingestion, retrieval, storage, and deployment requirements."
    }
  ];
}
