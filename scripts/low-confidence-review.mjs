import { writeFile } from "node:fs/promises";
import { listProjectKnowledgeWithMeta } from "../src/db.ts";
import { buildLowConfidenceReviewReport } from "../src/quality.ts";
import { seedProjects } from "../src/seed.ts";
import { buildGeneratedKnowledgeFixtures } from "./eval-fixtures.mjs";
import { mockD1Env } from "./mock-d1.mjs";

const outputPath = new URL("../docs/LOW_CONFIDENCE_REVIEW.md", import.meta.url);
const generatedProjects = buildGeneratedKnowledgeFixtures().map((item) => item.knowledge);
const d1Projects = (await listProjectKnowledgeWithMeta(mockD1Env({ knowledge: generatedProjects }))).projects;
const projects = mergeKnowledge([...d1Projects, ...seedProjects]);
const report = buildLowConfidenceReviewReport(projects);

await writeFile(outputPath, `${toMarkdown(report)}\n`);

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

function toMarkdown(report) {
  const generatedAt = new Date().toISOString();
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
