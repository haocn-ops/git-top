# Git.Top Agent Client Compatibility

Last reviewed: 2026-07-31

This report distinguishes three kinds of evidence:

1. Server contract validation proves that Git.Top implements the shared MCP initialize, discovery, tool-call, strict-source, and error contracts.
2. Configuration verification proves that an installed client accepts the documented configuration command format.
3. Real-client validation proves that a named client and version completes production initialize, discovery, first-value, multi-tool, and error-recovery tasks.

Configuration verification is not a support claim. A client is marked supported only after every required real-client check passes.

## Server Contract

| Check | Status | Validation |
| --- | --- | --- |
| Initialize | passed | `pnpm mcp:validate` |
| Core five-tool discovery | passed | `pnpm mcp:validate`, `pnpm test:focused` |
| First core workflow call | passed | `pnpm test:focused` |
| Invalid input | passed | `pnpm eval:agent-tasks` |
| Strict D1 rejection | passed | `pnpm mcp:validate` |
| Production core smoke | passed | `pnpm smoke:prod` on 2026-07-31 |

The production smoke establishes generic production availability for initialize, five-tool discovery, and a first core workflow call. It does not identify a real client as supported.

## Client Matrix

| Client | Version | Transport | Configuration | Initialize | Tool discovery | First call | Multi-tool workflow | Error behavior | Support level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex CLI, app, and IDE | 0.145.0 | Streamable HTTP | passed | passed | passed (5 tools) | passed | passed | passed | supported |
| Claude Code | 2.1.220 | Streamable HTTP | passed | passed | passed (5 tools) | passed | passed | passed | supported |

The installed CLI command formats and both production E2E flows were checked on 2026-07-31. Codex CLI and Claude Code are supported for the dated versions and evidence recorded here. This does not extend the support claim to untested future versions.

## Recorded Real-Client Evidence

Codex CLI 0.145.0 completed the production core-profile checks in one non-interactive turn:

- Initialized the configured Streamable HTTP server and discovered exactly five core tools. Codex JSONL exposed MCP startup and discovery but did not emit the initialize handshake as a separate item.
- Called `recommend_project` with `require_d1=true`, `category=browser_agent`, and `deployment=docker`; it returned `browser-use/browser-use`, `unclecode/crawl4ai`, and `browserless/browserless`.
- Passed the first two project IDs to `compare_projects`, which preserved input order and selected `browser-use/browser-use` from the observed evidence.
- Preserved `metadata.source=d1`, `metadata.reason=d1_query`, evidence, confidence, caveats, source fields, and verification timestamps.
- Parsed `-32005` for an unknown project and `-32602` for `limit=0` without aborting the final compatibility report.

Non-interactive `codex exec` initially cancelled MCP calls under its default tool-approval behavior. The successful run used the documented per-server `default_tools_approval_mode="approve"` setting while retaining a read-only filesystem sandbox and the five-tool core allow list. Interactive clients can approve calls in-session; automated runs should configure the narrow per-server setting instead of bypassing the full Codex sandbox.

Claude Code 2.1.220 completed the following checks against `https://git.top/mcp/core` on 2026-07-31:

- Connected over Streamable HTTP and discovered all five core tools.
- Called `recommend_project` with `require_d1=true` and received three D1-backed browser-agent recommendations with source, reason, confidence, evidence, and caveats.
- Passed recommendation results into `compare_projects` for a multi-tool decision.
- Called `get_project` successfully for `browser-use/browser-use` with `metadata.source=d1` and `metadata.reason=d1_query`.
- Parsed `-32005` for an unknown project and `-32602` for `limit=0` without losing the session result.

The run exposed and verified a compatibility fix: Claude Code skipped `get_project` when its input schema used a top-level `anyOf`. Git.Top now publishes an equivalent object schema without top-level composition, and the production client subsequently discovered all five tools. Production D1 was healthy during the run, so the exact `-32003` outage path remains server-contract evidence rather than a forced production failure.

### Full-Profile GRP Baseline

Claude Code 2.1.220 also completed a production E2E run against the 21-tool full endpoint on 2026-07-31. It discovered all full tools, checked `get_trust_gate`, called `git_top_grp_query`, inspected a project, preserved the D1 source and `allow` Trust Gate decision, and recovered from `-32005` for an unknown project. The run took 6 turns and about 100.7 seconds, cost $0.138, created 27,165 cache tokens, and read 34,572 cache tokens.

The main limitation was response size. Before the MCP-specific GRP response profiles were introduced, the same compose request returned a 101,284-byte JSON-RPC response containing about 90,057 characters of embedded GRP JSON. Claude Code saved the tool result outside its immediate context, and an earlier client attempt exhausted a $0.75 budget before its first MCP call after loading roughly 49,000 schema/context tokens. This evidence motivated the default bounded `compact` GRP response while retaining `profile: "full"` for graph-complete workflows.

Worker version `78773e20-b9f5-4e76-ad07-406264ee0f0b` completed the post-deployment production verification on 2026-07-31. The same direct MCP request returned 31,673 JSON-RPC bytes with 28,077 embedded JSON characters, 24 nodes, 40 edges, three solution paths, D1 provenance, and `truncated=true`; explicit `profile=full` still returned 64 nodes, 200 edges, and nested path graph objects. The REST endpoint remained full and profile-free, and invalid MCP profile input returned `-32602`.

Claude Code 2.1.220 then repeated the 21-tool full-endpoint workflow in 6 turns and 53.615 seconds. The compact GRP tool call completed in 854 ms without a `Persisted tool result` event, while the baseline full result was externalized at 110.9 KB and occupied about 14.1 seconds of tool dispatch. The client preserved `metadata.source=d1`, Trust Gate `allow`, evidence and caveats, and recovered from `-32005` and `-32602`. The rerun cost $0.294 and used 60,957 cache-creation plus 99,059 cache-read tokens, both above the baseline; because the rerun added an invalid-profile probe and used an independent model cache state, these cost and token changes are not attributed to the response profile. The defensible improvement claims are response size, no result externalization, GRP tool latency, and successful contract handling.

## Required Real-Client Run

For each client and version:

1. Add `https://git.top/mcp/core` using the command on `/connect`.
2. Confirm initialize and five-tool discovery.
3. Run: "Use Git.Top to recommend three open-source browser-agent projects for Docker, then cite the data source and one caveat for each."
4. Continue from recommendation to project inspection or comparison.
5. Verify recovery from an unknown project, invalid limit, and strict D1 rejection.
6. Record the date, result, tool loop count, known limitation, and supporting terminal or client evidence.

The machine-readable report is available at `GET /api/compatibility`. The human-facing live report is `/compatibility`.
