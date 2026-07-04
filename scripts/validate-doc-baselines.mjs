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

const evalQuality = await readFile(new URL("../docs/EVAL_QUALITY.md", import.meta.url), "utf8");
const evalExplanations = await readFile(new URL("../docs/EVAL_EXPLANATIONS.md", import.meta.url), "utf8");
const benchmarkSource = await readFile(new URL("../src/benchmark.ts", import.meta.url), "utf8");

assertBenchmarkNumber("evaluationBenchmark.evaluatedCases", /Evaluated cases: (\d+)/, /evaluatedCases: (\d+)/, evalQuality, benchmarkSource);
assertBenchmarkNumber("evaluationBenchmark.top1HitRate", /Top-1 hit rate: ([0-9.]+)/, /top1HitRate: ([0-9.]+)/, evalQuality, benchmarkSource);
assertBenchmarkNumber("evaluationBenchmark.top3HitRate", /Top-3 hit rate: ([0-9.]+)/, /top3HitRate: ([0-9.]+)/, evalQuality, benchmarkSource);
assertBenchmarkNumber("evaluationBenchmark.categoryAccuracy", /Category accuracy: ([0-9.]+)/, /categoryAccuracy: ([0-9.]+)/, evalQuality, benchmarkSource);
assertBenchmarkNumber("evaluationBenchmark.deploymentAccuracy", /Deployment accuracy: ([0-9.]+)/, /deploymentAccuracy: ([0-9.]+)/, evalQuality, benchmarkSource);
assertBenchmarkNumber("explanationBenchmark.checks", /Checks: (\d+)/, /checks: (\d+)/, evalExplanations, benchmarkSource);
assertBenchmarkNumber("explanationBenchmark.passed", /Passed: (\d+)/, /passed: (\d+)/, evalExplanations, benchmarkSource);
assertBenchmarkNumber("explanationBenchmark.failed", /Failed: (\d+)/, /failed: (\d+)/, evalExplanations, benchmarkSource);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Validated generated-report baseline references in project docs.");

function assertBenchmarkNumber(label, reportPattern, sourcePattern, reportContent, sourceContent) {
  const reportValue = matchNumber(reportPattern, reportContent);
  const sourceValue = matchNumber(sourcePattern, sourceContent);
  if (reportValue !== sourceValue) {
    failures.push(`${label} in src/benchmark.ts (${sourceValue}) does not match generated eval report (${reportValue}).`);
  }
}

function matchNumber(pattern, content) {
  const match = content.match(pattern);
  return match ? Number(match[1]) : Number.NaN;
}
