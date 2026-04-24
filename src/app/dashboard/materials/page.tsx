import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/roles";
import { addMaterial, deleteMaterial } from "./actions";
import MaterialsImportBar from "./MaterialsClient";
import EditablePrice from "@/components/materials/EditablePrice";
import EditableText from "@/components/materials/EditableText";

const INPUT_CLASS = "border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "materials")) redirect("/dashboard");

  const orgId = profile.org_id;

  const { data: materials } = await supabase
    .from("materials")
    .select("id, name, sku, unit, unit_cost, unit_price, category, supplier, notes")
    .eq("org_id", orgId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Materials</h1>
          <p className="text-sm text-muted mt-0.5">Manage your material catalog. These drive estimate line items.</p>
        </div>
        <a href="/dashboard/materials/price-sync"
          className="flex-shrink-0 bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
          Sync Supplier Prices
        </a>
      </div>

      <div className="bg-surface-2 rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-text">Add Material</h2><MaterialsImportBar materials={materials ?? []} /></div>
        <form action={addMaterial} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input name="name" placeholder="Name *" required className={INPUT_CLASS} />
          <input name="sku" placeholder="SKU" className={INPUT_CLASS} />
          <input name="unit" placeholder="Unit (ea, lf, bag)" required className={INPUT_CLASS} />
          <input name="unit_cost" type="number" step="0.01" min="0" placeholder="Unit Cost *" required className={INPUT_CLASS} />
          <input name="unit_price" type="number" step="0.01" min="0" placeholder="Unit Price *" required className={INPUT_CLASS} />
          <input name="category" placeholder="Category" className={INPUT_CLASS} />
          <input name="supplier" placeholder="Supplier" className={INPUT_CLASS} />
          <input name="notes" placeholder="Notes" className={`${INPUT_CLASS} sm:col-span-2`} />
          <div className="flex items-end">
            <button type="submit" className="bg-accent hover:bg-accent-light accent-glow text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors duration-150">
              Add Material
            </button>
          </div>
        </form>
      </div>

      {!materials || materials.length === 0 ? (
        <div className="bg-surface-2 rounded-xl border border-border p-12 text-center text-muted">
          No materials yet. Add one above.
        </div>
      ) : (() => {
        type Mat = { id: string; name: string; sku: string | null; unit: string; unit_cost: number; unit_price: number; category: string | null; supplier: string | null; notes: string | null; };
        const mats = materials as Mat[];
        const grouped: Record<string, Mat[]> = {};
        for (const m of mats) {
          const cat = m.category || "Uncategorized";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(m);
        }
        const sortedCats = Object.keys(grouped).sort((a, b) => {
          if (a === "Uncategorized") return 1;
          if (b === "Uncategorized") return -1;
          return a.localeCompare(b);
        });
        return (
          <div className="space-y-6">
            <p className="text-xs text-muted italic">Click any Name, SKU, Supplier, Cost, or Price to edit. Changes save automatically.</p>
            {sortedCats.map((cat) => (
              <div key={cat} className="bg-surface-2 rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-surface-3 border-b border-border">
                  <h3 className="font-bold text-sm text-muted uppercase tracking-wider">{cat}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-3 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">SKU</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Unit</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Cost</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Price</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted uppercase tracking-wider text-xs">Supplier</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grouped[cat].map((m) => (
                        <tr key={m.id} className="hover:bg-surface-3 transition-colors duration-150">
                          <td className="px-4 py-3">
                            <EditableText materialId={m.id} orgId={orgId} field="name" value={m.name} placeholder="Name" />
                          </td>
                          <td className="px-4 py-3 text-muted font-mono text-xs">
                            <EditableText materialId={m.id} orgId={orgId} field="sku" value={m.sku || ''} placeholder="SKU" />
                          </td>
                          <td className="px-4 py-3 text-muted">{m.unit}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <EditablePrice materialId={m.id} orgId={orgId} field="unit_cost" value={m.unit_cost} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <EditablePrice materialId={m.id} orgId={orgId} field="unit_price" value={m.unit_price} color="#22C55E" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <EditableText materialId={m.id} orgId={orgId} field="supplier" value={m.supplier || ''} placeholder="Supplier" />
                          </td>
                          <td className="px-4 py-3">
                            <form action={deleteMaterial}>
                              <input type="hidden" name="id" value={m.id} />
                              <button type="submit" className="text-danger hover:text-danger/80 text-xs font-medium transition-colors duration-150">
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
            ))}
          </div>
        );
      })()}
    </>
  );
}
