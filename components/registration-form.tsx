"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Braces, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import type { UserRole } from "../lib/users";
import { roleLabels } from "../lib/users";

const plans = [
  { id: "starter", name: "Starter", seats: "5 seats", price: "$49/mo" },
  { id: "team", name: "Team", seats: "15 seats", price: "$149/mo" },
  { id: "scale", name: "Scale", seats: "50 seats", price: "$499/mo" }
];

const roles: UserRole[] = ["owner", "admin", "developer", "viewer"];

export function RegistrationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<UserRole>("owner");
  const [plan, setPlan] = useState(plans[1].id);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const canSubmit = fullName.trim() && email.includes("@") && company.trim() && passwordScore >= 2;

  function registerUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page-stack">
        <section className="registration-success">
          <div className="success-icon">
            <CheckCircle2 size={28} aria-hidden="true" />
          </div>
          <p className="eyebrow">Registration payload ready</p>
          <h1>{fullName.trim()} is staged</h1>
          <p>
            The new {roleLabels[role].toLowerCase()} account payload for {company.trim()} has been staged. This page is an API contract
            demo; persistence and email delivery should happen in a real backend workflow.
          </p>
          <div className="success-actions">
            <button className="button secondary" type="button" onClick={() => setSubmitted(false)}>
              <UserPlus size={17} aria-hidden="true" />
              <span>Register another</span>
            </button>
            <Link className="button primary" href="/projects">
              <Braces size={17} aria-hidden="true" />
              <span>Explore projects</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">API Contract Demo</p>
          <h1>Registration Payload</h1>
        </div>
        <a className="button secondary" href="/api/schema/project.v2">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Schema</span>
        </a>
      </header>

      <section className="registration-layout">
        <form className="panel registration-form" onSubmit={registerUser}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New workspace user</p>
              <h2>Profile and access</h2>
            </div>
            <UserPlus size={20} aria-hidden="true" />
          </div>

          <div className="form-grid">
            <label>
              <span>Full name</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Morgan" />
            </label>
            <label>
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="alex@company.com" />
            </label>
            <label>
              <span>Company or tenant</span>
              <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme AI" />
            </label>
            <label>
              <span>Initial role</span>
              <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="plan-selector">
            <legend>Plan</legend>
            {plans.map((item) => (
              <label className={plan === item.id ? "plan-option selected" : "plan-option"} key={item.id}>
                <input type="radio" name="plan" value={item.id} checked={plan === item.id} onChange={() => setPlan(item.id)} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.seats} · {item.price}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="password-field">
            <span>Password</span>
            <div>
              <KeyRound size={17} aria-hidden="true" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </label>

          <div className="password-meter" aria-label="Password strength">
            <span className={passwordScore >= 1 ? "filled" : ""} />
            <span className={passwordScore >= 2 ? "filled" : ""} />
            <span className={passwordScore >= 3 ? "filled" : ""} />
            <span className={passwordScore >= 4 ? "filled" : ""} />
          </div>

          <button className="button primary full" type="submit" disabled={!canSubmit}>
            <UserPlus size={17} aria-hidden="true" />
            <span>Create account</span>
          </button>
        </form>

        <aside className="registration-aside">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Flow</p>
                <h2>Registration steps</h2>
              </div>
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <div className="check-list">
              <span><CheckCircle2 size={16} aria-hidden="true" /> Create tenant workspace</span>
              <span><CheckCircle2 size={16} aria-hidden="true" /> Assign initial role</span>
              <span><CheckCircle2 size={16} aria-hidden="true" /> Reserve plan seats</span>
              <span><Mail size={16} aria-hidden="true" /> Send verification email</span>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Default policy</h2>
              </div>
              <ShieldCheck size={19} aria-hidden="true" />
            </div>
            <p className="muted-copy">
              New users start with email verification required. Owner and Admin roles should be reviewed before production activation.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
