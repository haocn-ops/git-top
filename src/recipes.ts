export interface AgentRecipeStep {
  label: string;
  endpoint: string;
  method: "GET" | "POST";
  command: string;
  inspect: string[];
}

export interface AgentRecipe {
  id: string;
  title: string;
  useCase: string;
  outcome: string;
  steps: AgentRecipeStep[];
  trustChecks: string[];
}

export interface AgentRecipes {
  name: string;
  positioning: string;
  summary: string;
  recipes: AgentRecipe[];
}

export function buildAgentRecipes(): AgentRecipes {
  return {
    name: "Git.Top Agent Recipes",
    positioning: "The Knowledge Graph of Open Source",
    summary: "Executable REST and MCP-oriented recipes for common open-source knowledge tasks: choose, compare, replace, inspect graph context, explore ecosystems, map Atlas journeys, check trust, and plan project stacks.",
    recipes: [
      {
        id: "choose-cloudflare-agent-framework",
        title: "Choose A Cloudflare-ready Agent Framework",
        useCase: "A user wants an agent framework that fits Cloudflare or serverless deployment.",
        outcome: "Return a shortlist, explain why the top project fits, and cite deployment and confidence evidence.",
        steps: [
          step("Check live data", "GET", "/api/health", "curl https://git.top/api/health", ["db", "metadata.source", "sync_freshness"]),
          step(
            "Build selection workflow",
            "GET",
            "/api/workflow",
            'curl "https://git.top/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&limit=5&require_d1=true"',
            ["recommended_sequence", "shortlist", "trust_policy"]
          ),
          step("Inspect top project", "GET", "/api/project/cloudflare/agents", "curl https://git.top/api/project/cloudflare/agents?require_d1=true", ["classification", "quality_signal_confidence", "related"]),
          step("Compare likely candidates", "GET", "/api/compare", 'curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare&require_d1=true"', ["decision_matrix", "winner", "reasoning"])
        ],
        trustChecks: ["metadata.source=d1", "classification.cloudflare_ready.evidence", "recommendations[].confidence", "quality_signal_confidence"]
      },
      {
        id: "find-project-alternatives",
        title: "Find Alternatives To A Known Project",
        useCase: "A user names a project and asks for replacements or adjacent options.",
        outcome: "Return direct substitutes and adjacent options with replacement risk and next comparison links.",
        steps: [
          step("Resolve project", "GET", "/api/project/:project", "curl https://git.top/api/project/claude-code?require_d1=true", ["repo", "resolved_from", "metadata.source"]),
          step("Fetch alternatives", "GET", "/api/alternatives/:project", "curl https://git.top/api/alternatives/claude-code?limit=8&require_d1=true", ["alternative_matches", "replacement_risk", "comparison_links"]),
          step("Compare shortlist", "GET", "/api/compare", 'curl "https://git.top/api/compare?repos=anthropics/claude-code,sst/opencode&deployment=local&require_d1=true"', ["decision_matrix", "tradeoffs", "winner"])
        ],
        trustChecks: ["alternative_matches[].similarity_score", "alternative_matches[].match_signals", "replacement_risk", "metadata.source"]
      },
      {
        id: "compare-shortlist",
        title: "Compare A Shortlist",
        useCase: "A user already has two or more candidate repositories.",
        outcome: "Return a decision matrix and next actions instead of a star-only ranking.",
        steps: [
          step("Fetch comparison", "GET", "/api/compare", 'curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain,run-llama/llama_index&deployment=cloudflare&require_d1=true"', ["summary", "decision_matrix", "winner", "reasoning"]),
          step("Explain score", "GET", "/api/score/:project", "curl https://git.top/api/score/cloudflare/agents?require_d1=true", ["dimensions", "score_confidence", "risk_flags"]),
          step("Inspect graph context", "GET", "/api/graph/:project", "curl https://git.top/api/graph/cloudflare/agents?limit=18&require_d1=true", ["relationship_groups", "graph_stats", "next_actions"])
        ],
        trustChecks: ["context.deployment", "decision_matrix[].tradeoffs", "score_confidence.level", "relationship_groups"]
      },
      {
        id: "inspect-project-graph",
        title: "Inspect Project Graph Context",
        useCase: "A user wants to understand a project's alternatives, dependencies, related projects, and deployment targets.",
        outcome: "Return the graph summary, grouped relationships, and follow-up links.",
        steps: [
          step("Fetch graph", "GET", "/api/graph/:project", "curl https://git.top/api/graph/browser-use/browser-use?limit=24&require_d1=true", ["summary", "graph_stats", "relationship_groups", "nodes", "edges"]),
          step("Open human page", "GET", "/graph/:project", "curl https://git.top/graph/browser-use/browser-use", ["Project overview", "relationship legend", "exploration paths"]),
          step("Fetch alternatives", "GET", "/api/alternatives/:project", "curl https://git.top/api/alternatives/browser-use/browser-use?limit=6&require_d1=true", ["fit_summary", "adoption_notes", "replacement_risk"])
        ],
        trustChecks: ["graph_stats.relationship_counts", "relationship_groups.dependencies", "metadata.source"]
      },
      {
        id: "explore-ecosystem",
        title: "Explore An Ecosystem",
        useCase: "A user asks for a map of Cloudflare, MCP, RAG, AI agents, or Browser AI.",
        outcome: "Return representative projects, concept nodes, exploration paths, comparison paths, and next journeys.",
        steps: [
          step("Fetch Atlas", "GET", "/api/atlas/:ecosystem", "curl https://git.top/api/atlas/cloudflare?limit=8&require_d1=true", ["ecosystem.stats", "map.nodes", "map.edges", "exploration_paths", "comparison_paths"]),
          step("Browse human map", "GET", "/atlas/:ecosystem", "curl https://git.top/atlas/cloudflare", ["representative projects", "journeys", "comparison paths", "map"]),
          step("Recommend within ecosystem", "GET", "/api/recommend", 'curl "https://git.top/api/recommend?use_case=build%20Cloudflare-ready%20AI%20agents&deployment=cloudflare&category=agent_framework&cloudflare_ready=true&require_d1=true"', ["recommendations", "fit_profile", "risk_flags"])
        ],
        trustChecks: ["stats.project_count", "exploration_paths", "comparison_paths[].context", "recommendations[].confidence", "metadata.source"]
      },
      {
        id: "map-ecosystem-to-comparison",
        title: "Map An Ecosystem To Comparison Paths",
        useCase: "A user wants to move from an ecosystem map to concrete candidate comparisons.",
        outcome: "Return ecosystem-specific comparison paths, run the selected Compare JSON, and cite why the shortlist was chosen.",
        steps: [
          step("Fetch journey index", "GET", "/api/journeys", "curl https://git.top/api/journeys?limit=8&require_d1=true", ["journeys", "comparison_paths", "stats.comparison_path_count", "metadata.source"]),
          step("Fetch ecosystem map", "GET", "/api/atlas/:ecosystem", "curl https://git.top/api/atlas/cloudflare?limit=8&require_d1=true", ["ecosystem.comparison_paths", "ecosystem.map.nodes", "ecosystem.stats"]),
          step("Run comparison path", "GET", "/api/compare", 'curl "https://git.top/api/compare?repos=cloudflare/agents,langchain-ai/langchain&deployment=cloudflare&require_d1=true"', ["summary", "decision_matrix", "winner", "next_actions"])
        ],
        trustChecks: ["comparison_paths[].repos", "comparison_paths[].decision_focus", "decision_matrix[].tradeoffs", "metadata.source=d1"]
      },
      {
        id: "check-recommendation-trust",
        title: "Check Recommendation Trust",
        useCase: "A user or agent needs to know whether recommendations are safe to cite.",
        outcome: "Return release score, data trust score, risk level, and disclosure guidance.",
        steps: [
          step("Fetch health", "GET", "/api/health", "curl https://git.top/api/health", ["db", "metadata.source", "sync_health", "sync_freshness"]),
          step("Fetch quality report", "GET", "/api/quality", "curl https://git.top/api/quality?require_d1=true", ["release_score", "data_trust_score", "risk_level", "improvement_plan", "coverage", "issues"]),
          step("Fetch review queue", "GET", "/api/quality/review", "curl https://git.top/api/quality/review?require_d1=true", ["review_count", "items", "impact_score"]),
          step("Fetch coverage page", "GET", "/coverage", "curl https://git.top/coverage", ["category distribution", "collection semantics", "use boundaries"])
        ],
        trustChecks: ["release_score", "data_trust_score", "risk_summary.reasons", "improvement_plan", "coverage.low_confidence_classification_rate"]
      },
      {
        id: "plan-with-grp",
        title: "Plan With Graph Reasoning",
        useCase: "A user asks for a plan, stack, or project set rather than a single repository.",
        outcome: "Return graph-grounded paths or stacks, then validate candidate projects through normal APIs.",
        steps: [
          step("Run GRP", "POST", "/api/grp/query", 'curl -X POST "https://git.top/api/grp/query?require_d1=true" -H "content-type: application/json" -d \'{"goal":"compose an autonomous coding stack with MCP tools","mode":"compose","constraints":{"agent_ready":true}}\'', ["solution_paths", "recommended_stack", "nodes", "metadata.data_source"]),
          step("Inspect candidate", "GET", "/api/project/:project", "curl https://git.top/api/project/cloudflare/agents?require_d1=true", ["classification", "related", "quality_signal_confidence"]),
          step("Compare final stack candidates", "GET", "/api/compare", 'curl "https://git.top/api/compare?repos=cloudflare/agents,github/github-mcp-server&require_d1=true"', ["decision_matrix", "next_actions"])
        ],
        trustChecks: ["metadata.data_source", "nodes[].repo", "classification evidence", "comparison tradeoffs"]
      }
    ]
  };
}

export function renderRecipesPage(): Response {
  const recipes = buildAgentRecipes();
  return new Response(renderHtml(recipes), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}

function step(label: string, method: "GET" | "POST", endpoint: string, command: string, inspect: string[]): AgentRecipeStep {
  return { label, method, endpoint, command, inspect };
}

function renderHtml(recipes: AgentRecipes): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Git.Top Agent Recipes | Open Source Knowledge Workflows</title>
    <meta name="description" content="Executable Git.Top agent recipes for recommendations, alternatives, comparisons, graph context, Atlas ecosystems, trust checks, and GRP planning." />
    <link rel="canonical" href="https://git.top/recipes" />
    <meta property="og:title" content="Git.Top Agent Recipes" />
    <meta property="og:description" content="Reusable REST and MCP-oriented workflows for open-source project knowledge tasks." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://git.top/recipes" />
    <meta property="og:image" content="https://git.top/og.svg?title=Git.Top%20Agent%20Recipes&subtitle=Project%20selection%20workflows" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://git.top/og.svg?title=Git.Top%20Agent%20Recipes&subtitle=Project%20selection%20workflows" />
    <style>
      :root { color-scheme: light; --bg:#f7f8fb; --surface:#fff; --ink:#182026; --muted:#5f6f78; --line:#dce4e9; --teal:#0f766e; --shadow:0 16px 42px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing:border-box; }
      body { margin:0; min-width:320px; background:var(--bg); color:var(--ink); }
      a { color:inherit; text-decoration:none; }
      h1,h2,h3,p { margin:0; }
      code,pre { border:1px solid var(--line); border-radius:8px; background:#f8fbfb; color:#244855; }
      code { padding:3px 6px; }
      pre { margin:0; padding:12px; overflow:auto; white-space:pre-wrap; line-height:1.5; }
      .page { max-width:1180px; margin:0 auto; padding:22px; }
      .nav { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
      .brand { display:flex; align-items:center; gap:10px; font-weight:900; }
      .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px; background:#e6f3ef; color:var(--teal); }
      .nav-links,.actions,.tag-list { display:flex; gap:9px; flex-wrap:wrap; }
      .nav-links { color:#40505a; font-weight:800; }
      .hero,.panel,.recipe { border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
      .hero { display:grid; gap:14px; padding:20px; background:linear-gradient(135deg,rgba(15,118,110,.12),rgba(255,255,255,.96)); }
      .eyebrow { color:#0b5d56; font-size:12px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
      h1 { max-width:920px; font-size:clamp(34px,6vw,64px); line-height:1; }
      h2 { font-size:22px; line-height:1.2; }
      h3 { font-size:17px; line-height:1.2; }
      .lead,.muted,li { color:#40505a; line-height:1.6; }
      .lead { max-width:880px; font-size:18px; }
      .button,.tag { display:inline-flex; align-items:center; justify-content:center; min-height:34px; border:1px solid var(--line); border-radius:8px; background:#fff; font-weight:900; padding:7px 10px; }
      .button.primary { border-color:var(--teal); background:var(--teal); color:#fff; }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:12px; margin-top:14px; }
      .recipes { display:grid; gap:12px; }
      .recipe,.panel { display:grid; gap:12px; padding:16px; align-content:start; }
      .recipe-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .steps { display:grid; gap:10px; }
      .step { display:grid; gap:8px; border-top:1px solid var(--line); padding-top:10px; }
      .step:first-child { border-top:0; padding-top:0; }
      .tag { border-radius:999px; min-height:28px; font-size:12px; color:#40505a; }
      .rows { display:grid; gap:8px; }
      .row { display:grid; gap:5px; border-top:1px solid var(--line); padding-top:8px; }
      .row:first-child { border-top:0; padding-top:0; }
      @media (max-width:900px) { .layout { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <div class="page">
      <nav class="nav">
        <a class="brand" href="/"><span class="brand-mark">G</span><span>Git.Top</span></a>
        <div class="nav-links"><a href="/quickstart">Quickstart</a><a href="/recipes">Recipes</a><a href="/api/recipes">JSON</a><a href="/workflow">Workflow</a><a href="/mcp">MCP</a></div>
      </nav>

      <header class="hero">
        <p class="eyebrow">Agent Recipes</p>
        <h1>Reusable workflows for open-source knowledge tasks.</h1>
        <p class="lead">${escapeHtml(recipes.summary)}</p>
        <div class="actions">
          <a class="button primary" href="/api/recipes">Open Recipes JSON</a>
          <a class="button" href="/quickstart">Quickstart</a>
          <a class="button" href="/api/agent-map">Agent Map</a>
          <a class="button" href="/api/workflow?intent=choose%20a%20Cloudflare-ready%20agent%20framework&amp;deployment=cloudflare&amp;category=agent_framework&amp;cloudflare_ready=true&amp;limit=5&amp;require_d1=true">Try Workflow</a>
        </div>
      </header>

      <main class="layout">
        <section class="recipes">
          ${recipes.recipes.map(recipeCard).join("")}
        </section>
        <aside class="panel">
          <p class="eyebrow">How To Use</p>
          <h2>Pick a recipe, run the steps, cite trust fields</h2>
          <p class="muted">Recipes are intentionally small. Agents should still inspect project-level evidence, data source metadata, and confidence fields before giving a final recommendation.</p>
          <div class="rows">
            ${recipes.recipes.map((recipe) => `<a class="button" href="#${escapeAttr(recipe.id)}">${escapeHtml(recipe.title)}</a>`).join("")}
          </div>
        </aside>
      </main>
    </div>
  </body>
</html>`;
}

function recipeCard(recipe: AgentRecipe): string {
  return `<article class="recipe" id="${escapeAttr(recipe.id)}">
    <div class="recipe-top">
      <div><p class="eyebrow">${escapeHtml(recipe.id)}</p><h2>${escapeHtml(recipe.title)}</h2></div>
      <a class="button" href="/api/recipes#${escapeAttr(recipe.id)}">JSON</a>
    </div>
    <p class="muted">${escapeHtml(recipe.useCase)}</p>
    <p><strong>Outcome:</strong> ${escapeHtml(recipe.outcome)}</p>
    <div class="steps">${recipe.steps.map(recipeStep).join("")}</div>
    <div class="tag-list">${recipe.trustChecks.map((check) => `<span class="tag">${escapeHtml(check)}</span>`).join("")}</div>
  </article>`;
}

function recipeStep(item: AgentRecipeStep): string {
  return `<div class="step">
    <div class="tag-list"><span class="tag">${escapeHtml(item.method)}</span><span class="tag">${escapeHtml(item.endpoint)}</span><strong>${escapeHtml(item.label)}</strong></div>
    <pre>${escapeHtml(item.command)}</pre>
    <div class="tag-list">${item.inspect.map((field) => `<span class="tag">${escapeHtml(field)}</span>`).join("")}</div>
  </div>`;
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
