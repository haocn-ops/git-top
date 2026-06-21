import { readFile, writeFile } from "node:fs/promises";

const seedPath = new URL("../data/seed-repositories.json", import.meta.url);
const outputPath = new URL("../docs/SEED_LIVE_CHECK.md", import.meta.url);
const repositories = JSON.parse(await readFile(seedPath, "utf8"));
const options = parseArgs(process.argv.slice(2));
const selectedRepositories = repositories.slice(options.offset, options.offset + options.limit);
const checkedAt = new Date().toISOString();
const results = [];
let stoppedEarly = false;

for (const repository of selectedRepositories) {
  const result = await checkRepository(repository);
  results.push(result);
  if (result.rateLimitRemaining === "0") {
    stoppedEarly = true;
    break;
  }
}

const summary = summarize(results);
const nextOffset = options.offset + results.length;
await writeReport({ checkedAt, options, results, summary, stoppedEarly, nextOffset });

console.log(JSON.stringify({ checkedAt, ...summary, stoppedEarly, nextOffset }, null, 2));

if (
  summary.missing > 0 ||
  summary.renamed > 0 ||
  (options.failOnArchived && summary.archived > 0) ||
  (options.failOnError && summary.error > 0)
) {
  process.exit(1);
}

async function checkRepository(repository) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      redirect: "follow",
      headers: requestHeaders()
    });

    if (response.status === 404) {
      return { repository, status: "missing" };
    }

    if (!response.ok) {
      return {
        repository,
        status: "error",
        error: `GitHub API ${response.status}`,
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
        rateLimitReset: resetTime(response.headers.get("x-ratelimit-reset"))
      };
    }

    const payload = await response.json();
    const fullName = String(payload.full_name ?? repository);
    return {
      repository,
      status: payload.archived ? "archived" : fullName.toLowerCase() === repository.toLowerCase() ? "ok" : "renamed",
      canonical: fullName,
      archived: Boolean(payload.archived),
      private: Boolean(payload.private),
      disabled: Boolean(payload.disabled),
      pushedAt: typeof payload.pushed_at === "string" ? payload.pushed_at : null,
      stars: typeof payload.stargazers_count === "number" ? payload.stargazers_count : null,
      description: typeof payload.description === "string" ? payload.description : null
    };
  } catch (error) {
    return { repository, status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function requestHeaders() {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "git-top-seed-live-check"
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

function summarize(items) {
  return {
    checked: items.length,
    ok: items.filter((item) => item.status === "ok").length,
    renamed: items.filter((item) => item.status === "renamed").length,
    archived: items.filter((item) => item.status === "archived").length,
    missing: items.filter((item) => item.status === "missing").length,
    error: items.filter((item) => item.status === "error").length
  };
}

async function writeReport({ checkedAt, options, results, summary, stoppedEarly, nextOffset }) {
  const rows = results.map((item) =>
    [
      `\`${item.repository}\``,
      item.status,
      item.canonical ? `\`${item.canonical}\`` : "",
      item.stars ?? "",
      item.pushedAt ?? "",
      errorDetails(item)
    ].join(" | ")
  );

  const markdown = [
    "# Git.Top Seed Live Check",
    "",
    `Checked at: ${checkedAt}`,
    "",
    "This report checks seed repositories against the live GitHub API. It is network-dependent and is not part of the default offline validation gate.",
    "",
    "For full-list checks, set `GITHUB_TOKEN` to avoid unauthenticated GitHub API rate limits.",
    "",
    "## Summary",
    "",
    `- Offset: ${options.offset}`,
    `- Limit: ${options.limit}`,
    `- Checked: ${summary.checked}`,
    `- OK: ${summary.ok}`,
    `- Renamed: ${summary.renamed}`,
    `- Archived: ${summary.archived}`,
    `- Missing: ${summary.missing}`,
    `- Error: ${summary.error}`,
    `- Stopped early: ${stoppedEarly ? "yes" : "no"}`,
    `- Next offset: ${nextOffset}`,
    "",
    "## Results",
    "",
    "Repository | Status | Canonical | Stars | Pushed At | Error",
    "--- | --- | --- | ---: | --- | ---",
    ...rows
  ].join("\n");

  await writeFile(outputPath, `${markdown}\n`);
}

function parseArgs(args) {
  const options = {
    limit: repositories.length,
    offset: 0,
    failOnArchived: false,
    failOnError: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--limit") {
      options.limit = positiveInteger(args[index + 1], "limit");
      index += 1;
    } else if (arg === "--offset") {
      options.offset = nonNegativeInteger(args[index + 1], "offset");
      index += 1;
    } else if (arg === "--fail-on-archived") {
      options.failOnArchived = true;
    } else if (arg === "--fail-on-error") {
      options.failOnError = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    ...options,
    limit: Math.min(options.limit, repositories.length - options.offset)
  };
}

function errorDetails(item) {
  const parts = [];
  if (item.error) {
    parts.push(item.error);
  }
  if (item.rateLimitRemaining !== undefined && item.rateLimitRemaining !== null) {
    parts.push(`remaining=${item.rateLimitRemaining}`);
  }
  if (item.rateLimitReset) {
    parts.push(`reset=${item.rateLimitReset}`);
  }
  return parts.join("; ");
}

function resetTime(value) {
  if (!value) {
    return null;
  }
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp * 1000).toISOString();
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${label} must be a positive integer.`);
  }
  return parsed;
}

function nonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`--${label} must be a non-negative integer.`);
  }
  return parsed;
}
