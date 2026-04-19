"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

// Bridge to ContractorDocuments.com's /api/generate-from-job endpoint.
// Given a job id + a doc sku, pulls the job's customer + estimate, builds a
// variables map, asks contractordocs to render a branded PDF, uploads it to
// this org's 'contracts' storage bucket, and returns a signed URL.

// Must match DOC_REGISTRY in contractordocs.
export const DOC_SKUS = [
  { sku: "contractor-agreement", label: "Service Agreement / Contract" },
  { sku: "change-order", label: "Change Order Form" },
  { sku: "lien-waiver-conditional", label: "Conditional Lien Waiver" },
  { sku: "lien-waiver-final", label: "Final Lien Waiver" },
  { sku: "scope-of-work", label: "Scope of Work" },
  { sku: "warranty-certificate", label: "Warranty Certificate" },
] as const;

export type DocSku = (typeof DOC_SKUS)[number]["sku"];

const CONTRACTORDOCS_URL =
  process.env.CONTRACTORDOCS_URL ?? "https://contractordocuments.com";

export async function generateJobDoc({
  jobId,
  sku,
}: {
  jobId: string;
  sku: DocSku;
}): Promise<{ success: true; url: string; path: string } | { success: false; error: string }> {
  const secret = process.env.PEARL_INTERNAL_SECRET;
  if (!secret) {
    return { success: false, error: "PEARL_INTERNAL_SECRET not configured" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch the job scoped to the caller's org via RLS.
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id, org_id, title, scheduled_date, completed_date, notes, total_price, customers(name, email, phone, address, city, state, zip), estimates(title, fence_type, linear_feet, gate_count)",
    )
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return { success: false, error: "Job not found" };
  }

  // Fetch the org for the contractor's own details.
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", job.org_id)
    .single();

  // customers and estimates come back as arrays in some PostgREST modes; flatten.
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const estimate = Array.isArray(job.estimates) ? job.estimates[0] : job.estimates;

  const today = new Date().toISOString().split("T")[0];
  const variables: Record<string, string> = {
    // Customer block
    "CLIENT FULL NAME": customer?.name ?? "",
    "CLIENT NAME": customer?.name ?? "",
    "CLIENT ADDRESS": [
      customer?.address,
      customer?.city,
      customer?.state && customer?.zip ? `${customer.state} ${customer.zip}` : customer?.state,
    ]
      .filter(Boolean)
      .join(", "),
    "CLIENT PHONE": customer?.phone ?? "",
    "CLIENT EMAIL": customer?.email ?? "",
    // Contractor block
    "YOUR COMPANY NAME": org?.name ?? "",
    "COMPANY NAME": org?.name ?? "",
    // Project block
    "PROJECT NAME": job.title ?? estimate?.title ?? "",
    "JOB NUMBER": job.id,
    "DATE PREPARED": today,
    "DATE": today,
    // Scope
    "DESCRIPTION": estimate
      ? `${estimate.fence_type ?? "Fence"} installation, ${estimate.linear_feet ?? "—"} linear feet${
          estimate.gate_count ? `, ${estimate.gate_count} gate${estimate.gate_count > 1 ? "s" : ""}` : ""
        }`
      : "",
    "TOTAL AMOUNT": job.total_price ? `$${Number(job.total_price).toLocaleString()}` : "",
    "PROJECT SITE ADDRESS": [
      customer?.address,
      customer?.city,
      customer?.state && customer?.zip ? `${customer.state} ${customer.zip}` : customer?.state,
    ]
      .filter(Boolean)
      .join(", "),
    "JOB SITE ADDRESS": [
      customer?.address,
      customer?.city,
      customer?.state && customer?.zip ? `${customer.state} ${customer.zip}` : customer?.state,
    ]
      .filter(Boolean)
      .join(", "),
  };

  // Call contractordocs to render the PDF.
  const res = await fetch(`${CONTRACTORDOCS_URL}/api/generate-from-job`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ sku, variables, filename: `${sku}-${jobId.slice(0, 8)}.pdf` }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { success: false, error: `contractordocs ${res.status}: ${txt.slice(0, 200)}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());

  // Upload to the existing 'contracts' bucket alongside estimate PDFs.
  const admin = createAdminClient();
  const storagePath = `${job.org_id}/${jobId}/${sku}-${Date.now()}.pdf`;
  const { error: upErr } = await admin.storage
    .from("contracts")
    .upload(storagePath, buf, { contentType: "application/pdf", upsert: false });
  if (upErr) {
    return { success: false, error: `Upload failed: ${upErr.message}` };
  }

  const { data: signed, error: signErr } = await admin.storage
    .from("contracts")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

  if (signErr || !signed) {
    return { success: false, error: "Could not sign URL" };
  }

  return { success: true, url: signed.signedUrl, path: storagePath };
}
