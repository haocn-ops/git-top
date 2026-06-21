import { generateAgentCard } from "../src/cards.ts";
import { classifyRepository } from "../src/classification.ts";
import { seedProjects } from "../src/seed.ts";
import { validateProjectKnowledge } from "../src/validation.ts";
import { buildGeneratedKnowledgeFixtures, generatedKnowledgeFixtures, generatedKnowledgeNow } from "./eval-fixtures.mjs";

for (const project of seedProjects) {
  validateProjectKnowledge(project);
}

for (const fixture of generatedKnowledgeFixtures) {
  const classification = classifyRepository(fixture.repo, fixture.signals);
  assertEqual(classification.category, fixture.expected.category, `${fixture.repo.full_name} direct category`);
  assertEqual(classification.cloudflareReady, fixture.expected.cloudflareReady, `${fixture.repo.full_name} direct cloudflareReady`);
  for (const deployment of fixture.expected.deployments) {
    assertIncludes(classification.deployment, deployment, `${fixture.repo.full_name} direct deployment`);
  }
  assertClassificationEvidence(classification, fixture.repo.full_name);
  assertCloudflareEvidence(classification, fixture);

  const agentCard = generateAgentCard(fixture.repo, fixture.signals, generatedKnowledgeNow);
  assertEqual(agentCard.category, fixture.expected.category, `${fixture.repo.full_name} category`);
  assertEqual(agentCard.cloudflareReady, fixture.expected.cloudflareReady, `${fixture.repo.full_name} cloudflareReady`);
  if (agentCard.projectKind === "collection" && !agentCard.collectionMetadata) {
    throw new Error(`${fixture.repo.full_name} collection fixture missing collectionMetadata`);
  }
  if (fixture.expected.projectKind) {
    assertEqual(agentCard.projectKind, fixture.expected.projectKind, `${fixture.repo.full_name} projectKind`);
  }
  for (const deployment of fixture.expected.deployments) {
    assertIncludes(agentCard.deployment, deployment, `${fixture.repo.full_name} deployment`);
  }
  assertClassificationEvidence(agentCard, fixture.repo.full_name);
  assertCloudflareEvidence(agentCard, fixture);

}

for (const { knowledge } of buildGeneratedKnowledgeFixtures(generatedKnowledgeNow)) {
  validateProjectKnowledge(knowledge);
}

console.log(`Validated ${seedProjects.length} seed projects and ${generatedKnowledgeFixtures.length} generated knowledge fixtures.`);

function assertClassificationEvidence(subject, label) {
  for (const key of ["category", "deployment", "difficulty", "cloudflareReady"]) {
    const signal = subject.classification?.[key];
    if (!signal) {
      throw new Error(`${label} missing classification.${key}`);
    }
    if (!["high", "medium", "low"].includes(signal.confidence)) {
      throw new Error(`${label} classification.${key} has invalid confidence ${signal.confidence}`);
    }
    if (!Array.isArray(signal.evidence)) {
      throw new Error(`${label} classification.${key}.evidence must be an array`);
    }
  }
}

function assertCloudflareEvidence(subject, fixture) {
  if (!fixture.expected.deployments.includes("cloudflare")) {
    return;
  }
  const evidence = subject.classification?.cloudflareReady?.evidence ?? [];
  assertEvidenceIncludes(evidence, "Cloudflare signal:", `${fixture.repo.full_name} Cloudflare signal evidence`);
  if (fixture.expected.cloudflareReady) {
    assertEvidenceIncludes(evidence, "Runtime blocker: none detected.", `${fixture.repo.full_name} Cloudflare ready blocker evidence`);
  } else {
    assertEvidenceIncludes(evidence, "Runtime blocker:", `${fixture.repo.full_name} Cloudflare blocker evidence`);
  }
}

function assertEvidenceIncludes(evidence, expected, label) {
  if (!evidence.some((item) => item.includes(expected))) {
    throw new Error(`${label}: expected evidence to include ${expected}; got ${evidence.join(" | ")}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`${label}: expected ${values.join(", ")} to include ${expected}`);
  }
}
