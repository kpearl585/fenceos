"use client";
import { memo, useState } from "react";
import type { FenceEstimateResult } from "@/lib/fence-graph/engine";
import { downloadInternalBom, downloadSupplierPO } from "@/lib/fence-graph/exportBomExcel";
import type {
  ConvertStatus,
  Customer,
  PdfStatus,
  SaveStatus,
} from "../hooks/useEstimateActions";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

interface EstimateSummaryCardProps {
  result: FenceEstimateResult | null;
  estimateError: string | null;
  projectName: string;
  markupPct: number;
  totalLF: number;
  customer: Customer;
  saveStatus: SaveStatus;
  pdfStatus: PdfStatus;
  proposalStatus: PdfStatus;
  convertStatus: ConvertStatus;
  convertError: string | null;
  onSave: () => void;
  onPdfDownload: () => void;
  onProposalDownload: () => void;
  onConvertToEstimate: () => void;
}

// Memoized: this card re-renders on every parent keystroke (customer name,
// project name, etc.) even when `result` hasn't changed. The memo boundary
// skips re-renders when none of the 16 props change by reference equality.
// The `result` object identity only changes when the engine memo recomputes.
export default memo(function EstimateSummaryCard({
  result,
  estimateError,
  projectName,
  markupPct,
  totalLF,
  customer,
  saveStatus,
  pdfStatus,
  proposalStatus,
  convertStatus,
  convertError,
  onSave,
  onPdfDownload,
  onProposalDownload,
  onConvertToEstimate,
}: EstimateSummaryCardProps) {
  const [activeTab, setActiveTab] = useState<"bom" | "labor" | "audit">("bom");

  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        {estimateError ? (
          <p className="text-red-500 text-sm">{estimateError}</p>
        ) : (
          <p className="text-gray-400 text-sm">Add at least one run with a length to generate an estimate.</p>
        )}
      </div>
    );
  }

  const safeMarkupPct = Math.max(0, markupPct);
  const bidPrice = Math.round(result.totalCost * (1 + safeMarkupPct / 100));
  const grossProfit = bidPrice - result.totalCost;
  const grossMargin = bidPrice > 0 ? Math.round((grossProfit / bidPrice) * 100) : 0;
  const pricePerLF = totalLF > 0 ? Math.round(bidPrice / totalLF) : 0;
  const supplierAddress = customer.address ? `${customer.address}, ${customer.city}` : undefined;

  return (
    <>
      <div className="bg-fence-950 rounded-xl p-5 text-white">
        <p className="text-fence-300 text-xs font-semibold uppercase tracking-widest mb-3">Estimate Summary</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-fence-300 text-xs">Materials Cost</p>
            <p className="text-xl font-bold">{fmt(result.totalMaterialCost)}</p>
          </div>
          <div>
            <p className="text-fence-300 text-xs">Labor ({result.totalLaborHrs}h)</p>
            <p className="text-xl font-bold">{fmt(result.totalLaborCost)}</p>
          </div>
        </div>
        <div className="border-t border-fence-800 pt-3 mb-3 flex justify-between items-center">
          <p className="text-fence-300 text-sm">Total Cost</p>
          <p className="text-xl font-semibold text-fence-200">{fmt(result.totalCost)}</p>
        </div>
        {result.totalCost > 0 && (
          <div className="bg-fence-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-fence-200 text-xs font-semibold uppercase tracking-wide">Bid Price ({safeMarkupPct}% markup)</p>
              <p className="text-2xl font-bold text-white">{fmt(bidPrice)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-fence-300 text-xs">Gross Profit</p>
                <p className="text-sm font-bold text-green-400">{fmt(grossProfit)}</p>
              </div>
              <div>
                <p className="text-fence-300 text-xs">Gross Margin</p>
                <p className="text-sm font-bold text-green-400">{grossMargin}%</p>
              </div>
              <div>
                <p className="text-fence-300 text-xs">Per LF</p>
                <p className="text-sm font-bold text-fence-200">{fmt(pricePerLF)}/LF</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 flex justify-between text-xs text-fence-300">
          <span>Confidence: {Math.round(result.overallConfidence * 100)}%</span>
          <span>{totalLF} LF · {result.bom.length} line items</span>
          {result.redFlagItems.length > 0 && (
            <span className="text-amber-300">{result.redFlagItems.length} unpriced</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={onConvertToEstimate}
            disabled={convertStatus === "converting" || convertStatus === "done"}
            className="w-full py-3 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60 shadow-sm"
          >
            {convertStatus === "converting" ? "Creating Estimate..." :
             convertStatus === "done" ? "Redirecting..." :
             "Create Estimate & Send to Customer"}
          </button>
          {convertError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{convertError}</p>
          )}
          {convertStatus === "idle" && (
            <p className="text-xs text-fence-300 text-center">Requires customer name in Customer Info above</p>
          )}
          <button
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-fence-700 hover:bg-fence-600 text-white transition-colors disabled:opacity-60"
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save Draft"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPdfDownload}
              disabled={pdfStatus === "generating"}
              title="Internal BOM with costs, margins, and audit trail"
              className="py-2 rounded-lg text-xs font-semibold bg-fence-800 hover:bg-fence-700 text-fence-100 transition-colors disabled:opacity-60"
            >
              {pdfStatus === "generating" ? "Generating..." : "Internal BOM"}
            </button>
            <button
              onClick={onProposalDownload}
              disabled={proposalStatus === "generating"}
              title="Clean customer-facing proposal — no cost exposure"
              className="py-2 rounded-lg text-xs font-semibold bg-white text-fence-900 border border-fence-200 hover:bg-fence-50 transition-colors disabled:opacity-60"
            >
              {proposalStatus === "generating" ? "Generating..." : proposalStatus === "error" ? "Failed" : "Customer Proposal"}
            </button>
          </div>
          <p className="text-xs text-fence-300 text-center">Internal BOM shows costs · Proposal shows bid price only</p>
          <div className="border-t border-fence-800 pt-2 mt-1">
            <p className="text-xs text-fence-300 text-center mb-2">Excel / Spreadsheet</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadInternalBom(result, projectName, markupPct, totalLF)}
                title="Full BOM with costs, margins, labor — internal use only"
                className="py-2 rounded-lg text-xs font-semibold bg-fence-800 hover:bg-fence-700 text-fence-100 border border-fence-700 transition-colors"
              >
                Internal BOM (.xlsx)
              </button>
              <button
                onClick={() => downloadSupplierPO(result, projectName, totalLF, undefined, supplierAddress)}
                title="Clean purchase order for your supplier — no costs shown"
                className="py-2 rounded-lg text-xs font-semibold bg-white text-fence-900 border border-fence-200 hover:bg-fence-50 transition-colors"
              >
                Supplier PO (.xlsx)
              </button>
            </div>
            <p className="text-xs text-fence-300 text-center mt-1">Internal shows margins · Supplier PO shows quantities only</p>
          </div>
        </div>
      </div>

      {/* Scrap summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Waste Analysis</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Deterministic scrap</span>
          <span className="font-semibold text-gray-800">{(result.deterministicScrap_in / 12).toFixed(1)} LF</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600">Probabilistic waste</span>
          <span className="font-semibold text-gray-800">{result.probabilisticWastePct * 100}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["bom", "labor", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-2.5 uppercase tracking-wide transition-colors ${activeTab === tab ? "bg-fence-50 text-fence-700 border-b-2 border-fence-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              {tab === "bom" ? "BOM" : tab === "labor" ? "Labor" : "Audit"}
            </button>
          ))}
        </div>

        {activeTab === "bom" && (
          <div className="divide-y divide-gray-50">
            <div className="px-4 py-2 bg-gray-50 grid grid-cols-12 gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="col-span-5">Material</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit $</span>
              <span className="col-span-3 text-right">Ext. Cost</span>
            </div>
            {result.bom.map((item, i) => (
              <div key={`${item.name}-${i}`} className="px-4 py-2.5 hover:bg-gray-50 grid grid-cols-12 gap-1 items-center">
                <div className="col-span-5 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.traceability}</p>
                </div>
                <p className="col-span-2 text-sm font-bold text-gray-900 text-right">{item.qty} <span className="text-xs text-gray-400 font-normal">{item.unit}</span></p>
                <p className="col-span-2 text-xs text-gray-500 text-right">
                  {item.unitCost != null ? fmt(item.unitCost) : <span className="text-amber-400">—</span>}
                </p>
                <p className="col-span-3 text-sm font-semibold text-right">
                  {item.extCost != null && item.extCost > 0
                    ? <span className="text-gray-900">{fmt(item.extCost)}</span>
                    : <span className="text-amber-400 text-xs">No price</span>}
                </p>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
              <p className="text-sm font-bold text-gray-700">Materials Total</p>
              <p className="text-sm font-bold text-fence-700">{fmt(result.totalMaterialCost)}</p>
            </div>
          </div>
        )}

        {activeTab === "labor" && (
          <div className="divide-y divide-gray-50">
            {result.laborDrivers.filter((l) => l.count > 0).map((l, i) => (
              <div key={`${l.activity}-${i}`} className="px-4 py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{l.activity}</p>
                  <p className="text-xs text-gray-400">{l.count} units × {l.rateHrs}h each</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{l.totalHrs.toFixed(1)}h</p>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex justify-between">
              <p className="text-sm font-bold text-gray-700">Total Labor</p>
              <p className="text-sm font-bold text-fence-700">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="px-4 py-3">
            <ul className="space-y-1.5">
              {result.auditTrail.map((line, i) => (
                <li key={`${i}-${line.slice(0, 20)}`} className="text-xs text-gray-500 font-mono leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
});
