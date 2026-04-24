"use client";
import { useState, useRef } from "react";
import { parsePriceSyncCsv, applyPriceUpdates } from "./actions";
import type { PriceSyncPreview } from "./actions";

type MatchRow = PriceSyncPreview["matches"][0] & { selected: boolean; editedCost: number };

function fmt(n: number) {
  return "$" + n.toFixed(2);
}

function confidenceBadge(conf: number) {
  if (conf >= 0.9) return <span className="text-xs font-semibold text-accent-light bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded">High</span>;
  if (conf >= 0.6) return <span className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 px-1.5 py-0.5 rounded">Medium</span>;
  return <span className="text-xs font-semibold text-danger bg-danger/10 border border-danger/30 px-1.5 py-0.5 rounded">Low</span>;
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
      <div className="bg-surface-2 rounded-xl border border-border p-8 text-center">
        <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="text-xl font-bold text-text mb-2">{appliedCount} prices updated</p>
        <p className="text-muted text-sm mb-6">Your materials are synced. Future estimates will use the updated prices automatically.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStep("upload"); setRows([]); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="px-4 py-2 text-sm font-semibold text-text border border-border rounded-lg hover:bg-surface-3 transition-colors duration-150">
            Sync Another File
          </button>
          <a href="/dashboard/materials" className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-light accent-glow transition-colors duration-150">
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
        <div className="bg-surface-2 rounded-xl border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Format detected</p>
              <p className="text-sm font-bold text-text">{FORMAT_LABELS[preview.format] ?? preview.format}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Rows</p>
              <p className="text-sm font-bold text-text">{preview.totalRows}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Matched</p>
              <p className="text-sm font-bold text-accent-light">{preview.matchedRows}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Unmatched</p>
              <p className="text-sm font-bold text-warning">{preview.unmatchedRows}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setRows(r => r.map(row => ({ ...row, selected: !!row.matchedSku && row.confidence > 0.5 })))}
              className="text-xs text-muted hover:text-accent-light transition-colors duration-150">Select matched</button>
            <button
              onClick={handleApply}
              disabled={applying || selectedCount === 0}
              className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-light accent-glow transition-colors duration-150 disabled:opacity-50"
            >
              {applying ? "Applying..." : `Apply ${selectedCount} Updates`}
            </button>
          </div>
        </div>

        {/* Review table */}
        <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-surface-3 grid grid-cols-12 gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
            <span className="col-span-1">Use</span>
            <span className="col-span-4">Supplier Description</span>
            <span className="col-span-3">Matched SKU</span>
            <span className="col-span-1">Conf.</span>
            <span className="col-span-1 text-right">Current</span>
            <span className="col-span-2 text-right">New Price</span>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {rows.map((row, i) => (
              <div key={i} className={`px-4 py-3 grid grid-cols-12 gap-2 items-center ${!row.matchedSku ? "opacity-40" : ""}`}>
                <div className="col-span-1">
                  <input type="checkbox"
                    checked={row.selected}
                    disabled={!row.matchedSku}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))}
                    className="rounded accent-accent"
                  />
                </div>
                <div className="col-span-4 min-w-0">
                  <p className="text-xs text-text truncate">{row.supplierRow.rawDescription}</p>
                  {row.supplierRow.rawSku && <p className="text-xs text-muted">{row.supplierRow.rawSku}</p>}
                </div>
                <div className="col-span-3 min-w-0">
                  {row.matchedSku ? (
                    <>
                      <p className="text-xs font-semibold text-text">{row.matchedSku}</p>
                      <p className="text-xs text-muted truncate">{row.matchedName}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted italic">No match</p>
                  )}
                </div>
                <div className="col-span-1">{confidenceBadge(row.confidence)}</div>
                <div className="col-span-1 text-right text-xs text-muted">
                  {row.currentUnitCost != null ? fmt(row.currentUnitCost) : "—"}
                </div>
                <div className="col-span-2 text-right">
                  {row.matchedSku ? (
                    <input
                      type="number" step="0.01" min="0"
                      value={row.editedCost}
                      onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, editedCost: Number(e.target.value) } : r))}
                      className="w-20 border border-border bg-surface-3 text-text rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
                    />
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-4 py-3">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-border p-8">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors duration-150"
      >
        <svg className="w-10 h-10 text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-semibold text-text mb-1">
          {parsing ? "Parsing..." : "Upload supplier CSV"}
        </p>
        <p className="text-xs text-muted">HD Pro, Lowe&apos;s Pro, or any CSV with product names and prices</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
      {error && <p className="mt-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-4 py-3">{error}</p>}
    </div>
  );
}
