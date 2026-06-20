import { KeyRound, ShieldCheck, Webhook } from "lucide-react";

const settings = [
  { label: "Admin token", value: "Required for sync", icon: KeyRound },
  { label: "Role policy", value: "Owner approval", icon: ShieldCheck },
  { label: "Webhooks", value: "No delivery errors", icon: Webhook }
];

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Workspace Controls</h1>
        </div>
      </header>

      <section className="settings-grid">
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <article className="setting-card" key={setting.label}>
              <Icon size={20} aria-hidden="true" />
              <h2>{setting.label}</h2>
              <p>{setting.value}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
