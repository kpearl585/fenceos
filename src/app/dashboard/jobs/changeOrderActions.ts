"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { redirect } from "next/navigation";

import {
  calculateChangeOrder,
  type ChangeOrderLineInput,
} from "@/lib/change-orders/calculateChangeOrder";
import { approveChangeOrder } from "@/lib/change-orders/approveChangeOrder";

async function getChangeOrderAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const profile = await ensureProfile(supabase, user);
  if (!canAccess(profile.role, "jobs")) {
    throw new Error("You do not have access to jobs");
  }
  return { supabase, user, profile };
}

/* ------------------------------------------------------------------ */
/*  Submit Change Order                                                */
/* ------------------------------------------------------------------ */

export async function submitChangeOrder(fd: FormData) {
  const { supabase, user, profile } = await getChangeOrderAuthContext();
  const jobId = fd.get("jobId") as string;
  const reason = (fd.get("reason") as string) || "";

  // Parse line items from form data
  const linesJson = fd.get("lineItems") as string;
  let lineInputs: ChangeOrderLineInput[];
  try {
    lineInputs = JSON.parse(linesJson);
  } catch {
    throw new Error("Invalid line items data");
  }

  if (!lineInputs || lineInputs.length === 0) {
    throw new Error("At least one line item is required");
  }

  // Verify job belongs to org and user has access
  const { data: job } = await supabase
    .from("jobs")
    .select("id, org_id, assigned_foreman_id, status")
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();
  if (!job) throw new Error("Job not found");

  if (job.status === "complete" || job.status === "cancelled") {
    throw new Error("Cannot add change orders to completed/cancelled jobs");
  }

  // Foreman can only create COs for assigned jobs
  if (
    profile.role === "foreman" &&
    job.assigned_foreman_id !== user.id
  ) {
    throw new Error("You can only create change orders for jobs assigned to you");
  }

  // Calculate financials
  const calc = await calculateChangeOrder(jobId, profile.org_id, lineInputs);

  // Determine if owner auto-approve should happen after insert
  const autoApprove = profile.role === "owner" && !calc.requires_owner_approval;

  // Always insert as "pending" — approveChangeOrder handles the status
  // transition to "approved" and updates job totals. Inserting as "approved"
  // then calling approveChangeOrder throws because it expects "pending".
  const admin = createAdminClient();
  const { data: co, error: coErr } = await admin
    .from("change_orders")
    .insert({
      org_id: profile.org_id,
      job_id: jobId,
      status: "pending",
      created_by: user.id,
      reason,
      subtotal: calc.subtotal,
      cost_total: calc.cost_total,
      gross_profit: calc.gross_profit,
      gross_margin_pct: calc.gross_margin_pct,
    })
    .select("id")
    .single();

  if (coErr || !co) {
    throw new Error(`Failed to create change order: ${coErr?.message ?? "unknown"}`);
  }

  // Insert line items
  const coLines = calc.lines.map((l) => ({
    change_order_id: co.id,
    sku: l.sku,
    name: l.name,
    type: l.type as unknown as "material",
    qty: l.qty,
    unit_cost: l.unit_cost,
    unit_price: l.unit_price,
    extended_cost: l.extended_cost,
    extended_price: l.extended_price,
  }));

  const { error: liErr } = await admin
    .from("change_order_line_items")
    .insert(coLines);
  if (liErr) {
    await admin.from("change_orders").delete().eq("id", co.id);
    throw new Error(`Failed to insert line items: ${liErr.message}`);
  }

  // Auto-approve for owners when margin is acceptable: transitions status
  // pending → approved and updates job totals.
  if (autoApprove) {
    await approveChangeOrder(co.id, user.id);
  }

  return { success: true, jobId };
}

/* ------------------------------------------------------------------ */
/*  Approve Change Order (owner only)                                  */
/* ------------------------------------------------------------------ */

export async function approveChangeOrderAction(fd: FormData) {
  const { user, profile } = await getChangeOrderAuthContext();
  const changeOrderId = fd.get("changeOrderId") as string;
  const jobId = fd.get("jobId") as string;

  if (profile.role !== "owner") {
    throw new Error("Only owners can approve change orders");
  }

  await approveChangeOrder(changeOrderId, user.id);
  redirect(`/dashboard/jobs/${jobId}`);
}

/* ------------------------------------------------------------------ */
/*  Reject Change Order (owner only)                                   */
/* ------------------------------------------------------------------ */

export async function rejectChangeOrderAction(fd: FormData) {
  const { supabase, profile } = await getChangeOrderAuthContext();
  const changeOrderId = fd.get("changeOrderId") as string;
  const jobId = fd.get("jobId") as string;

  if (profile.role !== "owner") {
    throw new Error("Only owners can reject change orders");
  }

  const { error } = await supabase
    .from("change_orders")
    .update({ status: "rejected" })
    .eq("id", changeOrderId);
  if (error) throw new Error(`Failed to reject: ${error.message}`);

  redirect(`/dashboard/jobs/${jobId}`);
}
