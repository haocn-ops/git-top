# Git.Top Ranking Experiments

Generated at: 2026-06-21T09:53:05.375Z

Offline ranking experiments compare candidate search ranking strategies against both the CI-safe eval and the broader local eval. These experiments do not change runtime search behavior.

## Summary

Strategy | CI Top-1 | CI Top-3 | CI Bad Hits | Local Top-1 | Local Top-3 | Local Bad Hits | Notes
--- | ---: | ---: | ---: | ---: | ---: | ---: | ---
`baseline` | 1 | 1 | 0 | 0.739 | 0.783 | 0 | Current runtime search ranking.
`scoped_quality` | 0.786 | 0.964 | 0 | 0.957 | 1 | 0 | Boost quality and maintenance inside explicit category/deployment scopes.
`exact_intent_guard` | 0.714 | 0.893 | 0 | 0.826 | 0.957 | 0 | Boost quality inside scopes while preserving exact project-name and owner intent.
`broad_probe_quality` | 0.964 | 1 | 0 | 0.87 | 0.87 | 0 | Boost quality only for broad category/deployment queries, leaving specific intent queries on baseline ranking.
`broad_probe_blocker_aware` | 0.964 | 1 | 0 | 0.87 | 0.87 | 0 | Boost broad category/deployment queries and demote non-ready Cloudflare/serverless blocker examples.
`browse_mode_quality` | 1 | 1 | 0 | 0.87 | 0.87 | 0 | Boost quality only for broad browse-style queries with larger result limits.
`browse_mode_blocker_aware` | 1 | 1 | 0 | 0.87 | 0.87 | 0 | Boost browse-style queries and demote non-ready Cloudflare/serverless blocker examples.
`intent_aware_browse` | 1 | 1 | 0 | 0.913 | 0.913 | 0 | Boost browse-style queries while preserving specific owner/name/topic intent.

## Conclusion

Candidate `intent_aware_browse` improves local ranking without reducing CI top-1. Review the focus lists before promoting it to runtime search.

## Targeted Probes

- `local-target-github-mcp-broad-query` tracks a realistic GitHub automation MCP query that does not include an exact package name.
- Treat this probe as a guardrail against broad quality boosts that bury repository-specific intent.
- A candidate ranking strategy should keep `github/github-mcp-server` or `idosal/git-mcp` in the top three before promotion.

## Review Focus

### `baseline`

- CI focus: none
- Local focus: `local-category-agent_framework`, `local-category-rag_framework`, `local-deployment-docker`, `local-deployment-local`, `local-deployment-library_only`, `local-deployment-serverless`

### `scoped_quality`

- CI focus: `search-prompt-tooling`, `search-workflow-automation`, `search-rag-resource-collection`, `search-ambiguous-memory-framework`, `search-ambiguous-observability-tool`, `search-github-mcp-automation`
- Local focus: `local-target-github-mcp-broad-query`

### `exact_intent_guard`

- CI focus: `search-mcp-server-examples`, `search-prompt-tooling`, `search-workflow-automation`, `search-coding-agent`, `search-open-saas-template`, `search-ambiguous-memory-framework`, `search-ambiguous-structured-output`, `search-ambiguous-observability-tool`
- Local focus: `local-category-coding_agent`, `local-category-prompt_tooling`, `local-category-workflow_automation`, `local-deployment-docker`

### `broad_probe_quality`

- CI focus: `search-workflow-automation`
- Local focus: `local-category-rag_framework`, `local-deployment-local`, `local-target-github-mcp-broad-query`

### `broad_probe_blocker_aware`

- CI focus: `search-workflow-automation`
- Local focus: `local-category-rag_framework`, `local-deployment-local`, `local-target-github-mcp-broad-query`

### `browse_mode_quality`

- CI focus: none
- Local focus: `local-category-rag_framework`, `local-deployment-local`, `local-target-github-mcp-broad-query`

### `browse_mode_blocker_aware`

- CI focus: none
- Local focus: `local-category-rag_framework`, `local-deployment-local`, `local-target-github-mcp-broad-query`

### `intent_aware_browse`

- CI focus: none
- Local focus: `local-category-rag_framework`, `local-deployment-local`

