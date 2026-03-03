"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AdvancedEstimatePdf } from "@/lib/fence-graph/AdvancedEstimatePdf";
import { estimateFence } from "@/lib/fence-graph/engine";
import type { FenceProjectInput, FenceEstimateResult } from "@/lib/fence-graph/types";

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

// ── Generate PDF and return as base64 ────────────────────────────
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

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();

    let orgName = "Your Organization";
    if (profile) {
      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", profile.org_id)
        .single();
      if (org) orgName = org.name;
    }

    const result = estimateFence(input, laborRate, wastePct / 100);

    const pdfElement = React.createElement(AdvancedEstimatePdf, {
      result,
      projectName,
      orgName,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as React.ReactElement<any>);
    const base64 = Buffer.from(buffer).toString("base64");
    return { success: true, pdf: base64 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "PDF generation failed" };
  }
}
