"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function SearchFilter({
  placeholder = "Search...",
  statuses,
  currentSearch,
  currentStatus,
}: {
  placeholder?: string;
  statuses: { value: string; label: string }[];
  currentSearch: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }, [params, pathname, router]);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          defaultValue={currentSearch}
          onChange={e => update("q", e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent bg-surface text-text placeholder:text-muted"
        />
      </div>
      {statuses.length > 0 && (
        <select
          value={currentStatus}
          onChange={e => update("status", e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}
    </div>
  );
}
