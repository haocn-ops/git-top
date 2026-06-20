import type { LucideIcon } from "lucide-react";
import { Building2, Crown, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";

export type UserStatus = "active" | "invited" | "suspended";
export type UserRole = "owner" | "admin" | "developer" | "viewer";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  team: string;
  tenant: string;
  lastActive: string;
  seat: "paid" | "trial";
  repositories: number;
}

export interface TenantSummary {
  name: string;
  plan: string;
  seatsUsed: number;
  seatsTotal: number;
  mrr: string;
  health: "healthy" | "watch" | "blocked";
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer"
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended"
};

export const roleIcons: Record<UserRole, LucideIcon> = {
  owner: Crown,
  admin: ShieldCheck,
  developer: UserRoundCheck,
  viewer: UsersRound
};

export const tenants: TenantSummary[] = [
  {
    name: "Northstar AI",
    plan: "Scale",
    seatsUsed: 18,
    seatsTotal: 24,
    mrr: "$4,800",
    health: "healthy"
  },
  {
    name: "ForgeOps",
    plan: "Team",
    seatsUsed: 9,
    seatsTotal: 12,
    mrr: "$1,620",
    health: "watch"
  },
  {
    name: "Atlas Labs",
    plan: "Enterprise",
    seatsUsed: 41,
    seatsTotal: 60,
    mrr: "$12,400",
    health: "healthy"
  }
];

export const managedUsers: ManagedUser[] = [
  {
    id: "usr_001",
    name: "Lina Chen",
    email: "lina@northstar.ai",
    avatar: "LC",
    role: "owner",
    status: "active",
    team: "Platform",
    tenant: "Northstar AI",
    lastActive: "8 min ago",
    seat: "paid",
    repositories: 38
  },
  {
    id: "usr_002",
    name: "Marcus Hale",
    email: "marcus@northstar.ai",
    avatar: "MH",
    role: "admin",
    status: "active",
    team: "Security",
    tenant: "Northstar AI",
    lastActive: "24 min ago",
    seat: "paid",
    repositories: 22
  },
  {
    id: "usr_003",
    name: "Priya Rao",
    email: "priya@forgeops.dev",
    avatar: "PR",
    role: "developer",
    status: "invited",
    team: "Integrations",
    tenant: "ForgeOps",
    lastActive: "Pending",
    seat: "trial",
    repositories: 0
  },
  {
    id: "usr_004",
    name: "Noah Kim",
    email: "noah@atlaslabs.co",
    avatar: "NK",
    role: "admin",
    status: "active",
    team: "Data",
    tenant: "Atlas Labs",
    lastActive: "1 hr ago",
    seat: "paid",
    repositories: 54
  },
  {
    id: "usr_005",
    name: "Amelia Stone",
    email: "amelia@forgeops.dev",
    avatar: "AS",
    role: "viewer",
    status: "suspended",
    team: "Finance",
    tenant: "ForgeOps",
    lastActive: "12 days ago",
    seat: "paid",
    repositories: 4
  },
  {
    id: "usr_006",
    name: "Owen Park",
    email: "owen@atlaslabs.co",
    avatar: "OP",
    role: "developer",
    status: "active",
    team: "Agent Runtime",
    tenant: "Atlas Labs",
    lastActive: "2 hr ago",
    seat: "paid",
    repositories: 31
  }
];

export const auditEvents: AuditEvent[] = [
  {
    id: "evt_001",
    actor: "Lina Chen",
    action: "Changed role",
    target: "Marcus Hale to Admin",
    at: "Today, 09:42"
  },
  {
    id: "evt_002",
    actor: "Noah Kim",
    action: "Invited user",
    target: "Priya Rao",
    at: "Today, 08:10"
  },
  {
    id: "evt_003",
    actor: "System",
    action: "Seat limit checked",
    target: "Atlas Labs",
    at: "Yesterday, 21:18"
  }
];

export const userStats = [
  {
    label: "Total users",
    value: managedUsers.length.toString(),
    detail: "+2 this week",
    icon: UsersRound
  },
  {
    label: "Active seats",
    value: managedUsers.filter((user) => user.status === "active").length.toString(),
    detail: "Across 3 tenants",
    icon: UserRoundCheck
  },
  {
    label: "Admins",
    value: managedUsers.filter((user) => user.role === "owner" || user.role === "admin").length.toString(),
    detail: "Owner/Admin roles",
    icon: ShieldCheck
  },
  {
    label: "Organizations",
    value: tenants.length.toString(),
    detail: "Multi-tenant workspace",
    icon: Building2
  }
];
