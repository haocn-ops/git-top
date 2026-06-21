# Git.Top Local Eval

Generated at: 2026-06-21T11:53:20.972Z

This local-only report expands the CI-safe eval with generated category and deployment probes across the full fixture-backed project set. It is intended for ranking review before heuristic changes, not as a strict CI gate.

## Summary

- Evaluated cases: 23
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
`local-category-agent_framework` | search | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `cloudflare/agents`, `Significant-Gravitas/AutoGPT`, `microsoft/semantic-kernel`, `CrewAIInc/crewAI`
`local-category-ai_app_template` | search | yes | yes | yes | yes | yes | 0 | `Shubhamsaboo/awesome-llm-apps`, `stackblitz/bolt.new`, `google-gemini/starter-applets`, `openai/openai-chatkit-starter-app`, `openai/openai-responses-starter-app`
`local-category-ai_observability` | search | yes | yes | yes | yes | yes | 0 | `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`, `Arize-ai/phoenix`
`local-category-browser_agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/firecrawl`, `puppeteer/puppeteer`, `microsoft/playwright`, `scrapy/scrapy`, `unclecode/crawl4ai`
`local-category-coding_agent` | search | yes | yes | yes | yes | yes | 0 | `OpenHands/OpenHands`, `cline/cline`, `openai/codex`, `aider-ai/aider`, `TabbyML/tabby`
`local-category-llm_eval` | search | yes | yes | yes | yes | yes | 0 | `confident-ai/deepeval`, `braintrustdata/autoevals`, `Giskard-AI/giskard-oss`, `lm-sys/FastChat`, `HumanSignal/label-studio`
`local-category-llm_gateway` | search | yes | yes | yes | yes | yes | 0 | `Kong/kong`, `danny-avila/LibreChat`, `songquanpeng/one-api`, `BerriAI/litellm`, `Portkey-AI/gateway`
`local-category-local_llm_runtime` | search | yes | yes | yes | yes | yes | 0 | `oobabooga/textgen`, `ollama/ollama`, `exo-explore/exo`, `mozilla-ai/llamafile`, `ggml-org/llama.cpp`
`local-category-mcp_server` | search | yes | yes | yes | yes | yes | 0 | `modelcontextprotocol/servers`, `github/github-mcp-server`, `PrefectHQ/fastmcp`, `awslabs/mcp`, `cloudflare/mcp-server-cloudflare`
`local-category-prompt_tooling` | search | yes | yes | yes | yes | yes | 0 | `567-labs/instructor`, `openai/openai-structured-outputs-samples`, `microsoft/TypeChat`, `BoundaryML/baml`, `eth-sri/lmql`
`local-category-rag_framework` | search | yes | yes | yes | yes | yes | 0 | `run-llama/llama_index`, `microsoft/markitdown`, `stanford-oval/storm`, `langflow-ai/langflow`, `infiniflow/ragflow`
`local-category-vector_database` | search | yes | yes | yes | yes | yes | 0 | `redis/redis`, `milvus-io/milvus`, `qdrant/qdrant`, `facebookresearch/faiss`, `chroma-core/chroma`
`local-category-workflow_automation` | search | yes | yes | yes | yes | yes | 0 | `langgenius/dify`, `FlowiseAI/Flowise`, `ComposioHQ/composio`, `n8n-io/n8n`, `triggerdotdev/trigger.dev`
`local-deployment-cloudflare` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `example/cloudflare-python-agent`, `cloudflare/puppeteer`, `cloudflare/dynamic-workflows`, `cloudflare/templates`
`local-deployment-docker` | search | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `run-llama/llama_index`, `modelcontextprotocol/servers`, `Significant-Gravitas/AutoGPT`, `langgenius/dify`
`local-deployment-local` | search | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `run-llama/llama_index`, `modelcontextprotocol/servers`, `mudler/LocalAI`, `ollama/ollama`
`local-deployment-library_only` | search | yes | yes | yes | yes | yes | 0 | `langchain-ai/langchain`, `run-llama/llama_index`, `FoundationAgents/MetaGPT`, `scrapy/scrapy`, `CrewAIInc/crewAI`
`local-deployment-serverless` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `openfaas/faas`, `mckaywrigley/chatbot-ui`, `vercel/ai-sdk-rag-starter`, `vercel/ai-chatbot`
`local-deployment-vercel` | search | yes | yes | yes | yes | yes | 0 | `mckaywrigley/chatbot-ui`, `vercel/ai-sdk-rag-starter`, `vercel/ai-chatbot`, `vercel/ai`, `vercel/workflow`
`local-deployment-kubernetes` | search | yes | yes | yes | yes | yes | 0 | `vllm-project/vllm`, `milvus-io/milvus`, `qdrant/qdrant`, `windmill-labs/windmill`, `weaviate/weaviate`
`local-cloudflare-ready` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/puppeteer`, `cloudflare/dynamic-workflows`, `cloudflare/templates`, `cloudflare/ai-utils`
`local-cloudflare-mentioned-not-ready` | search | yes | yes | yes | yes | yes | 0 | `example/cloudflare-python-agent`, `example/cloudflare-docker-gateway`
`local-target-github-mcp-broad-query` | search | yes | yes | yes | yes | yes | 0 | `github/github-mcp-server`, `PrefectHQ/prefect-mcp-server`, `wonderwhy-er/DesktopCommanderMCP`, `browserbase/mcp-server-browserbase`, `microsoft/playwright-mcp`
