import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import SearchFilter from "@/components/dashboard/SearchFilter";
import ImportCustomersButton from "@/components/customers/ImportCustomersButton";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "customers")) redirect("/dashboard");

  const { q = "" } = await searchParams;
  const canCreate = profile.role === "owner" || profile.role === "sales";

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone, city, state, created_at")
    .eq("org_id", profile.org_id)
    .order("name");

  const filtered = q
    ? (customers ?? []).filter((c) => {
        const query = q.toLowerCase();
        return (
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.city?.toLowerCase().includes(query)
        );
      })
    : (customers ?? []);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-text">Customers</h1>
        {canCreate && (
          <div className="flex items-center gap-2">
            <ImportCustomersButton />
            <Link
              href="/dashboard/customers/new"
              className="bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150"
            >
              + New Customer
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4">
        <Suspense fallback={null}>
          <SearchFilter
            placeholder="Search by name, email, or city..."
            statuses={[]}
            currentSearch={q}
            currentStatus=""
          />
        </Suspense>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-2 rounded-xl border border-border p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-text mb-1">
            {q ? "No customers match your search" : "No customers yet"}
          </h2>
          <p className="text-sm text-muted mb-4">
            {q
              ? "Try a different search term."
              : "Add your first customer to start creating estimates."}
          </p>
          {canCreate && !q && (
            <Link
              href="/dashboard/customers/new"
              className="inline-block bg-accent hover:bg-accent-light accent-glow text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150"
            >
              + Add Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-3 transition-colors duration-150">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="text-text font-semibold hover:text-accent-light transition-colors duration-150">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-accent-light transition-colors duration-150">{c.phone}</a> : <span>—</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:text-accent-light transition-colors duration-150">{c.email}</a> : <span>—</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {c.city && c.state ? `${c.city}, ${c.state}` : c.city || c.state || <span>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border">
            {filtered.map((c) => (
              <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="block px-4 py-4 hover:bg-surface-3 transition-colors duration-150">
                <p className="font-semibold text-text">{c.name}</p>
                {c.phone && <p className="text-sm text-muted mt-0.5">{c.phone}</p>}
                {c.email && <p className="text-sm text-muted">{c.email}</p>}
                {(c.city || c.state) && <p className="text-xs text-muted mt-1">{c.city}{c.city && c.state && ", "}{c.state}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
