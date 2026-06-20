import { readFile } from "node:fs/promises";

const seedPath = new URL("../data/seed-repositories.json", import.meta.url);
const repositories = JSON.parse(await readFile(seedPath, "utf8"));
const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const issues = [];

if (!Array.isArray(repositories)) {
  issues.push("Seed file must contain a JSON array.");
} else {
  const seen = new Set();

  for (const [index, repository] of repositories.entries()) {
    if (typeof repository !== "string") {
      issues.push(`Entry ${index} must be a string.`);
      continue;
    }

    if (!repoPattern.test(repository)) {
      issues.push(`Entry ${index} is not a GitHub owner/name repository: ${repository}`);
    }

    const normalized = repository.toLowerCase();
    if (seen.has(normalized)) {
      issues.push(`Duplicate repository: ${repository}`);
    }
    seen.add(normalized);
  }

  if (repositories.length < 50) {
    issues.push(`Expected at least 50 seed repositories, found ${repositories.length}.`);
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`Validated ${repositories.length} seed repositories.`);
