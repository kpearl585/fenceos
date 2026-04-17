"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

/**
 * Save the company contact info (phone / email / address) that renders on
 * every customer-facing PDF (proposals, invoices, contracts, acceptance
 * emails). Separate from saveBranding because contact info is needed on
 * all plans — branding (logo, custom colors) is gated to Pro+, but a
 * Starter user's quote still needs their phone number on it.
 */
export async function saveOrgContact(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  await supabase.from("org_branding").upsert({
    org_id: profile.org_id,
    phone:   (fd.get("phone") as string | null)?.trim() || null,
    email:   (fd.get("email") as string | null)?.trim() || null,
    address: (fd.get("address") as string | null)?.trim() || null,
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

// Export all account data (GDPR/CCPA compliance)
// Returns data as JSON string for client-side download
export async function exportAccountData(): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  const { profile } = await getAuthContext();
  const admin = createAdminClient();

  try {
    // Fetch all org data
    const [estimates, customers, materials, orgSettings, orgBranding] = await Promise.all([
      admin.from('estimates').select('*').eq('org_id', profile.org_id),
      admin.from('customers').select('*').eq('org_id', profile.org_id),
      admin.from('materials').select('*').eq('org_id', profile.org_id),
      admin.from('org_settings').select('*').eq('org_id', profile.org_id).single(),
      admin.from('org_branding').select('*').eq('org_id', profile.org_id).single(),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      org_id: profile.org_id,
      estimates: estimates.data || [],
      customers: customers.data || [],
      materials: materials.data || [],
      settings: orgSettings.data || {},
      branding: orgBranding.data || {},
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return {
      success: true,
      data: jsonString,
      filename: `fenceestimatepro-export-${new Date().toISOString().split('T')[0]}.json`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

// Delete account (soft delete with 30-day retention)
export async function deleteAccount() {
  const { profile } = await getAuthContext();
  const admin = createAdminClient();
  const supabase = await createClient();

  // Only owner can delete organization
  if (profile.role !== 'owner') {
    throw new Error('Only organization owners can delete accounts');
  }

  // Mark organization for deletion (soft delete)
  const deletionDate = new Date();
  const permanentDeletionDate = new Date(deletionDate);
  permanentDeletionDate.setDate(permanentDeletionDate.getDate() + 30);

  await admin
    .from('organizations')
    .update({
      plan_status: 'cancelled',
      deleted_at: deletionDate.toISOString(),
      permanent_deletion_at: permanentDeletionDate.toISOString(),
    })
    .eq('id', profile.org_id);

  // TODO: Cancel Stripe subscription if active
  // const subscription = await getStripeSubscription(profile.org_id);
  // if (subscription) await stripe.subscriptions.cancel(subscription.id);

  // Sign out user
  await supabase.auth.signOut();

  // Redirect to goodbye page
  redirect('/account-deleted');
}
