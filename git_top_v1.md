# Git.Top V1 - Agent-Native GitHub Knowledge Layer

## 1. 项目定位

Git.Top 是一个面向 AI Agent 的开源项目知识层。

它的目标不是做 GitHub 导航站，也不是面向人类浏览的排行榜，而是：

```txt
GitHub -> Git.Top -> AI Agents
```

Git.Top 将 GitHub 上分散、非结构化、难以直接决策的数据，转换成 AI Agent 可以搜索、比较、推荐和调用的结构化知识。

V1 的核心问题：

- Agent 想完成某个任务时，应该用哪个开源项目？
- 这个项目适合本地部署、云端部署，还是 Cloudflare 部署？
- 这个项目维护状态如何，是否值得依赖？
- 如果这个项目不合适，有哪些替代方案？

## 2. V1 目标

V1 周期：4 周。

必须完成：

- 同步 100-500 个 GitHub AI/Agent 相关开源项目。
- 生成结构化 Agent Card。
- 提供 REST API。
- 计算 Git Score。
- 提供 MCP Server，让 Agent 直接调用。

暂不完成：

- 社区系统。
- 用户账号系统。
- 评论、收藏、点赞。
- 复杂前端门户。
- 全 GitHub 大规模爬取。

V1 的成功标准：

- AI Agent 可以通过 Git.Top API 或 MCP 工具完成项目搜索、推荐、比较和替代方案查询。
- Git.Top 返回的数据足够结构化，不需要 Agent 再重新阅读大量 README 才能做第一轮判断。

## 3. 项目范围

V1 聚焦 AI 开发者和 AI Agent 最常查找的开源项目类型。

优先收录：

- Agent framework
- Coding agent
- Browser agent
- RAG framework
- Vector database
- LLM gateway
- LLM eval
- Prompt tooling
- Workflow automation
- Local LLM runtime
- AI app template
- MCP server
- AI observability

暂不优先：

- 普通 Web framework。
- 与 AI/Agent 无关的基础库。
- 纯论文代码且长期不维护的项目。
- Star 很高但不适合 Agent 推荐决策的项目。

## 4. 核心数据模型

### 4.1 Project

`Project` 保存来自 GitHub 的基础事实数据。

```json
{
  "id": "langchain-ai/langchain",
  "name": "langchain",
  "owner": "langchain-ai",
  "full_name": "langchain-ai/langchain",
  "github_url": "https://github.com/langchain-ai/langchain",
  "homepage_url": "https://www.langchain.com/",
  "description": "Build context-aware reasoning applications",
  "language": "Python",
  "topics": ["llm", "agents", "rag"],
  "license": "MIT",
  "stars": 100000,
  "forks": 16000,
  "open_issues": 1000,
  "default_branch": "master",
  "created_at": "2020-01-01T00:00:00Z",
  "updated_at": "2026-06-01T00:00:00Z",
  "pushed_at": "2026-06-01T00:00:00Z",
  "synced_at": "2026-06-16T00:00:00Z"
}
```

字段说明：

- `id`：使用 GitHub `owner/name`，方便 Agent 直接识别。
- `full_name`：与 GitHub API 保持一致。
- `topics`：来自 GitHub topics，并可由 Git.Top 补充标准化标签。
- `synced_at`：Git.Top 最近一次同步时间。

### 4.2 Agent Card

`Agent Card` 是 Git.Top 的核心资产。它不是简单摘要，而是给 Agent 做决策用的结构化项目说明。

```json
{
  "project_id": "langchain-ai/langchain",
  "category": "agent_framework",
  "difficulty": "intermediate",
  "deployment": ["local", "docker", "cloud"],
  "cloudflare_ready": false,
  "use_cases": [
    "build RAG applications",
    "orchestrate LLM tools",
    "prototype agent workflows"
  ],
  "not_good_for": [
    "minimal single-file LLM scripts",
    "edge-only Cloudflare Workers deployment"
  ],
  "alternatives": [
    {
      "project_id": "run-llama/llama_index",
      "reason": "better suited for data-centric RAG workflows"
    }
  ],
  "maintenance_score": 86,
  "git_score": 91,
  "summary_for_agent": "Use this when the user needs a broad Python framework for building context-aware LLM applications with tools, retrieval, and workflow primitives.",
  "generated_at": "2026-06-16T00:00:00Z",
  "schema_version": "v1"
}
```

### 4.3 枚举约束

`category` V1 枚举：

- `agent_framework`
- `coding_agent`
- `browser_agent`
- `rag_framework`
- `vector_database`
- `llm_gateway`
- `llm_eval`
- `prompt_tooling`
- `workflow_automation`
- `local_llm_runtime`
- `ai_app_template`
- `mcp_server`
- `ai_observability`
- `other`

`difficulty` V1 枚举：

- `beginner`
- `intermediate`
- `advanced`

`deployment` V1 枚举：

- `local`
- `docker`
- `cloud`
- `serverless`
- `cloudflare`
- `vercel`
- `kubernetes`
- `library_only`

`cloudflare_ready` 判断标准：

- `true`：项目可以直接运行在 Cloudflare Workers、Pages、D1、R2、Durable Objects、Queues 等 Cloudflare 平台能力上，或官方文档明确支持 Cloudflare 部署。
- `false`：项目依赖长连接、本地进程、Python runtime、GPU、Docker daemon、文件系统持久写入、原生依赖等不适合直接运行在 Cloudflare Workers 的能力。

## 5. 数据采集流程

V1 使用 GitHub API + Cloudflare Worker Cron + D1。

```txt
GitHub API
  -> Worker Cron
  -> Normalize
  -> D1
  -> Agent Card Generator
  -> API
  -> MCP
  -> AI Agents
```

### 5.1 项目发现

项目来源：

- GitHub Search API 查询关键词。
- GitHub topics。
- 手动维护的 seed list。
- 已收录项目 README 中提到的替代项目。

初始关键词：

- `ai agent`
- `llm agent`
- `rag`
- `mcp server`
- `coding agent`
- `browser agent`
- `llm eval`
- `vector database`
- `prompt engineering`
- `local llm`

### 5.2 同步频率

V1 推荐：

- 项目基础信息：每天同步 1 次。
- Star 历史快照：每天同步 1 次。
- Commit、release、issue 指标：每天同步 1 次。
- Agent Card：项目首次收录时生成，之后在 README、release 或核心指标明显变化时重新生成。

### 5.3 GitHub API 数据

需要采集：

- Repository metadata。
- Topics。
- README。
- License。
- Releases。
- Contributors。
- Commit activity。
- Issues。
- Pull requests。

V1 可以只存必要聚合结果，不需要保存完整 GitHub 原始数据。

## 6. Agent Card 生成流程

Agent Card 可以由规则 + LLM 共同生成。

### 6.1 输入

- GitHub repository metadata。
- README。
- Topics。
- Package/deployment files，例如 `package.json`、`Dockerfile`、`wrangler.toml`、`pyproject.toml`、`requirements.txt`。
- 最近 release。
- Git Score 指标。

### 6.2 输出要求

Agent Card 必须：

- 使用稳定枚举。
- 返回可机器解析 JSON。
- 明确项目适合什么、不适合什么。
- 给出替代方案和替代原因。
- 给 Agent 一句话决策摘要。

Agent Card 不应该：

- 复制 README 长文本。
- 使用模糊营销语言。
- 输出无法验证的夸张判断。
- 把 GitHub star 数当成唯一质量指标。

### 6.3 生成策略

V1 可采用两层策略：

1. 规则层：从文件、topics、语言和依赖中判断部署方式、Cloudflare readiness、主要语言。
2. LLM 层：根据 README 和元数据生成 use cases、not_good_for、summary_for_agent、alternatives。

所有 LLM 输出必须经过 JSON schema 校验。

## 7. Git Score

Git Score 衡量项目当前活跃度和可依赖性，满分 100。

V1 权重：

- 40% stars 增长。
- 20% commits。
- 15% releases。
- 15% contributors。
- 10% issue 响应。

### 7.1 计算窗口

推荐窗口：

- stars 增长：最近 30 天。
- commits：最近 30 天默认分支提交数。
- releases：最近 180 天 release 数。
- contributors：最近 90 天活跃 contributors 数。
- issue 响应：最近 90 天 issue 首次响应时间中位数。

### 7.2 子分数

每个子分数归一化为 0-100。

```txt
git_score =
  star_growth_score * 0.40 +
  commit_score * 0.20 +
  release_score * 0.15 +
  contributor_score * 0.15 +
  issue_response_score * 0.10
```

### 7.3 维护分数

`maintenance_score` 更偏向“可依赖性”，不完全等同于热度。

建议 V1：

```txt
maintenance_score =
  commit_score * 0.30 +
  release_score * 0.25 +
  contributor_score * 0.20 +
  issue_response_score * 0.15 +
  recent_push_score * 0.10
```

### 7.4 分数解释

- `90-100`：高活跃，高维护，适合优先推荐。
- `75-89`：维护良好，通常可推荐。
- `60-74`：可用，但需要提示 Agent 检查风险。
- `40-59`：低活跃，只在强匹配场景推荐。
- `0-39`：不建议默认推荐。

## 8. 数据库 Schema

V1 使用 Cloudflare D1。

### 8.1 projects

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL UNIQUE,
  github_url TEXT NOT NULL,
  homepage_url TEXT,
  description TEXT,
  language TEXT,
  topics_json TEXT NOT NULL DEFAULT '[]',
  license TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT,
  created_at TEXT,
  updated_at TEXT,
  pushed_at TEXT,
  synced_at TEXT NOT NULL
);
```

### 8.2 project_metrics

```sql
CREATE TABLE project_metrics (
  project_id TEXT PRIMARY KEY,
  stars_30d_delta INTEGER NOT NULL DEFAULT 0,
  commits_30d INTEGER NOT NULL DEFAULT 0,
  releases_180d INTEGER NOT NULL DEFAULT 0,
  contributors_90d INTEGER NOT NULL DEFAULT 0,
  issue_first_response_median_hours REAL,
  recent_push_days INTEGER,
  git_score INTEGER NOT NULL DEFAULT 0,
  maintenance_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 8.3 agent_cards

```sql
CREATE TABLE agent_cards (
  project_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  deployment_json TEXT NOT NULL DEFAULT '[]',
  cloudflare_ready INTEGER NOT NULL DEFAULT 0,
  use_cases_json TEXT NOT NULL DEFAULT '[]',
  not_good_for_json TEXT NOT NULL DEFAULT '[]',
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  summary_for_agent TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v1',
  generated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 8.4 star_snapshots

```sql
CREATE TABLE star_snapshots (
  project_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (project_id, captured_at),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 8.5 indexes

```sql
CREATE INDEX idx_projects_language ON projects(language);
CREATE INDEX idx_projects_stars ON projects(stars DESC);
CREATE INDEX idx_agent_cards_category ON agent_cards(category);
CREATE INDEX idx_agent_cards_cloudflare_ready ON agent_cards(cloudflare_ready);
CREATE INDEX idx_metrics_git_score ON project_metrics(git_score DESC);
CREATE INDEX idx_metrics_maintenance_score ON project_metrics(maintenance_score DESC);
```

## 9. REST API

API 返回 JSON，优先服务 Agent，不追求浏览器页面友好。

### 9.1 GET /api/project/:id

获取单个项目及 Agent Card。

示例：

```txt
GET /api/project/langchain-ai/langchain
```

响应：

```json
{
  "project": {},
  "agent_card": {},
  "metrics": {}
}
```

### 9.2 GET /api/search

按关键词、分类、部署方式、难度搜索。

参数：

- `q`
- `category`
- `deployment`
- `difficulty`
- `cloudflare_ready`
- `limit`

示例：

```txt
GET /api/search?q=rag&deployment=cloudflare&difficulty=beginner
```

### 9.3 GET /api/trending

返回 Git Score 排名前列项目。

参数：

- `category`
- `window`
- `limit`

示例：

```txt
GET /api/trending?category=agent_framework&limit=20
```

### 9.4 GET /api/category/:name

返回某个分类下的项目。

示例：

```txt
GET /api/category/rag_framework
```

### 9.5 GET /api/recommend

根据 Agent 的意图推荐项目。这是 V1 最重要的 Agent-native API。

参数：

- `use_case`：用户要完成的任务。
- `deployment`：期望部署方式。
- `difficulty`：期望难度。
- `language`：偏好语言。
- `cloudflare_ready`：是否必须适配 Cloudflare。
- `limit`：返回数量。

示例：

```txt
GET /api/recommend?use_case=build%20a%20browser%20agent&deployment=cloudflare&limit=5
```

响应：

```json
{
  "query": {
    "use_case": "build a browser agent",
    "deployment": "cloudflare"
  },
  "recommendations": [
    {
      "project_id": "example/browser-agent",
      "score": 87,
      "reason": "Matches browser agent use case and has documented serverless deployment path.",
      "tradeoffs": ["Cloudflare Workers runtime support needs manual verification."]
    }
  ]
}
```

### 9.6 GET /api/alternatives/:id

返回替代项目。

示例：

```txt
GET /api/alternatives/langchain-ai/langchain
```

## 10. MCP Server

MCP 是 Git.Top 的核心入口之一。V1 MCP 工具应该直接映射 Agent 的真实任务。

### 10.1 search_projects

按关键词和过滤条件搜索项目。

输入：

```json
{
  "query": "rag framework",
  "category": "rag_framework",
  "deployment": "cloudflare",
  "difficulty": "beginner",
  "limit": 10
}
```

输出：

```json
{
  "projects": []
}
```

### 10.2 recommend_project

根据用例推荐项目。

输入：

```json
{
  "use_case": "build an AI coding assistant",
  "constraints": {
    "deployment": "local",
    "language": "TypeScript",
    "difficulty": "intermediate"
  },
  "limit": 5
}
```

输出：

```json
{
  "recommendations": [
    {
      "project_id": "owner/name",
      "reason": "Why this project fits",
      "risks": ["Known tradeoff"]
    }
  ]
}
```

### 10.3 find_alternatives

查找某项目替代方案。

输入：

```json
{
  "project_id": "owner/name",
  "reason": "needs easier deployment",
  "limit": 5
}
```

### 10.4 get_project_card

返回完整 Agent Card。

输入：

```json
{
  "project_id": "owner/name"
}
```

### 10.5 compare_projects

比较多个项目。

输入：

```json
{
  "project_ids": ["owner/a", "owner/b", "owner/c"],
  "criteria": ["deployment", "maintenance", "difficulty", "cloudflare_ready"]
}
```

输出应包含：

- 每个项目的优点。
- 每个项目的风险。
- 推荐排序。
- 适用场景差异。

## 11. 前端范围

V1 可以有轻量前端，但不是核心。

前端只需要支持：

- 搜索项目。
- 查看项目 Agent Card。
- 查看 Trending。
- 按 category 浏览。

前端不需要支持：

- 用户登录。
- 社区互动。
- 评论、收藏、点赞。
- 复杂 SEO 内容页。

V1 的主要用户不是人类点击浏览，而是 Agent 调 API。

## 12. Cloudflare 架构

推荐 V1 技术栈：

- Cloudflare Workers：API 和 MCP。
- Cloudflare D1：结构化数据。
- Cloudflare Cron Triggers：定时同步 GitHub。
- Cloudflare KV：缓存 GitHub API 响应和 API 热点查询。
- Cloudflare R2：可选，用于保存 README 快照或生成中间件。

### 12.1 Worker 模块

建议拆分：

- `src/api`：REST API routes。
- `src/mcp`：MCP tools。
- `src/github`：GitHub API client。
- `src/scoring`：Git Score 和 maintenance score。
- `src/cards`：Agent Card generation and validation。
- `src/db`：D1 queries。
- `src/cron`：定时同步任务。

## 13. 质量要求

V1 的关键质量不是页面好看，而是数据可信。

必须保证：

- API response schema 稳定。
- Agent Card JSON 可校验。
- Score 可解释。
- 同步任务可重试。
- GitHub rate limit 有处理。
- API 有基础缓存。
- MCP 工具返回简洁、结构化、可行动。

风险：

- GitHub Search API rate limit。
- LLM 生成内容不稳定。
- 项目分类不准确。
- 只看 star 容易导致推荐偏差。
- Cloudflare readiness 判断可能需要人工校验。

缓解：

- 使用 seed list 控制 V1 数据质量。
- 枚举字段全部 schema 校验。
- 重要项目人工复核。
- API response 保留 `generated_at` 和 `synced_at`。
- 对低置信字段增加 `confidence`，V1 可后续补充。

## 14. 4 周开发计划

### Week 1 - 数据层和同步

目标：

- 建立 Cloudflare Worker + D1 项目。
- 创建 D1 schema。
- 实现 GitHub API client。
- 实现 seed list。
- 同步首批 100 个项目。
- 保存基础 Project 数据。

交付：

- `projects` 表有可用数据。
- Cron 可以定时同步。
- 本地可运行同步脚本。

### Week 2 - Score 和 Agent Card

目标：

- 实现 Git Score。
- 实现 maintenance score。
- 实现 Agent Card schema。
- 实现 Agent Card 生成流程。
- 完成 100 个项目的 Agent Card。

交付：

- 每个项目有 `agent_card`。
- 每个项目有 `git_score` 和 `maintenance_score`。
- JSON schema 校验通过。

### Week 3 - API 和 MCP

目标：

- 实现 REST API。
- 实现 MCP Server。
- 增加搜索、推荐、替代方案、比较工具。
- 增加缓存和基础错误处理。

交付：

- Agent 可以调用 `/api/recommend`。
- MCP 工具可以在本地 Agent 环境中使用。
- API 返回稳定 JSON。

### Week 4 - 数据质量和发布

目标：

- 扩展到 300-500 个项目。
- 人工复核 Top 50 项目。
- 完善文档。
- 部署到 Cloudflare。
- 准备示例 Agent 调用。

交付：

- 线上 API。
- 线上 MCP endpoint 或可安装 MCP server。
- 示例调用文档。
- V1 数据集。

## 15. 验收标准

V1 完成时，应满足：

- 至少 100 个 AI/Agent 项目可查询。
- 每个项目都有 Project、Agent Card、Git Score。
- `/api/project/:id`、`/api/search`、`/api/trending`、`/api/category/:name`、`/api/recommend` 可用。
- MCP 工具 `search_projects`、`recommend_project`、`find_alternatives`、`get_project_card`、`compare_projects` 可用。
- Agent 可以根据 use case 获得推荐理由和替代方案。
- Cloudflare Worker + D1 部署成功。

## 16. 后续版本方向

V1 之后可以扩展：

- 项目语义向量搜索。
- README 和 docs chunking。
- 项目间依赖图谱。
- Agent benchmark 数据。
- 人工校正后台。
- 项目作者 claim 页面。
- Public dataset export。
- 更细粒度 Cloudflare deployability analysis。
- 每个项目的 Agent integration recipe。

## 17. 一句话原则

Git.Top V1 的判断标准不是“用户能不能逛”，而是：

```txt
Agent 能不能少读 10 个 README，直接做出更好的开源项目选择。
```
