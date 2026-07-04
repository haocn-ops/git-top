# Git.Top SDK-Oriented Examples

These examples show how an agent client can call Git.Top without depending on a generated SDK. They use built-in `fetch` in TypeScript and the Python standard library so they can be copied into agent runtimes, eval fixtures, or integration tests.

Production base URL:

```txt
https://git.top
```

Local base URL:

```txt
http://localhost:8787
```

## Client Rules

- Run a trust preflight before high-confidence recommendations.
- Use `require_d1=true` on production reads that should fail closed instead of using seed fallback.
- Treat `metadata.source !== "d1"` as fallback-backed and disclose it.
- Inspect `quality_signal_confidence`, classification evidence, recommendation `confidence`, risk flags, and unmatched constraints before answering.
- Prefer normalized evidence fields when present: `evidence`, `caveats`, `confidence_reason`, `source_fields`, and `last_verified_at`.
- Prefer canonical repo ids such as `cloudflare/agents` in follow-up project, score, graph, alternatives, and compare calls.

## TypeScript REST Client

```ts
type GitTopMetadata = {
  source?: "d1" | "seed";
  reason?: string;
  project_count?: number;
  warnings?: string[];
};

type GitTopResponse = {
  metadata?: GitTopMetadata;
};

type Recommendation = {
  repo: string;
  decision_summary?: string;
  confidence?: "high" | "medium" | "low";
  risk_flags?: string[];
  unmatched_constraints?: string[];
  confidence_reason?: string;
  caveats?: string[];
  quality_signal_confidence?: Record<string, string>;
  evidence?: {
    source_fields?: string[];
    caveats?: string[];
    confidence_reason?: string;
    last_verified_at?: string | null;
  };
};

const baseUrl = "https://git.top";

async function gitTopJson<T extends GitTopResponse>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: "application/json" }
  });
  const body = (await response.json()) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const message = body.error?.message ?? `Git.Top request failed: ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function requireD1<T extends GitTopResponse>(body: T): T {
  if (body.metadata?.source !== "d1") {
    throw new Error(`Git.Top response is not D1-backed: ${body.metadata?.source ?? "unknown"}`);
  }
  return body;
}

export async function recommendCloudflareAgentFramework() {
  const trust = await gitTopJson<{
    decision: "allow" | "caution" | "block";
    production_ready: boolean;
    metadata: GitTopMetadata;
  }>("/api/trust");

  if (trust.decision === "block") {
    throw new Error("Git.Top Trust Gate blocks high-confidence recommendations.");
  }

  const recommendations = requireD1(
    await gitTopJson<{
      recommendations: Recommendation[];
      metadata: GitTopMetadata;
    }>("/api/recommend?deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=3&require_d1=true")
  );

  const top = recommendations.recommendations[0];
  if (!top) {
    throw new Error("Git.Top returned no recommendations.");
  }

  const score = requireD1(
    await gitTopJson<{
      project_id: string;
      score_confidence: { level: "high" | "medium" | "low"; reasons: string[] };
      risk_flags: string[];
      metadata: GitTopMetadata;
    }>(`/api/score/${encodeURIComponent(top.repo)}?require_d1=true`)
  );

  return {
    repo: top.repo,
    summary: top.decision_summary,
    confidence: top.confidence,
    confidenceReason: top.confidence_reason,
    riskFlags: [...(top.risk_flags ?? []), ...(top.caveats ?? []), ...score.risk_flags],
    scoreConfidence: score.score_confidence.level,
    dataSource: recommendations.metadata.source
  };
}
```

## TypeScript MCP Client

MCP tool results are JSON-RPC responses. Git.Top tool content is JSON serialized inside text content blocks for broad MCP client compatibility; parse `content[].text` as JSON before reading fields.

```ts
type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

class GitTopMcpError extends Error {
  constructor(
    message: string,
    readonly code?: number
  ) {
    super(message);
  }
}

async function callGitTopTool<T>(name: string, arguments_: Record<string, unknown>): Promise<T> {
  const response = await fetch("https://git.top/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: arguments_ }
    })
  });
  const rpc = (await response.json()) as JsonRpcResponse<{ content?: Array<{ type: string; text?: string }> }>;
  if (rpc.error) throw new GitTopMcpError(rpc.error.message, rpc.error.code);
  const text = rpc.result?.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Git.Top MCP tool returned no text content.");
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error("Git.Top MCP tool returned non-JSON text content.", { cause: error });
  }
}

export async function getProjectThroughMcp() {
  return callGitTopTool("get_project", {
    owner: "cloudflare",
    repo: "agents",
    require_d1: true
  });
}

export async function getBenchmarkThroughMcp() {
  return callGitTopTool("get_public_benchmark", {
    require_d1: true
  });
}
```

## Python REST Client

```python
from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE_URL = "https://git.top"


def git_top_json(path: str) -> dict[str, Any]:
    request = Request(f"{BASE_URL}{path}", headers={"accept": "application/json"})
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = {"error": {"message": body}}
        message = payload.get("error", {}).get("message", f"Git.Top request failed: {exc.code}")
        raise RuntimeError(message) from exc


def require_d1(payload: dict[str, Any]) -> dict[str, Any]:
    source = payload.get("metadata", {}).get("source")
    if source != "d1":
        raise RuntimeError(f"Git.Top response is not D1-backed: {source or 'unknown'}")
    return payload


def recommend_browser_agent() -> dict[str, Any]:
    trust = git_top_json("/api/trust")
    if trust.get("decision") == "block":
        raise RuntimeError("Git.Top Trust Gate blocks high-confidence recommendations.")

    recommendations = require_d1(
        git_top_json(
            "/api/recommend?use_case=build%20browser%20automation%20agents"
            "&deployment=docker&category=browser_agent&limit=3&require_d1=true"
        )
    )
    top = recommendations["recommendations"][0]

    score = require_d1(
        git_top_json(f"/api/score/{quote(top['repo'], safe='')}?require_d1=true")
    )

    return {
        "repo": top["repo"],
        "summary": top.get("decision_summary"),
        "confidence": top.get("confidence"),
        "risk_flags": [*top.get("risk_flags", []), *score.get("risk_flags", [])],
        "score_confidence": score.get("score_confidence", {}).get("level"),
        "data_source": recommendations["metadata"]["source"],
    }
```

## Python Compare Flow

```python
from urllib.parse import quote


def compare_candidates(repos: list[str], deployment: str) -> dict[str, Any]:
    encoded_repos = ",".join(quote(repo, safe="/") for repo in repos)
    result = require_d1(
        git_top_json(
            f"/api/compare?repos={encoded_repos}&deployment={quote(deployment)}&require_d1=true"
        )
    )
    return {
        "summary": result.get("summary"),
        "winner": result.get("winner"),
        "decision_matrix": result.get("decision_matrix", []),
        "next_actions": result.get("next_actions", []),
        "data_source": result["metadata"]["source"],
    }
```

## Answer Pattern

When using these client helpers in an agent answer, include:

- Recommended repo.
- Why it matches the task.
- Caveats from `risk_flags`, `unmatched_constraints`, or `score_confidence.reasons`.
- One alternative or compare result when available.
- Data source, ideally `metadata.source=d1`.

Example:

```txt
Use cloudflare/agents for a Cloudflare Workers-native agent runtime. Git.Top returned D1-backed data, high recommendation confidence, and score evidence suitable for shortlist ranking. Caveat: compare against langchain-ai/langgraph if you need a broader Python graph workflow ecosystem.
```
