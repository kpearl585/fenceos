"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { FenceProjectInput, FenceEstimateResult } from "@/lib/fence-graph/types";
import {
  sendEmail,
  estimateAcceptedOwnerEmail,
  estimateAcceptedCustomerEmail,
} from "@/lib/email";
import { processAcceptance } from "@/lib/contracts/processAcceptance";
import type { PdfEstimateData } from "@/lib/contracts/generateEstimatePdf";
import { z } from "zod";

// ── Generate a shareable quote link ───────────────────────────────
// Creates a unique token for the estimate that customers can use to view and accept
export async function generateQuoteLink(
  estimateId: string,
  expiryDays: number = 30
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  try {
    // ✅ SECURITY: Validate inputs
    const schema = z.object({
      estimateId: z.string().uuid("Invalid estimate ID"),
      expiryDays: z.number().int().min(1).max(365, "Expiry must be 1-365 days"),
    });
    const validated = schema.parse({ estimateId, expiryDays });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();
    if (!profile) return { success: false, error: "Profile not found" };

    // ✅ SECURITY: Verify estimate belongs to this org
    const { data: estimate } = await admin
      .from("fence_graphs")
      .select("id, org_id")
      .eq("id", validated.estimateId)
      .eq("org_id", profile.org_id)
      .single();

    if (!estimate) {
      return { success: false, error: "Estimate not found" };
    }

    // Generate token using database function
    const { data: tokenData, error } = await admin.rpc("generate_quote_token", {
      estimate_id: validated.estimateId,
      expiry_days: validated.expiryDays,
    });

    if (error || !tokenData) {
      console.error("Error generating token:", error);
      return { success: false, error: "Failed to generate quote link" };
    }

    // Snapshot org legal + payment terms onto the row. Acceptance later
    // hashes the snapshot so the contractor can't edit org terms after
    // the customer signed and claim they agreed to new terms. This
    // matches the estimates flow (snapshotLegalTerms.ts).
    const { data: settings } = await admin
      .from("org_settings")
      .select("legal_terms, payment_terms")
      .eq("org_id", profile.org_id)
      .single();

    await admin
      .from("fence_graphs")
      .update({
        legal_terms_snapshot: settings?.legal_terms ?? "",
        payment_terms_snapshot: settings?.payment_terms ?? "",
      })
      .eq("id", validated.estimateId);

    const token = tokenData as string;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const url = `${baseUrl}/quote/${token}`;

    return { success: true, token, url };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message}` };
    }
    console.error("Generate quote link error:", err);
    return { success: false, error: "An error occurred" };
  }
}

// ── Get quote by public token ─────────────────────────────────────
// Public endpoint - customers can view quotes without authentication
export async function getQuoteByToken(token: string): Promise<{
  success: boolean;
  quote?: {
    id: string;
    name: string;
    input_json: FenceProjectInput;
    result_json: FenceEstimateResult;
    labor_rate: number;
    waste_pct: number;
    total_cost: number;
    customer_accepted_at: string | null;
    token_expires_at: string | null;
    legal_terms_snapshot: string | null;
    payment_terms_snapshot: string | null;
    contract_pdf_url: string | null;
    ar_enabled: boolean;
    org: {
      name: string;
      phone: string;
      email: string;
      address: string;
    };
  };
  error?: string;
}> {
  try {
    // ✅ SECURITY: Validate token format
    const tokenSchema = z.string().uuid("Invalid token format");
    const validatedToken = tokenSchema.parse(token);

    const admin = createAdminClient();

    // Load the row regardless of acceptance/expiry state — the page
    // renders a different surface for accepted and expired quotes and
    // needs the data either way. `acceptQuote` re-checks is_token_valid
    // before mutating, so this read-only fetch can't enable re-accepts.
    const { data: quote, error } = await admin
      .from("fence_graphs")
      .select(`
        id,
        name,
        input_json,
        result_json,
        labor_rate,
        waste_pct,
        total_cost,
        customer_accepted_at,
        token_expires_at,
        legal_terms_snapshot,
        payment_terms_snapshot,
        contract_pdf_url,
        ar_enabled,
        org_id
      `)
      .eq("public_token", validatedToken)
      .single();

    if (error || !quote) {
      console.error("Error fetching quote:", error);
      return { success: false, error: "Quote not found" };
    }

    // Fetch organization branding
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", quote.org_id)
      .single();

    const { data: branding } = await admin
      .from("org_branding")
      .select("phone, email, address")
      .eq("org_id", quote.org_id)
      .single();

    // `ar_enabled` was added by migration 20260419010000 but isn't in
    // the generated Supabase types yet. Narrow locally.
    const quoteAr = quote as unknown as { ar_enabled: boolean | null };

    return {
      success: true,
      quote: {
        id: quote.id,
        name: quote.name,
        input_json: quote.input_json as FenceProjectInput,
        result_json: quote.result_json as FenceEstimateResult,
        labor_rate: quote.labor_rate,
        waste_pct: quote.waste_pct,
        total_cost: quote.total_cost,
        customer_accepted_at: quote.customer_accepted_at,
        token_expires_at: quote.token_expires_at,
        legal_terms_snapshot: quote.legal_terms_snapshot ?? null,
        payment_terms_snapshot: quote.payment_terms_snapshot ?? null,
        contract_pdf_url: quote.contract_pdf_url ?? null,
        ar_enabled: quoteAr.ar_enabled ?? false,
        org: {
          name: org?.name ?? "Fence Company",
          phone: branding?.phone ?? "",
          email: branding?.email ?? "",
          address: branding?.address ?? "",
        },
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Invalid quote link" };
    }
    console.error("Get quote by token error:", err);
    return { success: false, error: "Failed to load quote" };
  }
}

// ── Accept quote ──────────────────────────────────────────────────
// Customer accepts the quote with a drawn signature. Mirrors the
// /api/accept route's ceremony: signature PNG upload, cryptographic
// hash bound to scope + legal terms, signed-contract PDF, and email
// notifications to both parties.
export async function acceptQuote(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = formData.get("token") as string | null;
    const customerName = (formData.get("name") as string | null)?.trim() ?? "";
    const customerEmail = (formData.get("email") as string | null)?.trim() ?? "";
    const ipAddress = (formData.get("ipAddress") as string | null) ?? "unknown";
    const userAgent = (formData.get("userAgent") as string | null) ?? "unknown";
    const signatureFile = formData.get("signature");

    const schema = z.object({
      token: z.string().uuid("Invalid token"),
      customerName: z.string().min(2, "Please enter your name").max(200),
      customerEmail: z.string().email("Please enter a valid email").max(200).or(z.literal("")),
      ipAddress: z.string().max(100),
      userAgent: z.string().max(500),
    });
    const validated = schema.parse({ token, customerName, customerEmail, ipAddress, userAgent });

    if (!(signatureFile instanceof File) || signatureFile.size === 0) {
      return { success: false, error: "Please draw your signature before accepting" };
    }
    if (signatureFile.size > 2 * 1024 * 1024) {
      return { success: false, error: "Signature file is too large" };
    }

    const admin = createAdminClient();

    const { data: isValid } = await admin.rpc("is_token_valid", {
      token: validated.token,
    });
    if (!isValid) {
      return { success: false, error: "Quote link has expired or has already been accepted" };
    }

    // Load the row we're accepting; we need enough data to build the
    // PDF + compute the hash before the row is marked accepted.
    // Cast because the generated DB types don't yet include the columns
    // added by migration 20260418120000 (acceptance-parity snapshots).
    const { data: quoteRaw, error: loadErr } = await admin
      .from("fence_graphs")
      .select(
        "id, org_id, name, input_json, result_json, total_cost, " +
        "legal_terms_snapshot, payment_terms_snapshot",
      )
      .eq("public_token", validated.token)
      .single();

    if (loadErr || !quoteRaw) {
      return { success: false, error: "Quote not found" };
    }

    const quote = quoteRaw as unknown as {
      id: string;
      org_id: string;
      name: string;
      input_json: FenceProjectInput;
      result_json: FenceEstimateResult;
      total_cost: number;
      legal_terms_snapshot: string | null;
      payment_terms_snapshot: string | null;
    };

    const [orgRes, brandingRes, ownerRes] = await Promise.all([
      admin.from("organizations").select("name").eq("id", quote.org_id).single(),
      admin.from("org_branding").select("*").eq("org_id", quote.org_id).single(),
      admin
        .from("users")
        .select("email")
        .eq("org_id", quote.org_id)
        .eq("role", "owner")
        .single(),
    ]);

    const orgName = orgRes.data?.name ?? "FenceEstimatePro";
    const branding = brandingRes.data ?? null;
    const ownerEmail = ownerRes.data?.email ?? null;

    const input = quote.input_json as FenceProjectInput;
    const totalLF = input.runs.reduce((s, r) => s + (r.linearFeet || 0), 0);
    const gateCount = input.gates?.length ?? 0;
    const total = Number(quote.total_cost) || 0;

    // Customer-facing PDF line items. One line — the customer already
    // saw the detailed scope on the web view; the signed contract binds
    // the agreed total and the legal terms via acceptance_hash.
    const scopeDescription = `Fence installation — ${totalLF.toFixed(0)} LF, ${gateCount} ${gateCount === 1 ? "gate" : "gates"}`;
    const lineItems = [
      {
        description: scopeDescription,
        qty: 1,
        unit: "ea",
        unitPrice: total,
        extendedPrice: total,
        type: "material" as const,
      },
    ];
    const lineItemsSummary = `${scopeDescription}:1:${total}:${total}`;

    const pdfData: Omit<PdfEstimateData, "isSigned" | "acceptedByName" | "acceptedAt" | "acceptanceHash" | "acceptedSignatureDataUrl"> = {
      estimateId: quote.id,
      title: quote.name,
      createdAt: new Date().toISOString(),
      quotedAt: null,
      customerName: validated.customerName,
      customerAddress: null,
      customerCity: null,
      customerState: null,
      customerPhone: null,
      customerEmail: validated.customerEmail || null,
      fenceType: (input.productLineId ?? "standard").split("_")[0],
      linearFeet: totalLF,
      gateCount,
      height: input.fenceHeight ?? null,
      lineItems,
      total,
      paymentTerms: quote.payment_terms_snapshot ?? null,
      legalTerms: quote.legal_terms_snapshot ?? null,
      orgName,
      logoUrl: branding?.logo_url ?? null,
      primaryColor: branding?.primary_color ?? "#1e3a5f",
      accentColor: branding?.accent_color ?? "#f59e0b",
      fontFamily: branding?.font_family ?? "helvetica",
      footerNote: branding?.footer_note ?? null,
    };

    const sigBuffer = Buffer.from(await signatureFile.arrayBuffer());
    const acceptedAt = new Date().toISOString();

    let signatureUrl: string;
    let acceptanceHash: string;
    let contractPdfUrl: string | null;
    try {
      const artifacts = await processAcceptance({
        supabase: admin,
        orgId: quote.org_id,
        recordId: quote.id,
        signerName: validated.customerName,
        signatureBuffer: sigBuffer,
        timestamp: acceptedAt,
        total,
        lineItemsSummary,
        legalTermsSnapshot: quote.legal_terms_snapshot ?? "",
        pdfData,
      });
      signatureUrl = artifacts.signatureUrl;
      acceptanceHash = artifacts.acceptanceHash;
      contractPdfUrl = artifacts.contractPdfUrl;
    } catch (err) {
      console.error("[acceptQuote] processAcceptance failed:", err);
      return { success: false, error: "Failed to process acceptance. Please try again." };
    }

    const { error: updateErr } = await admin
      .from("fence_graphs")
      .update({
        customer_accepted_at: acceptedAt,
        customer_signature: validated.customerName,
        customer_ip_address: validated.ipAddress,
        acceptance_user_agent: validated.userAgent,
        accepted_signature_url: signatureUrl,
        acceptance_hash: acceptanceHash,
        contract_pdf_url: contractPdfUrl,
        status: "accepted",
      })
      .eq("public_token", validated.token);

    if (updateErr) {
      console.error("[acceptQuote] Row update failed after artifacts generated:", updateErr);
      return { success: false, error: "Failed to finalize acceptance. Please try again." };
    }

    // Non-blocking: notify both sides. Delivery failure must not roll
    // back the acceptance — the row is already durable.
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com";
      const estimateUrl = `${baseUrl}/dashboard/estimates/${quote.id}`;
      const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total);

      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `Estimate Accepted — ${validated.customerName} (${fmt})`,
          html: estimateAcceptedOwnerEmail({
            ownerEmail,
            orgName,
            customerName: validated.customerName,
            total,
            estimateUrl,
            acceptedAt,
          }),
        });
      }
      if (validated.customerEmail) {
        await sendEmail({
          to: validated.customerEmail,
          subject: `Your estimate from ${orgName} has been confirmed`,
          html: estimateAcceptedCustomerEmail({
            orgName,
            customerName: validated.customerName,
            total,
            contractUrl: contractPdfUrl ?? undefined,
          }),
        });
      }
    } catch (emailErr) {
      console.error("[acceptQuote] Email send failed:", emailErr);
    }

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: `Validation failed: ${firstError?.message}` };
    }
    console.error("Accept quote error:", err);
    return { success: false, error: "An error occurred while accepting the quote" };
  }
}
