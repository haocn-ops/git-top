import Link from "next/link";
import { ArrowUpRight, Box, Cloud, GitPullRequest, Network, Rocket, Search, ShieldCheck, Star, UsersRound } from "lucide-react";
import { seedProjects } from "../../src/seed";
import { toProjectKnowledgeView } from "../../src/project-view";

export default function ProjectsPage() {
  const featured = toProjectKnowledgeView(seedProjects.find((item) => item.project.id === "cloudflare/agents") ?? seedProjects[0]);
  const related = seedProjects.map(toProjectKnowledgeView);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project Knowledge</p>
          <h1>{featured.repo}</h1>
        </div>
        <div className="header-actions">
          <a className="button secondary" href={`/api/project/${featured.repo}`}>
            <Box size={17} aria-hidden="true" />
            <span>JSON</span>
          </a>
          <a className="button primary" href="/api/search?q=cloudflare%20agent%20framework">
            <Search size={17} aria-hidden="true" />
            <span>Agent Search</span>
          </a>
        </div>
      </header>

      <section className="project-detail-layout">
        <article className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>What problem does it solve?</h2>
            </div>
            <span className="status-pill active">{featured.agentScore}/100 Agent Score</span>
          </div>
          <p className="large-copy">{featured.overview}</p>
          <div className="tag-list">
            {featured.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </article>

        <aside className="panel score-panel">
          <div>
            <p className="eyebrow">Quality Score</p>
            <strong>{featured.qualityScore}</strong>
            <span>/100</span>
          </div>
          <div className="quality-list">
            <span><Star size={15} aria-hidden="true" /> {featured.qualitySignals.stars.toLocaleString()} stars</span>
            <span><GitPullRequest size={15} aria-hidden="true" /> {featured.qualitySignals.recentCommits} recent commits</span>
            <span><UsersRound size={15} aria-hidden="true" /> {featured.qualitySignals.contributors} contributors</span>
            <span><Rocket size={15} aria-hidden="true" /> {featured.qualitySignals.releaseFrequency180d} releases in 180d</span>
          </div>
        </aside>
      </section>

      <section className="three-panel-grid">
        <article className="panel feature-panel">
          <div className="feature-icon"><Network size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Alternatives</p>
          <h2>Comparable projects</h2>
          <div className="simple-list">
            {(featured.alternatives.length > 0 ? featured.alternatives : related.slice(0, 3).map((item) => ({ repo: item.repo, reason: "Similar use case or category." }))).map((item) => (
              <div key={item.repo}>
                <strong>{item.repo}</strong>
                <span>{item.reason}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon"><Cloud size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Deploy</p>
          <h2>Supported deployment paths</h2>
          <div className="tag-list">
            {featured.deployments.map((deployment) => (
              <span key={deployment}>{deployment}</span>
            ))}
          </div>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon"><ShieldCheck size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Use Cases</p>
          <h2>Where agents should consider it</h2>
          <div className="simple-list">
            {featured.useCases.map((useCase) => (
              <div key={useCase}>
                <strong>{useCase}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Agent Search Results</p>
            <h2>Ranked project knowledge</h2>
          </div>
        </div>
        <div className="knowledge-table">
          <div className="knowledge-row knowledge-head">
            <span>Project</span>
            <span>Deploy</span>
            <span>Quality</span>
            <span>Agent</span>
          </div>
          {related.map((item) => (
            <div className="knowledge-row" key={item.repo}>
              <div>
                <strong>{item.repo}</strong>
                <span>{item.description}</span>
              </div>
              <span>{item.deployments.slice(0, 2).join(", ")}</span>
              <strong>{item.qualityScore}</strong>
              <strong>{item.agentScore}</strong>
            </div>
          ))}
        </div>
      </section>

      <Link className="plain-link" href="/">
        <span>Back to Git.Top v2 home</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
