import { Building2 } from "lucide-react";
import { tenants } from "../../lib/users";

export default function TenantsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Organizations</p>
          <h1>Tenants</h1>
        </div>
      </header>

      <section className="tenant-card-grid">
        {tenants.map((tenant) => (
          <article className="tenant-card" key={tenant.name}>
            <div className="tenant-card-icon">
              <Building2 size={20} aria-hidden="true" />
            </div>
            <div>
              <h2>{tenant.name}</h2>
              <p>{tenant.plan} · {tenant.mrr} MRR</p>
            </div>
            <div className="seat-meter wide">
              <span style={{ width: `${Math.round((tenant.seatsUsed / tenant.seatsTotal) * 100)}%` }} />
            </div>
            <strong>{tenant.seatsUsed}/{tenant.seatsTotal} seats</strong>
          </article>
        ))}
      </section>
    </div>
  );
}
