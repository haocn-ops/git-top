import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Cloud,
  GitBranch,
  Network,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
import { seedProjects } from "../src/seed";
import { calculateAgentScore } from "../src/project-view";

const categories = [
  "AI Agents",
  "MCP Servers",
  "AI IDEs",
  "AI Browsers",
  "AI Infrastructure",
  "RAG Frameworks",
  "LLM Applications"
];

const graphNodes = ["Claude Code", "MCP", "OpenRouter", "Playwright", "Browser Use", "A2A"];

export default function HomePage() {
  const trendingProjects = seedProjects.slice(0, 4);

  return (
    <div className="page-stack marketing-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">GitHub Knowledge Layer</p>
          <h1>GitHub Knowledge Layer for AI Agents</h1>
          <p className="hero-lede">Understand open source projects beyond stars. Git.Top turns GitHub repositories into structured knowledge agents can search, compare, evaluate, and deploy.</p>
          <div className="header-actions">
            <Link className="button primary" href="/projects">
              <Search size={17} aria-hidden="true" />
              <span>Explore Projects</span>
            </Link>
            <a className="button secondary" href="/api/search?q=cloudflare%20agent%20framework">
              <Braces size={17} aria-hidden="true" />
              <span>Agent API</span>
            </a>
          </div>
        </div>

        <div className="knowledge-preview" aria-label="Agent knowledge preview">
          <div className="preview-toolbar">
            <span className="status-pill active">Agent friendly</span>
            <code>GET /api/project/cloudflare/agents</code>
          </div>
          <div className="knowledge-grid">
            <div>
              <span>What</span>
              <strong>Cloudflare-native agent framework</strong>
            </div>
            <div>
              <span>Deploy</span>
              <strong>Cloudflare, serverless</strong>
            </div>
            <div>
              <span>Quality Score</span>
              <strong>82/100</strong>
            </div>
            <div>
              <span>Agent Score</span>
              <strong>83/100</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="category-strip" aria-label="Trending categories">
        {categories.map((category) => (
          <a key={category} className="category-chip" href={`/api/search?q=${encodeURIComponent(category)}`}>
            <Sparkles size={15} aria-hidden="true" />
            <span>{category}</span>
          </a>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Trending Projects</p>
          <h2>Structured signals agents can act on</h2>
        </div>
        <Link className="plain-link" href="/projects">
          <span>View knowledge layer</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="project-card-grid" aria-label="Trending projects">
        {trendingProjects.map((item) => (
          <article className="project-card" key={item.project.id}>
            <div className="project-card-top">
              <div>
                <p className="eyebrow">{item.agentCard.category.replaceAll("_", " ")}</p>
                <h3>{item.project.name}</h3>
              </div>
              <Star size={18} aria-hidden="true" />
            </div>
            <p>{item.project.description}</p>
            <div className="signal-row">
              <span>Alternative</span>
              <strong>{item.agentCard.alternatives[0]?.project_id ?? "Discoverable"}</strong>
            </div>
            <div className="signal-row">
              <span>Deploy</span>
              <strong>{item.agentCard.deployment.slice(0, 2).join(", ")}</strong>
            </div>
            <div className="score-pair">
              <div>
                <span>Quality</span>
                <strong>{item.metrics.gitScore}</strong>
              </div>
              <div>
                <span>Agent</span>
                <strong>{calculateAgentScore(item)}</strong>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="agent-grid">
        <article className="panel feature-panel">
          <div className="feature-icon">
            <Radar size={21} aria-hidden="true" />
          </div>
          <p className="eyebrow">Agent Search</p>
          <h2>“Find agent frameworks that support Cloudflare deployment.”</h2>
          <p className="muted-copy">Search ranks by use case fit, deployment target, maintenance, community, and project quality instead of keyword match alone.</p>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon">
            <Braces size={21} aria-hidden="true" />
          </div>
          <p className="eyebrow">API</p>
          <h2>One schema for project knowledge</h2>
          <code>{`{ repo, alternatives, deployments, quality_score, agent_score }`}</code>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon">
            <Network size={21} aria-hidden="true" />
          </div>
          <p className="eyebrow">Git.Top MCP</p>
          <h2>Tools agents can call directly</h2>
          <p className="muted-copy">search_projects, get_project, get_alternatives, get_deployment, and get_quality_score expose the knowledge layer to agent runtimes.</p>
        </article>
      </section>

      <section className="graph-section">
        <div>
          <p className="eyebrow">Project Graph</p>
          <h2>Relationships, dependencies, alternatives</h2>
        </div>
        <div className="graph-lines" aria-label="Project graph example">
          {graphNodes.map((node, index) => (
            <div className={index === 0 ? "graph-node root" : "graph-node"} key={node}>
              {index === 0 ? <GitBranch size={16} aria-hidden="true" /> : <Cloud size={16} aria-hidden="true" />}
              <span>{node}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-heading final-band">
        <div>
          <p className="eyebrow">Future Goal</p>
          <h2>When an agent needs open source, it asks Git.Top first.</h2>
        </div>
        <ShieldCheck size={26} aria-hidden="true" />
      </section>
    </div>
  );
}
