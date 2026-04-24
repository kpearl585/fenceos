"use client";

import { exportAccountData } from "@/app/dashboard/settings/actions";
import { useState } from "react";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function ExportDataButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAccountData();
      if (result.success && result.base64 && result.filename) {
        // Server returns base64 — Buffer/Uint8Array aren't a supported
        // Server Action return type across the RSC boundary, so we
        // decode in the browser.
        const binary = atob(result.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: XLSX_MIME });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("Export failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      alert("Export failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="bg-accent hover:bg-accent-light accent-glow text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? "Exporting..." : "Export Data"}
    </button>
  );
}
