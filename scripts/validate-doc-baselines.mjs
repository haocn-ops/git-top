import { readFile } from "node:fs/promises";

const staleBaselinePatterns = [
  {
    file: "docs/NEXT_STAGE_PLAN.md",
    patterns: [
      "generated fixture projects 506",
      "D1 fixture projects 506",
      "24 projects needing review",
      "19 low-confidence signals",
      "46 medium-confidence signals",
      "top-1 hit rate 0.739",
      "top-3 hit rate 0.783",
      "current best offline candidate"
    ]
  },
  {
    file: "docs/QUALITY_AND_HEALTH_IMPROVEMENT_PLAN.md",
    patterns: ["current best offline candidate"]
  },
  {
    file: "docs/QUALITY_HARDENING_PLAN.md",
    patterns: ["Top-1 hit rate: `0.739`", "Top-3 hit rate: `0.783`"]
  }
];

const failures = [];

for (const { file, patterns } of staleBaselinePatterns) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      failures.push(`${file} still contains stale baseline text: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Validated generated-report baseline references in project docs.");
