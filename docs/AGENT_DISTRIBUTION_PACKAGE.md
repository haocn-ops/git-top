# Git.Top Agent Distribution Package

Version: 2026-07-31

Status: active in the official MCP Registry and publicly listed on Smithery and Glama

Official Registry artifact: `distribution/server.json`

Official Registry record: `io.github.haocn-ops/git-top` version `0.1.0`, published at `2026-07-31T14:33:59.531212Z`

Publication and audit procedure: `docs/EXTERNAL_DISTRIBUTION_RUNBOOK.md`

## Canonical Description

Git.Top gives AI agents evidence-backed open-source project search, recommendations, alternatives, and comparisons through MCP and REST.

Canonical connection page: `https://git.top/connect`

## Endpoints

| Surface | URL | Purpose |
| --- | --- | --- |
| MCP core | `https://git.top/mcp/core` | Five-tool first-use project search and selection |
| MCP full | `https://git.top/mcp` | Alternatives, graph, score, quality, benchmark, governance, and GRP |
| REST/OpenAPI | `https://git.top/openapi.json` | Structured no-auth REST integration |
| Distribution JSON | `https://git.top/distribution.json` | Reusable listing metadata and verification status |

Authentication: none for public read-only REST and MCP calls. Agent registration, OAuth, API keys, and cookies are not required.

## Example Tasks

1. Choose an open-source agent framework that can run on Cloudflare Workers and explain the evidence.
2. Compare Codex and OpenCode for a local coding-agent workflow.
3. Check an unfamiliar dependency before adding it to a Python-first stack.

The full `/examples` and `/api/examples` surfaces contain ten decision-first examples covering framework selection, coding agents, archived-project replacement, local LLM runtimes, GitHub MCP automation, vector databases, RAG composition with trust evidence, collection repositories, dependency checks, and maintained alternatives.

## Trust And Privacy

- Require `metadata.source=d1` for high-confidence claims.
- Use `require_d1=true` to fail closed instead of accepting seed fallback.
- Preserve evidence, confidence, caveats, and verification timestamps.
- Check `https://git.top/api/trust` and `https://git.top/benchmark` before strong production recommendations.
- Adoption analytics never record prompts, arguments, results, repository choices, raw IP addresses, authorization headers, or cookies.

## Installable Skill

Repository path: `skills/git-top-project-selection`

Public Skill source: `https://raw.githubusercontent.com/haocn-ops/git-top/main/skills/git-top-project-selection/SKILL.md` (verified HTTP 200 on 2026-08-01; commit `0fefc63`)

The skill supports REST-first project decisions when remote MCP is unavailable and uses the core MCP profile when it is connected.

## Channel Links

Use explicit, privacy-safe source attribution:

- Canonical MCP registry: `https://git.top/connect?source=mcp-registry`
- Smithery: `https://git.top/connect?source=smithery`
- Glama: `https://git.top/connect?source=glama`
- Other third-party MCP catalog: `https://git.top/connect?source=mcp-catalog`
- GitHub: `https://git.top/connect?source=github`
- Agent Skill: `https://git.top/connect?source=agent-skill`

## Verification Boundary

- Local HTTP smoke: passed, including core initialize, five-tool discovery, and a seven-step workflow result.
- Production smoke for this change set: passed on 2026-08-01 after Worker version `b9b868d8-86fb-4a79-9ec7-9956940f5e96` exposed the confirmed catalog evidence.
- Real-client production E2E: Claude Code 2.1.220 and Codex CLI 0.145.0 passed on 2026-07-31. Both have dated D1-backed first-call, multi-tool, and error-recovery evidence in the compatibility report.

The official Registry status is `active`. Smithery is publicly listed at `https://smithery.ai/servers/izhenghaocn/git-top`; its remote deployment probe succeeded, discovered the expected five core tools, and reported server version `0.1.0` on 2026-07-31. Smithery is therefore `live`.

Glama's initial remote connector submission flow returned `A server with this URL already exists.` for `https://git.top/mcp/core`, indicating an existing record. Safari verification on 2026-08-01 found the public connector at `https://glama.ai/mcp/connectors/io.github.haocn-ops/git-top` and the server listing at `https://glama.ai/mcp/servers/haocn-ops/git-top`. Glama reports `Healthy`, Streamable HTTP, the expected core endpoint, and five available tools, so Glama is `live`. The aggregate third-party catalog state is `live`.
