"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { FenceProjectInput, FenceEstimateResult } from "@/lib/fence-graph/types";
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
      .from("profiles")
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

    // Check if token is valid (not expired, not accepted)
    const { data: isValid } = await admin.rpc("is_token_valid", {
      token: validatedToken,
    });

    if (!isValid) {
      return { success: false, error: "Quote link has expired or is no longer valid" };
    }

    // Fetch quote data with org branding
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
// Customer accepts the quote with e-signature
export async function acceptQuote(
  token: string,
  signature: string,
  ipAddress: string,
  userAgent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ SECURITY: Validate inputs
    const schema = z.object({
      token: z.string().uuid("Invalid token"),
      signature: z.string().min(2, "Signature required").max(500, "Signature too long"),
      ipAddress: z.string().max(100),
      userAgent: z.string().max(500),
    });
    const validated = schema.parse({ token, signature, ipAddress, userAgent });

    const admin = createAdminClient();

    // Verify token is still valid
    const { data: isValid } = await admin.rpc("is_token_valid", {
      token: validated.token,
    });

    if (!isValid) {
      return { success: false, error: "Quote link has expired or has already been accepted" };
    }

    // Update estimate with acceptance data
    const { error } = await admin
      .from("fence_graphs")
      .update({
        customer_accepted_at: new Date().toISOString(),
        customer_signature: validated.signature.trim(),
        customer_ip_address: validated.ipAddress,
        acceptance_user_agent: validated.userAgent,
        status: "accepted", // Update status from draft to accepted
      })
      .eq("public_token", validated.token);

    if (error) {
      console.error("Error accepting quote:", error);
      return { success: false, error: "Failed to accept quote. Please try again." };
    }

    // TODO: Send email notification to contractor
    // This will be implemented in the next phase

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
