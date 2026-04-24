"use server";

import { createClient } from "@/lib/supabase/server";

// Bridge to ContractorDocuments.com's /api/packets/from-job endpoint.
//
// Different from generateJobDoc.ts: that helper pulls a single pre-filled
// template PDF. This one creates a DRAFT HOA packet inside ContractorDocs
// (customer record + packet row with fence spec + cover + elevation +
// setback statement + first COI + first license auto-attached) and
// returns the URL to the packet detail page in CD where the contractor
// finishes setup + sends to the homeowner.
//
// ContractorDocs is the canonical "send & track" surface. Fenceos just
// hands off the job context; CD owns the workflow from there.

const CONTRACTORDOCS_URL =
  process.env.CONTRACTORDOCS_URL ?? "https://contractordocuments.com";

export interface GenerateHoaPacketInCDResult {
  success: boolean;
  dashboard_url?: string;
  download_url?: string | null;
  packet_id?: string;
  missing_credentials?: { coi: boolean; license: boolean };
  error?: string;
  action?: "subscribe";
  subscribe_url?: string;
}

export async function generateHoaPacketInCD({
  jobId,
  hoaName,
}: {
  jobId: string;
  hoaName?: string;
}): Promise<GenerateHoaPacketInCDResult> {
  const secret = process.env.PEARL_INTERNAL_SECRET;
  if (!secret) {
    return { success: false, error: "PEARL_INTERNAL_SECRET not configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch the job scoped to the caller via RLS — same shape as generateJobDoc
  // so the join is already understood by PostgREST.
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id, org_id, title, scheduled_date, completed_date, total_price, customers(name, email, phone, address, city, state, zip), estimates(title, fence_type, linear_feet, gate_count)",
    )
    .eq("id", jobId)
    .single();

  if (jobErr || !job) return { success: false, error: "Job not found" };

  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;

  if (!customer?.name) {
    return {
      success: false,
      error: "Job has no customer. Add a customer before generating a packet.",
    };
  }

  // Pull org name for context (contractor's company name is populated from
  // their CD user_profiles row on the CD side; we pass org name as a fallback
  // for the packet title + cross-reference).
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", job.org_id)
    .single();

  // Compose project address from the customer's address block (typical case
  // for residential fence jobs — the project site IS the customer's address).
  const projectAddress = [
    customer.address,
    customer.city,
    customer.state && customer.zip ? `${customer.state} ${customer.zip}` : customer.state,
  ]
    .filter(Boolean)
    .join(", ");

  // Fence spec — best-effort mapping from what FEP captures today. Height
  // + exact material/style are typically buried in the estimate's
  // input_json; for MVP we pass the readable fence_type label as "material"
  // and let the contractor refine in CD's packet detail page if needed.
  const linearFeet = typeof estimate?.linear_feet === "number" ? estimate.linear_feet : undefined;
  const gateCount =
    typeof estimate?.gate_count === "number" && estimate.gate_count > 0
      ? estimate.gate_count
      : undefined;

  const fenceSpec: Record<string, string | number> = {};
  if (estimate?.fence_type) fenceSpec.material = String(estimate.fence_type);
  if (linearFeet !== undefined) fenceSpec.linear_feet = linearFeet;
  if (gateCount !== undefined) {
    fenceSpec.gate_details = `${gateCount} gate${gateCount > 1 ? "s" : ""}`;
  }

  const projectTitle = job.title ?? estimate?.title ?? `Fence installation — ${customer.name}`;

  const res = await fetch(`${CONTRACTORDOCS_URL}/api/packets/from-job`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contractor_user_id: user.id,
      fep_job_id: jobId,
      customer: {
        name: customer.name,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
        address: customer.address ?? null,
        city: customer.city ?? null,
        state: customer.state ?? null,
        zip: customer.zip ?? null,
      },
      fence_spec: fenceSpec,
      project_address: projectAddress || null,
      project_title: projectTitle,
      hoa_name: hoaName ?? null,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON response; fall through to generic error below.
  }

  if (!res.ok) {
    const err = isRecord(payload) ? payload : {};
    const errorMsg = typeof err.error === "string" ? err.error : `ContractorDocs ${res.status}`;
    if (err.action === "subscribe" && typeof err.subscribe_url === "string") {
      return {
        success: false,
        error: errorMsg,
        action: "subscribe",
        subscribe_url: err.subscribe_url,
      };
    }
    return { success: false, error: errorMsg };
  }

  if (!isRecord(payload)) {
    return { success: false, error: "Unexpected response from ContractorDocs" };
  }

  const dashboard_url =
    typeof payload.dashboard_url === "string" ? payload.dashboard_url : undefined;
  const download_url =
    typeof payload.download_url === "string" ? payload.download_url : null;
  const packet_id = typeof payload.packet_id === "string" ? payload.packet_id : undefined;
  const missing = isRecord(payload.missing_credentials)
    ? {
        coi: Boolean((payload.missing_credentials as { coi?: unknown }).coi),
        license: Boolean((payload.missing_credentials as { license?: unknown }).license),
      }
    : undefined;

  if (!dashboard_url || !packet_id) {
    return { success: false, error: "ContractorDocs did not return a packet URL" };
  }

  return {
    success: true,
    dashboard_url,
    download_url,
    packet_id,
    missing_credentials: missing,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
