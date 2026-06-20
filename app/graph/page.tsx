import { ArrowUpRight, Boxes, GitCompare, Network, Rocket, ShieldCheck } from "lucide-react";
import { compareProjectKnowledge, buildKnowledgeGraph } from "../../src/graph";
import { seedProjects } from "../../src/seed";
import { toProjectKnowledgeView } from "../../src/project-view";

export default function GraphPage() {
  const focus = seedProjects.find((item) => item.project.id === "cloudflare/agents") ?? seedProjects[0];
  const graph = buildKnowledgeGraph(seedProjects, focus.project.id, 18);
  const compare = compareProjectKnowledge(seedProjects.slice(0, 4), { deployment: "cloudflare" });
  const focusView = toProjectKnowledgeView(focus);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project Knowledge Graph</p>
          <h1>Knowledge, then Graph, then Agent</h1>
        </div>
        <div className="header-actions">
          <a className="button secondary" href={`/api/graph?repo=${encodeURIComponent(focus.project.id)}`}>
            <Network size={17} aria-hidden="true" />
            <span>Graph API</span>
          </a>
          <a className="button primary" href="/mcp">
            <Boxes size={17} aria-hidden="true" />
            <span>MCP Tools</span>
          </a>
        </div>
      </header>

      <section className="graph-dashboard">
        <article className="panel graph-canvas">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Focus Graph</p>
              <h2>{focus.project.id}</h2>
            </div>
            <span className="status-pill active">{graph.nodes.length} nodes / {graph.edges.length} edges</span>
          </div>
          <div className="node-map" aria-label="Knowledge graph nodes">
            {graph.nodes.slice(0, 18).map((node) => (
              <div className={`node-token ${node.kind}`} key={node.id}>
                <span>{node.kind}</span>
                <strong>{node.label}</strong>
                {node.score ? <small>{node.score}/100</small> : null}
              </div>
            ))}
          </div>
        </article>

        <aside className="panel score-panel compact-score">
          <div>
            <p className="eyebrow">Agent Score</p>
            <strong>{focusView.agentScore}</strong>
            <span>/100</span>
          </div>
          <div className="quality-list">
            <span><ShieldCheck size={15} aria-hidden="true" /> Documentation {focusView.agentScoreBreakdown.documentation}</span>
            <span><Rocket size={15} aria-hidden="true" /> Deployment {focusView.agentScoreBreakdown.deployment}</span>
            <span><Network size={15} aria-hidden="true" /> Maintenance {focusView.agentScoreBreakdown.maintenance}</span>
          </div>
        </aside>
      </section>

      <section className="three-panel-grid">
        <article className="panel feature-panel">
          <div className="feature-icon"><Network size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Alternatives</p>
          <h2>Relationship data, not a repo list</h2>
          <div className="simple-list">
            {focusView.alternatives.map((alternative) => (
              <div key={alternative.repo}>
                <strong>{alternative.repo}</strong>
                <span>{alternative.reason}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon"><Rocket size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Deployment</p>
          <h2>Cloudflare becomes a first-class filter</h2>
          <div className="tag-list">
            {focusView.deployments.map((deployment) => (
              <span key={deployment}>{deployment}</span>
            ))}
          </div>
        </article>

        <article className="panel feature-panel">
          <div className="feature-icon"><GitCompare size={21} aria-hidden="true" /></div>
          <p className="eyebrow">Compare</p>
          <h2>{compare.winner} leads this set</h2>
          <p className="muted-copy">{compare.reasoning}</p>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Compare Matrix</p>
            <h2>What agents actually need to decide</h2>
          </div>
          <a className="plain-link" href={`/api/compare?deployment=cloudflare&repos=${seedProjects.slice(0, 4).map((item) => item.project.id).join(",")}`}>
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
          {compare.projects.map((project) => (
            <div className="compare-row" key={project.repo}>
              <strong>{project.repo}</strong>
              <span>{project.stars.toLocaleString()}</span>
              <span>{mark(project.agent)}</span>
              <span>{mark(project.local)}</span>
              <span>{mark(project.cloud)}</span>
              <span>{mark(project.cloudflare)}</span>
              <strong>{project.agentScore}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function mark(value: boolean): string {
  return value ? "Yes" : "No";
}
