import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { UserProfile } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type { InvoiceData } from "@/lib/invoice/InvoicePdf";

function invoiceNumber(jobId: string, date: Date): string {
  const year = date.getFullYear();
  const seq = jobId.replace(/-/g, "").substring(0, 6).toUpperCase();
  return `INV-${year}-${seq}`;
}

function safeString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function fmtCurrency(value: number): string {
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

async function renderInvoiceFallbackPdf(data: InvoiceData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.18, 0.42, 0.31);
  const black = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.4, 0.4, 0.4);

  let y = 740;
  const left = 48;
  const right = 564;

  const draw = (
    text: string,
    {
      x = left,
      size = 10,
      color = black,
      weight = "regular",
    }: { x?: number; size?: number; color?: ReturnType<typeof rgb>; weight?: "regular" | "bold" } = {}
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: weight === "bold" ? bold : font,
      color,
    });
    y -= size + 6;
  };

  page.drawText(safeString(data.org.name) ?? "Your Company", {
    x: left,
    y,
    size: 18,
    font: bold,
    color: black,
  });
  page.drawText("INVOICE", {
    x: right - 90,
    y,
    size: 24,
    font: bold,
    color: green,
  });
  y -= 28;
  draw(`Invoice #: ${data.invoiceNumber}`, { x: right - 140, size: 10, color: muted });
  draw(`Date: ${data.invoiceDate}`, { x: right - 140, size: 10, color: muted });

  y -= 12;
  draw("Bill To", { size: 9, color: muted, weight: "bold" });
  draw(safeString(data.customer.name) ?? "Customer", { size: 12, weight: "bold" });
  if (data.customer.address) draw(safeString(data.customer.address) ?? "");
  const cityStateZip = [data.customer.city, data.customer.state, data.customer.zip]
    .map((value) => safeString(value) ?? "")
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) draw(cityStateZip);
  if (data.customer.phone) draw(safeString(data.customer.phone) ?? "");
  if (data.customer.email) draw(safeString(data.customer.email) ?? "");

  y -= 8;
  draw("Job", { size: 9, color: muted, weight: "bold" });
  draw(safeString(data.job.title) ?? "Fence Job", { size: 12, weight: "bold" });
  draw(`${safeString(data.job.fenceType) ?? "Fence"} · ${data.job.linearFeet} LF${data.job.gateCount ? ` · ${data.job.gateCount} gate(s)` : ""}`);
  if (data.job.scheduledDate) draw(`Scheduled: ${data.job.scheduledDate}`);

  y -= 12;
  draw("Charges", { size: 9, color: muted, weight: "bold" });
  draw(`Original Scope: ${safeString(data.job.title) ?? "Fence Job"}`, { weight: "bold" });
  draw(fmtCurrency(data.estimateTotal), { x: right - 80, weight: "bold" });

  for (const [index, changeOrder] of data.changeOrders.entries()) {
    draw(`Change Order ${index + 1}: ${safeString(changeOrder.description) ?? "Additional work"}`, {
      weight: "bold",
    });
    draw(fmtCurrency(changeOrder.subtotal), { x: right - 80, weight: "bold" });
  }

  y -= 12;
  draw(`Total Due: ${fmtCurrency(data.estimateTotal + data.changeOrders.reduce((sum, co) => sum + co.subtotal, 0))}`, {
    size: 14,
    weight: "bold",
    color: green,
  });

  if (data.notes) {
    y -= 12;
    draw("Notes", { size: 9, color: muted, weight: "bold" });
    draw(safeString(data.notes) ?? "");
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
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
      name: safeString(org?.name) ?? "Your Company",
      logoUrl: safeString(branding?.logo_url),
      phone: safeString(branding?.phone),
      email: safeString(branding?.email),
      address: safeString(branding?.address),
    },
    customer: {
      name: safeString(customer?.name) ?? "Customer",
      email: safeString(customer?.email),
      phone: safeString(customer?.phone),
      address: safeString(customer?.address),
      city: safeString(customer?.city),
      state: safeString(customer?.state),
      zip: safeString(customer?.zip),
    },
    job: {
      title: safeString(job.title) ?? "Fence Job",
      fenceType: safeString(estimate?.fence_type) ?? "fence",
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
      description: safeString(co.reason) || safeString(co.description) || "",
      subtotal: Number(co.subtotal ?? 0),
      lines: (Array.isArray(co.change_order_line_items)
        ? co.change_order_line_items
        : [co.change_order_line_items]
      )
        .filter(Boolean)
        .map((l: { name: string; qty: number; unit_price: number; extended_price: number }) => ({
          name: safeString(l.name) ?? "Line Item",
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          extended_price: Number(l.extended_price),
        })),
    })),
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderInvoiceFallbackPdf(invoiceData);
  } catch (fallbackError) {
    console.error("Invoice PDF generation failed:", fallbackError);
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

  const invoicePayload = {
    org_id: profile.org_id,
    job_id: jobId,
    customer_id: job.customer_id,
    invoice_number: invNumber,
    status: "sent",
    subtotal: grandTotal,
    total: grandTotal,
    pdf_url: pdfUrl,
    sent_at: now.toISOString(),
  };
  const { data: existingInvoice, error: existingInvoiceErr } = await admin
    .from("invoices")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingInvoiceErr) {
    console.error("Invoice lookup failed:", existingInvoiceErr);
    return { success: false, error: "Failed to save invoice record." };
  }

  const invoiceWrite = existingInvoice
    ? await admin
        .from("invoices")
        .update(invoicePayload)
        .eq("id", existingInvoice.id)
    : await admin
        .from("invoices")
        .insert(invoicePayload);

  if (invoiceWrite.error) {
    console.error("Invoice write failed:", invoiceWrite.error);
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
    console.error("Job invoice completion update failed:", jobUpdateErr);
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
