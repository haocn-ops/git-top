const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.baseUrl ?? process.env.GIT_TOP_QUALITY_BASE_URL ?? "https://git.top");
const target = options.target ?? `${baseUrl}/api/quality`;
const minScore = Number(options.minScore ?? process.env.MIN_QUALITY_SCORE ?? 90);
const allowSeed = options.allowSeed === true || process.env.GIT_TOP_QUALITY_ALLOW_SEED === "1";

let response;
try {
  response = await fetch(target, {
    headers: {
      accept: "application/json"
    }
  });
} catch (error) {
  console.error(`Quality endpoint request failed for ${target}: ${formatError(error)}`);
  process.exit(1);
}

if (!response.ok) {
  console.error(`Quality endpoint failed with HTTP ${response.status}`);
  process.exit(1);
}

const report = await response.json();
const releaseScore = report.release_score ?? report.score;
const summary = {
  target,
  score: report.score,
  release_score: releaseScore,
  data_trust_score: report.data_trust_score,
  project_count: report.project_count,
  issue_count: report.issue_count,
  error_count: report.error_count,
  warning_count: report.warning_count,
  risk_level: report.risk_level,
  risk_reason_count: Array.isArray(report.risk_summary?.reasons) ? report.risk_summary.reasons.length : undefined,
  source: report.metadata?.source,
  reason: report.metadata?.reason
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

if (!report.metadata || typeof report.metadata !== "object") {
  console.error("Quality check failed: metadata is missing.");
  process.exit(1);
}

if (allowSeed) {
  if (!["d1", "seed"].includes(report.metadata.source)) {
    console.error(`Quality check failed: unexpected metadata source ${report.metadata.source}.`);
    process.exit(1);
  }
} else if (report.metadata.source !== "d1") {
  console.error("Quality check failed: expected D1-backed metadata; pass --allow-seed for intentional seed fallback checks.");
  process.exit(1);
}

if (releaseScore < minScore) {
  console.error(`Quality check failed: release score ${releaseScore} < ${minScore}.`);
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--base-url") {
      parsed.baseUrl = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--target") {
      parsed.target = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--target=")) {
      parsed.target = arg.slice("--target=".length);
    } else if (arg === "--min-score") {
      parsed.minScore = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--min-score=")) {
      parsed.minScore = arg.slice("--min-score=".length);
    } else if (arg === "--allow-seed") {
      parsed.allowSeed = true;
    } else if (!arg.startsWith("--") && !parsed.target) {
      parsed.target = arg;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/g, "");
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
