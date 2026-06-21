import { ArrowUpRight, BookOpen, GitCompare, Network, Rocket, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getProjectDetailData } from "../../../../src/next-data";
import type { ProjectKnowledgeView } from "../../../../src/project-view";
import { seedProjects } from "../../../../src/seed";

export function generateStaticParams() {
  return seedProjects.map((item) => ({
    owner: item.project.owner,
    repo: item.project.name
  }));
}

export default async function ProjectKnowledgePage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const id = `${owner}/${repo}`;
  const detail = await getProjectDetailData(id);
  if (!detail) {
    notFound();
  }
  const { view, alternatives, compare, graph, metadata } = detail;

  return (
    <div className="page-stack">
      <header className="project-hero">
        <div>
          <p className="eyebrow">Project Knowledge</p>
          <h1>{view.repo}</h1>
          <p className="large-copy">{view.overview}</p>
          <div className="tag-list">
            {view.projectKind === "collection" ? <span>Collection</span> : null}
            {[...view.category, ...view.tags.slice(0, 8)].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <a className="button primary" href={`/api/project/${view.repo}`}>
          <ArrowUpRight size={17} aria-hidden="true" />
          <span>Agent API</span>
        </a>
        <span className="status-pill neutral">{metadata.source} / {metadata.reason}</span>
      </header>

      <section className="score-grid">
        <Score label="Agent Score" value={`${view.agentScore}/100`} />
        <Score label="Documentation" value={view.agentScoreBreakdown.documentation} />
        <Score label="Maintenance" value={view.agentScoreBreakdown.maintenance} />
        <Score label="Deployment" value={view.agentScoreBreakdown.deployment} />
        <Score label="Quality" value={`${view.qualityScore}/100`} />
      </section>

      {view.collectionMetadata ? (
        <section className="panel collection-detail-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collection Metadata</p>
              <h2>{collectionScopeLabel(view.collectionMetadata.scope)}</h2>
            </div>
            <BookOpen size={18} aria-hidden="true" />
          </div>
          <div className="metadata-grid four-up">
            <Meta label="Kind" value="Collection" />
            <Meta label="Estimated items" value={formatEstimatedItems(view.collectionMetadata.estimatedItems)} />
            <Meta label="Freshness" value={collectionFreshnessLabel(view.collectionMetadata.freshness)} />
            <Meta label="Curated" value={view.collectionMetadata.curated ? "Yes" : "No"} />
          </div>
        </section>
      ) : null}

      <section className="project-detail-layout">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Alternatives</p>
              <h2>Comparable projects</h2>
            </div>
            <Network size={18} aria-hidden="true" />
          </div>
          <div className="simple-list">
            {alternatives.length > 0 ? alternatives.map((item) => (
              <div key={item.repo}>
                <strong>{item.repo}</strong>
                <span>{item.overview}</span>
              </div>
            )) : (
              <div>
                <strong>No alternatives yet</strong>
                <span>Git.Top will infer alternatives as the graph grows.</span>
              </div>
            )}
          </div>
        </article>

        <aside className="panel score-panel compact-score">
          <div>
            <p className="eyebrow">Graph</p>
            <strong>{graph.nodes.length}</strong>
            <span>nodes / {graph.edges.length} edges</span>
          </div>
          <a className="button secondary" href={`/api/graph?repo=${encodeURIComponent(view.repo)}`}>
            Graph JSON
          </a>
        </aside>
      </section>

      <section className="three-panel-grid">
        <KnowledgePanel icon={<Rocket size={21} aria-hidden="true" />} eyebrow="Deploy" title="Supported deployment paths" items={view.deployments} />
        <KnowledgePanel icon={<ShieldCheck size={21} aria-hidden="true" />} eyebrow="Compatible With" title="Inferred dependencies and protocols" items={view.dependencies.length ? view.dependencies : ["LLM provider"]} />
        <KnowledgePanel icon={<GitCompare size={21} aria-hidden="true" />} eyebrow="Use Cases" title="Where agents should consider it" items={view.useCases} />
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Compare</p>
            <h2>{compare.winner} leads this context</h2>
          </div>
          <a className="plain-link" href={`/api/compare?repos=${[view.repo, ...alternatives.slice(0, 3).map((item) => item.repo)].join(",")}`}>
            <span>JSON</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="compare-table">
          <div className="compare-row compare-head">
            <span>Project</span>
            <span>Stars</span>
            <span>Agent</span>
            <span>Local</span>
            <span>Cloud</span>
            <span>Cloudflare</span>
            <span>Agent Score</span>
          </div>
          {compare.projects.map((item) => (
            <div className="compare-row" key={item.repo}>
              <strong>{item.repo}</strong>
              <span>{item.stars.toLocaleString()}</span>
              <span>{mark(item.agent)}</span>
              <span>{mark(item.local)}</span>
              <span>{mark(item.cloud)}</span>
              <span>{mark(item.cloudflare)}</span>
              <strong>{item.agentScore}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Score({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric-card compact-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function KnowledgePanel({ icon, eyebrow, title, items }: { icon: React.ReactNode; eyebrow: string; title: string; items: string[] }) {
  return (
    <article className="panel feature-panel">
      <div className="feature-icon">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="tag-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </article>
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

function mark(value: boolean): string {
  return value ? "Yes" : "No";
}
