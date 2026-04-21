import { logout } from "@/app/login/actions";
import type { Role } from "@/lib/roles";
import Link from "next/link";

const ROLE_BADGE: Record<Role, string> = {
  owner:   "bg-surface-2 border border-border text-accent-light",
  sales:   "bg-surface-2 border border-border text-info",
  foreman: "bg-surface-2 border border-border text-accent",
};

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  sales: "Sales",
  foreman: "Foreman",
};

export function Header({ email, role, fullName }: { email: string; role: Role; fullName: string | null }) {
  const displayName = fullName || email.split("@")[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6">
      {/* Mobile brand */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3v10H3V7zm6-3h3v13H9V4zm6 5h3v8h-3V9z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-text">FenceEstimatePro</span>
      </div>

      <div className="hidden lg:block" />

      {/* Right: quick action + user */}
      <div className="flex items-center gap-3">
        {role !== "foreman" && (
          <Link
            href="/dashboard/advanced-estimate"
            className="hidden sm:inline-flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Estimate
          </Link>
        )}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-text leading-none">{displayName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <form>
          <button
            formAction={logout}
            className="text-xs text-muted hover:text-text px-2 py-1.5 rounded hover:bg-surface-2 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
