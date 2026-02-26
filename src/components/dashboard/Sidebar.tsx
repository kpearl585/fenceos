"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";
import { NavIcon } from "./NavIcon";

interface SidebarProps {
  items: NavItem[];
  orgName: string;
}

export function Sidebar({ items, orgName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-fence-950 text-white">
      {/* Brand */}
      <div className="flex items-center h-16 px-5 border-b border-fence-800">
        <span className="text-lg font-bold tracking-tight">FenceOS</span>
      </div>

      {/* Org name */}
      <div className="px-5 py-3 border-b border-fence-800">
        <p className="text-xs text-fence-400 uppercase tracking-wider">Organization</p>
        <p className="text-sm text-fence-200 truncate mt-0.5">{orgName}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-fence-700 text-white"
                  : "text-fence-300 hover:bg-fence-800 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
