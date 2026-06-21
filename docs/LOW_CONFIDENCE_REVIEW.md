# Git.Top Low-Confidence Review

Generated at: 2026-06-21T12:03:04.077Z

This report lists generated Agent Card classifications that need manual review before Git.Top scales further. It focuses on low and medium classification confidence, collection semantics, Cloudflare readiness ambiguity, and incomplete quality signals.

## Summary

- Projects reviewed: 504
- Projects needing review: 24
- Low-confidence signals: 19
- Medium-confidence signals: 46

## Release Candidate Checklist

Review these items before a release when changing classification, ranking, seed data, or generated Agent Card logic.

| Priority | Project | Category | Stars | Why | Action |
| --- | --- | --- | ---: | --- | --- |
| P0 | `chroma-core/chroma-mcp` | `mcp_server` | 13000 | Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals. | Re-sync from GitHub with complete signal collection before relying on score movement. |
| P0 | `BerriAI/litellm-guardrails` | `prompt_tooling` | 11000 | Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals. | Re-sync from GitHub with complete signal collection before relying on score movement. |
| P0 | `Portkey-AI/mcp-tool-filter` | `mcp_server` | 11000 | Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals. | Re-sync from GitHub with complete signal collection before relying on score movement. |
| P0 | `lastmile-ai/mcp-agent` | `mcp_server` | 3000 | Contains low-confidence classification evidence. | Inspect README, topics, and repository files; add an eval case if the classification is important. |
| P2 | `Shubhamsaboo/awesome-llm-apps` | `ai_app_template` | 100000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `microsoft/generative-ai-for-beginners` | `ai_app_template` | 90000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `openai/openai-cookbook` | `ai_app_template` | 65000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `github/awesome-copilot` | `coding_agent` | 30000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `e2b-dev/awesome-ai-agents` | `ai_app_template` | 28000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `e2b-dev/awesome-devins` | `coding_agent` | 16000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `deepset-ai/haystack-cookbook` | `rag_framework` | 15000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `run-llama/awesome-rag` | `rag_framework` | 15000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `weaviate/awesome-weaviate` | `vector_database` | 13000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `google-gemini/cookbook` | `ai_app_template` | 12000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |
| P2 | `huggingface/agents-course` | `agent_framework` | 12000 | Repository is a collection and may need curation semantics review. | Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code. |

## Collection Review Summary

Collection-style repositories are useful for discovery, but should be reviewed separately from executable projects.

- Collection-style checklist items: 20
- Collection metadata exception items: 2
- Stale collection metadata exception items: 0
- Collection metadata exception items with unknown freshness: 0

| Scope | Review Count |
| --- | ---: |
| `starter_collection` | 2 |

## Correction Loop

1. Inspect the project README, topics, and repository metadata.
2. If the generated classification is wrong for one project, write a protected classification override instead of changing global heuristics.
3. If multiple projects fail for the same reason, add or adjust classification hints and add an eval case.
4. Re-run `pnpm quality:review`, `pnpm eval:quality`, and `pnpm test:focused` before release.

## Review Count By Category

| Category | Review Count |
| --- | ---: |
| `agent_framework` | 2 |
| `coding_agent` | 2 |
| `rag_framework` | 2 |
| `vector_database` | 1 |
| `llm_eval` | 1 |
| `prompt_tooling` | 1 |
| `ai_app_template` | 9 |
| `mcp_server` | 5 |
| `ai_observability` | 1 |

## Review Items

### `BerriAI/litellm-guardrails`

- Category: `prompt_tooling`
- Reasons: Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals.
- Suggested action: Re-sync from GitHub with complete signal collection before relying on score movement.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | low |  |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `chroma-core/chroma-mcp`

- Category: `mcp_server`
- Reasons: Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals.
- Suggested action: Re-sync from GitHub with complete signal collection before relying on score movement.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | low |  |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `Portkey-AI/mcp-tool-filter`

- Category: `mcp_server`
- Reasons: Contains low-confidence classification evidence. Quality metrics include estimated or unknown signals.
- Suggested action: Re-sync from GitHub with complete signal collection before relying on score movement.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | low |  |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `anthropics/claude-cookbooks`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |

### `coleam00/ottomator-agents`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |

### `deepset-ai/haystack-cookbook`

- Category: `rag_framework`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "rag" in metadata. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `e2b-dev/awesome-ai-agents`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `e2b-dev/awesome-devins`

- Category: `coding_agent`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "coding agent" in metadata. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `Giskard-AI/awesome-ai-safety`

- Category: `llm_eval`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "eval" in metadata. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `github/awesome-copilot`

- Category: `coding_agent`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "coding agent" in metadata. |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `google-gemini/cookbook`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `huggingface/agents-course`

- Category: `agent_framework`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `huggingface/cookbook`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "template" in metadata. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `lastmile-ai/mcp-agent`

- Category: `mcp_server`
- Reasons: Contains low-confidence classification evidence.
- Suggested action: Inspect README, topics, and repository files; add an eval case if the classification is important.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | low |  |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |

### `microsoft/ai-agents-for-beginners`

- Category: `agent_framework`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `microsoft/generative-ai-for-beginners`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `openai/openai-cookbook`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `patchy631/ai-engineering-hub`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `punkpeye/awesome-mcp-servers`

- Category: `mcp_server`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `run-llama/awesome-rag`

- Category: `rag_framework`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "rag" in metadata. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `Shubhamsaboo/awesome-llm-apps`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `SigNoz/Awesome-OpenTelemetry`

- Category: `ai_observability`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "observability" in metadata. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `weaviate/awesome-weaviate`

- Category: `vector_database`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `category` | medium | Matched "vector database" in metadata. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

### `wong2/awesome-mcp-servers`

- Category: `mcp_server`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

