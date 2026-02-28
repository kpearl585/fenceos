"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { revalidatePath } from "next/cache";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await ensureProfile(supabase, user);
  return { supabase, profile };
}

export async function saveOrgSettings(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  const base = {
    org_id: profile.org_id,
    legal_terms: fd.get("legal_terms") as string || null,
    payment_terms: fd.get("payment_terms") as string || null,
    updated_at: new Date().toISOString(),
  };

  // Try to save new fields gracefully
  try {
    await supabase.from("org_settings").upsert({
      ...base,
      target_margin_pct: fd.get("target_margin_pct") ? Number(fd.get("target_margin_pct")) : 35,
      default_labor_rate: fd.get("default_labor_rate") ? Number(fd.get("default_labor_rate")) : 0,
    }, { onConflict: "org_id" });
  } catch {
    // Fallback without new columns if they don't exist yet
    await supabase.from("org_settings").upsert(base, { onConflict: "org_id" });
  }

  revalidatePath("/dashboard/settings");
}

export async function saveBranding(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  await supabase.from("org_branding").upsert({
    org_id: profile.org_id,
    primary_color: fd.get("primary_color") as string || null,
    accent_color: fd.get("accent_color") as string || null,
    footer_note: fd.get("footer_note") as string || null,
    logo_url: fd.get("logo_url") as string || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "org_id" });

  revalidatePath("/dashboard/settings");
}
