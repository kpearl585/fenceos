"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import type { OrgEstimatorConfig } from "@/lib/fence-graph/config/types";
import type { DeepPartial } from "@/lib/fence-graph/config/types";
import {
  mergeEstimatorConfig,
  validateEstimatorConfig,
} from "@/lib/fence-graph/config/resolveEstimatorConfig";

// ── Load estimator config for current org ────────────────────────

export async function getEstimatorConfig(): Promise<{
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

// ── Save estimator config overrides ──────────────────────────────

export async function saveEstimatorConfig(
  overrides: DeepPartial<OrgEstimatorConfig>
): Promise<{ success: boolean; warnings?: string[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    if (!canAccess(profile.role, "owner")) {
      return { success: false, error: "Only owners can modify estimator settings" };
    }

    // Validate the merged result
    const merged = mergeEstimatorConfig(overrides);
    const warnings = validateEstimatorConfig(merged);

    // Save just the overrides (not the full merged config)
    // so future default changes are picked up automatically
    const admin = createAdminClient();
    await admin
      .from("org_settings")
      .upsert(
        {
          org_id: profile.org_id,
          estimator_config_json: overrides as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" }
      );

    revalidatePath("/dashboard/settings/estimator");
    revalidatePath("/dashboard/advanced-estimate");

    return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (err) {
    console.error("Error saving estimator config:", err);
    return { success: false, error: "Failed to save settings. Please try again." };
  }
}

// ── Reset estimator config to defaults ───────────────────────────

export async function resetEstimatorConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    if (!canAccess(profile.role, "owner")) {
      return { success: false, error: "Only owners can modify estimator settings" };
    }

    const admin = createAdminClient();
    await admin
      .from("org_settings")
      .update({
        estimator_config_json: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", profile.org_id);

    revalidatePath("/dashboard/settings/estimator");
    revalidatePath("/dashboard/advanced-estimate");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset settings." };
  }
}
