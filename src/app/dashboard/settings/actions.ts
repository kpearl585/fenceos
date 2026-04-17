"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";

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
/**
 * Export the org's data as an Excel workbook (one sheet per table) with
 * friendly column headers.
 *
 * Previous implementation dumped raw JSON — technically complete but a
 * contractor had no idea what to do with it. An .xlsx file double-clicks
 * into Excel/Numbers/Google Sheets with tabs the user can read.
 *
 * Sheets:
 *   - README: plain-language key for what each tab contains
 *   - Estimates: quotes w/ customer names resolved
 *   - Customers: contact list
 *   - Materials: catalog
 *   - Settings: margin / labor / legal / payment terms
 *
 * Returns base64 so the client can decode to a Blob and trigger download.
 */
export async function exportAccountData(): Promise<{
  success: boolean;
  base64?: string;
  filename?: string;
  error?: string;
}> {
  const { profile } = await getAuthContext();
  const admin = createAdminClient();

  try {
    const [estimates, customers, materials, orgSettings, org] = await Promise.all([
      admin.from('estimates').select('*').eq('org_id', profile.org_id),
      admin.from('customers').select('*').eq('org_id', profile.org_id),
      admin.from('materials').select('*').eq('org_id', profile.org_id),
      admin.from('org_settings').select('*').eq('org_id', profile.org_id).maybeSingle(),
      admin.from('organizations').select('name').eq('id', profile.org_id).maybeSingle(),
    ]);

    // Build a quick lookup so Estimates can show the actual customer name
    // instead of a UUID no one can read.
    const customerMap = new Map<string, string>();
    (customers.data ?? []).forEach((c: Record<string, unknown>) => {
      if (c.id && c.name) customerMap.set(String(c.id), String(c.name));
    });

    // Format helpers — keep numbers readable in Excel without forcing
    // specific cell formats the user can't override.
    const fmtDate = (v: unknown) =>
      v ? new Date(String(v)).toLocaleDateString('en-US') : '';
    const fmtMoney = (v: unknown) =>
      v == null || v === '' ? '' : Number(v);
    const fmtPct = (v: unknown) =>
      v == null || v === '' ? '' : `${(Number(v) * 100).toFixed(1)}%`;

    // --- Estimates sheet (customer-facing columns only) -------------
    const estimatesRows = (estimates.data ?? []).map((e: Record<string, unknown>) => ({
      'Title': e.title ?? '',
      'Customer': customerMap.get(String(e.customer_id ?? '')) ?? '',
      'Status': e.status ?? '',
      'Total': fmtMoney(e.total),
      'Gross Margin': fmtPct(e.gross_margin_pct),
      'Fence Type': e.fence_type ?? '',
      'Linear Feet': e.linear_feet ?? '',
      'Created': fmtDate(e.created_at),
      'Quoted At': fmtDate(e.quoted_at),
      'Last Sent': fmtDate(e.last_sent_at),
      'Last Sent To': e.last_sent_to ?? '',
      'Accepted At': fmtDate(e.accepted_at),
    }));

    // --- Customers sheet --------------------------------------------
    const customersRows = (customers.data ?? []).map((c: Record<string, unknown>) => ({
      'Name': c.name ?? '',
      'Email': c.email ?? '',
      'Phone': c.phone ?? '',
      'Address': c.address ?? '',
      'Created': fmtDate(c.created_at),
    }));

    // --- Materials sheet --------------------------------------------
    const materialsRows = (materials.data ?? []).map((m: Record<string, unknown>) => ({
      'Name': m.name ?? '',
      'SKU': m.sku ?? '',
      'Category': m.category ?? '',
      'Unit': m.unit ?? '',
      'Unit Cost': fmtMoney(m.unit_cost),
      'Unit Price': fmtMoney(m.unit_price),
    }));

    // --- Settings sheet (key-value, easy to read) -------------------
    const s = (orgSettings.data ?? {}) as Record<string, unknown>;
    const settingsRows = [
      { Setting: 'Company Name',          Value: org.data?.name ?? '' },
      { Setting: 'Target Gross Margin',   Value: fmtPct(s.target_margin_pct) },
      { Setting: 'Default Labor Rate',    Value: fmtMoney(s.default_labor_rate) },
      { Setting: 'Payment Terms',         Value: s.payment_terms ?? '' },
      { Setting: 'Legal Terms',           Value: s.legal_terms ?? '' },
    ];

    // --- README sheet (first tab, explains the rest) ----------------
    const readmeRows = [
      { '': `FenceEstimatePro — data export for ${org.data?.name ?? 'your company'}` },
      { '': `Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` },
      { '': '' },
      { '': 'This file contains all your account data. Each tab below is a separate list:' },
      { '': '' },
      { '': '• Estimates — every quote you\'ve created, with customer, total, margin, and status.' },
      { '': '• Customers — your customer list with contact info.' },
      { '': '• Materials — your materials catalog with cost and price.' },
      { '': '• Settings — your company name, margin target, labor rate, and terms.' },
      { '': '' },
      { '': 'Open this file in Excel, Numbers, or Google Sheets. The tabs are at the bottom.' },
    ];

    // Build the workbook — README first so it's what the user sees on open.
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readmeRows, { skipHeader: true }), 'README');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(estimatesRows), 'Estimates');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersRows), 'Customers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialsRows), 'Materials');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsRows), 'Settings');

    // xlsx's 'base64' type returns a ready-to-transmit string we can
    // hand to the client without serializing a Buffer through the RSC
    // boundary (Buffer isn't one of React's serializable types).
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return {
      success: true,
      base64,
      filename: `fenceestimatepro-export-${new Date().toISOString().split('T')[0]}.xlsx`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
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
