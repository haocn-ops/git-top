import { listProjectKnowledgeWithMeta, type ProjectKnowledgeResult } from "./knowledge-source";
import type { Env } from "./types";

export interface SourcePolicyFailure {
  code: "d1_required";
  message: string;
  metadata: ProjectKnowledgeResult["metadata"];
}

export type SourcePolicyResult =
  | {
      ok: true;
      knowledge: ProjectKnowledgeResult;
    }
  | {
      ok: false;
      failure: SourcePolicyFailure;
    };

export async function getKnowledgeForSourcePolicy(env: Env, options: { requireD1?: boolean } = {}): Promise<SourcePolicyResult> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  if (!options.requireD1 || knowledge.metadata.source === "d1") {
    return {
      ok: true,
      knowledge
    };
  }

  return {
    ok: false,
    failure: {
      code: "d1_required",
      message: `D1-backed knowledge is required, but current source is ${knowledge.metadata.source}.`,
      metadata: knowledge.metadata
    }
  };
}
