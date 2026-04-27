"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  FenceProjectInput,
  FenceEstimateResult,
  FenceType,
  WoodStyle,
} from "@/lib/fence-graph/engine";
import {
  saveAdvancedEstimate,
  generateAdvancedEstimatePdf,
  generateCustomerProposalPdf,
} from "../actions";
import { createEstimateFromFenceGraph } from "../convertActions";
import { STATUS_RESET_MS, CONVERT_ERROR_RESET_MS } from "../constants";
import { validateEstimateBeforeConvert } from "../validation";
import { isPaywallBlock, type PaywallBlock } from "@/lib/paywall";
import { captureEvent } from "@/lib/analytics/posthog-client";

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  return name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "") || "estimate";
}

export interface Customer {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface UseEstimateActionsArgs {
  input: FenceProjectInput;
  result: FenceEstimateResult | null;
  projectName: string;
  laborRate: number;
  wastePct: number;
  markupPct: number;
  fenceType: FenceType;
  woodStyle: WoodStyle;
  customer: Customer;
  totalLF: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PdfStatus = "idle" | "generating" | "error";
export type ConvertStatus = "idle" | "converting" | "done" | "error";

export interface UseEstimateActionsReturn {
  saveStatus: SaveStatus;
  pdfStatus: PdfStatus;
  proposalStatus: PdfStatus;
  convertStatus: ConvertStatus;
  convertError: string | null;
  paywallBlock: PaywallBlock | null;
  dismissPaywall: () => void;
  /** Imperatively raise the paywall modal — used by sibling components
   *  (AI tab, etc.) that call their own server actions. */
  showPaywall: (block: PaywallBlock) => void;
  handleSave: () => Promise<void>;
  handlePdfDownload: () => Promise<void>;
  handleProposalDownload: () => Promise<void>;
  handleConvertToEstimate: () => Promise<void>;
}

// Encapsulates all server-action calls driven from the advanced estimator UI:
// save, PDF, customer proposal PDF, and convert-to-sendable-estimate. Owns
// the per-action status state so the caller doesn't have to.
export function useEstimateActions(args: UseEstimateActionsArgs): UseEstimateActionsReturn {
  const {
    input, result, projectName, laborRate, wastePct, markupPct,
    fenceType, woodStyle, customer, totalLF,
  } = args;
  const router = useRouter();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [proposalStatus, setProposalStatus] = useState<PdfStatus>("idle");
  const [convertStatus, setConvertStatus] = useState<ConvertStatus>("idle");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [paywallBlock, setPaywallBlock] = useState<PaywallBlock | null>(null);
  const dismissPaywall = useCallback(() => setPaywallBlock(null), []);
  const showPaywall = useCallback((block: PaywallBlock) => setPaywallBlock(block), []);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaveStatus("saving");
    const res = await saveAdvancedEstimate(
      input, result, projectName, laborRate, wastePct / 100, markupPct,
    );
    if (isPaywallBlock(res)) {
      setPaywallBlock(res);
      setSaveStatus("idle");
      return;
    }
    setSaveStatus(res.success ? "saved" : "error");
    if (res.success) {
      // Fire funnel event on save. Avoid PII (customer name etc.) —
      // only aggregate project metrics that help us see which fence
      // types + sizes are selling.
      const gateCount = Array.isArray(input?.gates) ? input.gates.length : 0;
      captureEvent("estimate_saved", {
        product_line_id: input?.productLineId,
        fence_height_ft: input?.fenceHeight,
        total_runs: Array.isArray(input?.runs) ? input.runs.length : 0,
        gate_count: gateCount,
        labor_rate: laborRate,
        waste_pct: wastePct,
        markup_pct: markupPct,
        total_cost: result?.totalCost,
      });
    }
    setTimeout(() => setSaveStatus("idle"), STATUS_RESET_MS);
  }, [input, result, projectName, laborRate, wastePct, markupPct]);

  const handlePdfDownload = useCallback(async () => {
    if (!result) return;
    setPdfStatus("generating");
    const res = await generateAdvancedEstimatePdf(input, laborRate, wastePct, projectName);
    if (isPaywallBlock(res)) {
      setPaywallBlock(res);
      setPdfStatus("idle");
      return;
    }
    if (res.success && res.pdf) {
      downloadBase64Pdf(res.pdf, `${safeFilename(projectName)}-estimate.pdf`);
      setPdfStatus("idle");
    } else {
      setPdfStatus("error");
      setTimeout(() => setPdfStatus("idle"), STATUS_RESET_MS);
    }
  }, [input, result, laborRate, wastePct, projectName]);

  const handleProposalDownload = useCallback(async () => {
    if (!result) return;
    setProposalStatus("generating");
    const res = await generateCustomerProposalPdf(
      input, laborRate, wastePct, markupPct, projectName, fenceType, customer, woodStyle,
    );
    if (isPaywallBlock(res)) {
      setPaywallBlock(res);
      setProposalStatus("idle");
      return;
    }
    if (res.success && res.pdf) {
      downloadBase64Pdf(res.pdf, `${safeFilename(projectName)}-proposal.pdf`);
      setProposalStatus("idle");
    } else {
      setProposalStatus("error");
      setTimeout(() => setProposalStatus("idle"), STATUS_RESET_MS);
    }
  }, [input, result, laborRate, wastePct, markupPct, projectName, fenceType, customer, woodStyle]);

  const handleConvertToEstimate = useCallback(async () => {
    if (!result) return;
    // Pure validation (project name present and not the "New Estimate"
    // default; customer name present). Blocks the "New Estimate" default
    // from silently accumulating in the estimates list as a pile of
    // identical titles, and catches missing customer before the server
    // roundtrip. Scroll/focus is a DOM side effect handled below.
    const validationError = validateEstimateBeforeConvert({
      projectName,
      customerName: customer.name,
    });
    if (validationError) {
      setConvertError(validationError.message);
      if (typeof document !== "undefined") {
        const field = document.getElementById(validationError.fieldId) as HTMLInputElement | null;
        if (field) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          // Wait for smooth scroll to settle before focusing — otherwise
          // the mobile keyboard popping up cancels the scroll animation.
          setTimeout(() => field.focus(), 300);
        }
      }
      // Only the project-name branch auto-clears the error banner so
      // the stronger "enter a customer name" message stays pinned until
      // the user actually types.
      if (validationError.fieldId === "est-project-name") {
        setTimeout(() => setConvertError(null), CONVERT_ERROR_RESET_MS);
      }
      return;
    }
    setConvertStatus("converting");
    setConvertError(null);
    const res = await createEstimateFromFenceGraph({
      input,
      result,
      projectName,
      laborRate,
      markupPct,
      wastePct,
      fenceType,
      woodStyle,
      customer,
    });
    if (isPaywallBlock(res)) {
      setPaywallBlock(res);
      setConvertStatus("idle");
      return;
    }
    if (res.success && res.estimateId) {
      setConvertStatus("done");
      router.push(`/dashboard/estimates/${res.estimateId}`);
    } else {
      setConvertStatus("error");
      setConvertError(res.error ?? "Conversion failed");
      setTimeout(() => setConvertStatus("idle"), CONVERT_ERROR_RESET_MS);
    }
  }, [input, result, projectName, laborRate, markupPct, wastePct, fenceType, woodStyle, customer, router]);

  return {
    saveStatus, pdfStatus, proposalStatus, convertStatus, convertError,
    paywallBlock, dismissPaywall, showPaywall,
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  };
}
