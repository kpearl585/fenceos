"use client";
import { useState, useRef } from "react";
import { parsePriceSyncCsv, applyPriceUpdates } from "./actions";
import type { PriceSyncPreview } from "./actions";

type MatchRow = PriceSyncPreview["matches"][0] & { selected: boolean; editedCost: number };

function fmt(n: number) {
  return "$" + n.toFixed(2);
}

function confidenceBadge(conf: number) {
  if (conf >= 0.9) return <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">High</span>;
  if (conf >= 0.6) return <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Medium</span>;
  return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Low</span>;
}

export default function PriceSyncClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [preview, setPreview] = useState<PriceSyncPreview | null>(null);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);

    try {
      const text = await file.text();
      const res = await parsePriceSyncCsv(text);
      if (!res.success || !res.preview) {
        setError(res.error ?? "Failed to parse CSV");
        return;
      }
      setPreview(res.preview);
      setRows(res.preview.matches.map(m => ({
        ...m,
        selected: !!m.matchedSku && m.confidence > 0.5,
        editedCost: m.supplierRow.unitCost,
      })));
      setStep("review");
    } finally {
      setParsing(false);
    }
  }

  async function handleApply() {
    const toApply = rows.filter(r => r.selected && r.matchedSku);
    if (toApply.length === 0) return;

    setApplying(true);
    const res = await applyPriceUpdates(
      toApply.map(r => ({
        sku: r.matchedSku!,
        unitCost: r.editedCost,
        supplierSku: r.supplierRow.rawSku,
        supplier: r.supplierRow.supplier,
      }))
    );
    setApplying(false);

    if (res.success) {
      setAppliedCount(res.updatedCount);
      setStep("done");
    } else {
      setError(res.error ?? "Apply failed");
    }
  }

  const selectedCount = rows.filter(r => r.selected && r.matchedSku).length;

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-xl font-bold text-fence-900 mb-2">{appliedCount} prices updated</p>
        <p className="text-gray-500 text-sm mb-6">Your materials are synced. Future estimates will use the updated prices automatically.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStep("upload"); setRows([]); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="px-4 py-2 text-sm font-semibold text-fence-600 border border-fence-200 rounded-lg hover:bg-fence-50">
            Sync Another File
          </button>
          <a href="/dashboard/materials" className="px-4 py-2 text-sm font-semibold bg-fence-600 text-white rounded-lg hover:bg-fence-700">
            View Materials
          </a>
        </div>
      </div>
    );
  }

  if (step === "review" && preview) {
    const FORMAT_LABELS: Record<string, string> = {
      hd_pro: "Home Depot Pro", lowes_pro: "Lowe\'s Pro", generic: "Generic CSV"
    };
    return (
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-gray-400">Format detected</p>
              <p className="text-sm font-bold text-fence-900">{FORMAT_LABELS[preview.format] ?? preview.format}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Rows</p>
              <p className="text-sm font-bold">{preview.totalRows}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Matched</p>
              <p className="text-sm font-bold text-green-700">{preview.matchedRows}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Unmatched</p>
              <p className="text-sm font-bold text-amber-600">{preview.unmatchedRows}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setRows(r => r.map(row => ({ ...row, selected: !!row.matchedSku && row.confidence > 0.5 })))}
              className="text-xs text-gray-500 hover:text-fence-600">Select matched</button>
            <button
              onClick={handleApply}
              disabled={applying || selectedCount === 0}
              className="px-4 py-2 bg-fence-600 text-white text-sm font-semibold rounded-lg hover:bg-fence-700 disabled:opacity-50"
            >
              {applying ? "Applying..." : `Apply ${selectedCount} Updates`}
            </button>
          </div>
        </div>

        {/* Review table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span className="col-span-1">Use</span>
            <span className="col-span-4">Supplier Description</span>
            <span className="col-span-3">Matched SKU</span>
            <span className="col-span-1">Conf.</span>
            <span className="col-span-1 text-right">Current</span>
            <span className="col-span-2 text-right">New Price</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
            {rows.map((row, i) => (
              <div key={i} className={`px-4 py-3 grid grid-cols-12 gap-2 items-center ${!row.matchedSku ? "opacity-40" : ""}`}>
                <div className="col-span-1">
                  <input type="checkbox"
                    checked={row.selected}
                    disabled={!row.matchedSku}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))}
                    className="rounded"
                  />
                </div>
                <div className="col-span-4 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{row.supplierRow.rawDescription}</p>
                  {row.supplierRow.rawSku && <p className="text-xs text-gray-400">{row.supplierRow.rawSku}</p>}
                </div>
                <div className="col-span-3 min-w-0">
                  {row.matchedSku ? (
                    <>
                      <p className="text-xs font-semibold text-fence-900">{row.matchedSku}</p>
                      <p className="text-xs text-gray-400 truncate">{row.matchedName}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No match</p>
                  )}
                </div>
                <div className="col-span-1">{confidenceBadge(row.confidence)}</div>
                <div className="col-span-1 text-right text-xs text-gray-400">
                  {row.currentUnitCost != null ? fmt(row.currentUnitCost) : "—"}
                </div>
                <div className="col-span-2 text-right">
                  {row.matchedSku ? (
                    <input
                      type="number" step="0.01" min="0"
                      value={row.editedCost}
                      onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, editedCost: Number(e.target.value) } : r))}
                      className="w-20 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-fence-400"
                    />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-fence-400 hover:bg-fence-50 transition-colors"
      >
        <svg className="w-10 h-10 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-semibold text-gray-600 mb-1">
          {parsing ? "Parsing..." : "Upload supplier CSV"}
        </p>
        <p className="text-xs text-gray-400">HD Pro, Lowe's Pro, or any CSV with product names and prices</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
    </div>
  );
}
