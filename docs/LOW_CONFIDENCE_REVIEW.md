# Git.Top Low-Confidence Review

Generated at: 2026-06-21T02:31:31.115Z

This report lists generated Agent Card classifications that need manual review before Git.Top scales further. It focuses on low and medium classification confidence, collection semantics, Cloudflare readiness ambiguity, and incomplete quality signals.

## Summary

- Projects reviewed: 442
- Projects needing review: 21
- Low-confidence signals: 15
- Medium-confidence signals: 38

## Review Count By Category

| Category | Review Count |
| --- | ---: |
| `agent_framework` | 2 |
| `coding_agent` | 2 |
| `llm_eval` | 3 |
| `ai_app_template` | 9 |
| `mcp_server` | 5 |

## Review Items

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

- Category: `llm_eval`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
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

- Category: `llm_eval`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `Shubhamsaboo/awesome-llm-apps`

- Category: `ai_app_template`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | No strong beginner or advanced signal found; defaulting to intermediate. |

### `wong2/awesome-mcp-servers`

- Category: `mcp_server`
- Reasons: Repository is a collection and may need curation semantics review.
- Suggested action: Confirm collection scope, freshness, and whether the category should represent resources rather than runtime code.

| Field | Confidence | Evidence |
| --- | --- | --- |
| `deployment` | medium | Local usage is assumed for open source repositories unless contradicted. |
| `difficulty` | medium | Repository has under 10k stars, so complexity is treated conservatively. |
| `cloudflareReady` | low | No Cloudflare deployment signal detected. |

