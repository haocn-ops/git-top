INSERT OR REPLACE INTO projects (
  id, owner, name, full_name, github_url, homepage_url, description, language,
  topics_json, license, stars, forks, open_issues, default_branch,
  created_at, updated_at, pushed_at, synced_at
) VALUES
(
  'langchain-ai/langchain',
  'langchain-ai',
  'langchain',
  'langchain-ai/langchain',
  'https://github.com/langchain-ai/langchain',
  'https://www.langchain.com/',
  'Build context-aware reasoning applications',
  'Python',
  '["agents","llm","rag","tools"]',
  'MIT',
  100000,
  16000,
  1000,
  'master',
  '2020-10-17T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z'
),
(
  'run-llama/llama_index',
  'run-llama',
  'llama_index',
  'run-llama/llama_index',
  'https://github.com/run-llama/llama_index',
  'https://www.llamaindex.ai/',
  'A data framework for LLM applications',
  'Python',
  '["rag","llm","data","agents"]',
  'MIT',
  38000,
  5200,
  850,
  'main',
  '2022-11-02T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z'
),
(
  'modelcontextprotocol/servers',
  'modelcontextprotocol',
  'servers',
  'modelcontextprotocol/servers',
  'https://github.com/modelcontextprotocol/servers',
  'https://modelcontextprotocol.io/',
  'Reference implementations and community MCP servers',
  'TypeScript',
  '["mcp","agents","tools","typescript"]',
  'MIT',
  18000,
  2200,
  320,
  'main',
  '2024-11-01T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z'
),
(
  'cloudflare/agents',
  'cloudflare',
  'agents',
  'cloudflare/agents',
  'https://github.com/cloudflare/agents',
  'https://developers.cloudflare.com/agents/',
  'Build and deploy AI agents on Cloudflare',
  'TypeScript',
  '["agents","cloudflare","workers","serverless"]',
  'Apache-2.0',
  5000,
  450,
  70,
  'main',
  '2025-01-01T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z',
  '2026-06-16T00:00:00Z'
);

INSERT OR REPLACE INTO project_metrics (
  project_id, stars_30d_delta, commits_30d, releases_180d, contributors_90d,
  issue_first_response_median_hours, recent_push_days, git_score,
  maintenance_score, calculated_at
) VALUES
('langchain-ai/langchain', 2500, 420, 12, 180, 18, 1, 91, 86, '2026-06-16T00:00:00Z'),
('run-llama/llama_index', 1200, 360, 18, 120, 22, 1, 88, 84, '2026-06-16T00:00:00Z'),
('modelcontextprotocol/servers', 3200, 140, 8, 90, 30, 1, 89, 80, '2026-06-16T00:00:00Z'),
('cloudflare/agents', 900, 90, 6, 30, 14, 2, 82, 78, '2026-06-16T00:00:00Z');

INSERT OR REPLACE INTO agent_cards (
  project_id, category, difficulty, deployment_json, cloudflare_ready,
  use_cases_json, not_good_for_json, alternatives_json, summary_for_agent,
  schema_version, generated_at
) VALUES
(
  'langchain-ai/langchain',
  'agent_framework',
  'intermediate',
  '["local","docker","cloud","library_only"]',
  0,
  '["build RAG applications","orchestrate LLM tools","prototype agent workflows"]',
  '["minimal single-file LLM scripts","edge-only Cloudflare Workers deployment"]',
  '[{"project_id":"run-llama/llama_index","reason":"Better suited for data-centric RAG workflows."}]',
  'Use this when the user needs a broad Python framework for context-aware LLM applications with tools, retrieval, and workflow primitives.',
  'v1',
  '2026-06-16T00:00:00Z'
),
(
  'run-llama/llama_index',
  'rag_framework',
  'intermediate',
  '["local","docker","cloud","library_only"]',
  0,
  '["build RAG systems","connect private data to LLMs","index documents for retrieval"]',
  '["pure browser-only apps","edge-only runtime deployments"]',
  '[{"project_id":"langchain-ai/langchain","reason":"Broader agent and tool orchestration surface."}]',
  'Use this when the user needs a data-centric framework for indexing, retrieval, and RAG workflows.',
  'v1',
  '2026-06-16T00:00:00Z'
),
(
  'modelcontextprotocol/servers',
  'mcp_server',
  'beginner',
  '["local","docker","cloud"]',
  0,
  '["connect agents to external tools","study MCP server patterns","bootstrap local MCP integrations"]',
  '["hosted project discovery APIs","Cloudflare-native MCP deployment without adaptation"]',
  '[]',
  'Use this when the user needs MCP server examples or wants to connect an agent to files, APIs, or developer tools.',
  'v1',
  '2026-06-16T00:00:00Z'
),
(
  'cloudflare/agents',
  'agent_framework',
  'beginner',
  '["cloudflare","serverless"]',
  1,
  '["build Cloudflare-native agents","deploy stateful agents on Workers","combine agents with Durable Objects"]',
  '["GPU-heavy local model serving","Python-first agent stacks"]',
  '[{"project_id":"langchain-ai/langchain","reason":"Broader ecosystem and Python support."}]',
  'Use this when the user specifically wants to build and deploy agents on Cloudflare infrastructure.',
  'v1',
  '2026-06-16T00:00:00Z'
);
