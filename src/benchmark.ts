import { listProjectKnowledgeWithMeta } from "./knowledge-source";
import { buildLowConfidenceReviewReport, buildQualityReport, type LowConfidenceReviewReport, type QualityReport } from "./quality";
import type { Env } from "./types";

export interface PublicBenchmarkReport {
  name: string;
  positioning: string;
  summary: string;
  generatedAt: string;
  evaluation: {
    generatedAt: string;
    evaluatedCases: number;
    top1HitRate: number;
    top3HitRate: number;
    categoryAccuracy: number;
    deploymentAccuracy: number;
    cloudflareReadinessAccuracy: number;
    unacceptableHitCount: number;
    generatedFixtureProjects: number;
    d1FixtureProjects: number;
    effectiveGeneratedFixtureProjects: number;
    syntheticProjects: number;
    reviewFocus: Array<{
      id: string;
      issue: string;
      expected: string[];
      observed: string[];
    }>;
    sourceReport: string;
  };
  explanations: {
    generatedAt: string;
    checks: number;
    passed: number;
    failed: number;
    coverage: number;
    sourceReport: string;
  };
  dataCoverage: {
    projectCount: number;
    categoryCoverage: string;
    coveredCategories: number;
    totalCategories: number;
    missingCategories: string[];
    lowConfidenceClassificationCount: number;
    lowConfidenceClassificationRate: number;
    staleProjectCount: number;
    staleProjectRate: number;
    collectionCount: number;
    collectionReviewCount: number;
    collectionReviewRate: number;
    dataTrustScore: number;
    releaseScore: number;
    riskLevel: QualityReport["riskLevel"];
  };
  reviewQueue: {
    reviewCount: number;
    lowSignalCount: number;
    mediumSignalCount: number;
    topImpactScore: number;
    topItems: Array<{
      projectId: string;
      category: string;
      impactScore: number;
      reasons: string[];
      suggestedAction: string;
    }>;
  };
  knownLimitations: string[];
  recommendedUse: string[];
  links: {
    html: string;
    api: string;
    quality: string;
    review: string;
    trust: string;
    coverage: string;
    evalQuality: string;
    evalExplanations: string;
  };
  metadata: {
    source: string;
    reason: string;
    projectCount: number;
    generatedAt: string;
  };
}

export const evaluationBenchmark = {
  generatedAt: "2026-06-30T00:08:13.734Z",
  evaluatedCases: 28,
  top1HitRate: 0.929,
  top3HitRate: 1,
  categoryAccuracy: 1,
  deploymentAccuracy: 1,
  cloudflareReadinessAccuracy: 1,
  unacceptableHitCount: 0,
  generatedFixtureProjects: 504,
  d1FixtureProjects: 504,
  effectiveGeneratedFixtureProjects: 500,
  syntheticProjects: 0,
  reviewFocus: [
    {
      id: "search-prompt-tooling",
      issue: "top-1 miss",
      expected: ["promptfoo/promptfoo", "guardrails-ai/guardrails", "dottxt-ai/outlines", "567-labs/instructor"],
      observed: ["openai/openai-structured-outputs-samples", "guardrails-ai/guardrails", "567-labs/instructor", "microsoft/TypeChat", "BoundaryML/baml"]
    },
    {
      id: "search-coding-agent",
      issue: "top-1 miss",
      expected: ["openai/codex", "cline/cline", "aider-ai/aider", "OpenHands/OpenHands"],
      observed: ["smol-ai/developer", "OpenHands/OpenHands", "cline/cline", "google-gemini/gemini-cli", "anomalyco/opencode"]
    }
  ],
  sourceReport: "docs/EVAL_QUALITY.md"
};

export const explanationBenchmark = {
  generatedAt: "2026-07-04T02:51:39.580Z",
  checks: 12,
  passed: 12,
  failed: 0,
  sourceReport: "docs/EVAL_EXPLANATIONS.md"
};

export async function buildPublicBenchmarkReport(env: Env): Promise<PublicBenchmarkReport> {
  const knowledge = await listProjectKnowledgeWithMeta(env);
  const quality = buildQualityReport(knowledge.projects);
  const review = buildLowConfidenceReviewReport(knowledge.projects);

  return buildPublicBenchmarkReportFromInputs(quality, review, knowledge.metadata, new Date().toISOString());
}

export function buildPublicBenchmarkReportFromInputs(
  quality: QualityReport,
  review: LowConfidenceReviewReport,
  metadata: PublicBenchmarkReport["metadata"],
  generatedAt: string
): PublicBenchmarkReport {
  const collectionReviewRate = quality.projectCount === 0 ? 0 : quality.coverage.collectionReviewCount / quality.projectCount;
  const explanationCoverage = explanationBenchmark.checks === 0 ? 0 : explanationBenchmark.passed / explanationBenchmark.checks;
  return {
    name: "Git.Top Public Trust Benchmark",
    positioning: "The Knowledge Graph of Open Source",
    summary: summary(quality, review),
    generatedAt,
    evaluation: evaluationBenchmark,
    explanations: {
      ...explanationBenchmark,
      coverage: round3(explanationCoverage)
    },
    dataCoverage: {
      projectCount: quality.projectCount,
      categoryCoverage: `${quality.coverage.coveredCategories}/${quality.coverage.totalCategories}`,
      coveredCategories: quality.coverage.coveredCategories,
      totalCategories: quality.coverage.totalCategories,
      missingCategories: quality.coverage.missingCategories,
      lowConfidenceClassificationCount: quality.coverage.lowConfidenceClassificationCount,
      lowConfidenceClassificationRate: round3(quality.coverage.lowConfidenceClassificationRate),
      staleProjectCount: quality.coverage.staleProjectCount,
      staleProjectRate: round3(quality.coverage.staleProjectRate),
      collectionCount: quality.coverage.collectionCount,
      collectionReviewCount: quality.coverage.collectionReviewCount,
      collectionReviewRate: round3(collectionReviewRate),
      dataTrustScore: quality.dataTrustScore,
      releaseScore: quality.releaseScore,
      riskLevel: quality.riskLevel
    },
    reviewQueue: {
      reviewCount: review.reviewCount,
      lowSignalCount: review.lowSignalCount,
      mediumSignalCount: review.mediumSignalCount,
      topImpactScore: review.items[0]?.impactScore ?? 0,
      topItems: review.items.slice(0, 5).map((item) => ({
        projectId: item.projectId,
        category: item.category,
        impactScore: item.impactScore,
        reasons: item.reasons,
        suggestedAction: item.suggestedAction
      }))
    },
    knownLimitations: knownLimitations(quality, review),
    recommendedUse: [
      "Use top_3_hit_rate, category_accuracy, and deployment_accuracy for current recommendation health.",
      "Use explanation coverage to decide whether agent-facing responses carry enough evidence to cite.",
      "Use data_trust_score, risk_level, and review_queue before making high-confidence production recommendations.",
      "Use require_d1=true for workflows that should fail closed instead of using seed fallback."
    ],
    links: {
      html: "/benchmark",
      api: "/api/benchmark",
      quality: "/api/quality",
      review: "/api/quality/review",
      trust: "/api/trust",
      coverage: "/coverage",
      evalQuality: "https://github.com/haocn-ops/git-top/blob/main/docs/EVAL_QUALITY.md",
      evalExplanations: "https://github.com/haocn-ops/git-top/blob/main/docs/EVAL_EXPLANATIONS.md"
    },
    metadata
  };
}

function summary(quality: QualityReport, review: LowConfidenceReviewReport): string {
  return `Recommendation eval top-3 hit rate is ${evaluationBenchmark.top3HitRate}; explanation checks are ${explanationBenchmark.passed}/${explanationBenchmark.checks}; data trust is ${quality.dataTrustScore}/100 with ${review.reviewCount} review queue items.`;
}

function knownLimitations(quality: QualityReport, review: LowConfidenceReviewReport): string[] {
  const limitations = [
    "Eval quality is a CI-safe baseline over curated cases and generated fixtures; it is not a live benchmark over every GitHub repository.",
    "Top-1 misses remain for prompt-tooling and coding-agent search cases; use top-3 health when evaluating shortlist quality.",
    "Quality signal confidence can be snapshot, partial, estimated, or unknown depending on available GitHub sync depth."
  ];
  if (quality.riskLevel !== "low") {
    limitations.push(`Current data trust risk is ${quality.riskLevel}; inspect quality and review queue details before high-confidence claims.`);
  }
  if (review.reviewCount > 0) {
    limitations.push(`${review.reviewCount} projects are in the low-confidence review queue and may need classification or collection-semantics review.`);
  }
  if (quality.coverage.missingCategories.length > 0) {
    limitations.push(`Missing category coverage: ${quality.coverage.missingCategories.join(", ")}.`);
  }
  return limitations;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
