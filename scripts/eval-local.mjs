import { buildEvaluationContext, buildLocalEvalCases, runEvalCases, summarizeEvalResults, writeEvalReport } from "./eval-lib.mjs";
import { seedProjects } from "../src/seed.ts";

const reportPath = new URL("../docs/EVAL_LOCAL.md", import.meta.url);
const {
  evaluationProjects,
  generatedEvaluationProjects,
  d1FixtureProjects,
  effectiveGeneratedFixtureCount
} = await buildEvaluationContext();
const evalCases = buildLocalEvalCases(evaluationProjects);
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
  title: "Git.Top Local Eval",
  description:
    "This local-only report expands the CI-safe eval with generated category and deployment probes across the full fixture-backed project set. It is intended for ranking review before heuristic changes, not as a strict CI gate."
});

console.log(
  JSON.stringify(
    {
      output: "docs/EVAL_LOCAL.md",
      ...report
    },
    null,
    2
  )
);

if (summary.top3_hit_rate < 0.7 || summary.category_accuracy < 0.85 || summary.deployment_accuracy < 0.85 || summary.unacceptable_hit_count > 0) {
  throw new Error(
    `Local eval below threshold: top3=${summary.top3_hit_rate}, category=${summary.category_accuracy}, deployment=${summary.deployment_accuracy}, unacceptable=${summary.unacceptable_hit_count}`
  );
}
