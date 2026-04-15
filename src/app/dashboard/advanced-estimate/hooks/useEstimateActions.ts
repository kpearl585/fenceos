"use client";
import { useCallback, useState } from "react";
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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [proposalStatus, setProposalStatus] = useState<PdfStatus>("idle");
  const [convertStatus, setConvertStatus] = useState<ConvertStatus>("idle");
  const [convertError, setConvertError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaveStatus("saving");
    const res = await saveAdvancedEstimate(input, result, projectName, laborRate, wastePct / 100);
    setSaveStatus(res.success ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }, [input, result, projectName, laborRate, wastePct]);

  const handlePdfDownload = useCallback(async () => {
    if (!result) return;
    setPdfStatus("generating");
    const res = await generateAdvancedEstimatePdf(input, laborRate, wastePct, projectName);
    if (res.success && res.pdf) {
      downloadBase64Pdf(res.pdf, `${safeFilename(projectName)}-estimate.pdf`);
      setPdfStatus("idle");
    } else {
      setPdfStatus("error");
      setTimeout(() => setPdfStatus("idle"), 3000);
    }
  }, [input, result, laborRate, wastePct, projectName]);

  const handleProposalDownload = useCallback(async () => {
    if (!result) return;
    setProposalStatus("generating");
    const res = await generateCustomerProposalPdf(
      input, laborRate, wastePct, markupPct, projectName, fenceType, customer, woodStyle,
    );
    if (res.success && res.pdf) {
      downloadBase64Pdf(res.pdf, `${safeFilename(projectName)}-proposal.pdf`);
      setProposalStatus("idle");
    } else {
      setProposalStatus("error");
      setTimeout(() => setProposalStatus("idle"), 3000);
    }
  }, [input, result, laborRate, wastePct, markupPct, projectName, fenceType, customer, woodStyle]);

  const handleConvertToEstimate = useCallback(async () => {
    if (!result) return;
    if (!customer.name.trim()) {
      setConvertError("Enter a customer name above before creating an estimate.");
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
    if (res.success && res.estimateId) {
      setConvertStatus("done");
      window.location.href = `/dashboard/estimates/${res.estimateId}`;
    } else {
      setConvertStatus("error");
      setConvertError(res.error ?? "Conversion failed");
      setTimeout(() => setConvertStatus("idle"), 4000);
    }
  }, [result, projectName, laborRate, markupPct, totalLF, fenceType, customer]);

  return {
    saveStatus, pdfStatus, proposalStatus, convertStatus, convertError,
    handleSave, handlePdfDownload, handleProposalDownload, handleConvertToEstimate,
  };
}
