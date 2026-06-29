import type { Category } from "./types";

const categoryOverrides: Record<string, Category> = {
  "apache/answer": "ai_app_template",
  "a2aproject/a2a": "agent_framework",
  "ag2ai/ag2": "agent_framework",
  "agentscope-ai/agentscope": "agent_framework",
  "arize-ai/client_python": "ai_observability",
  "arize-ai/openinference": "ai_observability",
  "berriai/litellm-guardrails": "prompt_tooling",
  "bentoml/bentoml": "local_llm_runtime",
  "builderio/gpt-crawler": "ai_app_template",
  "copilotkit/aimock": "ai_app_template",
  "chroma-core/chroma-mcp": "mcp_server",
  "cloudflare/agents": "agent_framework",
  "dagster-io/dagster-open-platform": "workflow_automation",
  "firecrawl/fireplexity": "browser_agent",
  "firecrawl/open-researcher": "browser_agent",
  "guardrails-ai/guardrails_pii": "prompt_tooling",
  "flowiseai/flowisepy": "workflow_automation",
  "huggingface/optimum": "local_llm_runtime",
  "kserve/kserve": "local_llm_runtime",
  "langgenius/dify": "workflow_automation",
  "langchain-ai/langsmith-sdk": "ai_observability",
  "lmstudio-ai/lms": "local_llm_runtime",
  "lobehub/lobehub": "ai_app_template",
  "open-webui/oikb": "rag_framework",
  "milvus-io/milvus-sdk-java": "vector_database",
  "mlc-ai/mlc-llm": "local_llm_runtime",
  "n8n-io/task-runner-launcher": "workflow_automation",
  "n8n-io/n8n": "workflow_automation",
  "open-webui/open-webui": "ai_app_template",
  "openai/openai-openapi": "llm_gateway",
  "openai/openai-structured-outputs-samples": "prompt_tooling",
  "prefecthq/marvin": "agent_framework",
  "portkey-ai/mcp-tool-filter": "mcp_server",
  "qdrant/page-search": "vector_database",
  "qdrant/n8n-nodes-qdrant": "vector_database",
  "qdrant/rust-client": "vector_database",
  "run-llama/rags": "rag_framework",
  "signoz/signoz-otel-collector": "ai_observability",
  "supermemoryai/opensearch-ai": "rag_framework",
  "supermemoryai/supermemory-mcp": "mcp_server",
  "sweepai/sweep": "coding_agent",
  "triggerdotdev/trigger.dev": "workflow_automation",
  "vercel/ai-elements": "ai_app_template",
  "wandb/weave": "ai_observability",
  "weaviate/retrieve-dspy": "rag_framework",
  "vllm-project/semantic-router": "prompt_tooling",
  "vllm-project/vllm-omni": "local_llm_runtime"
};

const cloudflareReadyOverrides: Record<string, boolean> = {
  "cloudflare/agents": true
};

export function inferCuratedCategory(projectId: string): Category | null {
  return categoryOverrides[projectId.toLowerCase()] ?? null;
}

export function curatedCategoryEvidence(projectId: string, category: Category): string[] {
  return inferCuratedCategory(projectId) === category ? [`Curated category override for ${projectId}.`] : [];
}

export function inferCuratedCloudflareReady(projectId: string): boolean | null {
  return cloudflareReadyOverrides[projectId.toLowerCase()] ?? null;
}

export function curatedCloudflareReadyEvidence(projectId: string, cloudflareReady: boolean): string[] {
  return inferCuratedCloudflareReady(projectId) === cloudflareReady ? [`Curated Cloudflare readiness override for ${projectId}.`] : [];
}
