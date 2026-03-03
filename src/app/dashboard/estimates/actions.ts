"use server";
import crypto from "crypto";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";
import {
  runEstimateEngine,
  FENCE_TYPE_CONFIGS,
} from "@/lib/estimate-engine";
import type {
  FenceType,
  EstimateInputs,
  MaterialRow,
} from "@/lib/estimate-engine";
import { snapshotLegalTerms } from "@/lib/contracts/snapshotLegalTerms";
import {
  buildPdfData,
  generateAndUploadEstimatePdf,
} from "@/lib/contracts/uploadContractPdf";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "estimates")) {
    throw new Error("You do not have access to estimates");
  }

  return { supabase, profile };
}

async function loadMaterialsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
) {
  const { data, error } = await supabase
    .from("materials")
    .select("id, sku, name, unit, unit_cost, unit_price")
    .eq("org_id", orgId)
    .not("sku", "is", null);

  if (error) throw new Error(`Failed to load materials: ${error.message}`);

  const map = new Map<string, MaterialRow>();
  for (const row of data ?? []) {
    if (row.sku) {
      map.set(row.sku, {
        id: row.id,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        unit_cost: Number(row.unit_cost),
        unit_price: Number(row.unit_price),
      });
    }
  }
  return map;
}

function buildInputs(fd: FormData): EstimateInputs {
  const fenceType = fd.get("fenceType") as FenceType;
  const cfg = FENCE_TYPE_CONFIGS[fenceType];
  const psRaw = fd.get("postSpacing");
  const hRaw = fd.get("height");

  return {
    fenceType,
    linearFeet: Number(fd.get("linearFeet")) || 0,
    gateCount: Number(fd.get("gateCount")) || 0,
    postSpacing: psRaw ? Number(psRaw) : cfg.defaultPostSpacing,
    height: hRaw ? Number(hRaw) : cfg.defaultHeight,
    wasteFactorPct: 0.05,
    targetMarginPct: 0.35,
    laborRatePerHr: 65,
  };
}

/** Replace all line items for an estimate with a fresh engine snapshot */
async function replaceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateId: string,
  orgId: string,
  result: ReturnType<typeof runEstimateEngine>
) {
  // Delete existing
  await supabase
    .from("estimate_line_items")
    .delete()
    .eq("estimate_id", estimateId);

  // Build material rows
  const rows = result.pricedItems.map((item, idx) => ({
    estimate_id: estimateId,
    org_id: orgId,
    sku: item.sku,
    description: item.name,
    quantity: item.qty,
    unit: item.unit,
    unit_cost: item.unitCost,
    unit_price: item.unitPrice,
    extended_cost: item.extendedCost,
    extended_price: item.extendedPrice,
    total: item.extendedPrice,
    type: "material" as const,
    sort_order: idx,
    meta: item.meta ? JSON.stringify(item.meta) : null,
  }));

  // Add labor row
  const laborUnitPrice =
    result.labor.hours > 0
      ? Math.round((result.labor.price / result.labor.hours) * 100) / 100
      : 0;

  rows.push({
    estimate_id: estimateId,
    org_id: orgId,
    sku: "",
    description: `Labor — ${result.labor.hours} hrs @ $${result.labor.rate}/hr`,
    quantity: result.labor.hours,
    unit: "hr",
    unit_cost: result.labor.rate,
    unit_price: laborUnitPrice,
    extended_cost: result.labor.cost,
    extended_price: result.labor.price,
    total: result.labor.price,
    type: "labor" as unknown as "material",
    sort_order: rows.length,
    meta: null,
  });

  const { error } = await supabase
    .from("estimate_line_items")
    .insert(rows);
  if (error)
    throw new Error(`Failed to write line items: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Create Estimate (Save Draft)                                       */
/* ------------------------------------------------------------------ */

export async function createEstimate(fd: FormData) {
  const { supabase, profile } = await getAuthContext();
  const inputs = buildInputs(fd);

  // Resolve customer — may be existing, new inline, or none
  let customerId: string | null = null;
  const custVal = fd.get("customerId") as string;
  if (custVal === "__new__") {
    const name = (fd.get("customerName") as string)?.trim();
    if (name) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          org_id: profile.org_id,
          name,
          phone: (fd.get("customerPhone") as string) || null,
          address: (fd.get("customerAddress") as string) || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Customer create failed: ${error.message}`);
      customerId = data.id;
    }
  } else if (custVal) {
    customerId = custVal;
  }

  // Customer is required — prevent orphan estimates
  if (!customerId) {
    throw new Error("Customer is required. Please select or create a customer.");
  }

  const title =
    (fd.get("title") as string)?.trim() ||
    `${FENCE_TYPE_CONFIGS[inputs.fenceType].label} Fence Estimate`;

  // Run engine
  const materialsMap = await loadMaterialsMap(supabase, profile.org_id);
  const result = runEstimateEngine(inputs, materialsMap);

  if (result.missingSkus.length > 0) {
    throw new Error(
      `Missing material SKUs: ${result.missingSkus.join(", ")}. ` +
      `Run the materials seed or add them in Materials.`
    );
  }

  // Insert estimate row
  const { data: est, error: estErr } = await supabase
    .from("estimates")
    .insert({
      org_id: profile.org_id,
      created_by: profile.id,
      customer_id: customerId,
      title,
      status: "draft",
      fence_type: inputs.fenceType,
      linear_feet: inputs.linearFeet,
      gate_count: inputs.gateCount,
      post_spacing: inputs.postSpacing,
      height: inputs.height,
      waste_factor_pct: inputs.wasteFactorPct,
      target_margin_pct: inputs.targetMarginPct,
      labor_rate_per_hr: inputs.laborRatePerHr,
      total: result.totals.total,
      margin_pct: result.totals.grossMarginPct,
      materials_subtotal: result.totals.materialsSubtotal,
      labor_subtotal: result.totals.laborSubtotal,
      estimated_cost: result.totals.estimatedCost,
      gross_profit: result.totals.grossProfit,
      gross_margin_pct: result.totals.grossMarginPct,
      margin_status: result.marginStatus,
    })
    .select("id")
    .single();

  if (estErr) throw new Error(`Estimate create failed: ${estErr.message}`);

  // Snapshot line items
  await replaceLineItems(supabase, est.id, profile.org_id, result);

  redirect(`/dashboard/estimates/${est.id}`);
}

/* ------------------------------------------------------------------ */
/*  Update Estimate (Re-save Draft)                                    */
/* ------------------------------------------------------------------ */

export async function updateEstimate(fd: FormData) {
  const { supabase, profile } = await getAuthContext();
  const estimateId = fd.get("estimateId") as string;

  // Server-side lock check — block editing converted estimates
  const { data: check } = await supabase
    .from("estimates")
    .select("status")
    .eq("id", estimateId)
    .single();
  if (check?.status === "converted" || check?.status === "accepted" || check?.status === "deposit_paid") {
    throw new Error("This estimate has been accepted or converted and is locked.");
  }

  const inputs = buildInputs(fd);

  const title =
    (fd.get("title") as string)?.trim() ||
    `${FENCE_TYPE_CONFIGS[inputs.fenceType].label} Fence Estimate`;
  const customerId = (fd.get("customerId") as string) || null;

  // Customer is required — prevent orphan estimates
  if (!customerId) {
    throw new Error("Customer is required. Please select or create a customer.");
  }

  // Re-run engine
  const materialsMap = await loadMaterialsMap(supabase, profile.org_id);
  const result = runEstimateEngine(inputs, materialsMap);

  if (result.missingSkus.length > 0) {
    throw new Error(`Missing material SKUs: ${result.missingSkus.join(", ")}`);
  }

  const { error: estErr } = await supabase
    .from("estimates")
    .update({
      customer_id: customerId,
      title,
      fence_type: inputs.fenceType,
      linear_feet: inputs.linearFeet,
      gate_count: inputs.gateCount,
      post_spacing: inputs.postSpacing,
      height: inputs.height,
      total: result.totals.total,
      margin_pct: result.totals.grossMarginPct,
      materials_subtotal: result.totals.materialsSubtotal,
      labor_subtotal: result.totals.laborSubtotal,
      estimated_cost: result.totals.estimatedCost,
      gross_profit: result.totals.grossProfit,
      gross_margin_pct: result.totals.grossMarginPct,
      margin_status: result.marginStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId)
    .eq("org_id", profile.org_id);

  if (estErr) throw new Error(`Update failed: ${estErr.message}`);

  await replaceLineItems(supabase, estimateId, profile.org_id, result);
  redirect(`/dashboard/estimates/${estimateId}`);
}

/* ------------------------------------------------------------------ */
/*  Send Quote — re-run engine, enforce margin guard, set quoted       */
/* ------------------------------------------------------------------ */

export async function sendQuote(fd: FormData) {
  const { supabase, profile } = await getAuthContext();
  const estimateId = fd.get("estimateId") as string;

  // Server-side lock check
  const { data: lockCheck } = await supabase
    .from("estimates")
    .select("status")
    .eq("id", estimateId)
    .single();
  if (lockCheck?.status === "converted" || lockCheck?.status === "accepted" || lockCheck?.status === "deposit_paid") {
    throw new Error("This estimate has been accepted or converted and is locked.");
  }

  // Load current estimate row to rebuild inputs
  const { data: est, error: loadErr } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("org_id", profile.org_id)
    .single();
  if (loadErr || !est) throw new Error("Estimate not found");

  const inputs: EstimateInputs = {
    fenceType: est.fence_type as FenceType,
    linearFeet: Number(est.linear_feet),
    gateCount: Number(est.gate_count),
    postSpacing: Number(est.post_spacing) || FENCE_TYPE_CONFIGS[est.fence_type as FenceType].defaultPostSpacing,
    height: Number(est.height) || FENCE_TYPE_CONFIGS[est.fence_type as FenceType].defaultHeight,
    wasteFactorPct: Number(est.waste_factor_pct),
    targetMarginPct: Number(est.target_margin_pct),
    laborRatePerHr: Number(est.labor_rate_per_hr),
  };

  // Re-run with latest material prices
  const materialsMap = await loadMaterialsMap(supabase, profile.org_id);
  const result = runEstimateEngine(inputs, materialsMap);

  if (result.missingSkus.length > 0) {
    throw new Error(`Missing SKUs: ${result.missingSkus.join(", ")}`);
  }

  // ── MARGIN GUARD ──
  if (result.totals.grossMarginPct < inputs.targetMarginPct) {
    const actual = (result.totals.grossMarginPct * 100).toFixed(1);
    const target = (inputs.targetMarginPct * 100).toFixed(1);
    throw new Error(
      `MARGIN GUARD: Gross margin is ${actual}%, below the ${target}% target. ` +
      `Adjust material prices or reduce costs before sending this quote.`
    );
  }

  // Replace line items with latest snapshot
  await replaceLineItems(supabase, estimateId, profile.org_id, result);

  // Update totals and mark quoted
  const { error: quoteUpdateErr } = await supabase
    .from("estimates")
    .update({
      status: "quoted",
      quoted_at: new Date().toISOString(),
      accept_token: crypto.randomUUID(),
      total: result.totals.total,
      margin_pct: result.totals.grossMarginPct,
      materials_subtotal: result.totals.materialsSubtotal,
      labor_subtotal: result.totals.laborSubtotal,
      estimated_cost: result.totals.estimatedCost,
      gross_profit: result.totals.grossProfit,
      gross_margin_pct: result.totals.grossMarginPct,
      margin_status: result.marginStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);
  if (quoteUpdateErr) throw new Error(`Failed to mark estimate as quoted: ${quoteUpdateErr.message}`);

  // ── PHASE 7: Snapshot legal terms + generate customer-facing PDF ──
  try {
    await snapshotLegalTerms(estimateId, profile.org_id);
    const pdfData = await buildPdfData(estimateId, profile.org_id);
    await generateAndUploadEstimatePdf(
      pdfData,
      profile.org_id,
      estimateId,
      "estimate.pdf"
    );
  } catch (snapErr) {
    console.error("Legal snapshot / PDF generation error:", snapErr);
    // Non-blocking — estimate is already quoted, PDF can be regenerated
  }

  redirect(`/dashboard/estimates/${estimateId}`);
}

/* ------------------------------------------------------------------ */
/*  Delete Estimate                                                    */
/* ------------------------------------------------------------------ */

export async function deleteEstimate(fd: FormData) {
  const { supabase, profile } = await getAuthContext();
  const estimateId = fd.get("estimateId") as string;

  // RLS enforces owner-only delete, but double-check
  if (profile.role !== "owner") {
    throw new Error("Only owners can delete estimates");
  }

  await supabase
    .from("estimate_line_items")
    .delete()
    .eq("estimate_id", estimateId);

  await supabase
    .from("estimates")
    .delete()
    .eq("id", estimateId)
    .eq("org_id", profile.org_id);

  redirect("/dashboard/estimates");
}

/* ------------------------------------------------------------------ */
/*  Convert Estimate → Job                                             */
/* ------------------------------------------------------------------ */

export async function convertToJob(fd: FormData) {
  const estimateId = fd.get("estimateId") as string;
  if (!estimateId) throw new Error("Missing estimateId");

  const { convertEstimateToJob } = await import(
    "@/lib/jobs/convertEstimateToJob"
  );

  // Do NOT wrap redirect() in try/catch — Next.js throws NEXT_REDIRECT
  // internally and it must propagate unimpeded.
  await convertEstimateToJob(estimateId);
  redirect(`/dashboard/jobs`);
}

/* ------------------------------------------------------------------ */
/*  Duplicate Estimate                                                 */
/* ------------------------------------------------------------------ */

export async function duplicateEstimate(estimateId: string) {
  "use server";
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  // Load original estimate
  const { data: original, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (error || !original) throw new Error("Estimate not found");

  // Create new estimate row
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original;
  const { data: newEst, error: insertErr } = await supabase
    .from("estimates")
    .insert({
      ...rest,
      status: "draft",
      title: `Copy of ${original.title || "Estimate"}`,
    })
    .select("id")
    .single();

  if (insertErr || !newEst) throw new Error("Failed to duplicate estimate");

  // Copy line items
  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateId);

  if (lineItems && lineItems.length > 0) {
    const newItems = lineItems.map(({ id: _lid, created_at: _lca, ...li }) => ({
      ...li,
      estimate_id: newEst.id,
    }));
    await supabase.from("estimate_line_items").insert(newItems);
  }

  redirect(`/dashboard/estimates/${newEst.id}`);
}

/* ------------------------------------------------------------------ */
/*  Expire Old Estimates                                               */
/* ------------------------------------------------------------------ */

export async function expireOldEstimates() {
  "use server";
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await ensureProfile(supabaseAuth, user);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error } = await supabase
    .from("estimates")
    .update({ status: "expired" })
    .eq("org_id", profile.org_id)
    .eq("status", "quoted")
    .lt("quoted_at", thirtyDaysAgo.toISOString());

  if (error) throw new Error(`Failed to expire estimates: ${error.message}`);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Re-quote Estimate (reset from expired to draft)                   */
/* ------------------------------------------------------------------ */

export async function reQuoteEstimate(fd: FormData) {
  "use server";
  const { supabase, profile } = await getAuthContext();
  const estimateId = fd.get("estimateId") as string;
  if (!estimateId) throw new Error("Missing estimateId");

  if (profile.role !== "owner" && profile.role !== "sales") {
    throw new Error("Only owners and sales can re-quote estimates");
  }

  const { error } = await supabase
    .from("estimates")
    .update({
      status: "draft",
      accept_token: null,
      quoted_at: null,
      accepted_at: null,
    })
    .eq("id", estimateId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to re-quote estimate: ${error.message}`);
  redirect(`/dashboard/estimates/${estimateId}`);
}
