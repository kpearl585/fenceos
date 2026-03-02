"use client";
import { useState, useRef } from "react";

interface ImportRow {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: number;
  message: string;
}

const REQUIRED_COLUMNS = ["name"];
const OPTIONAL_COLUMNS = ["email", "phone", "address", "city", "state", "zip", "notes"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    "customer name": "name", "full name": "name", "client name": "name",
    "email address": "email", "e-mail": "email",
    "phone number": "phone", "cell": "phone", "mobile": "phone", "telephone": "phone",
    "street": "address", "street address": "address",
    "zip code": "zip", "postal code": "zip", "zipcode": "zip",
  };
  const lower = h.toLowerCase().trim();
  return map[lower] || lower;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => normalizeHeader(h.replace(/"/g, "").trim()));
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
    if (cells.every(c => !c)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { if (ALL_COLUMNS.includes(h)) row[h] = cells[idx] || ""; });
    if (row.name) rows.push(row as unknown as ImportRow);
  }
  return rows;
}

export default function CustomerImport({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"idle" | "preview" | "importing" | "done">("idle");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError("No valid rows found. Make sure the file has a 'name' column.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function runImport() {
    setStep("importing");
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setStep("preview"); return; }
      setResult(data);
      setStep("done");
      if (data.inserted > 0) onSuccess();
    } catch {
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  }

  function reset() {
    setStep("idle");
    setRows([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Import customers from a CSV or Excel file.</p>
        <a
          href="/customer-import-template.csv"
          download
          className="text-xs text-fence-600 hover:text-fence-700 font-medium flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </a>
      </div>

      {step === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragging ? "border-fence-500 bg-fence-50" : "border-gray-200 hover:border-fence-400 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="font-semibold text-gray-700 mb-1">Drop your file here or click to browse</p>
          <p className="text-sm text-gray-400">CSV or Excel · Max 500 customers</p>
          <p className="text-xs text-gray-400 mt-2">Columns: name, email, phone, address, city, state, zip, notes</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{rows.length} customers ready to import</p>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Choose different file</button>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["Name", "Email", "Phone", "City", "State"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                      <td className="px-3 py-2 text-gray-500">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{row.phone || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{row.city || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{row.state || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 20 && (
              <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 text-center border-t border-gray-100">
                + {rows.length - 20} more customers
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={runImport}
              className="flex-1 bg-fence-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-fence-700 transition-colors"
            >
              Import {rows.length} Customers
            </button>
            <button onClick={reset} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-fence-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Importing {rows.length} customers...</p>
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-green-800 mb-1">{result.message}</p>
          {result.skipped > 0 && <p className="text-sm text-green-600">{result.skipped} duplicates were skipped.</p>}
          <button onClick={reset} className="mt-4 text-sm text-green-700 hover:text-green-900 font-medium">Import another file</button>
        </div>
      )}
    </div>
  );
}
