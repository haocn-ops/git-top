import { categoryValues, deploymentValues, difficultyValues, projectKindValues } from "./schema";
import type { AgentCard, ClassificationSignal, Project, ProjectKnowledge, ProjectMetrics } from "./types";

export class ValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Validation failed: ${issues.join("; ")}`);
    this.issues = issues;
    this.name = "ValidationError";
  }
}

export function validateProjectKnowledge(knowledge: ProjectKnowledge): void {
  const issues = [
    ...validateProject(knowledge.project),
    ...validateAgentCard(knowledge.agentCard),
    ...validateMetrics(knowledge.metrics),
    ...validateCrossReferences(knowledge)
  ];

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }
}

function validateProject(project: Project): string[] {
  const issues: string[] = [];
  requireRepoId(project.id, "project.id", issues);
  requireNonEmpty(project.owner, "project.owner", issues);
  requireNonEmpty(project.name, "project.name", issues);
  requireRepoId(project.fullName, "project.fullName", issues);
  requireNonEmpty(project.githubUrl, "project.githubUrl", issues);
  requireIsoDate(project.syncedAt, "project.syncedAt", issues);
  requireNonNegativeInteger(project.stars, "project.stars", issues);
  requireNonNegativeInteger(project.forks, "project.forks", issues);
  requireNonNegativeInteger(project.openIssues, "project.openIssues", issues);

  if (!Array.isArray(project.topics)) {
    issues.push("project.topics must be an array");
  }

  return issues;
}

function validateAgentCard(card: AgentCard): string[] {
  const issues: string[] = [];
  requireRepoId(card.projectId, "agentCard.projectId", issues);

  if (card.projectKind && !projectKindValues.includes(card.projectKind)) {
    issues.push(`agentCard.projectKind must be one of ${projectKindValues.join(", ")}`);
  }
  validateCollectionMetadata(card, issues);
  if (!categoryValues.includes(card.category)) {
    issues.push(`agentCard.category must be one of ${categoryValues.join(", ")}`);
  }
  if (!difficultyValues.includes(card.difficulty)) {
    issues.push(`agentCard.difficulty must be one of ${difficultyValues.join(", ")}`);
  }
  if (card.deployment.length === 0) {
    issues.push("agentCard.deployment must contain at least one value");
  }
  for (const deployment of card.deployment) {
    if (!deploymentValues.includes(deployment)) {
      issues.push(`agentCard.deployment contains invalid value ${deployment}`);
    }
  }
  if (new Set(card.deployment).size !== card.deployment.length) {
    issues.push("agentCard.deployment must not contain duplicate values");
  }
  if (card.useCases.length === 0) {
    issues.push("agentCard.useCases must contain at least one value");
  }
  for (const [index, useCase] of card.useCases.entries()) {
    requireNonEmpty(useCase, `agentCard.useCases[${index}]`, issues);
  }
  for (const [index, alternative] of card.alternatives.entries()) {
    requireRepoId(alternative.project_id, `agentCard.alternatives[${index}].project_id`, issues);
    requireNonEmpty(alternative.reason, `agentCard.alternatives[${index}].reason`, issues);
  }
  requireNonEmpty(card.summaryForAgent, "agentCard.summaryForAgent", issues);
  validateClassification(card, issues);
  if (card.schemaVersion !== "v1") {
    issues.push("agentCard.schemaVersion must be v1");
  }
  requireIsoDate(card.generatedAt, "agentCard.generatedAt", issues);

  return issues;
}

function validateCollectionMetadata(card: AgentCard, issues: string[]): void {
  if (!card.collectionMetadata) {
    return;
  }
  if (card.projectKind !== "collection") {
    issues.push("agentCard.collectionMetadata requires projectKind collection");
  }
  if (!["awesome_list", "cookbook", "starter_collection", "integration_collection", "resource_hub"].includes(card.collectionMetadata.scope)) {
    issues.push("agentCard.collectionMetadata.scope is invalid");
  }
  if (typeof card.collectionMetadata.curated !== "boolean") {
    issues.push("agentCard.collectionMetadata.curated must be boolean");
  }
  if (card.collectionMetadata.estimatedItems !== null && !Number.isInteger(card.collectionMetadata.estimatedItems)) {
    issues.push("agentCard.collectionMetadata.estimatedItems must be an integer or null");
  }
  if (!["active", "stale", "unknown"].includes(card.collectionMetadata.freshness)) {
    issues.push("agentCard.collectionMetadata.freshness is invalid");
  }
}

function validateClassification(card: AgentCard, issues: string[]): void {
  if (!card.classification) {
    return;
  }

  validateClassificationSignal(card.classification.category, "agentCard.classification.category", issues);
  validateClassificationSignal(card.classification.deployment, "agentCard.classification.deployment", issues);
  validateClassificationSignal(card.classification.difficulty, "agentCard.classification.difficulty", issues);
  validateClassificationSignal(card.classification.cloudflareReady, "agentCard.classification.cloudflareReady", issues);
}

function validateClassificationSignal(signal: ClassificationSignal | undefined, path: string, issues: string[]): void {
  if (!signal) {
    return;
  }
  if (!["high", "medium", "low"].includes(signal.confidence)) {
    issues.push(`${path}.confidence must be high, medium, or low`);
  }
  if (!Array.isArray(signal.evidence)) {
    issues.push(`${path}.evidence must be an array`);
    return;
  }
  for (const [index, evidence] of signal.evidence.entries()) {
    requireNonEmpty(evidence, `${path}.evidence[${index}]`, issues);
  }
}

function validateMetrics(metrics: ProjectMetrics): string[] {
  const issues: string[] = [];
  requireRepoId(metrics.projectId, "metrics.projectId", issues);
  requireNonNegativeInteger(metrics.stars30dDelta, "metrics.stars30dDelta", issues);
  requireNonNegativeInteger(metrics.commits30d, "metrics.commits30d", issues);
  requireNonNegativeInteger(metrics.releases180d, "metrics.releases180d", issues);
  requireNonNegativeInteger(metrics.contributors90d, "metrics.contributors90d", issues);
  requireScore(metrics.gitScore, "metrics.gitScore", issues);
  requireScore(metrics.maintenanceScore, "metrics.maintenanceScore", issues);
  requireNullableNonNegative(metrics.issueFirstResponseMedianHours, "metrics.issueFirstResponseMedianHours", issues);
  requireNullableNonNegative(metrics.recentPushDays, "metrics.recentPushDays", issues);
  requireIsoDate(metrics.calculatedAt, "metrics.calculatedAt", issues);
  return issues;
}

function validateCrossReferences(knowledge: ProjectKnowledge): string[] {
  const issues: string[] = [];
  if (knowledge.project.id !== knowledge.agentCard.projectId) {
    issues.push("project.id must match agentCard.projectId");
  }
  if (knowledge.project.id !== knowledge.metrics.projectId) {
    issues.push("project.id must match metrics.projectId");
  }
  return issues;
}

function requireRepoId(value: string, path: string, issues: string[]): void {
  if (!/^[^/\s]+\/[^/\s]+$/.test(value)) {
    issues.push(`${path} must be a GitHub owner/name id`);
  }
}

function requireNonEmpty(value: string | null | undefined, path: string, issues: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${path} must be a non-empty string`);
  }
}

function requireNonNegativeInteger(value: number, path: string, issues: string[]): void {
  if (!Number.isInteger(value) || value < 0) {
    issues.push(`${path} must be a non-negative integer`);
  }
}

function requireNullableNonNegative(value: number | null, path: string, issues: string[]): void {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    issues.push(`${path} must be null or a non-negative number`);
  }
}

function requireScore(value: number, path: string, issues: string[]): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    issues.push(`${path} must be an integer from 0 to 100`);
  }
}

function requireIsoDate(value: string, path: string, issues: string[]): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    issues.push(`${path} must be an ISO date string`);
  }
}
