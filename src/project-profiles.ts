import { toProjectKnowledgeView } from "./project-view";
import type { ProjectKnowledge } from "./types";

export type ProjectResponseProfile = "compact" | "decision" | "evidence";

export function parseProjectResponseProfile(value: unknown): ProjectResponseProfile | null {
  return value === "compact" || value === "decision" || value === "evidence" ? value : null;
}

export function projectProfileView(project: ProjectKnowledge, profile: ProjectResponseProfile) {
  const view = toProjectKnowledgeView(project);
  if (profile === "compact") {
    return {
      project_id: view.projectId,
      name: view.name,
      description: view.description,
      project_kind: view.projectKind,
      category: view.category,
      deployments: view.deployments,
      language: view.language,
      license: view.license,
      score: view.score,
      last_verified_at: view.lastVerifiedAt
    };
  }
  if (profile === "evidence") {
    return {
      project_id: view.projectId,
      classification: view.classification,
      quality_signals: view.qualitySignals,
      quality_signal_confidence: view.qualitySignalConfidence,
      evidence: view.evidence,
      caveats: view.caveats,
      confidence_reason: view.confidenceReason,
      source_fields: view.sourceFields,
      last_verified_at: view.lastVerifiedAt
    };
  }
  return view;
}
