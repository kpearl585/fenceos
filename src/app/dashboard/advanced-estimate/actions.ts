"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile, getProfileByAuthId } from "@/lib/bootstrap";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AdvancedEstimatePdf } from "@/lib/fence-graph/AdvancedEstimatePdf";
import type { FenceProjectInput, FenceEstimateResult, FenceType, WoodStyle } from "@/lib/fence-graph/engine";
import { updateWasteCalibration, DEFAULT_WASTE_CALIBRATION } from "@/lib/fence-graph/bom/shared";
import type { WasteCalibration } from "@/lib/fence-graph/bom/shared";
import {
  getOrgMaterialPricesByOrgId,
  recomputeEstimateForOrg,
  requireOrgEstimateContext,
} from "./serverEstimate";

// ── Fetch org material prices ─────────────────────────────────────
// Returns { [sku]: unit_cost } for the current org's materials.
// Used to populate dollar amounts in the BOM engine.
export async function getOrgMaterialPrices(): Promise<Record<string, number>> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return {};
    return await getOrgMaterialPricesByOrgId(context.admin, context.orgId);
  } catch {
    return {};
  }
}

// ── Save estimate to DB ───────────────────────────────────────────
export async function saveAdvancedEstimate(
  input: FenceProjectInput,
  name: string,
  laborRate: number,
  wastePctPercent: number,
  fenceType: FenceType,
  woodStyle?: WoodStyle
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };
    const { result, totalLF } = await recomputeEstimateForOrg(context, {
      input,
      laborRate,
      wastePctPercent,
      fenceType,
      woodStyle,
    });
    const persistedResult: FenceEstimateResult = { ...result, projectName: name };

    const { data, error } = await context.admin
      .from("fence_graphs")
      .insert({
        org_id: context.orgId,
        name,
        input_json: { ...input, fenceType } as unknown as Record<string, unknown>,
        result_json: persistedResult as unknown as Record<string, unknown>,
        labor_rate: laborRate,
        waste_pct: wastePctPercent / 100,
        total_lf: totalLF,
        total_cost: result.totalCost,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── List saved estimates ──────────────────────────────────────────
export async function listAdvancedEstimates(): Promise<{
  id: string; name: string; total_lf: number; total_cost: number; status: string; created_at: string;
}[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    const { data } = await admin
      .from("fence_graphs")
      .select("id, name, total_lf, total_cost, status, created_at")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(50);

    return data ?? [];
  } catch {
    return [];
  }
}

// ── Fetch org branding ────────────────────────────────────────────
async function getOrgInfo(userId: string): Promise<{
  orgId: string; orgName: string; orgPhone: string; orgEmail: string; orgAddress: string;
}> {
  const admin = createAdminClient();
  const profile = await getProfileByAuthId(userId);
  if (!profile) return { orgId: "", orgName: "Your Company", orgPhone: "", orgEmail: "", orgAddress: "" };

  const { data: org } = await admin
    .from("organizations").select("name").eq("id", profile.org_id).single();
  const { data: branding } = await admin
    .from("org_branding").select("phone, email, address").eq("org_id", profile.org_id).single();

  return {
    orgId: profile.org_id,
    orgName: org?.name ?? "Your Company",
    orgPhone: branding?.phone ?? "",
    orgEmail: branding?.email ?? "",
    orgAddress: branding?.address ?? "",
  };
}

// ── Generate Internal BOM PDF ────────────────────────────────────
export async function generateAdvancedEstimatePdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  projectName: string,
  fenceType: FenceType,
  woodStyle?: WoodStyle
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };

    const { orgName } = await getOrgInfo(context.userId);
    const { result } = await recomputeEstimateForOrg(context, {
      input,
      laborRate,
      wastePctPercent: wastePct,
      fenceType,
      woodStyle,
    });

    const pdfElement = React.createElement(AdvancedEstimatePdf, {
      result, projectName, orgName,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    });
    const buffer = await renderToBuffer(pdfElement as React.ReactElement);
    return { success: true, pdf: Buffer.from(buffer).toString("base64") };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "PDF generation failed" };
  }
}

// ── Generate Customer Proposal PDF ──────────────────────────────
export async function generateCustomerProposalPdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  markupPct: number,
  projectName: string,
  fenceType: FenceType,
  woodStyle: WoodStyle | undefined,
  customer: {
    name?: string; address?: string; city?: string; phone?: string; email?: string;
  }
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };

    const { orgName, orgPhone, orgEmail, orgAddress } = await getOrgInfo(context.userId);
    const { result, totalLF } = await recomputeEstimateForOrg(context, {
      input,
      laborRate,
      wastePctPercent: wastePct,
      fenceType,
      woodStyle,
    });
    const bidPrice = Math.round(result.totalCost * (1 + markupPct / 100));

    const { CustomerProposalPdf } = await import("@/lib/fence-graph/CustomerProposalPdf");
    const proposalElement = React.createElement(CustomerProposalPdf, {
      data: {
        result, projectName, fenceType, bidPrice, markupPct, totalLF,
        orgName, orgPhone, orgEmail, orgAddress,
        customerName: customer.name, customerAddress: customer.address,
        customerCity: customer.city, customerPhone: customer.phone, customerEmail: customer.email,
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        proposalNumber: `P-${Date.now().toString().slice(-6)}`,
        validDays: 30,
      },
    });
    const buffer = await renderToBuffer(proposalElement as React.ReactElement);
    return { success: true, pdf: Buffer.from(buffer).toString("base64") };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Proposal generation failed" };
  }
}

// ── Get org waste calibration ─────────────────────────────────────
export async function getOrgCalibration(): Promise<WasteCalibration> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_WASTE_CALIBRATION;
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    const { data: org } = await admin
      .from("organizations").select("waste_calibration_json").eq("id", profile.org_id).single();

    return (org?.waste_calibration_json as WasteCalibration | null) ?? DEFAULT_WASTE_CALIBRATION;
  } catch {
    return DEFAULT_WASTE_CALIBRATION;
  }
}

// ── Get a single saved estimate ──────────────────────────────────
export async function getSavedEstimate(id: string): Promise<{
  id: string; name: string; input_json: FenceProjectInput;
  result_json: FenceEstimateResult; labor_rate: number; waste_pct: number;
  total_lf: number; total_cost: number; status: string;
  closed_at: string | null; closeout_actual_waste_pct: number | null; closeout_notes: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    const { data } = await admin
      .from("fence_graphs")
      .select("*")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .single();

    return data ?? null;
  } catch {
    return null;
  }
}

// ── Close out an estimate (job complete — record actual waste) ────
// This is the core of the feedback loop.
// Contractor enters actual waste %. We update the org EWMA calibration.
export async function closeoutEstimate(
  estimateId: string,
  actualWastePct: number,  // 0–100 (user enters as percent, e.g. 7 = 7%)
  notes: string
): Promise<{ success: boolean; newCalibration?: WasteCalibration; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    // Validate estimate belongs to this org
    const { data: est } = await admin
      .from("fence_graphs").select("id, status")
      .eq("id", estimateId).eq("org_id", profile.org_id).single();
    if (!est) return { success: false, error: "Estimate not found" };
    if (est.status === "closed") return { success: false, error: "Estimate already closed" };

    const actualFactor = actualWastePct / 100;

    // Fetch current calibration
    const { data: org } = await admin
      .from("organizations").select("waste_calibration_json").eq("id", profile.org_id).single();
    const currentCal: WasteCalibration =
      (org?.waste_calibration_json as WasteCalibration | null) ?? DEFAULT_WASTE_CALIBRATION;

    // EWMA update
    const newCal = updateWasteCalibration(currentCal, actualFactor);

    // Update org calibration
    await admin
      .from("organizations")
      .update({ waste_calibration_json: newCal as unknown as Record<string, unknown> })
      .eq("id", profile.org_id);

    // Mark estimate as closed
    await admin
      .from("fence_graphs")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closeout_actual_waste_pct: actualFactor,
        closeout_notes: notes || null,
      })
      .eq("id", estimateId);

    return { success: true, newCalibration: newCal };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Closeout failed" };
  }
}
