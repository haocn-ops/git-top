import { ArrowUpRight, Network } from "lucide-react";
import { notFound } from "next/navigation";
import { getProjectDetailData } from "../../../src/next-data";
import { seedProjects } from "../../../src/seed";

export function generateStaticParams() {
  return seedProjects.map((item) => ({
    project: item.project.fullName.replace("/", "-")
  }));
}

export default async function ProjectGraphPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: projectSlug } = await params;
  const detail = await getProjectDetailData(projectSlug);
  if (!detail) {
    notFound();
  }
  const { view, alternatives, graph, metadata } = detail;
  const ringNodes = graph.nodes.filter((node) => node.id !== view.repo).slice(0, 14);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project Graph</p>
          <h1>{view.repo}</h1>
        </div>
        <div className="header-actions">
          <span className="status-pill neutral">{metadata.source} / {metadata.reason}</span>
          <a className="button primary" href={`/api/graph?repo=${encodeURIComponent(view.repo)}`}>
            <ArrowUpRight size={17} aria-hidden="true" />
            <span>Graph API</span>
          </a>
        </div>
      </header>

      <section className="graph-dashboard">
        <article className="panel graph-canvas">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Knowledge Graph</p>
              <h2>{graph.nodes.length} nodes / {graph.edges.length} edges</h2>
            </div>
          </div>
          <svg className="graph-svg" viewBox="0 0 840 640" role="img" aria-label={`${view.repo} knowledge graph`}>
            {ringNodes.map((node, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(ringNodes.length, 1) - Math.PI / 2;
              const x = Math.round(420 + Math.cos(angle) * 220);
              const y = Math.round(310 + Math.sin(angle) * 220);
              return <line className="graph-edge-line" key={`edge-${node.id}`} x1="420" y1="310" x2={x} y2={y} />;
            })}
            <circle className="graph-svg-node project" cx="420" cy="310" r="74" />
            <text className="graph-svg-label" x="420" y="304" textAnchor="middle">{shortLabel(view.name, 18)}</text>
            <text className="graph-svg-label" x="420" y="324" textAnchor="middle">focus</text>
            {ringNodes.map((node, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(ringNodes.length, 1) - Math.PI / 2;
              const x = Math.round(420 + Math.cos(angle) * 220);
              const y = Math.round(310 + Math.sin(angle) * 220);
              return (
                <g key={node.id}>
                  <circle className={`graph-svg-node ${node.kind}`} cx={x} cy={y} r="48" />
                  <text className="graph-svg-label" x={x} y={y - 5} textAnchor="middle">{shortLabel(node.label, 14)}</text>
                  <text className="graph-svg-label" x={x} y={y + 13} textAnchor="middle">{node.kind.replace("_", " ")}</text>
                </g>
              );
            })}
          </svg>
        </article>

        <aside className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Alternatives Network</p>
              <h2>{view.name} alternatives</h2>
            </div>
            <Network size={18} aria-hidden="true" />
          </div>
          <div className="simple-list">
            {alternatives.length > 0 ? alternatives.map((item) => (
              <div key={item.repo}>
                <strong>{view.repo} ↔ {item.repo}</strong>
                <span>{item.overview}</span>
              </div>
            )) : (
              <div>
                <strong>No alternatives yet</strong>
                <span>Git.Top will infer alternatives as the graph grows.</span>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="three-panel-grid">
        <GraphPanel title="Deploy" items={view.deployments} />
        <GraphPanel title="Compatible With" items={view.dependencies.length ? view.dependencies : ["LLM provider"]} />
        <GraphPanel title="Use Cases" items={view.useCases} />
      </section>
    </div>
  );
}

function GraphPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel feature-panel">
      <p className="eyebrow">{title}</p>
      <div className="tag-list">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </article>
  );
}

function shortLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
