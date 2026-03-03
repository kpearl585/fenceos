import { createClient } from "@/lib/supabase/server";
import {
  generateEstimatePdfBuffer,
  type PdfEstimateData,
} from "./generateEstimatePdf";

/**
 * Generate and upload the estimate PDF to Supabase Storage.
 * Returns the storage path (not a public URL — access via signed URL or RLS).
 */
export async function generateAndUploadEstimatePdf(
  pdfData: PdfEstimateData,
  orgId: string,
  estimateId: string,
  filename: string = "estimate.pdf"
): Promise<string> {
  const supabase = await createClient();
  const buffer = await generateEstimatePdfBuffer(pdfData);
  const storagePath = `${orgId}/${estimateId}/${filename}`;

  const { error } = await supabase.storage
    .from("contracts")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  return storagePath;
}

/**
 * Build PdfEstimateData from database records.
 */
export async function buildPdfData(
  estimateId: string,
  orgId: string
): Promise<PdfEstimateData> {
  const supabase = await createClient();

  const { data: est } = await supabase
    .from("estimates")
    .select(
      "*, customers(name, email, phone, address, city, state)"
    )
    .eq("id", estimateId)
    .single();

  if (!est) throw new Error("Estimate not found");

  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const { data: branding } = await supabase
    .from("org_branding")
    .select("*")
    .eq("org_id", orgId)
    .single();

  const customer = (
    est.customers as unknown as {
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
    }[]
  )?.[0];

  return {
    estimateId: est.id,
    title: est.title,
    createdAt: est.created_at,
    quotedAt: est.quoted_at,
    customerName: customer?.name || "Customer",
    customerAddress: customer?.address || null,
    customerCity: customer?.city || null,
    customerState: customer?.state || null,
    customerPhone: customer?.phone || null,
    customerEmail: customer?.email || null,
    fenceType: est.fence_type || "standard",
    linearFeet: Number(est.linear_feet) || 0,
    gateCount: Number(est.gate_count) || 0,
    height: est.height ? Number(est.height) : null,
    lineItems: (lineItems ?? []).map((li) => ({
      description: li.description || li.sku || "Item",
      qty: Number(li.quantity),
      unit: li.unit || "ea",
      unitPrice: Number(li.unit_price),
      extendedPrice: Number(li.extended_price),
      type: li.type,
    })),
    total: Number(est.total) || 0,
    paymentTerms: est.payment_terms_snapshot || null,
    legalTerms: est.legal_terms_snapshot || null,
    orgName: org?.name || "FenceOS",
    logoUrl: branding?.logo_url || null,
    primaryColor: branding?.primary_color || "#1e3a5f",
    accentColor: branding?.accent_color || "#f59e0b",
    fontFamily: branding?.font_family || "helvetica",
    footerNote: branding?.footer_note || null,
  };
}
