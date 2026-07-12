import type { ProjectKnowledge } from "./types";

const reviewedCollectionPolicies: Record<string, { reviewedAt: string; use: string; corpus?: "seed" | "discovery" }> = {
  "arabicapp/everything-claude-code": {
    reviewedAt: "2026-07-12",
    use: "Claude Code resource collection retained for agent workflow and configuration discovery.",
    corpus: "discovery"
  },
  "anthropics/claude-cookbooks": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for implementation patterns and examples."
  },
  "coleam00/ottomator-agents": {
    reviewedAt: "2026-06-23",
    use: "Resource hub retained for agent implementation discovery."
  },
  "cloudflare/templates": {
    reviewedAt: "2026-06-26",
    use: "Cloudflare starter collection retained for Workers and serverless template discovery."
  },
  "cloudflare/vibesdk-templates": {
    reviewedAt: "2026-06-26",
    use: "Cloudflare template collection retained for VibeSDK and Workers app discovery."
  },
  "deepset-ai/haystack-cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for RAG implementation patterns."
  },
  "e2b-dev/awesome-ai-agents": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for agent and app discovery."
  },
  "e2b-dev/awesome-devins": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for coding-agent discovery."
  },
  "enescingoz/awesome-n8n-templates": {
    reviewedAt: "2026-07-12",
    use: "n8n template collection retained for workflow implementation discovery.",
    corpus: "discovery"
  },
  "euniai/awesome-code-agents": {
    reviewedAt: "2026-07-12",
    use: "Coding-agent resource collection retained for evaluation and discovery.",
    corpus: "discovery"
  },
  "godiao/free-way": {
    reviewedAt: "2026-07-12",
    use: "Coding-agent resource collection retained for tool and workflow discovery.",
    corpus: "discovery"
  },
  "giskard-ai/awesome-ai-safety": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for evaluation and safety discovery."
  },
  "github/awesome-copilot": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for coding-agent and Copilot workflow discovery."
  },
  "googlecloudplatform/generative-ai": {
    reviewedAt: "2026-06-26",
    use: "Sample and cookbook collection retained for Google Cloud generative AI implementation patterns."
  },
  "google-gemini/cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
  },
  "google-gemini/starter-applets": {
    reviewedAt: "2026-06-26",
    use: "Starter applet collection retained for Gemini AI app template discovery."
  },
  "huggingface/agents-course": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for agent framework learning paths."
  },
  "huggingface/cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
  },
  "lancedb/vectordb-recipes": {
    reviewedAt: "2026-06-26",
    use: "Recipe collection retained for vector database implementation patterns."
  },
  "langgenius/dify-official-plugins": {
    reviewedAt: "2026-06-26",
    use: "Plugin collection retained for Dify ecosystem integration discovery."
  },
  "lobehub/lobe-chat-plugins": {
    reviewedAt: "2026-06-26",
    use: "Plugin collection retained for Lobe Chat extension discovery."
  },
  "microsoft/ai-agents-for-beginners": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for agent framework learning paths."
  },
  "microsoft/generative-ai-for-beginners": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for AI app examples and learning paths."
  },
  "microsoft/mcp": {
    reviewedAt: "2026-06-26",
    use: "MCP resource collection retained for Microsoft Model Context Protocol discovery."
  },
  "modelcontextprotocol/servers": {
    reviewedAt: "2026-07-12",
    use: "Official MCP server collection retained for protocol implementation discovery."
  },
  "n8n-io/self-hosted-ai-starter-kit": {
    reviewedAt: "2026-07-12",
    use: "Self-hosted AI starter collection retained for n8n deployment patterns."
  },
  "ningzimu/awesome-ai-ppt": {
    reviewedAt: "2026-07-12",
    use: "AI presentation resource collection retained for workflow discovery.",
    corpus: "discovery"
  },
  "n8n-io/n8n-hosting": {
    reviewedAt: "2026-06-26",
    use: "Hosting guide collection retained for n8n deployment pattern discovery."
  },
  "openai/frontier-evals": {
    reviewedAt: "2026-06-26",
    use: "Evaluation collection retained for frontier model assessment patterns."
  },
  "openai/openai-chatkit-advanced-samples": {
    reviewedAt: "2026-06-26",
    use: "Sample collection retained for advanced ChatKit implementation patterns."
  },
  "openai/openai-cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
  },
  "openai/openai-structured-outputs-samples": {
    reviewedAt: "2026-06-26",
    use: "Sample collection retained for structured output implementation patterns."
  },
  "openai/skills": {
    reviewedAt: "2026-06-26",
    use: "Skill collection retained for agent capability discovery."
  },
  "open-webui/openapi-servers": {
    reviewedAt: "2026-06-26",
    use: "OpenAPI server collection retained for Open WebUI integration discovery."
  },
  "patchy631/ai-engineering-hub": {
    reviewedAt: "2026-06-23",
    use: "Resource hub retained for AI engineering discovery."
  },
  "punkpeye/awesome-mcp-servers": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for MCP server discovery."
  },
  "run-llama/awesome-rag": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for RAG discovery."
  },
  "shubhamsaboo/awesome-llm-apps": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for AI app discovery."
  },
  "signoz/awesome-opentelemetry": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for observability discovery."
  },
  "signoz/dashboards": {
    reviewedAt: "2026-06-26",
    use: "Dashboard collection retained for observability template discovery."
  },
  "temporalio/samples-python": {
    reviewedAt: "2026-06-26",
    use: "Sample collection retained for Python workflow implementation patterns."
  },
  "tensorblock/awesome-mcp-servers": {
    reviewedAt: "2026-07-12",
    use: "MCP server resource collection retained for implementation discovery.",
    corpus: "discovery"
  },
  "vonzosten/awesome-langgraph": {
    reviewedAt: "2026-07-12",
    use: "LangGraph resource collection retained for agent workflow discovery.",
    corpus: "discovery"
  },
  "wagneragent/awesome-mcp-servers-devops": {
    reviewedAt: "2026-07-12",
    use: "DevOps-focused MCP collection retained for server discovery.",
    corpus: "discovery"
  },
  "weam-ai/weam": {
    reviewedAt: "2026-07-12",
    use: "MCP-oriented resource collection retained for tool discovery.",
    corpus: "discovery"
  },
  "weaviate/awesome-weaviate": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for vector database and RAG discovery."
  },
  "weaviate/recipes": {
    reviewedAt: "2026-06-26",
    use: "Recipe collection retained for Weaviate vector database implementation patterns."
  },
  "wong2/awesome-mcp-servers": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for MCP server discovery."
  },
  "hesreallyhim/awesome-claude-code": {
    reviewedAt: "2026-07-12",
    use: "Claude Code resource collection retained for workflow discovery.",
    corpus: "discovery"
  }
};

const reviewedCollectionPolicyIndex = new Map(
  Object.entries(reviewedCollectionPolicies).map(([projectId, policy]) => [projectId.toLowerCase(), policy] as const)
);

export interface ReviewedCollectionPolicy {
  reviewedAt: string;
  use: string;
  corpus?: "seed" | "discovery";
}

export function reviewedCollectionPolicy(projectId: string): ReviewedCollectionPolicy | null {
  return reviewedCollectionPolicyIndex.get(projectId.toLowerCase()) ?? null;
}

export function reviewedCollectionPolicyIds(): string[] {
  return Array.from(reviewedCollectionPolicyIndex.keys()).sort();
}

export function reviewedSeedCollectionPolicyIds(): string[] {
  return Array.from(reviewedCollectionPolicyIndex.entries())
    .filter(([, policy]) => (policy.corpus ?? "seed") === "seed")
    .map(([projectId]) => projectId)
    .sort();
}

export function isReviewedCollection(item: ProjectKnowledge): boolean {
  return item.agentCard.projectKind === "collection" && reviewedCollectionPolicy(item.project.id) !== null;
}
