import { compactFixtures } from "./eval-fixture-core.mjs";
import { compactGeneratedKnowledgeFixtureInputs } from "./eval-fixture-compact.mjs";
import { explicitGeneratedKnowledgeFixtures } from "./eval-fixture-explicit.mjs";

export const generatedKnowledgeFixtures = [
  ...explicitGeneratedKnowledgeFixtures,
  ...compactFixtures(compactGeneratedKnowledgeFixtureInputs)
];
