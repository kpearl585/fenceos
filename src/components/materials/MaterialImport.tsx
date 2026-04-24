"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

type ParsedRow = { name: string; sku: string; unit: string; unit_cost: string; unit_price: string; category: string; supplier: string };
type ImportResult = { imported: number; errors: string[] };

export default function MaterialImport({ onImport }: { onImport: (rows: ParsedRow[]) => Promise<ImportResult> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).map(r => ({
          name: r["Name"] || r["name"] || "",
          sku: r["SKU"] || r["sku"] || "",
          unit: r["Unit"] || r["unit"] || "ea",
          unit_cost: r["Cost"] || r["unit_cost"] || "0",
          unit_price: r["Price"] || r["unit_price"] || "0",
          category: r["Category"] || r["category"] || "",
          supplier: r["Supplier"] || r["supplier"] || "",
        })).filter(r => r.name);
        setPreview(rows); setResult(null);
      },
    });
  }

  async function doImport() {
    setLoading(true);
    const res = await onImport(preview);
    setResult(res); setLoading(false);
    if (res.imported > 0) { setPreview([]); if (fileRef.current) fileRef.current.value = ""; }
  }

  const close = () => { setOpen(false); setPreview([]); setResult(null); };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 border border-border bg-surface-3 text-text hover:bg-surface-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-2 border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="font-bold text-text text-lg">Import Materials from CSV</h2>
              <button onClick={close} className="text-muted hover:text-text transition-colors duration-150">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm">
                <p className="font-semibold text-accent-light mb-1">Required columns:</p>
                <p className="font-mono text-xs text-muted">Name, SKU, Unit, Cost, Price, Category, Supplier</p>
                <a href="data:text/csv;charset=utf-8,Name,SKU,Unit,Cost,Price,Category,Supplier%0AChain Link Post,CL-POST-2IN,ea,8.50,14.00,Posts,ABC Supply" download="materials-template.csv"
                  className="mt-2 inline-block text-xs text-accent-light hover:text-accent font-semibold hover:underline transition-colors duration-150">↓ Download template</a>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Select CSV file</label>
                <input ref={fileRef} type="file" accept=".csv" onChange={onFile}
                  className="block w-full text-sm text-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:font-semibold hover:file:bg-accent-light transition-colors duration-150" />
              </div>
              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text mb-2">{preview.length} rows ready to import</p>
                  <div className="overflow-x-auto border border-border rounded-lg max-h-48 overflow-y-auto">
                    <table className="text-xs w-full">
                      <thead className="bg-surface-3 sticky top-0">
                        <tr>{["Name","SKU","Unit","Cost","Price","Category"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted uppercase tracking-wider">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.map((r, i) => (
                          <tr key={i}><td className="px-3 py-1.5 font-medium text-text">{r.name}</td><td className="px-3 py-1.5 font-mono text-muted">{r.sku||"—"}</td><td className="px-3 py-1.5 text-text">{r.unit}</td><td className="px-3 py-1.5 text-text">${r.unit_cost}</td><td className="px-3 py-1.5 text-text">${r.unit_price}</td><td className="px-3 py-1.5 text-muted">{r.category||"—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={doImport} disabled={loading} className="mt-3 w-full bg-accent hover:bg-accent-light accent-glow text-white font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors duration-150">
                    {loading ? "Importing..." : `Import ${preview.length} materials`}
                  </button>
                </div>
              )}
              {result && (
                <div className={`rounded-lg p-4 text-sm font-medium ${result.imported > 0 ? "bg-accent/10 border border-accent/30 text-accent-light" : "bg-danger/10 border border-danger/30 text-danger"}`}>
                  {result.imported > 0 ? ` ${result.imported} materials imported!` : " Import failed."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
