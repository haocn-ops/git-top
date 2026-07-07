# Git.Top Eval Quality

Generated at: 2026-07-07T11:26:33.468Z

This report summarizes the CI-safe recommendation and classification baseline. Evaluation knowledge is built from hand-authored seed projects first and generated Agent Card fixtures for the full seed list second.

## Summary

- Evaluated cases: 28
- Top-1 hit rate: 0.929
- Top-3 hit rate: 1
- Category accuracy: 1
- Deployment accuracy: 1
- Cloudflare readiness accuracy: 1
- Unacceptable hit count: 0
- Generated fixture projects: 504
- D1 fixture projects: 504
- Effective generated fixture projects: 500
- Synthetic projects: 0

## Review Focus

### `search-prompt-tooling`

- Issue: top-1 miss
- Expected: `promptfoo/promptfoo`, `guardrails-ai/guardrails`, `dottxt-ai/outlines`, `567-labs/instructor`
- Observed: `openai/openai-structured-outputs-samples`, `guardrails-ai/guardrails`, `567-labs/instructor`, `microsoft/TypeChat`, `BoundaryML/baml`
- Tuning hint: Compare expected and observed candidates before changing global scoring weights.

### `search-coding-agent`

- Issue: top-1 miss
- Expected: `openai/codex`, `cline/cline`, `aider-ai/aider`, `OpenHands/OpenHands`
- Observed: `smol-ai/developer`, `OpenHands/OpenHands`, `cline/cline`, `google-gemini/gemini-cli`, `anomalyco/opencode`
- Tuning hint: Compare expected and observed candidates before changing global scoring weights.


## Cases

Case | Type | Top-1 | Top-3 | Category | Deployment | Cloudflare Ready | Unacceptable Hits | Top Candidates
--- | --- | --- | --- | --- | --- | --- | ---: | ---
`search-cloudflare-agent-framework` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/mcp-server-cloudflare`, `cloudflare/puppeteer`
`search-mcp-server-examples` | search | yes | yes | yes | yes | yes | 0 | `modelcontextprotocol/servers`, `github/github-mcp-server`, `cloudflare/mcp-server-cloudflare`
`recommend-rag-framework` | recommend | yes | yes | yes | yes | yes | 0 | `run-llama/llama_index`, `langchain-ai/langchain`, `langflow-ai/langflow`
`recommend-cloudflare-agent` | recommend | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/mcp-server-cloudflare`
`grp-find-cloudflare-agents` | grp | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/mcp-server-cloudflare`, `cloudflare/dynamic-workflows`, `cloudflare/templates`
`grp-compose-coding-stack` | grp | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `modelcontextprotocol/servers`, `OpenHands/OpenHands`, `huggingface/smolagents`, `langchain-ai/langgraph`
`search-local-llm-runtime` | search | yes | yes | yes | yes | yes | 0 | `huggingface/text-embeddings-inference`, `ollama/ollama`, `ggml-org/llama.cpp`, `nomic-ai/gpt4all`, `oobabooga/textgen`
`search-vector-database` | search | yes | yes | yes | yes | yes | 0 | `redis/redis`, `milvus-io/milvus`, `qdrant/qdrant`, `neo4j/neo4j`, `epsilla-cloud/vectordb`
`search-prompt-tooling` | search | no | yes | yes | yes | yes | 0 | `openai/openai-structured-outputs-samples`, `guardrails-ai/guardrails`, `567-labs/instructor`, `microsoft/TypeChat`, `BoundaryML/baml`
`search-ai-observability` | search | yes | yes | yes | yes | yes | 0 | `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`, `Arize-ai/phoenix`
`search-workflow-automation` | search | yes | yes | yes | yes | yes | 0 | `n8n-io/n8n`, `apache/airflow`, `PrefectHQ/prefect`, `activepieces/activepieces`, `kestra-io/kestra`
`search-coding-agent` | search | no | yes | yes | yes | yes | 0 | `smol-ai/developer`, `OpenHands/OpenHands`, `cline/cline`, `google-gemini/gemini-cli`, `anomalyco/opencode`
`search-browser-agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/firecrawl`, `browser-use/web-ui`, `lightpanda-io/browser`, `nanobrowser/nanobrowser`, `browserbase/stagehand`
`search-coding-resource-hub` | search | yes | yes | yes | yes | yes | 0 | `github/awesome-copilot`, `OpenHands/OpenHands`, `cline/cline`, `openai/codex`, `aider-ai/aider`
`search-ai-app-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `Shubhamsaboo/awesome-llm-apps`, `e2b-dev/awesome-ai-agents`, `vercel/ai`, `run-llama/create-llama`, `microsoft/generative-ai-for-beginners`
`search-rag-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `run-llama/awesome-rag`, `deepset-ai/haystack-cookbook`, `run-llama/llama_index`, `langflow-ai/langflow`, `microsoft/markitdown`
`search-mcp-observability-integration` | search | yes | yes | yes | yes | yes | 0 | `comet-ml/opik-mcp`, `modelcontextprotocol/servers`, `github/github-mcp-server`, `cloudflare/mcp-server-cloudflare`, `PrefectHQ/fastmcp`
`search-mcp-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `punkpeye/awesome-mcp-servers`, `wong2/awesome-mcp-servers`, `modelcontextprotocol/servers`, `microsoft/mcp`, `modelcontextprotocol/typescript-sdk`
`search-open-saas-template` | search | yes | yes | yes | yes | yes | 0 | `wasp-lang/open-saas`, `openai/openai-chatkit-starter-app`, `openai/openai-responses-starter-app`, `open-webui/open-webui`, `openai/openai-cookbook`
`search-ambiguous-memory-framework` | search | yes | yes | yes | yes | yes | 0 | `supermemoryai/supermemory`, `supermemoryai/claude-supermemory`, `supermemoryai/opensearch-ai`, `supermemoryai/smfs`, `supermemoryai/memorybench`
`search-ambiguous-structured-output` | search | yes | yes | yes | yes | yes | 0 | `dottxt-ai/outlines`, `guidance-ai/guidance`, `openai/openai-structured-outputs-samples`, `eth-sri/lmql`, `microsoft/aici`
`search-ambiguous-observability-tool` | search | yes | yes | yes | yes | yes | 0 | `pydantic/logfire`, `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`
`search-cloudflare-mentioned-not-ready` | search | yes | yes | yes | yes | yes | 0 | `example/cloudflare-python-agent`, `example/cloudflare-docker-gateway`
`search-browser-research-agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/open-researcher`, `firecrawl/firesearch`, `firecrawl/open-scouts`, `openai/openai-cua-sample-app`, `firecrawl/firecrawl`
`search-lightweight-cloudflare-workers-agent` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`
`search-github-mcp-automation` | search | yes | yes | yes | yes | yes | 0 | `github/github-mcp-server`, `idosal/git-mcp`, `cloudflare/mcp-server-cloudflare`, `PrefectHQ/fastmcp`, `Portkey-AI/mcp-tool-filter`
`search-cloudflare-mcp-workers` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/mcp-server-cloudflare`
`recommend-local-rag-with-observability` | recommend | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `run-llama/llama_index`, `modelcontextprotocol/servers`, `SigNoz/signoz`, `deepset-ai/haystack`
