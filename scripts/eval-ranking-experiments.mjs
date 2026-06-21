import { readFile, writeFile } from "node:fs/promises";
import {
  buildEvaluationContext,
  buildLocalEvalCases,
  runEvalCases,
  runEvalCasesWithSearch,
  summarizeEvalResults
} from "./eval-lib.mjs";
import { searchProjectList } from "../src/db.ts";

const genericIntentWords = new Set(["agent", "app", "apps", "cloud", "framework", "install", "library", "local", "open", "project", "server", "source", "tool", "tools"]);
const broadProbeWords = new Set([
  "agent",
  "automation",
  "benchmark",
  "browser",
  "calling",
  "compose",
  "context",
  "database",
  "deployment",
  "docker",
  "durable",
  "embedding",
  "framework",
  "gateway",
  "guardrails",
  "helm",
  "inference",
  "install",
  "kubernetes",
  "library",
  "local",
  "llm",
  "mcp",
  "model",
  "monitoring",
  "open",
  "orchestration",
  "package",
  "protocol",
  "proxy",
  "rag",
  "retrieval",
  "router",
  "runtime",
  "search",
  "server",
  "serverless",
  "serving",
  "starter",
  "structured",
  "template",
  "testing",
  "tool",
  "tools",
  "tracing",
  "vector",
  "vercel",
  "web",
  "workflow",
  "workers"
]);
const specificIntentStopWords = new Set([
  ...broadProbeWords,
  "api",
  "code",
  "docs",
  "example",
  "examples",
  "issue",
  "issues",
  "pull",
  "request",
  "requests",
  "repository",
  "repos"
]);
const reportPath = new URL("../docs/RANKING_EXPERIMENTS.md", import.meta.url);
const evalCases = JSON.parse(await readFile(new URL("../data/eval-cases.json", import.meta.url), "utf8"));
const { evaluationProjects } = await buildEvaluationContext();
const localCases = buildLocalEvalCases(evaluationProjects);

const experiments = [
  {
    id: "baseline",
    description: "Current runtime search ranking.",
    search: searchProjectList
  },
  {
    id: "scoped_quality",
    description: "Boost quality and maintenance inside explicit category/deployment scopes.",
    search: (projects, filters) => experimentalSearch(projects, filters, { scopedQuality: true })
  },
  {
    id: "exact_intent_guard",
    description: "Boost quality inside scopes while preserving exact project-name and owner intent.",
    search: (projects, filters) => experimentalSearch(projects, filters, { scopedQuality: true, exactIntentGuard: true })
  },
  {
    id: "broad_probe_quality",
    description: "Boost quality only for broad category/deployment queries, leaving specific intent queries on baseline ranking.",
    search: (projects, filters) => experimentalSearch(projects, filters, { broadProbeQuality: true })
  },
  {
    id: "broad_probe_blocker_aware",
    description: "Boost broad category/deployment queries and demote non-ready Cloudflare/serverless blocker examples.",
    search: (projects, filters) => experimentalSearch(projects, filters, { broadProbeQuality: true, blockerAware: true })
  },
  {
    id: "browse_mode_quality",
    description: "Boost quality only for broad browse-style queries with larger result limits.",
    search: (projects, filters) => experimentalSearch(projects, filters, { browseModeQuality: true })
  },
  {
    id: "browse_mode_blocker_aware",
    description: "Boost browse-style queries and demote non-ready Cloudflare/serverless blocker examples.",
    search: (projects, filters) => experimentalSearch(projects, filters, { browseModeQuality: true, blockerAware: true })
  },
  {
    id: "intent_aware_browse",
    description: "Boost browse-style queries while preserving specific owner/name/topic intent.",
    search: (projects, filters) => experimentalSearch(projects, filters, { browseModeQuality: true, specificIntent: true })
  }
];

const results = experiments.map((experiment) => {
  const qualityResults =
    experiment.id === "baseline" ? runEvalCases(evalCases, evaluationProjects) : runEvalCasesWithSearch(evalCases, evaluationProjects, experiment.search);
  const localResults =
    experiment.id === "baseline" ? runEvalCases(localCases, evaluationProjects) : runEvalCasesWithSearch(localCases, evaluationProjects, experiment.search);

  return {
    id: experiment.id,
    description: experiment.description,
    quality: summarizeEvalResults(qualityResults),
    local: summarizeEvalResults(localResults),
    qualityFocus: focusIds(qualityResults),
    localFocus: focusIds(localResults)
  };
});

await writeFile(reportPath, `${rankingMarkdown(results)}\n`);
console.log(JSON.stringify({ output: "docs/RANKING_EXPERIMENTS.md", experiments: results }, null, 2));

function experimentalSearch(projects, filters, strategy) {
  const limit = clampLimit(filters.limit);
  const query = normalize(filters.q);
  const words = queryTokens(query);
  const scoped = Boolean(filters.category || filters.deployment || filters.difficulty || filters.language || typeof filters.cloudflareReady === "boolean");
  const broadProbe = isBroadProbe(filters, words);
  const browseMode = isBrowseMode(filters, words, limit);

  return projects
    .map((item) => {
      if (filters.category && item.agentCard.category !== filters.category) {
        return null;
      }
      if (filters.deployment && !item.agentCard.deployment.includes(filters.deployment)) {
        return null;
      }
      if (filters.difficulty && item.agentCard.difficulty !== filters.difficulty) {
        return null;
      }
      if (typeof filters.cloudflareReady === "boolean" && item.agentCard.cloudflareReady !== filters.cloudflareReady) {
        return null;
      }
      if (filters.language && normalize(item.project.language) !== normalize(filters.language)) {
        return null;
      }
      if (!query) {
        return { item, score: item.metrics.gitScore };
      }

      const haystack = normalize(
        [
          item.project.name,
          item.project.fullName,
          item.project.description,
          item.project.language,
          item.project.topics.join(" "),
          item.agentCard.category,
          item.agentCard.useCases.join(" "),
          item.agentCard.summaryForAgent
        ].join(" ")
      );
      const score = experimentalScore(query, words, haystack, item, {
        scoped,
        broadProbe,
        browseMode,
        scopedQuality: strategy.scopedQuality,
        broadProbeQuality: strategy.broadProbeQuality,
        browseModeQuality: strategy.browseModeQuality,
        blockerAware: strategy.blockerAware,
        exactIntentGuard: strategy.exactIntentGuard,
        specificIntent: strategy.specificIntent
      });
      return score > 0 ? { item, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || byGitScore(a.item, b.item))
    .map(({ item }) => item)
    .slice(0, limit);
}

function experimentalScore(query, words, haystack, item, strategy) {
  const useQuality =
    strategy.scoped &&
    (strategy.scopedQuality || (strategy.broadProbeQuality && strategy.broadProbe) || (strategy.browseModeQuality && strategy.browseMode));
  const qualityScore = useQuality ? scopedQualityScore(item) : item.metrics.gitScore;
  if (haystack.includes(query)) {
    return (useQuality ? 220 : 1000) + qualityScore + blockerAdjustment(item, strategy);
  }

  const hits = words.filter((word) => haystack.includes(word)).length;
  if (hits === 0) {
    return 0;
  }

  const deploymentHits = words.filter((word) => item.agentCard.deployment.some((deployment) => normalize(deployment).includes(word))).length;
  const topicHits = words.filter((word) => item.project.topics.some((topic) => normalize(topic).includes(word))).length;
  const categoryHits = words.filter((word) => normalize(item.agentCard.category).includes(word)).length;
  const specificIntentBoost = strategy.specificIntent ? specificIntentScore(words, item) : 0;
  const exactNameHits = strategy.exactIntentGuard
    ? words.filter((word) => !genericIntentWords.has(word) && normalize(`${item.project.owner} ${item.project.name} ${item.project.fullName}`).includes(word))
        .length
    : 0;

  if (useQuality) {
    return hits * 70 + deploymentHits * 70 + topicHits * 45 + categoryHits * 65 + exactNameHits * 420 + specificIntentBoost + qualityScore + blockerAdjustment(item, strategy);
  }

  return hits * 120 + deploymentHits * 80 + topicHits * 60 + categoryHits * 60 + specificIntentBoost + item.metrics.gitScore;
}

function specificIntentScore(words, item) {
  const identityText = normalize([item.project.owner, item.project.name, item.project.fullName, item.project.topics.join(" ")].join(" "));
  const hits = words.filter((word) => !specificIntentStopWords.has(word) && identityText.includes(word)).length;
  return hits * 480;
}

function isBroadProbe(filters, words) {
  if (filters.difficulty || filters.language || typeof filters.cloudflareReady === "boolean") {
    return false;
  }
  if (!filters.category && !filters.deployment) {
    return false;
  }

  const filterWords = new Set([...queryTokens(filters.category ?? ""), ...queryTokens(filters.deployment ?? "")]);
  const specificWords = words.filter((word) => !broadProbeWords.has(word) && !filterWords.has(word));
  return specificWords.length === 0;
}

function isBrowseMode(filters, words, limit) {
  return limit >= 8 && isBroadProbe(filters, words);
}

function blockerAdjustment(item, strategy) {
  if (!strategy.blockerAware) {
    return 0;
  }

  const text = normalize([item.project.id, item.project.description, item.project.topics.join(" "), item.agentCard.notGoodFor.join(" ")].join(" "));
  let adjustment = 0;
  if (item.agentCard.deployment.includes("cloudflare") && !item.agentCard.cloudflareReady) {
    adjustment -= 350;
  }
  if (text.includes("docker") && text.includes("cloudflare")) {
    adjustment -= 160;
  }
  return adjustment;
}

function rankingMarkdown(rows) {
  return [
    "# Git.Top Ranking Experiments",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "Offline ranking experiments compare candidate search ranking strategies against both the CI-safe eval and the broader local eval. These experiments do not change runtime search behavior.",
    "",
    "## Summary",
    "",
    "Strategy | CI Top-1 | CI Top-3 | CI Bad Hits | Local Top-1 | Local Top-3 | Local Bad Hits | Notes",
    "--- | ---: | ---: | ---: | ---: | ---: | ---: | ---",
    ...rows.map((row) =>
      [
        `\`${row.id}\``,
        row.quality.top1_hit_rate,
        row.quality.top3_hit_rate,
        row.quality.unacceptable_hit_count,
        row.local.top1_hit_rate,
        row.local.top3_hit_rate,
        row.local.unacceptable_hit_count,
        row.description
      ].join(" | ")
    ),
    "",
    "## Conclusion",
    "",
    conclusion(rows),
    "",
    "## Targeted Probes",
    "",
    "- `local-target-github-mcp-broad-query` tracks a realistic GitHub automation MCP query that does not include an exact package name.",
    "- Treat this probe as a guardrail against broad quality boosts that bury repository-specific intent.",
    "- A candidate ranking strategy should keep `github/github-mcp-server` or `idosal/git-mcp` in the top three before promotion.",
    "",
    "## Review Focus",
    "",
    ...rows.flatMap((row) => [
      `### \`${row.id}\``,
      "",
      `- CI focus: ${formatFocus(row.qualityFocus)}`,
      `- Local focus: ${formatFocus(row.localFocus)}`,
      ""
    ])
  ].join("\n");
}

function conclusion(rows) {
  const baseline = rows.find((row) => row.id === "baseline");
  const winner = rows
    .filter((row) => row.id !== "baseline")
    .filter((row) => row.quality.top1_hit_rate >= baseline.quality.top1_hit_rate && row.local.top3_hit_rate > baseline.local.top3_hit_rate)
    .sort((left, right) => {
      const top3Delta = right.local.top3_hit_rate - left.local.top3_hit_rate;
      if (top3Delta !== 0) {
        return top3Delta;
      }
      return right.local.top1_hit_rate - left.local.top1_hit_rate;
    })[0];

  if (winner) {
    return `Candidate \`${winner.id}\` improves local ranking without reducing CI top-1. Review the focus lists before promoting it to runtime search.`;
  }

  return "No candidate strategy currently improves the local ranking baseline without reducing CI-safe top-1 quality. Keep these strategies offline until a narrower scoped-ranking approach preserves exact query intent.";
}

function focusIds(results) {
  return results
    .filter((item) => !item.top1_hit || !item.top3_hit || item.unacceptable_hits.length > 0)
    .map((item) => item.id)
    .slice(0, 12);
}

function formatFocus(ids) {
  return ids.length > 0 ? ids.map((id) => `\`${id}\``).join(", ") : "none";
}

function scopedQualityScore(item) {
  return item.metrics.gitScore * 8 + Math.round(item.metrics.maintenanceScore * 1.5) + Math.min(120, Math.round(item.project.stars / 1000));
}

function byGitScore(a, b) {
  return b.metrics.gitScore - a.metrics.gitScore || b.project.stars - a.project.stars;
}

function queryTokens(query) {
  return query
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2);
}

function clampLimit(value, fallback = 20) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

function normalize(value) {
  return (value ?? "").trim().toLowerCase();
}
