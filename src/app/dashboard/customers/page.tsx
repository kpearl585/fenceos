import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "customers")) redirect("/dashboard");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, city, state, created_at")
    .eq("org_id", profile.org_id)
    .order("name");

  const canCreate = profile.role === "owner" || profile.role === "sales";

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-fence-900">Customers</h1>
        {canCreate && (
          <Link
            href="/dashboard/customers/new"
            className="bg-fence-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-fence-700 transition-colors"
          >
            + New Customer
          </Link>
        )}
      </div>

      {(!customers || customers.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">👤</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No customers yet
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Add your first customer to start creating estimates.
          </p>
          {canCreate && (
            <Link
              href="/dashboard/customers/new"
              className="inline-block bg-fence-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-fence-700 transition-colors"
            >
              + Add Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Phone</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="text-fence-700 font-semibold hover:text-fence-900"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:text-fence-700">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="hover:text-fence-700">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {c.city && c.state
                        ? `${c.city}, ${c.state}`
                        : c.city || c.state || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                className="block px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <p className="font-semibold text-fence-900">{c.name}</p>
                {c.phone && (
                  <p className="text-sm text-gray-500 mt-0.5">{c.phone}</p>
                )}
                {c.email && (
                  <p className="text-sm text-gray-500">{c.email}</p>
                )}
                {(c.city || c.state) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {c.city}{c.city && c.state && ", "}{c.state}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
