const target = process.argv[2] ?? "https://git-top.izhenghaocn.workers.dev/api/quality";
const minScore = Number(process.env.MIN_QUALITY_SCORE ?? 60);

const response = await fetch(target, {
  headers: {
    accept: "application/json"
  }
});

if (!response.ok) {
  console.error(`Quality endpoint failed with HTTP ${response.status}`);
  process.exit(1);
}

const report = await response.json();
const summary = {
  score: report.score,
  project_count: report.project_count,
  issue_count: report.issue_count,
  error_count: report.error_count,
  warning_count: report.warning_count
};

console.log(JSON.stringify(summary, null, 2));

if (Array.isArray(report.issues) && report.issues.length > 0) {
  console.log("Top quality issues:");
  for (const issue of report.issues.slice(0, 10)) {
    console.log(`- [${issue.severity}] ${issue.project_id} ${issue.code}: ${issue.message}`);
  }
}

if (report.error_count > 0) {
  console.error(`Quality check failed: ${report.error_count} error issue(s).`);
  process.exit(1);
}

if (report.score < minScore) {
  console.error(`Quality check failed: score ${report.score} < ${minScore}.`);
  process.exit(1);
}
