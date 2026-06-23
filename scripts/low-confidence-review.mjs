import { readFile, writeFile } from "node:fs/promises";
import { isReviewedCollection, reviewedCollectionPolicy } from "../src/collection-policy.ts";
import { listProjectKnowledgeWithMeta } from "../src/knowledge-source.ts";
import { buildLowConfidenceReviewReport } from "../src/quality.ts";
import { seedProjects } from "../src/seed.ts";
import { buildGeneratedKnowledgeFixturesForSeed } from "./eval-fixtures.mjs";
import { mockD1Env } from "./mock-d1.mjs";

const outputPath = new URL("../docs/LOW_CONFIDENCE_REVIEW.md", import.meta.url);
const seedRepositories = JSON.parse(await readFile(new URL("../data/seed-repositories.json", import.meta.url), "utf8"));
const generatedProjects = buildGeneratedKnowledgeFixturesForSeed(seedRepositories).map((item) => item.knowledge);
const d1Projects = (await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: generatedProjects }))).projects;
const projects = mergeKnowledge([...d1Projects, ...seedProjects]);
const report = buildLowConfidenceReviewReport(projects);

await writeFile(outputPath, `${toMarkdown(report, projects)}\n`);

console.log(
  JSON.stringify(
    {
      output: "docs/LOW_CONFIDENCE_REVIEW.md",
      project_count: report.projectCount,
      review_count: report.reviewCount,
      low_signal_count: report.lowSignalCount,
      medium_signal_count: report.mediumSignalCount
    },
    null,
    2
  )
);

function mergeKnowledge(items) {
  const byId = new Map();
  for (const item of items) {
    byId.set(item.project.id.toLowerCase(), item);
  }
  return Array.from(byId.values()).sort((a, b) => a.project.id.localeCompare(b.project.id));
}

function toMarkdown(report, projects) {
  const generatedAt = new Date().toISOString();
  const projectIndex = new Map(projects.map((item) => [item.project.id, item]));
  const checklistItems = buildReleaseChecklist(report, projectIndex);
  const priorityCounts = buildPriorityCounts(report);
  const collectionSummary = buildCollectionSummary(projects);
  const reviewedCollectionRows = buildReviewedCollectionRows(projects);
  const categoryRows = Object.entries(report.categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `| \`${category}\` | ${count} |`);
  const itemRows = report.items.flatMap((item) => [
    `### \`${item.projectId}\``,
    "",
    `- Category: \`${item.category}\``,
    `- Reasons: ${item.reasons.length > 0 ? item.reasons.join(" ") : "No extra reason."}`,
    `- Suggested action: ${item.suggestedAction}`,
    "",
    "| Field | Confidence | Evidence |",
    "| --- | --- | --- |",
    ...item.classificationSignals.map((signal) =>
      `| \`${signal.field}\` | ${signal.confidence} | ${signal.evidence.map(escapeCell).join("<br>")} |`
    ),
    ""
  ]);

  return [
    "# Git.Top Low-Confidence Review",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "This report lists generated Agent Card classifications that need manual review before Git.Top scales further. It focuses on low and medium classification confidence, collection semantics, Cloudflare readiness ambiguity, and incomplete quality signals.",
    "",
    "## Summary",
    "",
    `- Projects reviewed: ${report.projectCount}`,
    `- Projects needing review: ${report.reviewCount}`,
    `- Low-confidence signals: ${report.lowSignalCount}`,
    `- Medium-confidence signals: ${report.mediumSignalCount}`,
    `- P0 review items: ${priorityCounts.P0}`,
    `- P1 review items: ${priorityCounts.P1}`,
    `- P2 review items: ${priorityCounts.P2}`,
    `- P3 review items: ${priorityCounts.P3}`,
    "",
    "## Release Candidate Checklist",
    "",
    "Review these items before a release when changing classification, ranking, seed data, or generated Agent Card logic.",
    "",
    "| Priority | Project | Category | Stars | Why | Action |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...(checklistItems.length > 0 ? checklistItems : ["| none | none | none | 0 | No release-blocking review items. | none |"]),
    "",
    "## Collection Review Summary",
    "",
    "Collection-style repositories are useful for discovery, but should be reviewed separately from executable projects.",
    "",
    `- Collection-style checklist items: ${collectionSummary.checklistTotal}`,
    `- Reviewed collection policy items: ${collectionSummary.reviewed}`,
    `- Collection metadata exception items: ${collectionSummary.total}`,
    `- Stale collection metadata exception items: ${collectionSummary.stale}`,
    `- Collection metadata exception items with unknown freshness: ${collectionSummary.unknown}`,
    "",
    "| Scope | Review Count |",
    "| --- | ---: |",
    ...collectionSummary.scopeRows,
    "",
    "## Reviewed Collection Policy",
    "",
    "| Project | Category | Scope | Reviewed At | Policy |",
    "| --- | --- | --- | --- | --- |",
    ...reviewedCollectionRows,
    "",
    "## Correction Loop",
    "",
    "1. Inspect the project README, topics, and repository metadata.",
    "2. If the generated classification is wrong for one project, write a protected classification override instead of changing global heuristics.",
    "3. If multiple projects fail for the same reason, add or adjust classification hints and add an eval case.",
    "4. Re-run `pnpm quality:review`, `pnpm eval:quality`, and `pnpm test:focused` before release.",
    "",
    "## Review Count By Category",
    "",
    "| Category | Review Count |",
    "| --- | ---: |",
    ...(categoryRows.length > 0 ? categoryRows : ["| none | 0 |"]),
    "",
    "## Review Items",
    "",
    ...(itemRows.length > 0 ? itemRows : ["No low-confidence review items."])
  ].join("\n");
}

function escapeCell(value) {
  return value.replaceAll("|", "\\|");
}

function buildReleaseChecklist(report, projectIndex) {
  return report.items.slice().sort((a, b) => {
    const priority = priorityRank(reviewPriority(a)) - priorityRank(reviewPriority(b));
    if (priority !== 0) {
      return priority;
    }
    const aStars = projectIndex.get(a.projectId)?.project.stars ?? 0;
    const bStars = projectIndex.get(b.projectId)?.project.stars ?? 0;
    return bStars - aStars || a.projectId.localeCompare(b.projectId);
  }).slice(0, 15).map((item) => {
    const priority = reviewPriority(item);
    const stars = projectIndex.get(item.projectId)?.project.stars ?? 0;
    return [
      priority,
      `\`${item.projectId}\``,
      `\`${item.category}\``,
      stars,
      escapeCell(item.reasons.join(" ")),
      escapeCell(item.suggestedAction)
    ].join(" | ");
  }).map((row) => `| ${row} |`);
}

function buildPriorityCounts(report) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const item of report.items) {
    counts[reviewPriority(item)] += 1;
  }
  return counts;
}

function buildCollectionSummary(projects) {
  const collectionChecklistItems = reportCollectionItems(projects);
  const collectionItems = projects.filter((item) => item.agentCard.projectKind === "collection" && needsCollectionReview(item));
  const reviewedItems = projects.filter(isReviewedCollection);
  const scopeCounts = new Map();

  for (const item of collectionItems) {
    const scope = item.agentCard.collectionMetadata?.scope ?? "unknown";
    scopeCounts.set(scope, (scopeCounts.get(scope) ?? 0) + 1);
  }

  const scopeRows = Array.from(scopeCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([scope, count]) => `| \`${scope}\` | ${count} |`);

  return {
    checklistTotal: collectionChecklistItems.length,
    reviewed: reviewedItems.length,
    total: collectionItems.length,
    stale: collectionItems.filter((item) => item.agentCard.collectionMetadata?.freshness === "stale").length,
    unknown: collectionItems.filter((item) => !item.agentCard.collectionMetadata || item.agentCard.collectionMetadata.freshness === "unknown").length,
    scopeRows: scopeRows.length > 0 ? scopeRows : ["| none | 0 |"]
  };
}

function buildReviewedCollectionRows(projects) {
  const rows = projects
    .filter(isReviewedCollection)
    .sort((a, b) => a.project.id.localeCompare(b.project.id))
    .map((item) => {
      const policy = reviewedCollectionPolicy(item.project.id);
      return [
        `\`${item.project.id}\``,
        `\`${item.agentCard.category}\``,
        `\`${item.agentCard.collectionMetadata?.scope ?? "unknown"}\``,
        policy?.reviewedAt ?? "unknown",
        escapeCell(policy?.use ?? "Reviewed collection.")
      ].join(" | ");
    })
    .map((row) => `| ${row} |`);

  return rows.length > 0 ? rows : ["| none | none | none | none | none |"];
}

function reportCollectionItems(projects) {
  return projects.filter((item) => item.agentCard.projectKind === "collection");
}

function reviewPriority(item) {
  if (item.reasons.some((reason) => reason.includes("low-confidence")) || item.category === "other") {
    return "P0";
  }
  if (item.reasons.some((reason) => reason.includes("Cloudflare-ready") || reason.includes("Quality metrics"))) {
    return "P1";
  }
  if (item.reasons.some((reason) => reason.includes("collection"))) {
    return "P2";
  }
  return "P3";
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function needsCollectionReview(item) {
  if (reviewedCollectionPolicy(item.project.id)) {
    return false;
  }
  const metadata = item.agentCard.collectionMetadata;
  return !metadata || !metadata.curated || metadata.estimatedItems === null || metadata.freshness !== "active";
}
