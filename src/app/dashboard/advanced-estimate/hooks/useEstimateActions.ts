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
import { isPaywallBlock, type PaywallBlock } from "@/lib/paywall";

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
    const res = await saveAdvancedEstimate(input, result, projectName, laborRate, wastePct / 100);
    if (isPaywallBlock(res)) {
      setPaywallBlock(res);
      setSaveStatus("idle");
      return;
    }
    setSaveStatus(res.success ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), STATUS_RESET_MS);
  }, [input, result, projectName, laborRate, wastePct]);

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
    // Project name must be a real name before we create a permanent
    // estimate record. Blocks the "New Estimate" default from silently
    // accumulating in the estimates list as a pile of identical titles.
    const trimmedName = projectName.trim();
    if (!trimmedName || trimmedName.toLowerCase() === "new estimate") {
      setConvertError("Give this estimate a name before creating the quote.");
      if (typeof document !== "undefined") {
        const field = document.getElementById("est-project-name") as HTMLInputElement | null;
        if (field) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => field.focus(), 300);
        }
      }
      setTimeout(() => setConvertError(null), CONVERT_ERROR_RESET_MS);
      return;
    }
    if (!customer.name.trim()) {
      setConvertError("Enter a customer name above before creating an estimate.");
      // Pull the user to the field instead of making them hunt for it.
      // Guarded by typeof document for SSR safety — this runs in a
      // useCallback bound event handler so the check is defensive only.
      if (typeof document !== "undefined") {
        const field = document.getElementById("est-cust-name") as HTMLInputElement | null;
        if (field) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          // Wait for the smooth scroll to settle before focusing, otherwise
          // the mobile keyboard popping up cancels the scroll animation.
          setTimeout(() => field.focus(), 300);
        }
      }
      return;
    }
    setConvertStatus("converting");
    setConvertError(null);
    const res = await createEstimateFromFenceGraph({
      result,
      projectName,
      laborRate,
      markupPct,
      totalLF,
      fenceType,
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
  }, [result, projectName, laborRate, markupPct, totalLF, fenceType, customer, router]);

  return {
    saveStatus, pdfStatus, proposalStatus, convertStatus, convertError,
    paywallBlock, dismissPaywall, showPaywall,
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  };
}
