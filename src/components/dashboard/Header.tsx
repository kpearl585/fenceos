import { logout } from "@/app/login/actions";
import type { Role } from "@/lib/roles";

interface HeaderProps {
  email: string;
  role: Role;
  fullName: string | null;
}

function roleBadgeColor(role: Role): string {
  switch (role) {
    case "owner":   return "bg-amber-100 text-amber-800";
    case "sales":   return "bg-blue-100 text-blue-800";
    case "foreman": return "bg-green-100 text-green-800";
  }
}

export function Header({ email, role, fullName }: HeaderProps) {
  const displayName = fullName || email.split("@")[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:pl-64">
      {/* Mobile brand */}
      <div className="lg:hidden flex items-center">
        <span className="text-lg font-bold text-fence-900">FenceOS</span>
      </div>

      {/* Spacer for desktop (sidebar takes left) */}
      <div className="hidden lg:block" />

      {/* Right side: user info + logout */}
      <div className="flex items-center gap-3">
        <span className={`hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${roleBadgeColor(role)}`}>
          {role}
        </span>
        <span className="text-sm text-fence-700 hidden sm:inline">{displayName}</span>
        <form>
          <button
            formAction={logout}
            className="px-3 py-1.5 text-sm bg-fence-100 hover:bg-fence-200 text-fence-700 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}
