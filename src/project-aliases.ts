import type { ProjectKnowledge } from "./types";

const projectAliases: Record<string, string[]> = {
  "claude-code": ["openai/codex", "continuedev/continue", "cloudflare/agents", "langchain-ai/langchain"],
  "claude-code-alternatives": ["openai/codex", "continuedev/continue", "cloudflare/agents", "langchain-ai/langchain"],
  cursor: ["continuedev/continue", "openai/codex", "langchain-ai/langchain"],
  "cursor-alternatives": ["continuedev/continue", "openai/codex", "langchain-ai/langchain"],
  openai: ["openai/openai-agents-python", "openai/codex", "cloudflare/agents", "langchain-ai/langchain"],
  "openai-alternatives": ["openai/openai-agents-python", "openai/codex", "cloudflare/agents", "langchain-ai/langchain"],
  "openai-sdk": ["openai/openai-openapi", "openai/openai-agents-python", "langchain-ai/langchain"],
  "openai-sdk-alternatives": ["openai/openai-openapi", "openai/openai-agents-python", "langchain-ai/langchain"],
  dify: ["langgenius/dify", "langchain-ai/langchain"],
  "dify-alternatives": ["langgenius/dify", "langchain-ai/langchain"],
  langchain: ["langchain-ai/langchain"],
  "langchain-alternatives": ["langchain-ai/langchain"],
  "browser-use": ["browser-use/browser-use", "cloudflare/agents"],
  "browser-use-alternatives": ["browser-use/browser-use", "cloudflare/agents"],
  "cloudflare-agents": ["cloudflare/agents"],
  "cloudflare-agents-alternatives": ["cloudflare/agents"],
  llamaindex: ["run-llama/llama_index"],
  "llama-index": ["run-llama/llama_index"],
  "llamaindex-alternatives": ["run-llama/llama_index"],
  "llama-index-alternatives": ["run-llama/llama_index"],
  opencode: ["anomalyco/opencode", "openai/codex", "langchain-ai/langchain"],
  "opencode-alternatives": ["anomalyco/opencode", "openai/codex", "langchain-ai/langchain"]
};

export interface ProjectResolution {
  project: ProjectKnowledge;
  requestedId: string;
  resolvedId: string;
  resolution: "direct" | "alias";
}

export function resolveProject(projects: ProjectKnowledge[], id: string): ProjectResolution | null {
  const requestedId = decodeURIComponent(id).trim();
  const direct = findProjectById(projects, requestedId);
  if (direct) {
    return {
      project: direct,
      requestedId,
      resolvedId: direct.project.id,
      resolution: "direct"
    };
  }

  const aliasIds = projectAliases[normalizeAlias(requestedId)];
  if (!aliasIds) {
    return null;
  }

  const project = aliasIds.map((aliasId) => findProjectById(projects, aliasId)).find((item): item is ProjectKnowledge => item !== null);
  if (!project) {
    return null;
  }

  return {
    project,
    requestedId,
    resolvedId: project.project.id,
    resolution: "alias"
  };
}

export function findProjectById(projects: ProjectKnowledge[], id: string): ProjectKnowledge | null {
  const wanted = normalizeAlias(id);
  return (
    projects.find((item) =>
      [item.project.id, item.project.fullName, item.project.name, item.project.fullName.replace("/", "-"), item.project.fullName.replace("/", "--")]
        .map(normalizeAlias)
        .includes(wanted)
    ) ?? null
  );
}

export function alternativeAliasPaths(): string[] {
  return ["claude-code", "cursor", "openai", "dify", "langchain", "browser-use", "cloudflare-agents", "llama-index", "opencode"];
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replaceAll("--", "/").replaceAll("_", "-");
}
