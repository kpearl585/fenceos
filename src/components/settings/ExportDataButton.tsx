"use client";

import { exportAccountData } from "@/app/dashboard/settings/actions";
import { useState } from "react";

export default function ExportDataButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAccountData();
      if (result.success && result.data && result.filename) {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Export failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="bg-fence-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-fence-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? 'Exporting...' : 'Export Data'}
    </button>
  );
}
