export type Role = "owner" | "sales" | "foreman";

export interface UserProfile {
  id: string;
  auth_id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

/**
 * Route access matrix.
 * Key = route segment under /dashboard.
 * Value = set of roles allowed.
 */
const ACCESS_MATRIX: Record<string, Role[]> = {
  // Dashboard home — everyone
  "":          ["owner", "sales", "foreman"],
  estimates:   ["owner", "sales"],
  jobs:        ["owner", "sales", "foreman"],
  materials:   ["owner", "foreman"],
  margin:      ["owner"],
  owner:       ["owner"],
};

/** Navigation items for the sidebar / mobile nav */
export interface NavItem {
  label: string;
  href: string;
  /** Route segment used to check access */
  segment: string;
  icon: "home" | "calculator" | "briefcase" | "package" | "trending-up";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview",   href: "/dashboard",           segment: "",          icon: "home" },
  { label: "Estimates",  href: "/dashboard/estimates",  segment: "estimates", icon: "calculator" },
  { label: "Jobs",       href: "/dashboard/jobs",       segment: "jobs",      icon: "briefcase" },
  { label: "Materials",  href: "/dashboard/materials",  segment: "materials", icon: "package" },
  { label: "Margin",     href: "/dashboard/margin",     segment: "margin",    icon: "trending-up" },
  { label: "Owner P&L",  href: "/dashboard/owner",      segment: "owner",     icon: "trending-up" },
];

/** Check if a role can access a given route segment */
export function canAccess(role: Role, segment: string): boolean {
  const allowed = ACCESS_MATRIX[segment];
  if (!allowed) return false;
  return allowed.includes(role);
}

/** Filter nav items to only those the role can see */
export function getVisibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.segment));
}
