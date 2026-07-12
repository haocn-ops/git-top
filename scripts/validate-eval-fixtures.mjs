import { readFile, writeFile } from "node:fs/promises";
import { reviewedCollectionPolicyIds, reviewedSeedCollectionPolicyIds } from "../src/collection-policy.ts";
import { categoryHints } from "./seed-category-hints.mjs";
import {
  buildGeneratedKnowledgeFixturesForSeed,
  generatedKnowledgeFixtures,
  generatedKnowledgeNow
} from "./eval-fixtures.mjs";

const seedPath = new URL("../data/seed-repositories.json", import.meta.url);
const outputPath = new URL("../docs/EVAL_FIXTURE_HEALTH.md", import.meta.url);
const seedRepositories = JSON.parse(await readFile(seedPath, "utf8"));
const fixtureResults = buildGeneratedKnowledgeFixturesForSeed(seedRepositories, generatedKnowledgeNow);
const seedIds = new Set(seedRepositories.map((repository) => repository.toLowerCase()));
const handAuthoredIds = generatedKnowledgeFixtures.map((fixture) => fixture.repo.full_name.toLowerCase());
const generatedIds = fixtureResults.map(({ knowledge }) => knowledge.project.id.toLowerCase());
const duplicateHandAuthoredIds = duplicates(handAuthoredIds);
const duplicateGeneratedIds = duplicates(generatedIds);
const missingSeedIds = [...seedIds].filter((id) => !generatedIds.includes(id));
const categoryCounts = Object.fromEntries(Object.keys(categoryHints).map((category) => [category, 0]));
const handAuthoredFixtureIds = new Set(handAuthoredIds);
const handAuthoredExpectedMismatches = [];
const generatedExpectedDrift = [];
const collectionIds = fixtureResults
  .filter(({ knowledge }) => knowledge.agentCard.projectKind === "collection")
  .map(({ knowledge }) => knowledge.project.id.toLowerCase())
  .sort();
const collectionIdSet = new Set(collectionIds);
const reviewedCollectionIds = reviewedCollectionPolicyIds();
const reviewedCollectionIdSet = new Set(reviewedCollectionIds);
const reviewedCollectionPolicyDrift = reviewedSeedCollectionPolicyIds().filter((id) => !collectionIdSet.has(id));
const unreviewedCollectionIds = collectionIds.filter((id) => !reviewedCollectionIdSet.has(id));
const lowConfidenceCount = fixtureResults.reduce(
  (count, { knowledge }) =>
    count +
    Object.values(knowledge.agentCard.classification ?? {}).filter((signal) => signal?.confidence === "low").length,
  0
);

for (const { fixture, knowledge } of fixtureResults) {
  const category = knowledge.agentCard.category;
  if (categoryCounts[category] !== undefined) {
    categoryCounts[category] += 1;
  }
  const driftTarget = handAuthoredFixtureIds.has(knowledge.project.id.toLowerCase())
    ? handAuthoredExpectedMismatches
    : generatedExpectedDrift;
  if (fixture.expected?.category && category !== fixture.expected.category) {
    driftTarget.push(`${knowledge.project.id}: expected category ${fixture.expected.category}, got ${category}`);
  }
  if (
    typeof fixture.expected?.cloudflareReady === "boolean" &&
    knowledge.agentCard.cloudflareReady !== fixture.expected.cloudflareReady
  ) {
    driftTarget.push(
      `${knowledge.project.id}: expected cloudflareReady ${fixture.expected.cloudflareReady}, got ${knowledge.agentCard.cloudflareReady}`
    );
  }
  for (const deployment of fixture.expected?.deployments ?? []) {
    if (!knowledge.agentCard.deployment.includes(deployment)) {
      driftTarget.push(`${knowledge.project.id}: expected deployment ${deployment}`);
    }
  }
}

const missingCategories = Object.entries(categoryCounts)
  .filter(([, count]) => count === 0)
  .map(([category]) => category);
const failures = [
  ...duplicateHandAuthoredIds.map((id) => `Duplicate hand-authored fixture: ${id}`),
  ...duplicateGeneratedIds.map((id) => `Duplicate generated fixture: ${id}`),
  ...missingSeedIds.map((id) => `Missing generated fixture for seed repository: ${id}`),
  ...missingCategories.map((category) => `No generated fixture coverage for category: ${category}`),
  ...reviewedCollectionPolicyDrift.map((id) => `Reviewed collection policy no longer matches a generated collection: ${id}`),
  ...unreviewedCollectionIds.map((id) => `Generated collection fixture is missing reviewed collection policy: ${id}`),
  ...handAuthoredExpectedMismatches,
  ...generatedExpectedDrift
];

await writeFile(outputPath, `${toMarkdown()}\n`);

console.log(
  JSON.stringify(
    {
      output: "docs/EVAL_FIXTURE_HEALTH.md",
      hand_authored_fixtures: generatedKnowledgeFixtures.length,
      seed_repositories: seedRepositories.length,
      generated_fixtures: fixtureResults.length,
      collection_fixtures: collectionIds.length,
      reviewed_collection_policy_items: reviewedCollectionIds.length,
      reviewed_collection_policy_drift: reviewedCollectionPolicyDrift.length,
      unreviewed_collection_fixtures: unreviewedCollectionIds.length,
      low_confidence_signals: lowConfidenceCount,
      missing_seed_fixtures: missingSeedIds.length,
      duplicate_hand_authored_fixtures: duplicateHandAuthoredIds.length,
      duplicate_generated_fixtures: duplicateGeneratedIds.length,
      missing_categories: missingCategories,
      hand_authored_expected_mismatches: handAuthoredExpectedMismatches.length,
      generated_expected_drift: generatedExpectedDrift.length
    },
    null,
    2
  )
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

function toMarkdown() {
  const generatedAt = new Date().toISOString();
  const categoryRows = Object.entries(categoryCounts).map(([category, count]) => `| \`${category}\` | ${count} |`);
  const failureRows = failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["None."];
  return [
    "# Git.Top Eval Fixture Health",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "This report validates the generated evaluation fixture corpus before ranking, classification, or fixture-structure changes.",
    "",
    "## Summary",
    "",
    `- Hand-authored fixtures: ${generatedKnowledgeFixtures.length}`,
    `- Seed repositories: ${seedRepositories.length}`,
    `- Generated fixtures: ${fixtureResults.length}`,
    `- Collection fixtures: ${collectionIds.length}`,
    `- Reviewed collection policy items: ${reviewedCollectionIds.length}`,
    `- Reviewed collection policy drift: ${reviewedCollectionPolicyDrift.length}`,
    `- Unreviewed collection fixtures: ${unreviewedCollectionIds.length}`,
    `- Low-confidence classification signals: ${lowConfidenceCount}`,
    `- Missing seed fixtures: ${missingSeedIds.length}`,
    `- Duplicate hand-authored fixtures: ${duplicateHandAuthoredIds.length}`,
    `- Duplicate generated fixtures: ${duplicateGeneratedIds.length}`,
    `- Missing categories: ${missingCategories.length > 0 ? missingCategories.join(", ") : "none"}`,
    `- Hand-authored expected metadata mismatches: ${handAuthoredExpectedMismatches.length}`,
    `- Generated expected metadata drift: ${generatedExpectedDrift.length}`,
    "",
    "## Category Distribution",
    "",
    "| Category | Generated Fixture Count |",
    "| --- | ---: |",
    ...categoryRows,
    "",
    "## Validation Failures",
    "",
    ...failureRows,
    "",
    "## Generated Expected Metadata Drift",
    "",
    ...(generatedExpectedDrift.length > 0 ? generatedExpectedDrift.map((item) => `- ${item}`) : ["None."]),
    "",
    "## Collection Policy Drift",
    "",
    ...(reviewedCollectionPolicyDrift.length > 0
      ? reviewedCollectionPolicyDrift.map((id) => `- ${id}`)
      : ["No reviewed collection policy drift."]),
    "",
    "## Unreviewed Collection Fixtures",
    "",
    ...(unreviewedCollectionIds.length > 0 ? unreviewedCollectionIds.map((id) => `- ${id}`) : ["None."]),
    "",
    "## Maintenance Notes",
    "",
    "- Keep this report passing before further fixture module splits.",
    "- Keep reviewed collection policy entries aligned with generated collection fixtures.",
    "- Add targeted hand-authored fixtures when category inference needs regression coverage.",
    "- Add eval cases when fixture changes alter ranking or recommendation behavior."
  ].join("\n");
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated].sort();
}
