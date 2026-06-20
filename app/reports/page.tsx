import { BarChart3, CircleCheckBig, TriangleAlert } from "lucide-react";

const reports = [
  { label: "Access reviews", value: "3 due", tone: "warn" },
  { label: "Schema validation", value: "Passing", tone: "good" },
  { label: "Sync reliability", value: "99.8%", tone: "good" }
];

export default function ReportsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Operational Signals</h1>
        </div>
      </header>

      <section className="report-list">
        {reports.map((report) => {
          const Icon = report.tone === "good" ? CircleCheckBig : TriangleAlert;
          return (
            <article className="report-row" key={report.label}>
              <div className={report.tone === "good" ? "report-icon good" : "report-icon warn"}>
                <Icon size={19} aria-hidden="true" />
              </div>
              <div>
                <h2>{report.label}</h2>
                <p>{report.value}</p>
              </div>
              <BarChart3 size={18} aria-hidden="true" />
            </article>
          );
        })}
      </section>
    </div>
  );
}
