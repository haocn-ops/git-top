import { ArrowUpRight, GitCompare, Network, Rocket, ShieldCheck } from "lucide-react";
import { generateAlternatives } from "../../../../src/alternatives";
import { compareProjectKnowledge, buildKnowledgeGraph } from "../../../../src/graph";
import { toProjectKnowledgeView } from "../../../../src/project-view";
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
  const project = seedProjects.find((item) => item.project.id === id || item.project.fullName === id) ?? seedProjects[0];
  const view = toProjectKnowledgeView(project);
  const alternativeIds = new Set([
    ...project.agentCard.alternatives.map((item) => item.project_id),
    ...generateAlternatives(project, seedProjects, 4).map((item) => item.project_id)
  ]);
  const alternatives = seedProjects.filter((item) => alternativeIds.has(item.project.id)).map(toProjectKnowledgeView);
  const compare = compareProjectKnowledge([project, ...seedProjects.filter((item) => alternativeIds.has(item.project.id)).slice(0, 3)], {
    deployment: view.deployments.includes("cloudflare") ? "cloudflare" : undefined
  });
  const graph = buildKnowledgeGraph([project, ...seedProjects.filter((item) => alternativeIds.has(item.project.id))], project.project.id, 18);

  return (
    <div className="page-stack">
      <header className="project-hero">
        <div>
          <p className="eyebrow">Project Knowledge</p>
          <h1>{view.repo}</h1>
          <p className="large-copy">{view.overview}</p>
          <div className="tag-list">
            {[...view.category, ...view.tags.slice(0, 8)].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <a className="button primary" href={`/api/project/${view.repo}`}>
          <ArrowUpRight size={17} aria-hidden="true" />
          <span>Agent API</span>
        </a>
      </header>

      <section className="score-grid">
        <Score label="Agent Score" value={`${view.agentScore}/100`} />
        <Score label="Documentation" value={view.agentScoreBreakdown.documentation} />
        <Score label="Maintenance" value={view.agentScoreBreakdown.maintenance} />
        <Score label="Deployment" value={view.agentScoreBreakdown.deployment} />
        <Score label="Quality" value={`${view.qualityScore}/100`} />
      </section>

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

function mark(value: boolean): string {
  return value ? "Yes" : "No";
}
