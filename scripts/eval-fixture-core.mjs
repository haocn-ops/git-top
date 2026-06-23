export const generatedKnowledgeNow = "2026-06-20T00:00:00Z";

export const baseSignals = {
  readmeText: "",
  files: ["package.json"],
  commits30d: 30,
  releases180d: 2,
  contributors90d: 8,
  issueFirstResponseMedianHours: 24,
  signalConfidence: {
    commits30d: "complete",
    releases180d: "complete",
    contributors90d: "complete"
  }
};

export function compactFixtures(items) {
  return items.map(({ readmeText, files = ["package.json"], expected, ...repo }) => ({
    repo: repoFixture(repo),
    signals: {
      ...baseSignals,
      readmeText,
      files
    },
    expected
  }));
}

export function repoFixture({ owner, name, description, topics, language = "TypeScript", stars }) {
  return {
    id: 1,
    name,
    full_name: `${owner}/${name}`,
    owner: {
      login: owner
    },
    html_url: `https://github.com/${owner}/${name}`,
    homepage: null,
    description,
    language,
    topics,
    license: {
      spdx_id: "MIT"
    },
    stargazers_count: stars,
    forks_count: 100,
    open_issues_count: 10,
    default_branch: "main",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: generatedKnowledgeNow,
    pushed_at: generatedKnowledgeNow
  };
}
