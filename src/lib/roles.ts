export type Role = "owner" | "sales" | "foreman";

export interface UserProfile {
  id: string;
  auth_id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

const ACCESS_MATRIX: Record<string, Role[]> = {
  "":                 ["owner", "sales", "foreman"],
  customers:          ["owner", "sales", "foreman"],
  estimates:          ["owner", "sales", "foreman"],
  "advanced-estimate": ["owner", "sales", "foreman"],
  "phase1-estimator": ["owner", "sales", "foreman"],
  jobs:               ["owner", "sales", "foreman"],
  materials:          ["owner", "foreman"],
  leads:              ["owner"],
  margin:             ["owner"],
  owner:              ["owner"],
  settings:           ["owner"],
};

export type NavIcon = "home" | "users" | "calculator" | "briefcase" | "package" | "trending-up" | "settings" | "bar-chart" | "mail";

export interface NavItem {
  label: string;
  href: string;
  segment: string;
  icon: NavIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview",   href: "/dashboard",           segment: "",          icon: "home" },
  { label: "Customers",  href: "/dashboard/customers",  segment: "customers", icon: "users" },
  { label: "Estimates",  href: "/dashboard/estimates",  segment: "estimates", icon: "calculator" },
  { label: "Adv. Estimate", href: "/dashboard/advanced-estimate", segment: "advanced-estimate", icon: "calculator" },
  { label: "Phase 1",    href: "/dashboard/phase1-estimator", segment: "phase1-estimator", icon: "calculator" },
  { label: "Jobs",       href: "/dashboard/jobs",       segment: "jobs",      icon: "briefcase" },
  { label: "Leads",      href: "/dashboard/leads",      segment: "leads",     icon: "mail" },
  { label: "Materials",  href: "/dashboard/materials",  segment: "materials", icon: "package" },
  { label: "P&L",        href: "/dashboard/owner",      segment: "owner",     icon: "bar-chart" },
  { label: "Settings",   href: "/dashboard/settings",   segment: "settings",  icon: "settings" },
];

export function canAccess(role: Role, segment: string): boolean {
  const allowed = ACCESS_MATRIX[segment];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getVisibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.segment));
}
