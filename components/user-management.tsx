"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Filter, MailPlus, MoreHorizontal, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AuditEvent, ManagedUser, TenantSummary, UserRole, UserStatus } from "../lib/users";
import { roleIcons, roleLabels, statusLabels } from "../lib/users";

interface UserManagementProps {
  auditEvents: AuditEvent[];
  initialUsers: ManagedUser[];
  tenants: TenantSummary[];
}

const allRoles = ["all", "owner", "admin", "developer", "viewer"] as const;
const allStatuses = ["all", "active", "invited", "suspended"] as const;

export function UserManagement({ auditEvents, initialUsers, tenants }: UserManagementProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof allRoles)[number]>("all");
  const [status, setStatus] = useState<(typeof allStatuses)[number]>("all");
  const [users, setUsers] = useState(initialUsers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("developer");
  const [inviteTenant, setInviteTenant] = useState(tenants[0]?.name ?? "");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        normalized.length === 0 ||
        [user.name, user.email, user.team, user.tenant].some((value) => value.toLowerCase().includes(normalized));
      const matchesRole = role === "all" || user.role === role;
      const matchesStatus = status === "all" || user.status === status;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, role, status, users]);

  const stats: Array<{ label: string; value: string; detail: string; icon: LucideIcon }> = [
    {
      label: "Total users",
      value: users.length.toString(),
      detail: "+2 this week",
      icon: UserPlus
    },
    {
      label: "Active seats",
      value: users.filter((user) => user.status === "active").length.toString(),
      detail: "Across tenants",
      icon: Check
    },
    {
      label: "Admins",
      value: users.filter((user) => user.role === "owner" || user.role === "admin").length.toString(),
      detail: "Owner/Admin roles",
      icon: ShieldCheck
    },
    {
      label: "Invites",
      value: users.filter((user) => user.status === "invited").length.toString(),
      detail: "Pending acceptance",
      icon: MailPlus
    }
  ];

  function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      return;
    }

    const name = email
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const nextUser: ManagedUser = {
      id: `usr_${Date.now()}`,
      name: name || "Invited User",
      email,
      avatar: email.slice(0, 2).toUpperCase(),
      role: inviteRole,
      status: "invited",
      team: "Pending",
      tenant: inviteTenant,
      lastActive: "Pending",
      seat: "trial",
      repositories: 0
    };

    setUsers((current) => [nextUser, ...current]);
    setInviteEmail("");
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Access Control</p>
          <h1>User Management</h1>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" title="Export users">
            <Check size={17} aria-hidden="true" />
            <span>Export</span>
          </button>
          <a className="button primary" href="#invite-user">
            <UserPlus size={17} aria-hidden="true" />
            <span>Invite user</span>
          </a>
          <Link className="button secondary" href="/register">
            <MailPlus size={17} aria-hidden="true" />
            <span>Register</span>
          </Link>
        </div>
      </header>

      <section className="overview-grid" aria-label="User metrics">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="metric-card" key={stat.label}>
              <div className="metric-icon">
                <Icon size={20} aria-hidden={true} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          );
        })}
      </section>

      <section className="management-grid">
        <div className="panel table-panel">
          <div className="toolbar">
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
            </label>
            <label className="select-box">
              <Filter size={16} aria-hidden="true" />
              <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} aria-label="Filter by role">
                {allRoles.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All roles" : roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-box">
              <ShieldCheck size={16} aria-hidden="true" />
              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter by status">
                {allStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All status" : statusLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="user-table" aria-label="Users">
            <div className="user-row user-head">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Tenant</span>
              <span>Last active</span>
              <span />
            </div>
            {filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel invite-panel" id="invite-user">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Invite</p>
                <h2>New user</h2>
              </div>
              <MailPlus size={19} aria-hidden="true" />
            </div>
            <form className="invite-form" onSubmit={inviteUser}>
              <label>
                <span>Email</span>
                <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" placeholder="name@company.com" />
              </label>
              <label>
                <span>Role</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as UserRole)}>
                  {(["owner", "admin", "developer", "viewer"] as UserRole[]).map((item) => (
                    <option key={item} value={item}>
                      {roleLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tenant</span>
                <select value={inviteTenant} onChange={(event) => setInviteTenant(event.target.value)}>
                  {tenants.map((tenant) => (
                    <option key={tenant.name} value={tenant.name}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                <span>Send invite</span>
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Audit</p>
                <h2>Access activity</h2>
              </div>
            </div>
            <div className="activity-list slim">
              {auditEvents.map((event) => (
                <div className="activity-row" key={event.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{event.action}</strong>
                    <p>{event.actor} · {event.target}</p>
                  </div>
                  <time>{event.at}</time>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function UserRow({ user }: { user: ManagedUser }) {
  const RoleIcon = roleIcons[user.role];
  const statusClass = `status-pill ${user.status}`;

  return (
    <div className="user-row">
      <div className="identity-cell">
        <span className="avatar">{user.avatar}</span>
        <div>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>
      </div>
      <span className="role-pill">
        <RoleIcon size={15} aria-hidden="true" />
        {roleLabels[user.role]}
      </span>
      <span className={statusClass}>
        {user.status === "suspended" ? <X size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        {statusLabels[user.status as UserStatus]}
      </span>
      <span>{user.tenant}</span>
      <span>{user.lastActive}</span>
      <button className="icon-button" type="button" title={`Open ${user.name} actions`} aria-label={`Open ${user.name} actions`}>
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
