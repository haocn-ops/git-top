"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { BarChart3, Braces, Building2, Github, LayoutDashboard, Network, Settings, Shield, UserPlus, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navigation: Array<{ href: Route; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/users", label: "Users", icon: UsersRound },
  { href: "/register", label: "Register", icon: UserPlus },
  { href: "/projects", label: "Projects", icon: Braces },
  { href: "/tenants", label: "Tenants", icon: Building2 },
  { href: "/reports", label: "Reports", icon: BarChart3 }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Git.Top dashboard">
          <span className="brand-mark">
            <Github size={20} aria-hidden="true" />
          </span>
          <span>
            <strong>Git.Top</strong>
            <small>Agent Knowledge</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={active ? "nav-item active" : "nav-item"} href={item.href}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="compliance-badge">
            <Shield size={18} aria-hidden="true" />
            <span>SOC 2 Ready</span>
          </div>
          <Link className="nav-item compact" href="/settings">
            <Settings size={18} aria-hidden="true" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
