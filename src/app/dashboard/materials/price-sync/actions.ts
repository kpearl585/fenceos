"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { matchSupplierRow, parseSupplierCsv } from "@/lib/price-sync/matcher";
import type { MatchResult } from "@/lib/price-sync/matcher";

export interface PriceSyncPreview {
  matches: (MatchResult & { currentUnitCost?: number; currentName?: string })[];
  format: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
}

// ── Parse uploaded CSV and return match previews ──────────────────
export async function parsePriceSyncCsv(
  csvText: string
): Promise<{ success: boolean; preview?: PriceSyncPreview; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    // Parse CSV
    const { rows, format } = parseSupplierCsv(csvText);
    if (rows.length === 0) return { success: false, error: "No valid rows found in CSV" };

    // Match each row to a SKU
    const matches = rows.map(row => matchSupplierRow(row));

    // Fetch current materials for this org to show current prices
    const skus = matches.map(m => m.matchedSku).filter(Boolean) as string[];
    const { data: currentMaterials } = await admin
      .from("materials")
      .select("sku, unit_cost, name")
      .eq("org_id", profile.org_id)
      .in("sku", skus);

    const currentMap = Object.fromEntries(
      (currentMaterials ?? []).map(m => [m.sku, { unit_cost: m.unit_cost, name: m.name }])
    );

    const enriched = matches.map(m => ({
      ...m,
      currentUnitCost: m.matchedSku ? currentMap[m.matchedSku]?.unit_cost : undefined,
      currentName: m.matchedSku ? currentMap[m.matchedSku]?.name : undefined,
    }));

    return {
      success: true,
      preview: {
        matches: enriched,
        format,
        totalRows: rows.length,
        matchedRows: matches.filter(m => m.matchedSku).length,
        unmatchedRows: matches.filter(m => !m.matchedSku).length,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Parse failed" };
  }
}

// ── Apply approved price updates ──────────────────────────────────
export async function applyPriceUpdates(
  updates: { sku: string; unitCost: number; supplierSku?: string; supplier?: string }[]
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, updatedCount: 0, error: "Not authenticated" };
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const update of updates) {
      const { error } = await admin
        .from("materials")
        .update({
          unit_cost: update.unitCost,
          price_updated_at: now,
          ...(update.supplierSku ? { supplier_sku: update.supplierSku } : {}),
          ...(update.supplier ? { supplier: update.supplier } : {}),
        })
        .eq("org_id", profile.org_id)
        .eq("sku", update.sku);

      if (!error) updatedCount++;
    }

    return { success: true, updatedCount };
  } catch (err: unknown) {
    return { success: false, updatedCount: 0, error: err instanceof Error ? err.message : "Update failed" };
  }
}

// ── Get price freshness summary ───────────────────────────────────
export async function getPriceFreshness(): Promise<{
  totalMaterials: number;
  pricedMaterials: number;
  staleCount: number;  // not updated in 30+ days
  neverUpdated: number;
  lastSyncDate: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { totalMaterials: 0, pricedMaterials: 0, staleCount: 0, neverUpdated: 0, lastSyncDate: null };
    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    const { data: materials } = await admin
      .from("materials")
      .select("unit_cost, price_updated_at")
      .eq("org_id", profile.org_id);

    if (!materials) return { totalMaterials: 0, pricedMaterials: 0, staleCount: 0, neverUpdated: 0, lastSyncDate: null };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const neverUpdated = materials.filter(m => !m.price_updated_at).length;
    const staleCount = materials.filter(m =>
      m.price_updated_at && new Date(m.price_updated_at) < thirtyDaysAgo
    ).length;
    const pricedMaterials = materials.filter(m => m.unit_cost && m.unit_cost > 0).length;
    const allDates = materials.filter(m => m.price_updated_at).map(m => m.price_updated_at!);
    const lastSyncDate = allDates.length > 0 ? allDates.sort().reverse()[0] : null;

    return {
      totalMaterials: materials.length,
      pricedMaterials,
      staleCount,
      neverUpdated,
      lastSyncDate,
    };
  } catch {
    return { totalMaterials: 0, pricedMaterials: 0, staleCount: 0, neverUpdated: 0, lastSyncDate: null };
  }
}
