"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile, getProfileByAuthId } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import React from "react";
import { AdvancedEstimatePdf } from "@/lib/fence-graph/AdvancedEstimatePdf";
import type { FenceProjectInput, FenceEstimateResult, FenceType, WoodStyle } from "@/lib/fence-graph/engine";
import { inferFenceTypeFromProductLineId, totalLinearFeet } from "@/lib/fence-graph/estimateInput";
import { updateWasteCalibration, DEFAULT_WASTE_CALIBRATION } from "@/lib/fence-graph/bom/shared";
import type { WasteCalibration } from "@/lib/fence-graph/bom/shared";
import type { AccuracyMetrics, CloseoutData, SiteComplexity } from "@/lib/fence-graph/accuracy-types";
import { buildAccuracyMetrics } from "@/lib/fence-graph/accuracyMetrics";
import type { OrgEstimatorConfig, DeepPartial } from "@/lib/fence-graph/config/types";
import {
  mergeEstimatorConfig,
  extractEstimatorOverrides,
} from "@/lib/fence-graph/config/resolveEstimatorConfig";
import { buildFenceGraphCloseoutPersistence } from "@/lib/fence-graph/closeout/persistence";
import type { CloseoutActuals, EstimateCloseoutAnalysis } from "@/lib/fence-graph/closeout/types";
import {
  applyEstimatorTuningRecommendations,
  buildEstimatorTuningRecommendations,
} from "@/lib/fence-graph/closeout/tuning";
import type { PaywallBlock } from "@/lib/paywall";
import {
  getOrgMaterialPricesByOrgId,
  getOrgMaterialPricingByOrgId,
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

export async function getOrgMaterialPricing(): Promise<{
  priceMap: Record<string, number>;
  priceMeta: Record<string, { updatedAt?: string | null }>;
}> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { priceMap: {}, priceMeta: {} };
    return await getOrgMaterialPricingByOrgId(context.admin, context.orgId);
  } catch {
    return { priceMap: {}, priceMeta: {} };
  }
}

// ── Save estimate to DB ───────────────────────────────────────────
export async function saveAdvancedEstimate(
  input: FenceProjectInput,
  result: FenceEstimateResult,
  name: string,
  laborRate: number,
  wastePct: number,
  markupPct?: number
): Promise<{ success: boolean; id?: string; error?: string } | PaywallBlock>;
export async function saveAdvancedEstimate(
  input: FenceProjectInput,
  name: string,
  laborRate: number,
  wastePctPercent: number,
  fenceType: FenceType,
  woodStyle?: WoodStyle
): Promise<{ success: boolean; id?: string; error?: string } | PaywallBlock>;
export async function saveAdvancedEstimate(
  input: FenceProjectInput,
  resultOrName: FenceEstimateResult | string,
  nameOrLaborRate: string | number,
  laborRateOrWastePct: number,
  wastePctOrFenceType: number | FenceType,
  markupPctOrWoodStyle?: number | WoodStyle
): Promise<{ success: boolean; id?: string; error?: string } | PaywallBlock> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };

    let name: string;
    let laborRate: number;
    let totalLF: number;
    let persistedResult: FenceEstimateResult;
    let persistedInput: FenceProjectInput & { fenceType?: FenceType };

    if (typeof resultOrName === "string") {
      const fenceType = wastePctOrFenceType as FenceType;
      const woodStyle =
        typeof markupPctOrWoodStyle === "string" ? markupPctOrWoodStyle : undefined;
      name = resultOrName;
      laborRate = nameOrLaborRate as number;

      const recomputed = await recomputeEstimateForOrg(context, {
        input,
        laborRate,
        wastePctPercent: laborRateOrWastePct,
        fenceType,
        woodStyle,
      });
      totalLF = recomputed.totalLF;
      persistedResult = { ...recomputed.result, projectName: name };
      persistedInput = { ...input, fenceType };
    } else {
      name = nameOrLaborRate as string;
      laborRate = laborRateOrWastePct;
      totalLF = totalLinearFeet(input);
      const fenceType = inferFenceTypeFromProductLineId(input.productLineId) ?? "vinyl";
      persistedResult = { ...resultOrName, projectName: name };
      persistedInput = { ...input, fenceType };
    }

    const { data, error } = await context.admin
      .from("fence_graphs")
      .insert({
        org_id: context.orgId,
        name,
        input_json: persistedInput as unknown as Record<string, unknown>,
        result_json: persistedResult as unknown as Record<string, unknown>,
        labor_rate: laborRate,
        waste_pct:
          typeof resultOrName === "string" ? laborRateOrWastePct / 100 : laborRateOrWastePct,
        total_lf: totalLF,
        total_cost: persistedResult.totalCost,
        estimated_labor_hours: persistedResult.totalLaborHrs,
        site_complexity_json:
          ((input.siteComplexity as SiteComplexity | undefined) ?? null) as unknown as Record<string, unknown> | null,
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
  fenceType?: FenceType,
  woodStyle?: WoodStyle
): Promise<{ success: boolean; pdf?: string; error?: string } | PaywallBlock> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };

    const { orgName } = await getOrgInfo(context.userId);
    const resolvedFenceType = fenceType ?? inferFenceTypeFromProductLineId(input.productLineId) ?? "vinyl";
    const { result } = await recomputeEstimateForOrg(context, {
      input,
      laborRate,
      wastePctPercent: wastePct,
      fenceType: resolvedFenceType,
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
type ProposalCustomer = {
  name?: string; address?: string; city?: string; phone?: string; email?: string;
};

export async function generateCustomerProposalPdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  markupPct: number,
  projectName: string,
  fenceType: FenceType,
  customer: ProposalCustomer,
  woodStyle?: WoodStyle
): Promise<{ success: boolean; pdf?: string; error?: string } | PaywallBlock>;
export async function generateCustomerProposalPdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  markupPct: number,
  projectName: string,
  fenceType: FenceType,
  woodStyle: WoodStyle | undefined,
  customer: ProposalCustomer
): Promise<{ success: boolean; pdf?: string; error?: string } | PaywallBlock>;
export async function generateCustomerProposalPdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  markupPct: number,
  projectName: string,
  fenceType: FenceType,
  customerOrWoodStyle: ProposalCustomer | WoodStyle | undefined,
  maybeWoodStyleOrCustomer?: ProposalCustomer | WoodStyle
): Promise<{ success: boolean; pdf?: string; error?: string } | PaywallBlock> {
  try {
    const context = await requireOrgEstimateContext();
    if (!context) return { success: false, error: "Not authenticated" };

    const { orgName, orgPhone, orgEmail, orgAddress } = await getOrgInfo(context.userId);
    const customer =
      typeof customerOrWoodStyle === "object" && customerOrWoodStyle !== null
        ? customerOrWoodStyle
        : ((maybeWoodStyleOrCustomer as ProposalCustomer | undefined) ?? {});
    const woodStyle =
      typeof customerOrWoodStyle === "string" || customerOrWoodStyle === undefined
        ? (customerOrWoodStyle as WoodStyle | undefined)
        : (maybeWoodStyleOrCustomer as WoodStyle | undefined);
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
  closeout_actual_labor_hours: number | null;
  closeout_crew_size: number | null;
  closeout_weather_conditions: string | null;
  closeout_actual_material_cost: number | null;
  closeout_actual_labor_cost: number | null;
  closeout_actual_total_cost: number | null;
  closeout_analysis_json?: unknown;
  closeout_actuals_json?: unknown;
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
  return closeoutEstimateEnhanced(estimateId, { actualWastePct, notes });
}

export async function closeoutEstimateEnhanced(
  estimateId: string,
  closeoutData: CloseoutData
): Promise<{ success: boolean; newCalibration?: WasteCalibration; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    // Validate estimate belongs to this org
    const { data: est } = await admin
      .from("fence_graphs").select("id, status, result_json")
      .eq("id", estimateId).eq("org_id", profile.org_id).single();
    if (!est) return { success: false, error: "Estimate not found" };
    if (est.status === "closed") return { success: false, error: "Estimate already closed" };

    if (!Number.isFinite(closeoutData.actualWastePct) || closeoutData.actualWastePct < 0) {
      return { success: false, error: "Actual waste percent is required" };
    }

    const actualFactor = closeoutData.actualWastePct / 100;

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

    const closedAt = new Date().toISOString();
    const { update } = buildFenceGraphCloseoutPersistence(
      est.result_json as FenceEstimateResult,
      closeoutData,
      closedAt
    );

    // Mark estimate as closed
    const { error: closeoutError } = await admin
      .from("fence_graphs")
      .update(update)
      .eq("id", estimateId);
    if (closeoutError) {
      return { success: false, error: closeoutError.message };
    }

    return { success: true, newCalibration: newCal };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Closeout failed" };
  }
}

export async function applyCloseoutTuningRecommendations(
  estimateId: string
): Promise<{ success: boolean; appliedCount?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    if (!canAccess(profile.role, "owner")) {
      return { success: false, error: "Only owners can apply estimator tuning" };
    }

    const admin = createAdminClient();

    const { data: est } = await admin
      .from("fence_graphs")
      .select("id, org_id, input_json, closeout_actuals_json, closeout_analysis_json")
      .eq("id", estimateId)
      .eq("org_id", profile.org_id)
      .single();

    if (!est) return { success: false, error: "Estimate not found" };

    const input = est.input_json as FenceProjectInput & { fenceType?: FenceType };
    const fenceType = input.fenceType ?? inferFenceTypeFromProductLineId(input.productLineId);
    if (!fenceType) {
      return { success: false, error: "Could not determine fence type for tuning" };
    }

    const actuals = (est.closeout_actuals_json as CloseoutActuals | null | undefined) ?? null;
    const analysis = (est.closeout_analysis_json as EstimateCloseoutAnalysis | null | undefined) ?? null;
    if (!actuals || !analysis) {
      return { success: false, error: "Closeout data is incomplete for tuning" };
    }

    const { data: orgSettings } = await admin
      .from("org_settings")
      .select("estimator_config_json")
      .eq("org_id", profile.org_id)
      .single();

    const rawOverrides =
      ((orgSettings as Record<string, unknown> | null)?.estimator_config_json as DeepPartial<OrgEstimatorConfig> | null) ?? null;
    const currentConfig = mergeEstimatorConfig(rawOverrides);

    const recommendations = buildEstimatorTuningRecommendations({
      analysis,
      actuals,
      currentConfig,
      fenceType,
      siteComplexity: input.siteComplexity ?? null,
    }).filter((recommendation) => recommendation.patch);

    if (recommendations.length === 0) {
      return { success: false, error: "No safe tuning recommendations were generated for this closeout" };
    }

    const nextConfig = applyEstimatorTuningRecommendations(currentConfig, recommendations);
    const nextOverrides = extractEstimatorOverrides(nextConfig);

    await admin
      .from("org_settings")
      .upsert(
        {
          org_id: profile.org_id,
          estimator_config_json: nextOverrides as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" }
      );

    revalidatePath("/dashboard/settings/estimator");
    revalidatePath(`/dashboard/advanced-estimate/${estimateId}`);
    revalidatePath("/dashboard/advanced-estimate/saved");

    return { success: true, appliedCount: recommendations.length };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to apply tuning" };
  }
}

// ── Get accuracy metrics ──────────────────────────────────────────
export async function getAccuracyMetrics(days: number = 30): Promise<AccuracyMetrics | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("fence_graphs")
      .select(
        "id, name, total_lf, closed_at, input_json, site_complexity_json, closeout_analysis_json, closeout_actual_waste_pct, waste_pct"
      )
      .eq("org_id", profile.org_id)
      .eq("status", "closed")
      .gte("closed_at", since)
      .order("closed_at", { ascending: false });

    if (error) {
      console.error("Error fetching accuracy metrics:", error);
      return null;
    }

    return buildAccuracyMetrics({
      rows: (data ?? []) as Parameters<typeof buildAccuracyMetrics>[0]["rows"],
      periodDays: days,
    });
  } catch (err) {
    console.error("Unexpected error fetching accuracy metrics:", err);
    return null;
  }
}

// ── Fetch org estimator config ───────────────────────────────────
export async function getOrgEstimatorConfig(): Promise<{
  config: OrgEstimatorConfig;
  hasCustomConfig: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { config: mergeEstimatorConfig(null), hasCustomConfig: false };

    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();
    const { data: orgSettings } = await admin
      .from("org_settings")
      .select("estimator_config_json")
      .eq("org_id", profile.org_id)
      .single();

    const raw = (orgSettings as Record<string, unknown> | null)?.estimator_config_json;
    const hasCustomConfig = raw !== null && raw !== undefined && typeof raw === "object";
    const config = mergeEstimatorConfig(
      hasCustomConfig ? (raw as DeepPartial<OrgEstimatorConfig>) : null
    );

    return { config, hasCustomConfig };
  } catch {
    return { config: mergeEstimatorConfig(null), hasCustomConfig: false };
  }
}
