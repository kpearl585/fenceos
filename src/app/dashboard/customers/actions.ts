"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "customers")) {
    throw new Error("You do not have access to customers");
  }

  return { supabase, profile };
}

/* ── Create Customer ── */
export async function createCustomer(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  if (profile.role === "foreman") {
    throw new Error("Foremen cannot create customers");
  }

  const name = (fd.get("name") as string)?.trim();
  if (!name) throw new Error("Customer name is required");

  const { data, error } = await supabase
    .from("customers")
    .insert({
      org_id: profile.org_id,
      name,
      email: (fd.get("email") as string)?.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      address: (fd.get("address") as string)?.trim() || null,
      city: (fd.get("city") as string)?.trim() || null,
      state: (fd.get("state") as string)?.trim() || null,
      zip: (fd.get("zip") as string)?.trim() || null,
      notes: (fd.get("notes") as string)?.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create customer: ${error.message}`);

  // If called from estimate form (returnTo param), redirect back
  const returnTo = fd.get("returnTo") as string;
  if (returnTo) {
    redirect(returnTo);
  }

  redirect(`/dashboard/customers/${data.id}`);
}

/* ── Update Customer ── */
export async function updateCustomer(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  if (profile.role === "foreman") {
    throw new Error("Foremen cannot edit customers");
  }

  const customerId = fd.get("customerId") as string;
  if (!customerId) throw new Error("Missing customerId");

  const name = (fd.get("name") as string)?.trim();
  if (!name) throw new Error("Customer name is required");

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      email: (fd.get("email") as string)?.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      address: (fd.get("address") as string)?.trim() || null,
      city: (fd.get("city") as string)?.trim() || null,
      state: (fd.get("state") as string)?.trim() || null,
      zip: (fd.get("zip") as string)?.trim() || null,
      notes: (fd.get("notes") as string)?.trim() || null,
    })
    .eq("id", customerId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to update customer: ${error.message}`);

  redirect(`/dashboard/customers/${customerId}?saved=1`);
}

/* ── Delete Customer ── */
export async function deleteCustomer(fd: FormData) {
  const { supabase, profile } = await getAuthContext();

  if (profile.role !== "owner") {
    throw new Error("Only owners can delete customers");
  }

  const customerId = fd.get("customerId") as string;
  if (!customerId) throw new Error("Missing customerId");

  // Check for linked estimates/jobs
  const { count: estCount } = await supabase
    .from("estimates")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  const { count: jobCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if ((estCount ?? 0) > 0 || (jobCount ?? 0) > 0) {
    throw new Error(
      `Cannot delete customer with ${estCount ?? 0} estimate(s) and ${jobCount ?? 0} job(s). ` +
      `Remove or reassign linked records first.`
    );
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(`Failed to delete customer: ${error.message}`);

  redirect("/dashboard/customers");
}

/* ── Quick Create (for estimate form AJAX) ── */
export async function quickCreateCustomer(fd: FormData): Promise<{ id: string; name: string }> {
  const { supabase, profile } = await getAuthContext();

  if (profile.role === "foreman") {
    throw new Error("Foremen cannot create customers");
  }

  const name = (fd.get("name") as string)?.trim();
  if (!name) throw new Error("Customer name is required");

  const { data, error } = await supabase
    .from("customers")
    .insert({
      org_id: profile.org_id,
      name,
      phone: (fd.get("phone") as string)?.trim() || null,
      email: (fd.get("email") as string)?.trim() || null,
      address: (fd.get("address") as string)?.trim() || null,
    })
    .select("id, name")
    .single();

  if (error) throw new Error(`Failed to create customer: ${error.message}`);
  return data;
}
