# Git.Top Agent Task Evaluation

Generated: 2026-07-31T02:47:01.070Z

This CI gate validates complete agent workflows across trust, retrieval, evidence, pagination, comparison, change handling, feedback governance, fallback, multilingual input, typos, renamed-project aliases, and invalid MCP input handling.

## Summary

- Tasks: 10
- Passed: 10
- Failed: 0
- Success rate: 100.0%

## Tasks

| Task | Status | Workflow | Error |
| --- | --- | --- | --- |
| trust-first-d1-preflight | passed | health -> trust -> search | - |
| fallback-disclosure-and-fail-closed | passed | search seed fallback -> strict D1 rejection | - |
| snapshot-pagination | passed | search page 1 -> search page 2 | - |
| evidence-to-alternatives-to-compare | passed | project evidence -> alternatives -> compare | - |
| change-feed-tombstone | passed | change feed -> deletion tombstone | - |
| review-gated-feedback | passed | feedback validation -> no anonymous persistence | - |
| multilingual-and-typo-intent | passed | Chinese query -> typo correction | - |
| renamed-project-alias | passed | alias resolution -> canonical project response | - |
| mcp-invalid-limit-fails-closed | passed | invalid MCP limits -> JSON-RPC input error -> valid boundary | - |
| mcp-project-not-found-semantics | passed | unknown project error -> alias success -> batch missing list | - |
