import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  generateEstimatePdfBuffer,
  type PdfEstimateData,
} from "@/lib/contracts/generateEstimatePdf";
import { sendEmail, estimateAcceptedOwnerEmail, estimateAcceptedCustomerEmail } from "@/lib/email";

/**
 * POST /api/accept
 * Public endpoint — validates token, captures acceptance, generates signed PDF.
 * No auth required (customer-facing).
 */

async function createAnonClient() {
  return createSupabaseServerClient();
}

export async function POST(request: NextRequest) {
  try {
    const fd = await request.formData();
    const estimateId = fd.get("estimateId") as string;
    const token = fd.get("token") as string;
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const signatureFile = fd.get("signature") as File | null;

    if (!estimateId || !token || !name || !email || !signatureFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createAnonClient();

    // 1. Validate token and status
    const { data: est, error: estErr } = (await supabase
      .from("estimates")
      .select(
        "id, org_id, status, total, accept_token, " +
          "legal_terms_snapshot, payment_terms_snapshot, " +
          "title, fence_type, linear_feet, gate_count, height, " +
          "quoted_at, created_at, " +
          "customers(name, email, phone, address, city, state), " +
          "organizations(name)"
      )
      .eq("id", estimateId)
      .eq("accept_token", token)
      .single()) as { data: any; error: any };

    if (estErr || !est) {
      return NextResponse.json(
        { error: "Invalid or expired acceptance link" },
        { status: 404 }
      );
    }

    if (est.status !== "quoted") {
      return NextResponse.json(
        { error: `Estimate status is '${est.status}', cannot accept` },
        { status: 400 }
      );
    }

    // 2. Capture IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 3. Upload signature to storage
    const sigBuffer = Buffer.from(await signatureFile.arrayBuffer());
    const sigPath = `${est.org_id}/${estimateId}/signature.png`;

    const { error: sigErr } = await supabase.storage
      .from("contracts")
      .upload(sigPath, sigBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (sigErr) {
      return NextResponse.json(
        { error: `Signature upload failed: ${sigErr.message}` },
        { status: 500 }
      );
    }

    // 4. Load line items for hash
    const { data: lineItems } = await supabase
      .from("estimate_line_items")
      .select("description, quantity, unit_price, extended_price")
      .eq("estimate_id", estimateId)
      .order("sort_order");

    const lineItemsSummary = (lineItems ?? [])
      .map(
        (li) =>
          `${li.description}:${li.quantity}:${li.unit_price}:${li.extended_price}`
      )
      .join(";");

    // 5. Generate acceptance hash
    const timestamp = new Date().toISOString();
    const hashPayload = [
      estimateId,
      Number(est.total).toFixed(2),
      lineItemsSummary,
      est.legal_terms_snapshot || "",
      timestamp,
    ].join("|");

    const acceptanceHash = crypto
      .createHash("sha256")
      .update(hashPayload)
      .digest("hex");

    // 6. Get signature public URL
    const { data: sigUrlData } = supabase.storage
      .from("contracts")
      .getPublicUrl(sigPath);
    const signatureUrl = sigUrlData.publicUrl;

    // 7. Update estimate — V1: no deposit handling
    const { error: updateErr } = await supabase
      .from("estimates")
      .update({
        status: "accepted",
        accepted_at: timestamp,
        accepted_by_name: name,
        accepted_by_email: email,
        accepted_ip: ip,
        accepted_signature_url: signatureUrl,
        acceptance_hash: acceptanceHash,
        updated_at: timestamp,
      })
      .eq("id", estimateId)
      .eq("accept_token", token);

    if (updateErr) {
      return NextResponse.json(
        { error: `Acceptance failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 8. Generate signed contract PDF
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

    const orgObj2 = est.organizations as unknown as { name: string } | { name: string }[] | null;
    const orgName =
      (Array.isArray(orgObj2) ? orgObj2[0]?.name : (orgObj2 as { name: string } | null)?.name) ||
      "FenceOS";

    // Load branding
    const { data: branding } = await supabase
      .from("org_branding")
      .select("*")
      .eq("org_id", est.org_id)
      .single();

    // Convert the drawn signature to a base64 data URL so the PDF module
    // can embed it without a storage round-trip (signed URL expiry + latency
    // would complicate the request path). sigBuffer is already in memory.
    const signatureDataUrl = `data:image/png;base64,${sigBuffer.toString("base64")}`;

    const pdfData: PdfEstimateData = {
      estimateId: est.id,
      title: est.title,
      createdAt: est.created_at,
      quotedAt: est.quoted_at,
      customerName: customer?.name || name,
      customerAddress: customer?.address || null,
      customerCity: customer?.city || null,
      customerState: customer?.state || null,
      customerPhone: customer?.phone || null,
      customerEmail: customer?.email || email,
      fenceType: est.fence_type || "standard",
      linearFeet: Number(est.linear_feet) || 0,
      gateCount: Number(est.gate_count) || 0,
      height: est.height ? Number(est.height) : null,
      lineItems: (lineItems ?? []).map((li) => ({
        description: li.description || "Item",
        qty: Number(li.quantity),
        unit: "ea",
        unitPrice: Number(li.unit_price),
        extendedPrice: Number(li.extended_price),
        type: "material",
      })),
      total: Number(est.total) || 0,
      paymentTerms: est.payment_terms_snapshot || null,
      legalTerms: est.legal_terms_snapshot || null,
      orgName,
      logoUrl: branding?.logo_url || null,
      primaryColor: branding?.primary_color || "#1e3a5f",
      accentColor: branding?.accent_color || "#f59e0b",
      fontFamily: branding?.font_family || "helvetica",
      footerNote: branding?.footer_note || null,
      isSigned: true,
      acceptedByName: name,
      acceptedAt: timestamp,
      acceptedSignatureDataUrl: signatureDataUrl,
      acceptanceHash,
    };

    const pdfBuffer = await generateEstimatePdfBuffer(pdfData);
    const contractPath = `${est.org_id}/${estimateId}/signed-contract.pdf`;

    const { error: pdfErr } = await supabase.storage
      .from("contracts")
      .upload(contractPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (!pdfErr) {
      // Private bucket — use signed URL (1 year expiry = 31536000 seconds)
      const { data: contractUrlData } = await supabase.storage
        .from("contracts")
        .createSignedUrl(contractPath, 31536000);

      const contractPdfUrl = contractUrlData?.signedUrl ?? null;

      // Update contract PDF URL
      await supabase
        .from("estimates")
        .update({ contract_pdf_url: contractPdfUrl })
        .eq("id", estimateId);
    }

    // 9. Send notification emails (non-blocking)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com";
      const estimateUrl = `${baseUrl}/dashboard/estimates/${estimateId}`;

      // Get owner email
      const { data: ownerUser } = await supabase
        .from("users")
        .select("email")
        .eq("org_id", est.org_id)
        .eq("role", "owner")
        .single();

      if (ownerUser?.email) {
        await sendEmail({
          to: ownerUser.email,
          subject: `Estimate Accepted — ${customer?.name || name} (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(est.total))})`,
          html: estimateAcceptedOwnerEmail({
            ownerEmail: ownerUser.email,
            orgName,
            customerName: customer?.name || name,
            total: Number(est.total),
            estimateUrl,
            acceptedAt: timestamp,
          }),
        });

        // Deposit reminder removed — V2 feature
      }

      // Customer confirmation — signed contract link (1 year signed URL)
      const customerEmail = customer?.email || email;
      if (customerEmail) {
        const { data: contractUrl } = await supabase.storage
          .from("contracts")
          .createSignedUrl(`${est.org_id}/${estimateId}/signed-contract.pdf`, 31536000);

        await sendEmail({
          to: customerEmail,
          subject: `Your estimate from ${orgName} has been confirmed`,
          html: estimateAcceptedCustomerEmail({
            orgName,
            customerName: customer?.name || name,
            total: Number(est.total),
            contractUrl: contractUrl?.signedUrl,
          }),
        });
      }
    } catch (emailErr) {
      console.error("[accept] Email send failed:", emailErr);
      // Non-blocking — acceptance is already recorded
    }

        return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Acceptance error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
