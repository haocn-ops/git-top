import { readFile, writeFile } from "node:fs/promises";
import { categoryHints, inferSeedCategory } from "./seed-category-hints.mjs";

const seedPath = new URL("../data/seed-repositories.json", import.meta.url);
const outputPath = new URL("../docs/DATA_COVERAGE.md", import.meta.url);
const repositories = JSON.parse(await readFile(seedPath, "utf8"));

const categoryCounts = Object.fromEntries(Object.keys(categoryHints).map((category) => [category, 0]));
const uncategorized = [];

for (const repository of repositories) {
  const category = inferCategory(repository);
  if (category) {
    categoryCounts[category] += 1;
  } else {
    uncategorized.push(repository);
  }
}

const missingCategories = Object.entries(categoryCounts)
  .filter(([, count]) => count === 0)
  .map(([category]) => category);
const nextExpansionTarget =
  repositories.length >= 300 ? "Grow the seed list toward 500 repositories." : "Grow the seed list to at least 300 repositories.";
const generatedAt = new Date().toISOString();
const markdown = [
  "# Git.Top Data Coverage",
  "",
  `Generated at: ${generatedAt}`,
  "",
  "This report summarizes the curated seed repository list. It is a heuristic coverage report, not a replacement for live GitHub sync or generated Agent Card classification.",
  "",
  "## Summary",
  "",
  `- Seed repositories: ${repositories.length}`,
  `- Heuristically covered categories: ${Object.values(categoryCounts).filter((count) => count > 0).length}/${Object.keys(categoryCounts).length}`,
  `- Missing categories: ${missingCategories.length > 0 ? missingCategories.join(", ") : "none"}`,
  `- Uncategorized repositories: ${uncategorized.length}`,
  "",
  "## Category Coverage",
  "",
  "| Category | Repository Count |",
  "| --- | ---: |",
  ...Object.entries(categoryCounts).map(([category, count]) => `| \`${category}\` | ${count} |`),
  "",
  "## Uncategorized Repositories",
  "",
  ...(uncategorized.length > 0 ? uncategorized.map((repository) => `- \`${repository}\``) : ["None."]),
  "",
  "## Next Expansion Targets",
  "",
  `- ${nextExpansionTarget}`,
  "- Keep every V1 category represented.",
  "- Add eval cases when adding meaningfully new categories or project types.",
  "- Use live sync failures to remove archived, renamed, or unavailable repositories."
].join("\n");

await writeFile(outputPath, `${markdown}\n`);

console.log(JSON.stringify({ repositories: repositories.length, categoryCounts, missingCategories, uncategorized }, null, 2));

if (missingCategories.length > 0) {
  console.error(`Seed coverage is missing categories: ${missingCategories.join(", ")}`);
  process.exit(1);
}

function inferCategory(repository) {
  return inferSeedCategory(repository);
}
