import { readFile } from "node:fs/promises";
import { buildEvaluationContext, runEvalCases, summarizeEvalResults, writeEvalReport } from "./eval-lib.mjs";
import { seedProjects } from "../src/seed.ts";

const evalCases = JSON.parse(await readFile(new URL("../data/eval-cases.json", import.meta.url), "utf8"));
const reportPath = new URL("../docs/EVAL_QUALITY.md", import.meta.url);
const {
  evaluationProjects,
  generatedEvaluationProjects,
  d1FixtureProjects,
  effectiveGeneratedFixtureCount
} = await buildEvaluationContext();
const results = runEvalCases(evalCases, evaluationProjects);
const summary = summarizeEvalResults(results);
const report = {
  ...summary,
  generated_fixture_projects: generatedEvaluationProjects.length,
  d1_fixture_projects: d1FixtureProjects.length,
  effective_generated_fixture_projects: effectiveGeneratedFixtureCount,
  synthetic_projects: evaluationProjects.length - seedProjects.length - effectiveGeneratedFixtureCount,
  cases: results
};

await writeEvalReport(report, {
  outputPath: reportPath,
  title: "Git.Top Eval Quality",
  description:
    "This report summarizes the CI-safe recommendation and classification baseline. Evaluation knowledge is built from hand-authored seed projects first, generated Agent Card fixtures second, and synthetic seed metadata last."
});

console.log(JSON.stringify(report, null, 2));

if (summary.top3_hit_rate < 0.8 || summary.category_accuracy < 0.8 || summary.deployment_accuracy < 0.8 || summary.unacceptable_hit_count > 0) {
  throw new Error(
    `Eval quality below threshold: top3=${summary.top3_hit_rate}, category=${summary.category_accuracy}, deployment=${summary.deployment_accuracy}, unacceptable=${summary.unacceptable_hit_count}`
  );
}
