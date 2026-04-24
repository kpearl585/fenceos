"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/fence-graph/config/defaults";
import { mergeEstimatorConfig } from "@/lib/fence-graph/config/resolveEstimatorConfig";
import type { DeepPartial, OrgEstimatorConfig } from "@/lib/fence-graph/config/types";
import { redirect } from "next/navigation";

export type WizardField = "region" | "hoursPerDay" | "wastePct";

interface SaveFieldInput {
  field: WizardField;
  value: string | number;
}

// Saves one wizard answer into the org's estimator config overrides.
// Deliberately narrow — the wizard only owns three fields. Everything
// else in the estimator config stays at defaults (or whatever the user
// set elsewhere) until they open Settings → Estimator.
export async function saveEstimatorSetupField(
  input: SaveFieldInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    const admin = createAdminClient();

    // Load current overrides so we merge, not overwrite.
    const { data: settings } = await admin
      .from("org_settings")
      .select("estimator_config_json")
      .eq("org_id", profile.org_id)
      .maybeSingle();

    const current =
      (settings?.estimator_config_json as Record<string, unknown> | null) ?? {};

    let next: Record<string, unknown> = { ...current };

    if (input.field === "region") {
      const raw = String(input.value);
      // Narrow to the set shipped in the EstimatorSettingsClient dropdown —
      // keep them in sync or the engine will silently fall back to "base".
      const allowed = [
        "base", "northeast", "southeast", "midwest", "south_central",
        "southwest", "west", "florida", "northwest", "mountain",
      ];
      if (!allowed.includes(raw)) {
        return { success: false, error: "Unknown region" };
      }
      next.region = { ...(current.region as object | null ?? {}), key: raw };
    } else if (input.field === "hoursPerDay") {
      const num = Number(input.value);
      if (!Number.isFinite(num) || num < 4 || num > 14) {
        return { success: false, error: "Hours per day must be between 4 and 14" };
      }
      next.production = { ...(current.production as object | null ?? {}), hoursPerDay: num };
    } else if (input.field === "wastePct") {
      // UI passes a percentage (0–25); engine stores a decimal.
      const num = Number(input.value);
      if (!Number.isFinite(num) || num < 1 || num > 25) {
        return { success: false, error: "Waste must be between 1% and 25%" };
      }
      next.waste = { ...(current.waste as object | null ?? {}), defaultPct: num / 100 };
    }

    const { error } = await admin
      .from("org_settings")
      .upsert(
        {
          org_id: profile.org_id,
          estimator_config_json: next,
        },
        { onConflict: "org_id" }
      );

    if (error) {
      return { success: false, error: "Failed to save. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("[estimator-setup] saveEstimatorSetupField error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Loads the three wizard-owned fields at their current value (merged
// overrides + defaults). Used by the wizard page to prefill inputs so
// a returning user doesn't lose the values they already set.
export async function loadEstimatorSetupFields(): Promise<{
  region: string;
  hoursPerDay: number;
  wastePct: number; // as a percentage (5, not 0.05)
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      region: DEFAULT_ESTIMATOR_CONFIG.region.key,
      hoursPerDay: DEFAULT_ESTIMATOR_CONFIG.production.hoursPerDay,
      wastePct: Math.round(DEFAULT_ESTIMATOR_CONFIG.waste.defaultPct * 1000) / 10,
    };
  }

  const profile = await ensureProfile(supabase, user);
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("org_settings")
    .select("estimator_config_json")
    .eq("org_id", profile.org_id)
    .maybeSingle();

  const raw =
    (settings?.estimator_config_json as DeepPartial<OrgEstimatorConfig> | null) ?? null;
  const resolved = mergeEstimatorConfig(raw);

  return {
    region: resolved.region.key,
    hoursPerDay: resolved.production.hoursPerDay,
    wastePct: Math.round(resolved.waste.defaultPct * 1000) / 10,
  };
}
