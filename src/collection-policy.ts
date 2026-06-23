import type { ProjectKnowledge } from "./types";

const reviewedCollectionPolicies: Record<string, { reviewedAt: string; use: string }> = {
  "anthropics/claude-cookbooks": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for implementation patterns and examples."
  },
  "coleam00/ottomator-agents": {
    reviewedAt: "2026-06-23",
    use: "Resource hub retained for agent implementation discovery."
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
  "giskard-ai/awesome-ai-safety": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for evaluation and safety discovery."
  },
  "github/awesome-copilot": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for coding-agent and Copilot workflow discovery."
  },
  "google-gemini/cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
  },
  "huggingface/agents-course": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for agent framework learning paths."
  },
  "huggingface/cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
  },
  "microsoft/ai-agents-for-beginners": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for agent framework learning paths."
  },
  "microsoft/generative-ai-for-beginners": {
    reviewedAt: "2026-06-23",
    use: "Course collection retained for AI app examples and learning paths."
  },
  "openai/openai-cookbook": {
    reviewedAt: "2026-06-23",
    use: "Cookbook collection retained for AI app examples."
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
  "weaviate/awesome-weaviate": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for vector database and RAG discovery."
  },
  "wong2/awesome-mcp-servers": {
    reviewedAt: "2026-06-23",
    use: "Awesome list retained for MCP server discovery."
  }
};

export interface ReviewedCollectionPolicy {
  reviewedAt: string;
  use: string;
}

export function reviewedCollectionPolicy(projectId: string): ReviewedCollectionPolicy | null {
  return reviewedCollectionPolicies[projectId.toLowerCase()] ?? null;
}

export function reviewedCollectionPolicyIds(): string[] {
  return Object.keys(reviewedCollectionPolicies).sort();
}

export function isReviewedCollection(item: ProjectKnowledge): boolean {
  return item.agentCard.projectKind === "collection" && reviewedCollectionPolicy(item.project.id) !== null;
}
