import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import type { UserProfile } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { InvoicePdf, type InvoiceData } from "@/lib/invoice/InvoicePdf";

function invoiceNumber(jobId: string, date: Date): string {
  const year = date.getFullYear();
  const seq = jobId.replace(/-/g, "").substring(0, 6).toUpperCase();
  return `INV-${year}-${seq}`;
}

function buildInvoiceEmail({
  invoiceNumber,
  customerName,
  orgName,
  total,
  pdfUrl,
  invoiceDate,
}: {
  invoiceNumber: string;
  customerName: string;
  orgName: string;
  total: number;
  pdfUrl?: string;
  invoiceDate: string;
}) {
  const fmt = (n: number) =>
    `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#2D6A4F;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${orgName}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:#1a1a1a;">Invoice ${invoiceNumber}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${invoiceDate}</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Thank you for choosing ${orgName}. Please find your invoice below for the completed work.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="font-size:14px;color:#6b7280;">Invoice Number</td>
              <td align="right" style="font-size:14px;color:#1a1a1a;font-weight:bold;">${invoiceNumber}</td>
            </tr>
            <tr><td colspan="2" style="padding:8px 0;border-bottom:1px solid #e5e7eb;"></td></tr>
            <tr><td colspan="2" style="padding:4px 0;"></td></tr>
            <tr>
              <td style="font-size:16px;color:#1a1a1a;font-weight:bold;">Total Due</td>
              <td align="right" style="font-size:20px;color:#2D6A4F;font-weight:bold;">${fmt(total)}</td>
            </tr>
          </table>
          ${
            pdfUrl
              ? `<p style="text-align:center;margin:0 0 24px;">
              <a href="${pdfUrl}" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;">
                View Invoice PDF
              </a>
            </p>`
              : ""
          }
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Please remit payment at your earliest convenience. Contact us if you have any questions about this invoice.
          </p>
        </td></tr>
        <tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${orgName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function generateInvoiceForJob(
  jobId: string,
  profile: UserProfile
): Promise<{ success: boolean; error?: string; jobId?: string; invoiceUrl?: string | null }> {
  if (profile.role !== "owner") {
    return { success: false, error: "Only owners can mark jobs as paid." };
  }

  const admin = createAdminClient();

  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select(`
      id, org_id, title, status, scheduled_date, paid_at,
      total_price, total_cost,
      estimate_id,
      customer_id,
      estimates (
        id, total, fence_type, linear_feet, gate_count, target_margin_pct
      ),
      customers (
        id, name, email, phone, address, city, state, zip
      )
    `)
    .eq("id", jobId)
    .eq("org_id", profile.org_id)
    .single();

  if (jobErr || !job) {
    return { success: false, error: "Job not found." };
  }
  if (job.status !== "active") {
    return { success: false, error: "Only active jobs can be marked paid and invoiced." };
  }
  if ((job as { paid_at?: string | null }).paid_at) {
    return { success: false, error: "Job has already been marked paid." };
  }

  const { data: changeOrders } = await admin
    .from("change_orders")
    .select(`
      id, description, reason, subtotal,
      change_order_line_items (
        name, qty, unit_price, extended_price
      )
    `)
    .eq("job_id", jobId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .single();

  const { data: branding } = await admin
    .from("org_branding")
    .select("logo_url, phone, email, address")
    .eq("org_id", profile.org_id)
    .maybeSingle();

  const now = new Date();
  const invNumber = invoiceNumber(jobId, now);
  const invDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const estimate = (Array.isArray(job.estimates) ? job.estimates[0] : job.estimates) as {
    id: string; total: number; fence_type: string; linear_feet: number; gate_count: number; target_margin_pct: number;
  } | null;
  const customer = (Array.isArray(job.customers) ? job.customers[0] : job.customers) as {
    id: string; name: string; email: string | null; phone: string | null;
    address: string | null; city: string | null; state: string | null; zip: string | null;
  } | null;

  const invoiceData: InvoiceData = {
    invoiceNumber: invNumber,
    invoiceDate: invDate,
    org: {
      name: org?.name ?? "Your Company",
      logoUrl: branding?.logo_url ?? undefined,
      phone: branding?.phone ?? undefined,
      email: branding?.email ?? undefined,
      address: branding?.address ?? undefined,
    },
    customer: {
      name: customer?.name ?? "Customer",
      email: customer?.email ?? undefined,
      phone: customer?.phone ?? undefined,
      address: customer?.address ?? undefined,
      city: customer?.city ?? undefined,
      state: customer?.state ?? undefined,
      zip: customer?.zip ?? undefined,
    },
    job: {
      title: job.title,
      fenceType: estimate?.fence_type ?? "fence",
      linearFeet: Number(estimate?.linear_feet ?? 0),
      gateCount: Number(estimate?.gate_count ?? 0),
      scheduledDate: job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined,
    },
    estimateTotal: Number(estimate?.total ?? job.total_price ?? 0),
    changeOrders: (changeOrders ?? []).map((co) => ({
      id: co.id,
      description: co.reason || co.description || "",
      subtotal: Number(co.subtotal ?? 0),
      lines: (Array.isArray(co.change_order_line_items)
        ? co.change_order_line_items
        : [co.change_order_line_items]
      )
        .filter(Boolean)
        .map((l: { name: string; qty: number; unit_price: number; extended_price: number }) => ({
          name: l.name,
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          extended_price: Number(l.extended_price),
        })),
    })),
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePdf, { data: invoiceData }) as React.ReactElement
    );
  } catch (e) {
    console.error("PDF generation failed:", e);
    return { success: false, error: "Failed to generate PDF invoice." };
  }

  const pdfPath = `invoices/${profile.org_id}/${jobId}/${invNumber}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("contracts")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    return { success: false, error: "Failed to store PDF invoice." };
  }

  const { data: urlData, error: signedUrlErr } = await admin.storage
    .from("contracts")
    .createSignedUrl(pdfPath, 31536000);
  if (signedUrlErr) {
    return { success: false, error: "Failed to create invoice access URL." };
  }
  const pdfUrl = urlData?.signedUrl ?? null;

  const grandTotal =
    invoiceData.estimateTotal +
    invoiceData.changeOrders.reduce((s, co) => s + co.subtotal, 0);

  const { error: invoiceErr } = await admin.from("invoices").upsert({
    org_id: profile.org_id,
    job_id: jobId,
    customer_id: job.customer_id,
    invoice_number: invNumber,
    status: "sent",
    subtotal: grandTotal,
    total: grandTotal,
    pdf_url: pdfUrl,
    sent_at: now.toISOString(),
  }, { onConflict: "job_id" });
  if (invoiceErr) {
    return { success: false, error: "Failed to save invoice record." };
  }

  const { error: jobUpdateErr } = await admin
    .from("jobs")
    .update({
      status: "complete",
      paid_at: now.toISOString(),
      completed_at: now.toISOString(),
      invoice_url: pdfUrl,
    })
    .eq("id", jobId)
    .eq("org_id", profile.org_id);
  if (jobUpdateErr) {
    return { success: false, error: "Failed to mark job paid." };
  }

  if (customer?.email) {
    try {
      await sendEmail({
        to: customer.email,
        subject: `Invoice ${invNumber} — ${org?.name ?? "Your Contractor"}`,
        html: buildInvoiceEmail({
          invoiceNumber: invNumber,
          customerName: customer.name,
          orgName: org?.name ?? "Your Contractor",
          total: grandTotal,
          pdfUrl: pdfUrl ?? undefined,
          invoiceDate: invDate,
        }),
      });
    } catch (e) {
      console.error("Invoice email failed:", e);
    }
  }

  return { success: true, jobId, invoiceUrl: pdfUrl };
}
