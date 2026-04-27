"use client";

interface ExportRow {
  customer_name: string | null;
  job_title: string;
  status: string;
  total_price: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export default function ExportCSV({ data }: { data: ExportRow[] }) {
  function handleExport() {
    const headers = ["Customer", "Job Title", "Status", "Contract Value", "Gross Profit", "Margin %"];
    const rows = data.map((j) => [
      j.customer_name || "",
      j.job_title || "",
      j.status,
      j.total_price?.toFixed(2) ?? "0.00",
      j.gross_profit?.toFixed(2) ?? "0.00",
      ((j.gross_margin_pct ?? 0) * 100).toFixed(1) + "%",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pl-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="bg-surface border border-border text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-2 transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export CSV
    </button>
  );
}
