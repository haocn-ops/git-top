# Git.Top Ranking Experiments

Generated at: 2026-06-20T18:20:35.517Z

Offline ranking experiments compare candidate search ranking strategies against both the CI-safe eval and the broader local eval. These experiments do not change runtime search behavior.

## Summary

Strategy | CI Top-1 | CI Top-3 | CI Bad Hits | Local Top-1 | Local Top-3 | Local Bad Hits | Notes
--- | ---: | ---: | ---: | ---: | ---: | ---: | ---
`baseline` | 1 | 1 | 0 | 0.773 | 0.864 | 0 | Current runtime search ranking.
`scoped_quality` | 0.81 | 1 | 0 | 1 | 1 | 0 | Boost quality and maintenance inside explicit category/deployment scopes.
`exact_intent_guard` | 0.714 | 1 | 0 | 0.909 | 0.955 | 0 | Boost quality inside scopes while preserving exact project-name and owner intent.
`broad_probe_quality` | 0.952 | 1 | 0 | 0.909 | 0.909 | 0 | Boost quality only for broad category/deployment queries, leaving specific intent queries on baseline ranking.
`broad_probe_blocker_aware` | 0.952 | 1 | 0 | 0.909 | 0.909 | 0 | Boost broad category/deployment queries and demote non-ready Cloudflare/serverless blocker examples.
`browse_mode_quality` | 1 | 1 | 0 | 0.909 | 0.909 | 0 | Boost quality only for broad browse-style queries with larger result limits.
`browse_mode_blocker_aware` | 1 | 1 | 0 | 0.909 | 0.909 | 0 | Boost browse-style queries and demote non-ready Cloudflare/serverless blocker examples.

## Conclusion

Candidate `browse_mode_quality` improves local ranking without reducing CI top-1. Review the focus lists before promoting it to runtime search.

## Review Focus

### `baseline`

- CI focus: none
- Local focus: `local-category-agent_framework`, `local-category-rag_framework`, `local-deployment-docker`, `local-deployment-local`, `local-deployment-serverless`

### `scoped_quality`

- CI focus: `search-prompt-tooling`, `search-workflow-automation`, `search-ambiguous-memory-framework`, `search-ambiguous-observability-tool`
- Local focus: none

### `exact_intent_guard`

- CI focus: `search-mcp-server-examples`, `search-workflow-automation`, `search-coding-agent`, `search-open-saas-template`, `search-ambiguous-memory-framework`, `search-ambiguous-observability-tool`
- Local focus: `local-category-coding_agent`, `local-deployment-docker`

### `broad_probe_quality`

- CI focus: `search-workflow-automation`
- Local focus: `local-category-rag_framework`, `local-deployment-local`

### `broad_probe_blocker_aware`

- CI focus: `search-workflow-automation`
- Local focus: `local-category-rag_framework`, `local-deployment-local`

### `browse_mode_quality`

- CI focus: none
- Local focus: `local-category-rag_framework`, `local-deployment-local`

### `browse_mode_blocker_aware`

- CI focus: none
- Local focus: `local-category-rag_framework`, `local-deployment-local`

