"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";
import { NavIcon } from "./NavIcon";

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const matchesPrefix =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const active =
            matchesPrefix &&
            !items.some(
              (other) =>
                other.href !== item.href &&
                other.href.startsWith(item.href + "/") &&
                (pathname === other.href || pathname.startsWith(other.href + "/"))
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-0 ${
                active ? "text-accent-light" : "text-muted"
              }`}
            >
              <NavIcon name={item.icon} className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
