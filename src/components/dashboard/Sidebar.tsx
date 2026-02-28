"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";
import { NavIcon } from "./NavIcon";

export function Sidebar({ items, orgName }: { items: NavItem[]; orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-fence-950 text-white shadow-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-fence-800">
        <div className="w-8 h-8 bg-fence-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tight leading-tight">FenceEstimate<span className="text-fence-400">Pro</span></span>
      </div>

      {/* Org */}
      <div className="px-5 py-3 border-b border-fence-800/60">
        <p className="text-xs text-fence-500 uppercase tracking-wider font-medium">Organization</p>
        <p className="text-sm text-fence-200 truncate mt-0.5 font-medium">{orgName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-fence-600 text-white shadow-sm"
                  : "text-fence-400 hover:bg-fence-800 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-fence-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-fence-800">
        <p className="text-xs text-fence-500 text-center">FenceEstimatePro v1.0</p>
      </div>
    </aside>
  );
}
