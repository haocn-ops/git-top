# Git.Top Local Eval

Generated at: 2026-06-20T18:20:35.366Z

This local-only report expands the CI-safe eval with generated category and deployment probes across the full fixture-backed project set. It is intended for ranking review before heuristic changes, not as a strict CI gate.

## Summary

- Evaluated cases: 22
- Top-1 hit rate: 0.773
- Top-3 hit rate: 0.864
- Category accuracy: 1
- Deployment accuracy: 1
- Cloudflare readiness accuracy: 1
- Unacceptable hit count: 0
- Generated fixture projects: 313
- D1 fixture projects: 313
- Effective generated fixture projects: 308
- Synthetic projects: 0

## Review Focus

### `local-category-agent_framework`

- Issue: top-1 miss, top-3 miss
- Expected: `langchain-ai/langchain`, `cloudflare/agents`, `Significant-Gravitas/AutoGPT`, `FoundationAgents/MetaGPT`, `microsoft/autogen`, `CrewAIInc/crewAI`, `microsoft/semantic-kernel`, `openai/swarm`
- Observed: `huggingface/smolagents`, `langchain-ai/langgraph`, `openai/openai-agents-python`, `langchain-ai/langchainjs`, `mastra-ai/mastra`, `humanlayer/humanlayer`, `langroid/langroid`, `microsoft/semantic-kernel`
- Tuning hint: Review broad category ranking separately from exact keyword search; likely needs scoped category ranking or category-specific canonical-project priors.

### `local-category-rag_framework`

- Issue: top-1 miss, top-3 miss
- Expected: `run-llama/llama_index`, `langflow-ai/langflow`, `microsoft/markitdown`, `gradio-app/gradio`, `infiniflow/ragflow`, `streamlit/streamlit`, `mem0ai/mem0`, `stanfordnlp/dspy`
- Observed: `stanford-oval/storm`, `llmware-ai/llmware`, `neuml/txtai`, `getzep/graphiti`, `microsoft/kernel-memory`, `neo4j-labs/llm-graph-builder`, `deepset-ai/haystack-core-integrations`, `run-llama/llama_deploy`
- Tuning hint: Review broad category ranking separately from exact keyword search; likely needs scoped category ranking or category-specific canonical-project priors.

### `local-deployment-docker`

- Issue: top-1 miss
- Expected: `langchain-ai/langchain`, `modelcontextprotocol/servers`, `run-llama/llama_index`, `Significant-Gravitas/AutoGPT`, `langgenius/dify`, `n8n-io/n8n`, `abi/screenshot-to-code`, `open-webui/open-webui`
- Observed: `example/cloudflare-docker-gateway`, `Significant-Gravitas/AutoGPT`, `langgenius/dify`, `n8n-io/n8n`, `open-webui/open-webui`, `redis/redis`, `abi/screenshot-to-code`, `vllm-project/vllm`
- Tuning hint: Review broad deployment ranking separately from exact runtime mentions; likely needs deployment-specific quality priors and blocker-aware ordering.

### `local-deployment-local`

- Issue: top-1 miss, top-3 miss
- Expected: `langchain-ai/langchain`, `modelcontextprotocol/servers`, `run-llama/llama_index`, `Significant-Gravitas/AutoGPT`, `ollama/ollama`, `langgenius/dify`, `n8n-io/n8n`, `Shubhamsaboo/awesome-llm-apps`
- Observed: `mudler/LocalAI`, `openai/openai-cookbook`, `continuedev/continue`, `openfaas/faas`, `bentoml/OpenLLM`, `helicone/helicone`, `openvinotoolkit/openvino.genai`, `github/awesome-copilot`
- Tuning hint: Review broad deployment ranking separately from exact runtime mentions; likely needs deployment-specific quality priors and blocker-aware ordering.

### `local-deployment-serverless`

- Issue: top-1 miss
- Expected: `cloudflare/agents`, `mckaywrigley/chatbot-ui`, `openfaas/faas`, `vercel/ai`, `vercel/ai-chatbot`, `vercel/chatbot`, `cloudflare/mcp-server-cloudflare`, `supabase-community/vercel-ai-chatbot`
- Observed: `example/cloudflare-docker-gateway`, `openfaas/faas`, `mckaywrigley/chatbot-ui`, `vercel/ai-chatbot`, `vercel/ai`, `vercel/chatbot`, `cloudflare/mcp-server-cloudflare`, `cloudflare/agents`
- Tuning hint: Review broad deployment ranking separately from exact runtime mentions; likely needs deployment-specific quality priors and blocker-aware ordering.


## Cases

Case | Type | Top-1 | Top-3 | Category | Deployment | Cloudflare Ready | Unacceptable Hits | Top Candidates
--- | --- | --- | --- | --- | --- | --- | ---: | ---
`local-category-agent_framework` | search | no | no | yes | yes | yes | 0 | `huggingface/smolagents`, `langchain-ai/langgraph`, `openai/openai-agents-python`, `langchain-ai/langchainjs`, `mastra-ai/mastra`
`local-category-ai_app_template` | search | yes | yes | yes | yes | yes | 0 | `Shubhamsaboo/awesome-llm-apps`, `stackblitz/bolt.new`, `microsoft/generative-ai-for-beginners`, `open-webui/open-webui`, `abi/screenshot-to-code`
`local-category-ai_observability` | search | yes | yes | yes | yes | yes | 0 | `SigNoz/signoz`, `jaegertracing/jaeger`, `langfuse/langfuse`, `comet-ml/opik`, `Arize-ai/phoenix`
`local-category-browser_agent` | search | yes | yes | yes | yes | yes | 0 | `firecrawl/firecrawl`, `browser-use/web-ui`, `lightpanda-io/browser`, `nanobrowser/nanobrowser`, `browserbase/stagehand`
`local-category-coding_agent` | search | yes | yes | yes | yes | yes | 0 | `OpenHands/OpenHands`, `cline/cline`, `openai/codex`, `aider-ai/aider`, `TabbyML/tabby`
`local-category-llm_eval` | search | yes | yes | yes | yes | yes | 0 | `confident-ai/deepeval`, `braintrustdata/autoevals`, `Giskard-AI/giskard-oss`, `lm-sys/FastChat`, `HumanSignal/label-studio`
`local-category-llm_gateway` | search | yes | yes | yes | yes | yes | 0 | `Kong/kong`, `Portkey-AI/gateway`, `open-webui/pipelines`, `danny-avila/LibreChat`, `songquanpeng/one-api`
`local-category-local_llm_runtime` | search | yes | yes | yes | yes | yes | 0 | `oobabooga/textgen`, `exo-explore/exo`, `mozilla-ai/llamafile`, `mlc-ai/mlc-llm`, `sgl-project/sglang`
`local-category-mcp_server` | search | yes | yes | yes | yes | yes | 0 | `github/github-mcp-server`, `cloudflare/mcp-server-cloudflare`, `PrefectHQ/fastmcp`, `awslabs/mcp`, `supabase/mcp`
`local-category-prompt_tooling` | search | yes | yes | yes | yes | yes | 0 | `guardrails-ai/guardrails`, `567-labs/instructor`, `microsoft/TypeChat`, `BoundaryML/baml`, `eth-sri/lmql`
`local-category-rag_framework` | search | no | no | yes | yes | yes | 0 | `stanford-oval/storm`, `llmware-ai/llmware`, `neuml/txtai`, `getzep/graphiti`, `microsoft/kernel-memory`
`local-category-vector_database` | search | yes | yes | yes | yes | yes | 0 | `redis/redis`, `milvus-io/milvus`, `qdrant/qdrant`, `chroma-core/chroma`, `weaviate/weaviate`
`local-category-workflow_automation` | search | yes | yes | yes | yes | yes | 0 | `n8n-io/n8n`, `apache/airflow`, `PrefectHQ/prefect`, `activepieces/activepieces`, `kestra-io/kestra`
`local-deployment-cloudflare` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `example/cloudflare-python-agent`, `cloudflare/mcp-server-cloudflare`, `example/cloudflare-docker-gateway`
`local-deployment-docker` | search | no | yes | yes | yes | yes | 0 | `example/cloudflare-docker-gateway`, `Significant-Gravitas/AutoGPT`, `langgenius/dify`, `n8n-io/n8n`, `open-webui/open-webui`
`local-deployment-local` | search | no | no | yes | yes | yes | 0 | `mudler/LocalAI`, `openai/openai-cookbook`, `continuedev/continue`, `openfaas/faas`, `bentoml/OpenLLM`
`local-deployment-library_only` | search | yes | yes | yes | yes | yes | 0 | `FoundationAgents/MetaGPT`, `scrapy/scrapy`, `CrewAIInc/crewAI`, `unclecode/crawl4ai`, `streamlit/streamlit`
`local-deployment-serverless` | search | no | yes | yes | yes | yes | 0 | `example/cloudflare-docker-gateway`, `openfaas/faas`, `mckaywrigley/chatbot-ui`, `vercel/ai-chatbot`, `vercel/ai`
`local-deployment-vercel` | search | yes | yes | yes | yes | yes | 0 | `mckaywrigley/chatbot-ui`, `vercel/ai-chatbot`, `vercel/ai`, `vercel/chatbot`, `supabase-community/vercel-ai-chatbot`
`local-deployment-kubernetes` | search | yes | yes | yes | yes | yes | 0 | `vllm-project/vllm`, `kserve/kserve`, `llm-d/llm-d`, `milvus-io/milvus`, `qdrant/qdrant`
`local-cloudflare-ready` | search | yes | yes | yes | yes | yes | 0 | `cloudflare/agents`, `cloudflare/mcp-server-cloudflare`
`local-cloudflare-mentioned-not-ready` | search | yes | yes | yes | yes | yes | 0 | `example/cloudflare-python-agent`, `example/cloudflare-docker-gateway`
