"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AdvancedEstimatePdf } from "@/lib/fence-graph/AdvancedEstimatePdf";
import { estimateFence } from "@/lib/fence-graph/engine";
import type { FenceProjectInput, FenceEstimateResult } from "@/lib/fence-graph/types";

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
      .from("profiles")
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
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return { success: false, error: "Profile not found" };

    const totalLF = input.runs.reduce((s, r) => s + r.linearFeet, 0);

    const { data, error } = await admin
      .from("fence_graphs")
      .insert({
        org_id: profile.org_id,
        name,
        input_json: input as unknown as Record<string, unknown>,
        result_json: result as unknown as Record<string, unknown>,
        labor_rate: laborRate,
        waste_pct: wastePct,
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

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
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
async function getOrgInfo(userId: string): Promise<{
  orgId: string; orgName: string; orgPhone: string; orgEmail: string; orgAddress: string;
}> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("org_id").eq("auth_id", userId).single();
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
  projectName: string
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { orgName } = await getOrgInfo(user.id);
    const priceMap = await getOrgMaterialPrices();
    const result = estimateFence(input, { laborRatePerHr: laborRate, wastePct: wastePct / 100, priceMap });

    const pdfElement = React.createElement(AdvancedEstimatePdf, {
      result, projectName, orgName,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as React.ReactElement<any>);
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
  fenceType: string,
  customer: {
    name?: string; address?: string; city?: string; phone?: string; email?: string;
  }
): Promise<{ success: boolean; pdf?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { orgName, orgPhone, orgEmail, orgAddress } = await getOrgInfo(user.id);
    const priceMap = await getOrgMaterialPrices();
    const result = estimateFence(input, { fenceType: fenceType as import("@/lib/fence-graph/bom/index").FenceType, laborRatePerHr: laborRate, wastePct: wastePct / 100, priceMap });
    const bidPrice = Math.round(result.totalCost * (1 + markupPct / 100));
    const totalLF = input.runs.reduce((s, r) => s + r.linearFeet, 0);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(proposalElement as React.ReactElement<any>);
    return { success: true, pdf: Buffer.from(buffer).toString("base64") };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Proposal generation failed" };
  }
}
