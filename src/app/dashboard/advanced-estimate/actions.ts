"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AdvancedEstimatePdf } from "@/lib/fence-graph/AdvancedEstimatePdf";
import { estimateFence } from "@/lib/fence-graph/engine";
import type { FenceProjectInput, FenceEstimateResult } from "@/lib/fence-graph/types";
import { updateWasteCalibration, DEFAULT_WASTE_CALIBRATION } from "@/lib/fence-graph/bom/shared";
import type { WasteCalibration } from "@/lib/fence-graph/bom/shared";
import { calculateProjectTimeline } from "@/lib/fence-graph/calculateTimeline";
import { SaveEstimateSchema, GenerateAdvancedPdfSchema, GenerateCustomerProposalPdfSchema } from "@/lib/validation/schemas";
import { DEFAULT_CREW_LEAD_DAYS, DEFAULT_PROPOSAL_VALID_DAYS } from "./constants";
import { instrument } from "@/lib/observability/estimator-instrumentation";
import { enforceBillingGate } from "@/lib/subscription";
import { type PaywallBlock } from "@/lib/paywall";
import { RateLimiters } from "@/lib/security/rate-limit";
import { z } from "zod";
import type { SiteComplexity, CloseoutData, AccuracyMetrics } from "@/lib/fence-graph/accuracy-types";
import { calculateOverallComplexity } from "@/lib/fence-graph/accuracy-types";
import * as Sentry from '@sentry/nextjs';
import type { OrgEstimatorConfig } from "@/lib/fence-graph/config/types";
import type { DeepPartial } from "@/lib/fence-graph/config/types";
import { mergeEstimatorConfig } from "@/lib/fence-graph/config/resolveEstimatorConfig";

// ── Fetch org material prices ─────────────────────────────────────
// Returns { [sku]: unit_cost } for the current org's materials.
// Used to populate dollar amounts in the BOM engine.
export async function getOrgMaterialPrices(): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return {};

    const { data: materials } = await admin
      .from("materials")
      .select("sku, unit_cost")
      .eq("org_id", profile.org_id);

    if (!materials) return {};
    return Object.fromEntries(
      materials
        .filter(m => m.unit_cost != null)
        .map(m => [m.sku, Number(m.unit_cost)])
    );
  } catch {
    return {};
  }
}

// ── Save estimate to DB ───────────────────────────────────────────
export async function saveAdvancedEstimate(
  input: FenceProjectInput,
  result: FenceEstimateResult,
  name: string,
  laborRate: number,
  wastePct: number
): Promise<{ success: true; id: string } | { success: false; error: string } | PaywallBlock> {
  const startTime = Date.now();

  try {
    // ✅ SECURITY: Validate all inputs server-side
    const validated = SaveEstimateSchema.parse({
      name,
      laborRate,
      wastePct,
      input,
      result,
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return { success: false, error: "Profile not found" };

    // ✅ BILLING: Subscription + monthly estimate cap (paywall-aware).
    const billingBlock = await enforceBillingGate(profile.org_id);
    if (billingBlock) return billingBlock;

    const totalLF = input.runs.reduce((s, r) => s + r.linearFeet, 0);

    // Add Sentry context for better debugging
    Sentry.setContext('advanced_estimator', {
      total_linear_feet: totalLF,
      labor_rate: laborRate,
      waste_pct: wastePct,
      total_cost: result.totalCost
    });
    Sentry.setUser({ id: user.id });

    // ✅ SECURITY: Rate limit estimate creation
    const rateLimit = RateLimiters.estimateCreation(profile.org_id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error ?? "Rate limit exceeded. Please try again later." };
    }

    const { data, error } = await admin
      .from("fence_graphs")
      .insert({
        org_id: profile.org_id,
        name: validated.name,
        input_json: validated.input as unknown as Record<string, unknown>,
        result_json: validated.result as unknown as Record<string, unknown>,
        labor_rate: validated.laborRate,
        waste_pct: validated.wastePct,
        total_lf: totalLF,
        total_cost: validated.result.totalCost,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      // Track failed event
      const duration = Date.now() - startTime;
      try {
        await admin.rpc('track_estimator_event', {
          p_event_type: 'failed',
          p_error_message: 'Database error saving estimate',
          p_duration_ms: duration
        });
      } catch (trackErr) {
        console.error('Failed to track error event:', trackErr);
      }

      // Capture in Sentry
      Sentry.captureException(error, {
        tags: { estimator: 'advanced', step: 'save' },
        level: 'error'
      });

      // ✅ SECURITY: Don't leak database error details to client
      console.error("Database error saving estimate:", error);
      return { success: false, error: "Failed to save estimate. Please try again." };
    }

    // Track completed event
    const duration = Date.now() - startTime;
    try {
      await admin.rpc('track_estimator_event', {
        p_event_type: 'completed',
        p_result_summary: {
          total_cost: validated.result.totalCost,
          total_lf: totalLF,
          labor_rate: laborRate
        },
        p_duration_ms: duration
      });
    } catch (trackErr) {
      console.error('Failed to track success event:', trackErr);
    }

    instrument.estimateSaved({
      totalLF,
      fenceType: "advanced",
      totalCost: validated.result.totalCost,
    });

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;

    // Track failed event
    try {
      const admin = createAdminClient();
      await admin.rpc('track_estimator_event', {
        p_event_type: 'failed',
        p_error_message: err instanceof Error ? err.message : 'Unknown error',
        p_duration_ms: duration
      });
    } catch (trackErr) {
      console.error('Failed to track error event:', trackErr);
    }

    // Capture in Sentry
    Sentry.captureException(err, {
      tags: { estimator: 'advanced', step: 'save' },
      level: err instanceof z.ZodError ? 'warning' : 'error'
    });

    if (err instanceof z.ZodError) {
      // ✅ SECURITY: Validation error - return sanitized message
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message || "Invalid input"}` };
    }
    console.error("Unexpected error saving estimate:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
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

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return [];

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
// Returns null when the user has no profile — callers must bail rather
// than fall through with an empty orgId (which would collide rate-limit
// keys across every profileless user).
interface OrgInfo {
  orgId: string;
  orgName: string;
  orgPhone: string;
  orgEmail: string;
  orgAddress: string;
}
async function getOrgInfo(userId: string): Promise<OrgInfo | null> {
  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("users").select("org_id").eq("auth_id", userId).single();
  if (profileErr || !profile) {
    if (profileErr) {
      Sentry.captureException(profileErr, { tags: { step: 'getOrgInfo.profile' }, level: 'warning' });
    }
    return null;
  }

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
  projectName: string
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    // ✅ SECURITY: Validate all inputs server-side
    const validated = GenerateAdvancedPdfSchema.parse({ input, laborRate, wastePct, projectName });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const orgInfo = await getOrgInfo(user.id);
    if (!orgInfo) return { success: false, error: "Profile not found" };

    // ✅ BILLING: Subscription + monthly cap gate.
    const billingBlock = await enforceBillingGate(orgInfo.orgId);
    if (billingBlock) return billingBlock;

    // ✅ SECURITY: Rate limit PDF generation
    const rateLimit = RateLimiters.pdfGeneration(orgInfo.orgId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error ?? "Rate limit exceeded. Please try again later." };
    }

    const priceMap = await getOrgMaterialPrices();
    const result = estimateFence(validated.input as FenceProjectInput, {
      laborRatePerHr: validated.laborRate,
      wastePct: validated.wastePct / 100,
      priceMap,
    });

    const pdfElement = React.createElement(AdvancedEstimatePdf, {
      result, projectName: validated.projectName, orgName: orgInfo.orgName,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as React.ReactElement<any>);
    return { success: true, pdf: Buffer.from(buffer).toString("base64") };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message || "Invalid input"}` };
    }
    Sentry.captureException(err, { tags: { estimator: 'advanced', step: 'pdf' }, level: 'error' });
    console.error("PDF generation error:", err);
    return { success: false, error: "PDF generation failed. Please try again." };
  }
}

// ── Generate Customer Proposal PDF ──────────────────────────────
export async function generateCustomerProposalPdf(
  input: FenceProjectInput,
  laborRate: number,
  wastePct: number,
  markupPct: number,
  projectName: string,
  fenceType: string,
  customer: {
    name?: string; address?: string; city?: string; phone?: string; email?: string;
  },
  woodStyle?: "dog_ear_privacy" | "flat_top_privacy" | "picket" | "board_on_board"
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    // ✅ SECURITY: Validate all inputs server-side
    const validated = GenerateCustomerProposalPdfSchema.parse({
      input, laborRate, wastePct, markupPct, projectName, fenceType, customer, woodStyle,
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const orgInfo = await getOrgInfo(user.id);
    if (!orgInfo) return { success: false, error: "Profile not found" };
    const { orgName, orgPhone, orgEmail, orgAddress } = orgInfo;

    // ✅ BILLING: Subscription + monthly cap gate.
    const billingBlock = await enforceBillingGate(orgInfo.orgId);
    if (billingBlock) return billingBlock;

    // ✅ SECURITY: Rate limit PDF generation
    const rateLimit = RateLimiters.pdfGeneration(orgInfo.orgId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error ?? "Rate limit exceeded. Please try again later." };
    }

    const priceMap = await getOrgMaterialPrices();
    const result = estimateFence(validated.input as FenceProjectInput, {
      fenceType: validated.fenceType as import("@/lib/fence-graph/bom/index").FenceType,
      laborRatePerHr: validated.laborRate,
      wastePct: validated.wastePct / 100,
      priceMap,
    });
    const bidPrice = Math.round(result.totalCost * (1 + validated.markupPct / 100));
    const totalLF = validated.input.runs.reduce((s, r) => s + r.linearFeet, 0);

    // Calculate project timeline
    const timeline = calculateProjectTimeline(
      result,
      validated.fenceType,
      validated.woodStyle,
      DEFAULT_CREW_LEAD_DAYS,
    );

    const { CustomerProposalPdf } = await import("@/lib/fence-graph/CustomerProposalPdf");
    const proposalElement = React.createElement(CustomerProposalPdf, {
      data: {
        result,
        projectName: validated.projectName,
        fenceType: validated.fenceType,
        bidPrice,
        markupPct: validated.markupPct,
        totalLF,
        orgName, orgPhone, orgEmail, orgAddress,
        customerName: validated.customer.name,
        customerAddress: validated.customer.address,
        customerCity: validated.customer.city,
        customerPhone: validated.customer.phone,
        customerEmail: validated.customer.email,
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        proposalNumber: `P-${Date.now().toString().slice(-6)}`,
        validDays: DEFAULT_PROPOSAL_VALID_DAYS,
        estimatedStartDate: timeline.estimatedStartDateString,
        estimatedDurationDays: timeline.estimatedDurationDays,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(proposalElement as React.ReactElement<any>);
    return { success: true, pdf: Buffer.from(buffer).toString("base64") };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message || "Invalid input"}` };
    }
    Sentry.captureException(err, { tags: { estimator: 'advanced', step: 'proposal' }, level: 'error' });
    console.error("Proposal generation error:", err);
    return { success: false, error: "Proposal generation failed. Please try again." };
  }
}

// ── Get org waste calibration ─────────────────────────────────────
export async function getOrgCalibration(): Promise<WasteCalibration> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_WASTE_CALIBRATION;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return DEFAULT_WASTE_CALIBRATION;

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
    // ✅ SECURITY: Validate UUID format to prevent injection
    const uuidSchema = z.string().uuid("Invalid estimate ID");
    const validatedId = uuidSchema.parse(id);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return null;

    // ✅ SECURITY: org_id filter prevents unauthorized access
    const { data } = await admin
      .from("fence_graphs")
      .select("*")
      .eq("id", validatedId)
      .eq("org_id", profile.org_id)
      .single();

    return data ?? null;
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Invalid estimate ID format:", id);
    }
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
    // ✅ SECURITY: Validate inputs
    const closeoutSchema = z.object({
      estimateId: z.string().uuid("Invalid estimate ID"),
      actualWastePct: z.number().min(0).max(100).finite("Waste % must be 0-100"),
      notes: z.string().max(5000, "Notes too long"),
    });
    const validated = closeoutSchema.parse({ estimateId, actualWastePct, notes });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    // ✅ SECURITY: Rate limit closeout submissions
    const rateLimit = RateLimiters.closeoutSubmission(profile.org_id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error };
    }

    // ✅ SECURITY: Validate estimate belongs to this org (authorization check)
    const { data: est } = await admin
      .from("fence_graphs").select("id, status")
      .eq("id", validated.estimateId).eq("org_id", profile.org_id).single();
    if (!est) return { success: false, error: "Estimate not found" };
    if (est.status === "closed") return { success: false, error: "Estimate already closed" };

    const actualFactor = validated.actualWastePct / 100;

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
        closeout_notes: validated.notes.trim() || null,
      })
      .eq("id", validated.estimateId);

    return { success: true, newCalibration: newCal };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message || "Invalid input"}` };
    }
    console.error("Closeout error:", err);
    return { success: false, error: "Failed to close estimate. Please try again." };
  }
}

// ── Close out an estimate (Phase 1 Enhanced) ──────────────────────
// Enhanced version with labor hours, costs, and site conditions tracking
export async function closeoutEstimateEnhanced(
  estimateId: string,
  closeoutData: CloseoutData
): Promise<{ success: boolean; newCalibration?: WasteCalibration; error?: string }> {
  try {
    // ✅ SECURITY: Validate inputs
    const closeoutSchema = z.object({
      estimateId: z.string().uuid("Invalid estimate ID"),
      actualWastePct: z.number().min(0).max(100).finite("Waste % must be 0-100"),
      notes: z.string().max(5000, "Notes too long"),
      // Phase 1 additions
      actualLaborHours: z.number().min(0).max(10000).finite("Labor hours must be 0-10000"),
      crewSize: z.number().int().min(1).max(20).finite("Crew size must be 1-20"),
      weatherConditions: z.enum(["clear", "rain", "heat", "cold", "mixed"]),
      actualMaterialCost: z.number().min(0).finite("Material cost must be positive"),
      actualLaborCost: z.number().min(0).finite("Labor cost must be positive"),
      actualTotalCost: z.number().min(0).finite("Total cost must be positive"),
    });
    const validated = closeoutSchema.parse({ estimateId, ...closeoutData });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    // ✅ SECURITY: Rate limit enhanced closeout submissions
    const rateLimit = RateLimiters.closeoutSubmission(profile.org_id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error };
    }

    // ✅ SECURITY: Validate estimate belongs to this org (authorization check)
    const { data: est } = await admin
      .from("fence_graphs").select("id, status")
      .eq("id", validated.estimateId).eq("org_id", profile.org_id).single();
    if (!est) return { success: false, error: "Estimate not found" };
    if (est.status === "closed") return { success: false, error: "Estimate already closed" };

    const actualFactor = validated.actualWastePct / 100;

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

    // Mark estimate as closed with full closeout data (Phase 1)
    await admin
      .from("fence_graphs")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closeout_actual_waste_pct: actualFactor,
        closeout_notes: validated.notes.trim() || null,
        // Phase 1: Labor and cost tracking
        closeout_actual_labor_hours: validated.actualLaborHours,
        closeout_crew_size: validated.crewSize,
        closeout_weather_conditions: validated.weatherConditions,
        closeout_actual_material_cost: validated.actualMaterialCost,
        closeout_actual_labor_cost: validated.actualLaborCost,
        closeout_actual_total_cost: validated.actualTotalCost,
      })
      .eq("id", validated.estimateId);

    return { success: true, newCalibration: newCal };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message || "Invalid input"}` };
    }
    console.error("Closeout error:", err);
    return { success: false, error: "Failed to close estimate. Please try again." };
  }
}

// ── Get accuracy metrics ──────────────────────────────────────────
// Phase 1: Fetch accuracy summary for dashboard
export async function getAccuracyMetrics(days: number = 30): Promise<AccuracyMetrics | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users").select("org_id").eq("auth_id", user.id).single();
    if (!profile) return null;

    // Call the database function
    const { data, error } = await admin.rpc("get_accuracy_summary", {
      p_org_id: profile.org_id,
      p_days: days,
    });

    if (error) {
      console.error("Error fetching accuracy metrics:", error);
      return null;
    }

    return data as AccuracyMetrics;
  } catch (err) {
    console.error("Unexpected error fetching accuracy metrics:", err);
    return null;
  }
}

// ── Fetch org estimator config ──────────────────────────────────
// Returns resolved config (org overrides merged over defaults).
export async function getOrgEstimatorConfig(): Promise<{
  config: OrgEstimatorConfig;
  hasCustomConfig: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { config: mergeEstimatorConfig(null), hasCustomConfig: false };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return { config: mergeEstimatorConfig(null), hasCustomConfig: false };

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
