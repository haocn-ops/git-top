import { toProjectKnowledgeView } from "./project-view";
import type { ProjectKnowledge } from "./types";

type ProjectView = ReturnType<typeof toProjectKnowledgeView>;

const gitTopScoreWeights = [
  { key: "community", label: "Community", weight: 16 },
  { key: "maintenance", label: "Maintenance", weight: 20 },
  { key: "documentation", label: "Documentation", weight: 16 },
  { key: "stability", label: "Stability", weight: 16 },
  { key: "adoption", label: "Adoption", weight: 16 },
  { key: "agentReadability", label: "Agent Readability", weight: 16 }
] as const;

export function buildProjectScoreExplanation(project: ProjectKnowledge) {
  const view = toProjectKnowledgeView(project);
  const dimensions = gitTopScoreWeights.map((item) => {
    const value = view.gitTopScoreBreakdown[item.key];
    return {
      key: toSnakeKey(item.key),
      label: item.label,
      score: value,
      weight: item.weight,
      contribution: Number((value * (item.weight / 100)).toFixed(1)),
      explanation: dimensionExplanation(view, item.key)
    };
  });
  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const riskFlags = scoreRiskFlags(view, weakest);
  const nextActions = scoreNextActions(view);

  return {
    project: {
      repo: view.repo,
      name: view.name,
      description: view.description,
      category: view.category,
      language: view.language,
      license: view.license
    },
    score: view.gitTopScore,
    git_top_score: view.gitTopScore,
    git_top_score_breakdown: view.gitTopScoreBreakdown,
    dimensions,
    summary: `${view.repo} scores ${view.gitTopScore}/100. ${strongest.label} is strongest at ${strongest.score}/100; ${weakest.label} is the lowest dimension at ${weakest.score}/100.`,
    adoption_guidance: adoptionGuidance(view.gitTopScore, riskFlags),
    risk_flags: riskFlags,
    next_actions: nextActions,
    strongest_dimension: strongest,
    weakest_dimension: weakest,
    related_scores: {
      quality_score: view.qualityScore,
      agent_score: view.agentScore,
      agent_score_breakdown: view.agentScoreBreakdown
    },
    evidence: {
      deployments: view.deployments,
      dependencies: view.dependencies,
      use_cases: view.useCases,
      not_good_for: view.notGoodFor,
      quality_signals: view.qualitySignals,
      quality_signal_confidence: view.qualitySignalConfidence,
      classification: view.classification
    },
    links: {
      page: `/score/${view.repo}`,
      project_api: `/api/project/${view.repo}`,
      graph_api: `/api/graph/${view.repo}`,
      alternatives_api: `/api/alternatives/${view.repo}`,
      compare_api: `/api/compare?repos=${view.repo}`,
      recommendations_api: `/api/recommend?category=${encodeURIComponent(view.category[0] ?? "")}&limit=5`
    }
  };
}

function adoptionGuidance(score: number, riskFlags: string[]): string {
  if (score >= 80 && riskFlags.length === 0) {
    return "Strong candidate for shortlist inclusion. Verify license, deployment fit, and source freshness before production adoption.";
  }
  if (score >= 65) {
    return "Promising candidate. Review risk flags, weakest score dimension, and alternatives before recommending it as the default choice.";
  }
  return "Use cautiously. Treat this project as an exploration candidate until documentation, maintenance, and adoption signals are reviewed.";
}

function scoreRiskFlags(view: ProjectView, weakest: { label: string; score: number }): string[] {
  const flags: string[] = [];
  if (weakest.score < 55) {
    flags.push(`${weakest.label} is the weakest dimension at ${weakest.score}/100.`);
  }
  if (view.qualitySignalConfidence?.stars30dDelta === "estimated") {
    flags.push("Recent star movement is estimated rather than fully observed.");
  }
  if (view.deployments.length === 0) {
    flags.push("No explicit deployment target is indexed.");
  }
  if (view.notGoodFor.length > 0) {
    flags.push(`Known caveat: ${view.notGoodFor[0]}`);
  }
  return flags.slice(0, 4);
}

function scoreNextActions(view: ProjectView) {
  return [
    { label: "Open project knowledge", href: `/projects/${view.repo}`, kind: "project" },
    { label: "Inspect graph", href: `/graph/${view.repo}`, kind: "graph" },
    { label: "Find alternatives", href: `/alternatives/${view.repo}`, kind: "alternatives" },
    { label: "Compare shortlist", href: `/api/compare?repos=${view.repo}`, kind: "compare" },
    { label: "Get category recommendations", href: `/api/recommend?category=${encodeURIComponent(view.category[0] ?? "")}&limit=5`, kind: "recommend" }
  ];
}

function dimensionExplanation(view: ProjectView, key: (typeof gitTopScoreWeights)[number]["key"]): string {
  if (key === "documentation") {
    return view.overview.length > 80 ? "Agent-readable documentation signals are strong enough for recommendation workflows." : "Documentation context is short; inspect source material before citing.";
  }
  if (key === "maintenance") {
    return `Maintenance reflects repository activity, commits, releases, issue-response signals, and recent push freshness.`;
  }
  if (key === "stability") {
    return `Stability reflects release cadence, issue load, recent activity, and maturity signals.`;
  }
  if (key === "adoption") {
    return `Adoption is normalized from stars, forks, and ecosystem attention signals.`;
  }
  if (key === "agentReadability") {
    return `Agent readability reflects summaries, use cases, tradeoffs, dependencies, alternatives, and deployment clarity.`;
  }
  return `Community reflects contributor activity and ecosystem attention. Current contributor signal is ${view.qualitySignals.contributors}.`;
}

function toSnakeKey(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}
