# Git.Top Low-Confidence Review

Generated at: 2026-07-04T04:07:43.986Z

This report lists generated Agent Card classifications that need manual review before Git.Top scales further. It focuses on low and medium classification confidence, collection semantics, Cloudflare readiness ambiguity, and incomplete quality signals.

## Summary

- Projects reviewed: 504
- Projects needing review: 0
- Low-confidence signals: 0
- Medium-confidence signals: 0
- P0 review items: 0
- P1 review items: 0
- P2 review items: 0
- P3 review items: 0

## Release Candidate Checklist

Review these items before a release when changing classification, ranking, seed data, or generated Agent Card logic.

| Priority | Project | Category | Impact | Stars | Why | Action |
| --- | --- | --- | ---: | ---: | --- | --- |
| none | none | none | 0 | 0 | No release-blocking review items. | none |

## Collection Review Summary

Collection-style repositories are useful for discovery, but should be reviewed separately from executable projects.

- Collection-style checklist items: 37
- Reviewed collection policy items: 37
- Collection metadata exception items: 0
- Stale collection metadata exception items: 0
- Collection metadata exception items with unknown freshness: 0

| Scope | Review Count |
| --- | ---: |
| none | 0 |

## Reviewed Collection Policy

| Project | Category | Scope | Reviewed At | Policy |
| --- | --- | --- | --- | --- |
| `anthropics/claude-cookbooks` | `ai_app_template` | `cookbook` | 2026-06-23 | Cookbook collection retained for implementation patterns and examples. |
| `cloudflare/templates` | `ai_app_template` | `starter_collection` | 2026-06-26 | Cloudflare starter collection retained for Workers and serverless template discovery. |
| `cloudflare/vibesdk-templates` | `ai_app_template` | `starter_collection` | 2026-06-26 | Cloudflare template collection retained for VibeSDK and Workers app discovery. |
| `coleam00/ottomator-agents` | `ai_app_template` | `starter_collection` | 2026-06-23 | Resource hub retained for agent implementation discovery. |
| `deepset-ai/haystack-cookbook` | `rag_framework` | `cookbook` | 2026-06-23 | Cookbook collection retained for RAG implementation patterns. |
| `e2b-dev/awesome-ai-agents` | `ai_app_template` | `awesome_list` | 2026-06-23 | Awesome list retained for agent and app discovery. |
| `e2b-dev/awesome-devins` | `coding_agent` | `awesome_list` | 2026-06-23 | Awesome list retained for coding-agent discovery. |
| `Giskard-AI/awesome-ai-safety` | `llm_eval` | `awesome_list` | 2026-06-23 | Awesome list retained for evaluation and safety discovery. |
| `github/awesome-copilot` | `coding_agent` | `awesome_list` | 2026-06-23 | Awesome list retained for coding-agent and Copilot workflow discovery. |
| `google-gemini/cookbook` | `ai_app_template` | `cookbook` | 2026-06-23 | Cookbook collection retained for AI app examples. |
| `google-gemini/starter-applets` | `ai_app_template` | `starter_collection` | 2026-06-26 | Starter applet collection retained for Gemini AI app template discovery. |
| `GoogleCloudPlatform/generative-ai` | `ai_app_template` | `starter_collection` | 2026-06-26 | Sample and cookbook collection retained for Google Cloud generative AI implementation patterns. |
| `huggingface/agents-course` | `agent_framework` | `cookbook` | 2026-06-23 | Course collection retained for agent framework learning paths. |
| `huggingface/cookbook` | `ai_app_template` | `cookbook` | 2026-06-23 | Cookbook collection retained for AI app examples. |
| `lancedb/vectordb-recipes` | `vector_database` | `resource_hub` | 2026-06-26 | Recipe collection retained for vector database implementation patterns. |
| `langgenius/dify-official-plugins` | `workflow_automation` | `resource_hub` | 2026-06-26 | Plugin collection retained for Dify ecosystem integration discovery. |
| `lobehub/lobe-chat-plugins` | `ai_app_template` | `starter_collection` | 2026-06-26 | Plugin collection retained for Lobe Chat extension discovery. |
| `microsoft/ai-agents-for-beginners` | `agent_framework` | `cookbook` | 2026-06-23 | Course collection retained for agent framework learning paths. |
| `microsoft/generative-ai-for-beginners` | `ai_app_template` | `cookbook` | 2026-06-23 | Course collection retained for AI app examples and learning paths. |
| `microsoft/mcp` | `mcp_server` | `integration_collection` | 2026-06-26 | MCP resource collection retained for Microsoft Model Context Protocol discovery. |
| `n8n-io/n8n-hosting` | `workflow_automation` | `resource_hub` | 2026-06-26 | Hosting guide collection retained for n8n deployment pattern discovery. |
| `open-webui/openapi-servers` | `llm_gateway` | `resource_hub` | 2026-06-26 | OpenAPI server collection retained for Open WebUI integration discovery. |
| `openai/frontier-evals` | `llm_eval` | `resource_hub` | 2026-06-26 | Evaluation collection retained for frontier model assessment patterns. |
| `openai/openai-chatkit-advanced-samples` | `ai_app_template` | `starter_collection` | 2026-06-26 | Sample collection retained for advanced ChatKit implementation patterns. |
| `openai/openai-cookbook` | `ai_app_template` | `cookbook` | 2026-06-23 | Cookbook collection retained for AI app examples. |
| `openai/openai-structured-outputs-samples` | `prompt_tooling` | `resource_hub` | 2026-06-26 | Sample collection retained for structured output implementation patterns. |
| `openai/skills` | `coding_agent` | `resource_hub` | 2026-06-26 | Skill collection retained for agent capability discovery. |
| `patchy631/ai-engineering-hub` | `ai_app_template` | `starter_collection` | 2026-06-23 | Resource hub retained for AI engineering discovery. |
| `punkpeye/awesome-mcp-servers` | `mcp_server` | `awesome_list` | 2026-06-23 | Awesome list retained for MCP server discovery. |
| `run-llama/awesome-rag` | `rag_framework` | `awesome_list` | 2026-06-23 | Awesome list retained for RAG discovery. |
| `Shubhamsaboo/awesome-llm-apps` | `ai_app_template` | `awesome_list` | 2026-06-23 | Awesome list retained for AI app discovery. |
| `SigNoz/Awesome-OpenTelemetry` | `ai_observability` | `awesome_list` | 2026-06-23 | Awesome list retained for observability discovery. |
| `SigNoz/dashboards` | `ai_observability` | `resource_hub` | 2026-06-26 | Dashboard collection retained for observability template discovery. |
| `temporalio/samples-python` | `workflow_automation` | `resource_hub` | 2026-06-26 | Sample collection retained for Python workflow implementation patterns. |
| `weaviate/awesome-weaviate` | `vector_database` | `awesome_list` | 2026-06-23 | Awesome list retained for vector database and RAG discovery. |
| `weaviate/recipes` | `vector_database` | `resource_hub` | 2026-06-26 | Recipe collection retained for Weaviate vector database implementation patterns. |
| `wong2/awesome-mcp-servers` | `mcp_server` | `awesome_list` | 2026-06-23 | Awesome list retained for MCP server discovery. |

## Correction Loop

1. Inspect the project README, topics, and repository metadata.
2. If the generated classification is wrong for one project, write a protected classification override instead of changing global heuristics.
3. If multiple projects fail for the same reason, add or adjust classification hints and add an eval case.
4. Re-run `pnpm quality:review`, `pnpm eval:quality`, and `pnpm test:focused` before release.

## Review Count By Category

| Category | Review Count |
| --- | ---: |
| none | 0 |

## Review Items

No low-confidence review items.
