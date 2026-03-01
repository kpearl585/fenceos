"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

  try {
    await supabase.from("org_settings").upsert({
      ...base,
      target_margin_pct: fd.get("target_margin_pct") ? Number(fd.get("target_margin_pct")) : 35,
      default_labor_rate: fd.get("default_labor_rate") ? Number(fd.get("default_labor_rate")) : 0,
    }, { onConflict: "org_id" });
  } catch {
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

export async function updateOrgName(orgId: string, name: string) {
  if (!name?.trim()) return { error: "Name is required" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: name.trim() })
    .eq("id", orgId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function inviteTeamMember(orgId: string, email: string, role: 'sales' | 'foreman') {
  if (!email?.trim() || !email.includes('@')) return { error: 'Valid email required' }
  if (!['sales', 'foreman'].includes(role)) return { error: 'Invalid role' }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('email', email)
    .single()

  if (existing?.org_id === orgId) return { error: 'This person is already on your team' }
  if (existing?.org_id && existing.org_id !== orgId) return { error: 'This email is already registered to another organization' }

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { org_id: orgId, role }
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function removeTeamMember(profileId: string, orgId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('users')
    .update({ org_id: null, role: null })
    .eq('id', profileId)
    .eq('org_id', orgId)
    .neq('role', 'owner')
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateMemberRole(profileId: string, orgId: string, role: 'sales' | 'foreman') {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', profileId)
    .eq('org_id', orgId)
    .neq('role', 'owner')
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
