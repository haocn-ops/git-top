import type { Category } from "./types";

const categoryOverrides: Record<string, Category> = {
  "apache/answer": "ai_app_template",
  "berriai/litellm-guardrails": "prompt_tooling",
  "builderio/gpt-crawler": "ai_app_template",
  "chroma-core/chroma-mcp": "mcp_server",
  "dagster-io/dagster-open-platform": "workflow_automation",
  "firecrawl/fireplexity": "browser_agent",
  "firecrawl/open-researcher": "browser_agent",
  "flowiseai/flowisepy": "workflow_automation",
  "huggingface/optimum": "local_llm_runtime",
  "lmstudio-ai/lms": "local_llm_runtime",
  "milvus-io/milvus-sdk-java": "vector_database",
  "mlc-ai/mlc-llm": "local_llm_runtime",
  "n8n-io/task-runner-launcher": "workflow_automation",
  "openai/openai-openapi": "llm_gateway",
  "portkey-ai/mcp-tool-filter": "mcp_server",
  "qdrant/page-search": "vector_database",
  "qdrant/rust-client": "vector_database",
  "signoz/signoz-otel-collector": "ai_observability",
  "supermemoryai/opensearch-ai": "rag_framework",
  "sweepai/sweep": "coding_agent",
  "weaviate/retrieve-dspy": "rag_framework"
};

export function inferCuratedCategory(projectId: string): Category | null {
  return categoryOverrides[projectId.toLowerCase()] ?? null;
}

export function curatedCategoryEvidence(projectId: string, category: Category): string[] {
  return inferCuratedCategory(projectId) === category ? [`Curated category override for ${projectId}.`] : [];
}
