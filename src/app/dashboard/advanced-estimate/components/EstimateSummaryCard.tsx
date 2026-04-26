"use client";
import { memo, useEffect, useRef, useState } from "react";
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
  const [showExports, setShowExports] = useState(false);

  // Flash animation: briefly highlight the total when it changes so the
  // contractor knows the estimate recalculated (especially on desktop
  // where the right column may not be in direct focus).
  const [flash, setFlash] = useState(false);
  const prevCostRef = useRef<number | null>(null);
  useEffect(() => {
    if (result && prevCostRef.current !== null && prevCostRef.current !== result.totalCost) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    if (result) prevCostRef.current = result.totalCost;
  }, [result]);

  if (!result) {
    return (
      <div className="bg-surface-2 rounded-xl border border-border p-8 text-center">
        {estimateError ? (
          <p role="alert" className="text-danger text-sm">{estimateError}</p>
        ) : (
          <p className="text-muted text-sm">Add at least one run with a length to generate an estimate.</p>
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
      {/* Hero summary — deep background with accent glow. The signature
          moment of the estimator, equivalent to the price-range card on
          /try-it. */}
      <div className="bg-background border border-accent/20 accent-glow rounded-xl p-5 text-text">
        <p className="text-accent-light text-xs font-semibold uppercase tracking-widest mb-3">Estimate Summary</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-muted text-xs uppercase tracking-wider">Materials Cost</p>
            <p className="font-display text-xl font-bold text-text">{fmt(result.totalMaterialCost)}</p>
          </div>
          <div>
            <p className="text-muted text-xs uppercase tracking-wider">Labor ({result.totalLaborHrs}h)</p>
            <p className="font-display text-xl font-bold text-text">{fmt(result.totalLaborCost)}</p>
          </div>
        </div>
        <div className="border-t border-border pt-3 mb-3 flex justify-between items-center">
          <p className="text-muted text-sm">Total Cost</p>
          <p className={`font-display text-xl font-semibold text-text transition-colors duration-500 ${flash ? "text-accent-light" : ""}`}>{fmt(result.totalCost)}</p>
        </div>
        {result.totalCost > 0 && (
          <div className="bg-surface-2 border border-border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider">Bid Price ({safeMarkupPct}% markup)</p>
              <p className="font-display text-2xl font-bold text-text">{fmt(bidPrice)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Gross Profit</p>
                <p className="font-display text-sm font-bold text-accent-light">{fmt(grossProfit)}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Gross Margin</p>
                <p className="font-display text-sm font-bold text-accent-light">{grossMargin}%</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Per LF</p>
                <p className="font-display text-sm font-bold text-text">{fmt(pricePerLF)}/LF</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 flex justify-between text-xs text-muted">
          <span>Confidence: {Math.round(result.overallConfidence * 100)}%</span>
          <span>{totalLF} LF · {result.bom.length} line items</span>
          {result.redFlagItems.length > 0 && (
            <span className="text-warning">{result.redFlagItems.length} unpriced</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={onConvertToEstimate}
            disabled={convertStatus === "converting" || convertStatus === "done"}
            className="w-full py-3 rounded-lg text-sm font-bold bg-accent hover:bg-accent-light accent-glow text-white transition-colors duration-150 disabled:opacity-60 disabled:hover:bg-accent"
          >
            {convertStatus === "converting" ? "Creating Quote..." :
             convertStatus === "done" ? "Redirecting..." :
             "Create Quote →"}
          </button>
          {convertError && (
            <p role="alert" className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-1">{convertError}</p>
          )}
          {convertStatus === "idle" && (
            <p className="text-xs text-muted text-center">Enter customer name below to create a sendable quote</p>
          )}
          <button
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-surface-3 hover:bg-surface-2 border border-border text-text transition-colors duration-150 disabled:opacity-60"
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "Error — retry" : "Save Draft"}
          </button>

          {/* Downloads — collapsed by default to reduce decision fatigue.
              Contractors see the 2 primary actions (Create Quote + Save Draft)
              and expand this section only when they need exports. */}
          <div className="relative">
            <button
              onClick={() => setShowExports((v) => !v)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-surface-3 hover:bg-surface-2 border border-border text-muted hover:text-text transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download / Export {showExports ? "▴" : "▾"}
            </button>
            {showExports && (
              <div className="mt-2 space-y-2 bg-surface-3 border border-border rounded-lg p-3">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">PDF</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onPdfDownload}
                    disabled={pdfStatus === "generating"}
                    title="Internal BOM with costs, margins, and audit trail"
                    className="py-2 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-border text-text transition-colors duration-150 disabled:opacity-60"
                  >
                    {pdfStatus === "generating" ? "Generating..." : "Internal BOM"}
                  </button>
                  <button
                    onClick={onProposalDownload}
                    disabled={proposalStatus === "generating"}
                    title="Clean customer-facing proposal — no cost exposure"
                    className="py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-light text-white transition-colors duration-150 disabled:opacity-60 disabled:hover:bg-accent"
                  >
                    {proposalStatus === "generating" ? "Generating..." : proposalStatus === "error" ? "Failed" : "Customer Proposal"}
                  </button>
                </div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mt-2 mb-1">Excel</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadInternalBom(result, projectName, markupPct, totalLF)}
                    title="Full BOM with costs, margins, labor — internal use only"
                    className="py-2 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-border text-text transition-colors duration-150"
                  >
                    Internal BOM (.xlsx)
                  </button>
                  <button
                    onClick={() => downloadSupplierPO(result, projectName, totalLF, undefined, supplierAddress)}
                    title="Clean purchase order for your supplier — no costs shown"
                    className="py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-light text-white transition-colors duration-150"
                  >
                    Supplier PO (.xlsx)
                  </button>
                </div>
                <p className="text-xs text-muted text-center mt-1">Internal shows costs · Proposal/Supplier shows bid price only</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrap summary */}
      <div className="bg-surface-2 rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Waste Analysis</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Deterministic scrap</span>
          <span className="font-semibold text-text">{(result.deterministicScrap_in / 12).toFixed(1)} LF</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted">Probabilistic waste</span>
          <span className="font-semibold text-text">{result.probabilisticWastePct * 100}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
        <div className="flex border-b border-border">
          {(["bom", "labor", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-2.5 uppercase tracking-wider transition-colors duration-150 ${activeTab === tab ? "bg-accent/10 text-accent-light border-b-2 border-accent" : "text-muted hover:text-text"}`}
            >
              {tab === "bom" ? "BOM" : tab === "labor" ? "Labor" : "Audit"}
            </button>
          ))}
        </div>

        {activeTab === "bom" && (
          <div className="divide-y divide-border">
            <div className="px-4 py-2 bg-surface-3 grid grid-cols-12 gap-1 text-xs font-semibold text-muted uppercase tracking-wider">
              <span className="col-span-5">Material</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit $</span>
              <span className="col-span-3 text-right">Ext. Cost</span>
            </div>
            {result.bom.map((item, i) => (
              <div key={`${item.name}-${i}`} className="px-4 py-2.5 hover:bg-surface-3 transition-colors duration-150 grid grid-cols-12 gap-1 items-center">
                <div className="col-span-5 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{item.name}</p>
                  <p className="text-xs text-muted truncate">{item.traceability}</p>
                </div>
                <p className="col-span-2 text-sm font-bold font-display text-text text-right">{item.qty} <span className="text-xs text-muted font-normal">{item.unit}</span></p>
                <p className="col-span-2 text-xs text-muted text-right font-mono">
                  {item.unitCost != null ? fmt(item.unitCost) : <span className="text-warning">—</span>}
                </p>
                <p className="col-span-3 text-sm font-semibold text-right">
                  {item.extCost != null && item.extCost > 0
                    ? <span className="text-text font-display">{fmt(item.extCost)}</span>
                    : <span className="text-warning text-xs">No price</span>}
                </p>
              </div>
            ))}
            <div className="px-4 py-3 bg-surface-3 flex justify-between items-center">
              <p className="text-sm font-bold text-text">Materials Total</p>
              <p className="font-display text-sm font-bold text-accent-light">{fmt(result.totalMaterialCost)}</p>
            </div>
          </div>
        )}

        {activeTab === "labor" && (
          <div className="divide-y divide-border">
            {result.laborDrivers.filter((l) => l.count > 0).map((l, i) => (
              <div key={`${l.activity}-${i}`} className="px-4 py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-text">{l.activity}</p>
                  <p className="text-xs text-muted">{l.count} units × {l.rateHrs}h each</p>
                </div>
                <p className="font-display text-sm font-bold text-text">{l.totalHrs.toFixed(1)}h</p>
              </div>
            ))}
            <div className="px-4 py-3 bg-surface-3 flex justify-between">
              <p className="text-sm font-bold text-text">Total Labor</p>
              <p className="font-display text-sm font-bold text-accent-light">{result.totalLaborHrs}h · {fmt(result.totalLaborCost)}</p>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="px-4 py-3">
            <ul className="space-y-1.5">
              {result.auditTrail.map((line, i) => (
                <li key={`${i}-${line.slice(0, 20)}`} className="text-xs text-muted font-mono leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
});
