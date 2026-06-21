# Git.Top Eval Quality

Generated at: 2026-06-21T10:26:06.127Z

This report summarizes the CI-safe recommendation and classification baseline. Evaluation knowledge is built from hand-authored seed projects first and generated Agent Card fixtures for the full seed list second.

## Summary

- Evaluated cases: 28
- Top-1 hit rate: 1
- Top-3 hit rate: 1
- Category accuracy: 1
- Deployment accuracy: 1
- Cloudflare readiness accuracy: 1
- Unacceptable hit count: 0
- Generated fixture projects: 506
- D1 fixture projects: 506
- Effective generated fixture projects: 500
- Synthetic projects: 0

## Review Focus

No review focus items. The current cases all satisfy the tracked thresholds.

## Cases

Case | Type | Top-1 | Top-3 | Category | Deployment | Cloudflare Ready | Unacceptable Hits | Top Candidates
--- | --- | --- | --- | --- | --- | --- | ---: | ---
`search-cloudflare-agent-framework` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/mcp-server-cloudflare`
`search-mcp-server-examples` | search | yes | yes | yes | yes | yes | 0 | `modelcontextprotocol/servers`, `github/github-mcp-server`, `cloudflare/mcp-server-cloudflare`
`recommend-rag-framework` | recommend | yes | yes | yes | yes | yes | 0 | `run-llama/llama_index`, `langchain-ai/langchain`, `langflow-ai/langflow`
`recommend-cloudflare-agent` | recommend | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/mcp-server-cloudflare`
`grp-find-cloudflare-agents` | grp | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/mcp-server-cloudflare`, `cloudflare/dynamic-workflows`, `cloudflare/templates`
`grp-compose-coding-stack` | grp | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `modelcontextprotocol/servers`, `run-llama/llama_index`, `Portkey-AI/mcp-tool-filter`, `OpenHands/OpenHands`
`search-local-llm-runtime` | search | yes | yes | yes | yes | yes | 0 | `huggingface/text-embeddings-inference`, `ollama/ollama`, `ggml-org/llama.cpp`, `nomic-ai/gpt4all`, `oobabooga/textgen`
`search-vector-database` | search | yes | yes | yes | yes | yes | 0 | `redis/redis`, `milvus-io/milvus`, `qdrant/qdrant`, `neo4j/neo4j`, `unum-cloud/usearch`
`search-prompt-tooling` | search | yes | yes | yes | yes | yes | 0 | `guardrails-ai/guardrails`, `guidance-ai/guidance`, `dottxt-ai/outlines`, `567-labs/instructor`, `openai/openai-structured-outputs-samples`
`search-ai-observability` | search | yes | yes | yes | yes | yes | 0 | `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`, `Arize-ai/phoenix`
`search-workflow-automation` | search | yes | yes | yes | yes | yes | 0 | `n8n-io/n8n`, `apache/airflow`, `PrefectHQ/prefect`, `activepieces/activepieces`, `kestra-io/kestra`
`search-coding-agent` | search | yes | yes | yes | yes | yes | 0 | `OpenHands/OpenHands`, `cline/cline`, `openai/codex`, `aider-ai/aider`, `TabbyML/tabby`
`search-browser-agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/firecrawl`, `browser-use/web-ui`, `lightpanda-io/browser`, `nanobrowser/nanobrowser`, `browserbase/stagehand`
`search-coding-resource-hub` | search | yes | yes | yes | yes | yes | 0 | `github/awesome-copilot`, `e2b-dev/awesome-devins`, `OpenHands/OpenHands`, `cline/cline`, `openai/codex`
`search-ai-app-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `Shubhamsaboo/awesome-llm-apps`, `e2b-dev/awesome-ai-agents`, `microsoft/generative-ai-for-beginners`, `openai/openai-cookbook`, `open-webui/open-webui`
`search-rag-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `run-llama/awesome-rag`, `deepset-ai/haystack-cookbook`, `run-llama/llama_index`, `langflow-ai/langflow`, `microsoft/markitdown`
`search-mcp-observability-integration` | search | yes | yes | yes | yes | yes | 0 | `comet-ml/opik-mcp`, `modelcontextprotocol/servers`, `github/github-mcp-server`, `cloudflare/mcp-server-cloudflare`, `qdrant/mcp-server-qdrant`
`search-mcp-resource-collection` | search | yes | yes | yes | yes | yes | 0 | `punkpeye/awesome-mcp-servers`, `wong2/awesome-mcp-servers`, `modelcontextprotocol/servers`, `modelcontextprotocol/typescript-sdk`, `awslabs/mcp`
`search-open-saas-template` | search | yes | yes | yes | yes | yes | 0 | `wasp-lang/open-saas`, `openai/openai-chatkit-starter-app`, `openai/openai-responses-starter-app`, `open-webui/open-webui`, `openai/openai-cookbook`
`search-ambiguous-memory-framework` | search | yes | yes | yes | yes | yes | 0 | `mem0ai/mem0`, `supermemoryai/supermemory`, `getzep/zep`, `supermemoryai/claude-supermemory`, `supermemoryai/opensearch-ai`
`search-ambiguous-structured-output` | search | yes | yes | yes | yes | yes | 0 | `dottxt-ai/outlines`, `guidance-ai/guidance`, `eth-sri/lmql`, `microsoft/aici`, `567-labs/instructor`
`search-ambiguous-observability-tool` | search | yes | yes | yes | yes | yes | 0 | `pydantic/logfire`, `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`
`search-cloudflare-mentioned-not-ready` | search | yes | yes | yes | yes | yes | 0 | `example/cloudflare-python-agent`, `example/cloudflare-docker-gateway`
`search-browser-research-agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/open-researcher`, `firecrawl/firesearch`, `firecrawl/open-scouts`, `openai/openai-cua-sample-app`, `firecrawl/firecrawl`
`search-lightweight-cloudflare-workers-agent` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`
`search-github-mcp-automation` | search | yes | yes | yes | yes | yes | 0 | `github/github-mcp-server`, `idosal/git-mcp`, `cloudflare/mcp-server-cloudflare`, `qdrant/mcp-server-qdrant`, `PrefectHQ/prefect-mcp-server`
`search-cloudflare-mcp-workers` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/mcp-server-cloudflare`
`recommend-local-rag-with-observability` | recommend | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `SigNoz/signoz`, `run-llama/llama_index`, `deepset-ai/haystack`, `jaegertracing/jaeger`
