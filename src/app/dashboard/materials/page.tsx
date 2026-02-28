import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { addMaterial, deleteMaterial } from "./actions";

function fmt(v: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(v) || 0);
}

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "materials")) redirect("/dashboard");

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, sku, unit, unit_cost, unit_price, category, supplier, notes")
    .eq("org_id", profile.org_id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fence-900">Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your material catalog. These drive estimate line items.</p>
        </div>
      </div>

      {/* Add Material Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-fence-900 mb-4">Add Material</h2>
        <form action={addMaterial} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input name="name" placeholder="Name *" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="sku" placeholder="SKU" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="unit" placeholder="Unit (ea, lf, bag)" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="unit_cost" type="number" step="0.01" min="0" placeholder="Unit Cost *" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="unit_price" type="number" step="0.01" min="0" placeholder="Unit Price *" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="category" placeholder="Category" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="supplier" placeholder="Supplier" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input name="notes" placeholder="Notes" className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <div className="flex items-end">
            <button type="submit" className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors">
              Add Material
            </button>
          </div>
        </form>
      </div>

      {/* Materials Table */}
      {!materials || materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No materials yet. Add one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Supplier</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(materials as {
                  id: string; name: string; sku: string | null; unit: string;
                  unit_cost: number; unit_price: number; category: string | null;
                  supplier: string | null; notes: string | null;
                }[]).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-fence-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.sku || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(m.unit_cost)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(m.unit_price)}</td>
                    <td className="px-4 py-3 text-gray-500">{m.category || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{m.supplier || "—"}</td>
                    <td className="px-4 py-3">
                      <form action={deleteMaterial}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="text-red-500 hover:text-red-700 text-xs font-medium">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
