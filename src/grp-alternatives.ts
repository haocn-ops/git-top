import { alternativesFor } from "./grp-graph";
import type { ScoredProject } from "./grp-candidates";
import type { GrpAlternative, StackRole } from "./grp-types";
import type { ProjectKnowledge } from "./types";

export function buildAlternatives(projects: ProjectKnowledge[], seeds: ScoredProject[], stack: StackRole[]): GrpAlternative[] {
  const selected = new Set(stack.map((item) => item.nodeId));
  const matchedSeeds = seeds.filter((entry) => selected.has(entry.node.id));
  const sourceSeeds = matchedSeeds.length > 0 ? matchedSeeds : seeds.slice(0, 6);

  return sourceSeeds
    .map((entry) => ({
      source: entry.item.project.id,
      alternatives: alternativesFor(entry.item, projects)
        .slice(0, 4)
        .map((alternative) => ({
          projectId: alternative.project_id,
          reason: alternative.reason,
          score: projects.find((project) => project.project.id === alternative.project_id)?.metrics.gitScore
        }))
    }))
    .filter((item) => item.alternatives.length > 0);
}
