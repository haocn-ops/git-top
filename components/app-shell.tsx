"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Braces, Github, LayoutDashboard, Network, Shield, SquareCode, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navigation: Array<{ href: Route; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/projects", label: "Projects", icon: Braces },
  { href: "/register", label: "Register API", icon: UserPlus }
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
            <span>Agent Ready</span>
          </div>
          <a className="nav-item compact" href="/api/schema/project.v2">
            <SquareCode size={18} aria-hidden="true" />
            <span>Schema</span>
          </a>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
