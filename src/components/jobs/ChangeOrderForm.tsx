"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitChangeOrder } from "@/app/dashboard/jobs/changeOrderActions";

type Material = {
  sku: string;
  name: string;
  unit: string;
  unit_price: number;
};

type LineItem = {
  id: number;
  type: "material" | "labor";
  sku: string;
  name: string;
  qty: string;
  unit_price: string;
};

let nextId = 1;

function emptyItem(): LineItem {
  return { id: nextId++, type: "material", sku: "", name: "", qty: "1", unit_price: "" };
}

export default function ChangeOrderForm({
  jobId,
  materials,
}: {
  jobId: string;
  materials: Material[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function onMaterialSelect(id: number, sku: string) {
    const mat = materials.find((m) => m.sku === sku);
    if (mat) {
      updateItem(id, {
        sku: mat.sku,
        name: mat.name,
        unit_price: String(mat.unit_price),
      });
    } else {
      updateItem(id, { sku: "", name: "", unit_price: "" });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    // Build lineItems JSON from state
    const lineItems = items
      .filter((i) => i.name.trim() && Number(i.qty) > 0)
      .map((i) => ({
        name: i.name,
        type: i.type,
        qty: Number(i.qty),
        unit_price: Number(i.unit_price) || 0,
        sku: i.sku || undefined,
      }));
    fd.set("lineItems", JSON.stringify(lineItems));
    fd.set("jobId", jobId);
    setError(null);
    try {
      const result = await submitChangeOrder(fd);
      if (result?.success) {
        router.push(`/dashboard/jobs/${result.jobId}`);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />

      {/* Reason */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="reason"
          required
          placeholder="e.g. Customer wants to add a double gate"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
        />
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">
            Line Items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addItem}
            className="text-xs text-fence-600 font-semibold hover:text-fence-800 flex items-center gap-1"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { type: "material", sku: "", name: "", unit_price: "" })}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    item.type === "material"
                      ? "bg-fence-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Material
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { type: "labor", sku: "" })}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    item.type === "labor"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Labor
                </button>
              </div>

              {/* Material dropdown (if type = material) */}
              {item.type === "material" && materials.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Pick from catalog (optional)</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fence-400"
                    value={item.sku}
                    onChange={(e) => onMaterialSelect(item.id, e.target.value)}
                  >
                    <option value="">— Select material —</option>
                    {materials.map((m) => (
                      <option key={m.sku} value={m.sku}>
                        {m.name} (${m.unit_price}/{m.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder={item.type === "labor" ? "e.g. Extra labor for double gate install" : "e.g. Double gate kit"}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                />
              </div>

              {/* Qty + Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, { qty: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, { unit_price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-fence-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Change Order"}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </form>
  );
}
