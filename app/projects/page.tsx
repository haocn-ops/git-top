import Link from "next/link";
import { ArrowUpRight, BookOpen, Box, Cloud, GitPullRequest, Network, Rocket, Search, ShieldCheck, Star, UsersRound } from "lucide-react";
import { getProjectCollectionData } from "../../src/next-data";
import type { ProjectKnowledgeView } from "../../src/project-view";

export default async function ProjectsPage() {
  const { views: related, metadata } = await getProjectCollectionData("cloudflare agent framework", 100);
  const featured = related.find((item) => item.repo === "cloudflare/agents") ?? related[0];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project Knowledge</p>
          <h1>{featured.repo}</h1>
        </div>
        <div className="header-actions">
          <span className="status-pill neutral">{metadata.source} / {metadata.reason}</span>
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
            {featured.projectKind === "collection" ? <span>Collection</span> : null}
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
        {featured.collectionMetadata ? (
          <article className="panel feature-panel collection-panel">
            <div className="feature-icon"><BookOpen size={21} aria-hidden="true" /></div>
            <p className="eyebrow">Collection</p>
            <h2>{collectionScopeLabel(featured.collectionMetadata.scope)}</h2>
            <div className="metadata-grid">
              <Meta label="Items" value={formatEstimatedItems(featured.collectionMetadata.estimatedItems)} />
              <Meta label="Freshness" value={collectionFreshnessLabel(featured.collectionMetadata.freshness)} />
              <Meta label="Curated" value={featured.collectionMetadata.curated ? "Yes" : "No"} />
            </div>
          </article>
        ) : null}

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
            <p className="muted-copy">{metadata.projectCount} projects loaded from {metadata.source}.</p>
          </div>
        </div>
        <div className="knowledge-table">
          <div className="knowledge-row knowledge-head">
            <span>Project</span>
            <span>Kind</span>
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
              <span className={item.projectKind === "collection" ? "status-pill active" : "status-pill neutral"}>
                {item.projectKind === "collection" ? "Collection" : "Project"}
              </span>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function collectionScopeLabel(scope: NonNullable<ProjectKnowledgeView["collectionMetadata"]>["scope"]): string {
  const labels: Record<NonNullable<ProjectKnowledgeView["collectionMetadata"]>["scope"], string> = {
    awesome_list: "Awesome list",
    cookbook: "Cookbook",
    starter_collection: "Starter collection",
    integration_collection: "Integration collection",
    resource_hub: "Resource hub"
  };
  return labels[scope];
}

function collectionFreshnessLabel(freshness: NonNullable<ProjectKnowledgeView["collectionMetadata"]>["freshness"]): string {
  const labels: Record<NonNullable<ProjectKnowledgeView["collectionMetadata"]>["freshness"], string> = {
    active: "Active",
    stale: "Stale",
    unknown: "Unknown"
  };
  return labels[freshness];
}

function formatEstimatedItems(value: number | null): string {
  return value === null ? "Unknown" : value.toLocaleString();
}
