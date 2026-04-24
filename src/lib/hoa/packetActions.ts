"use server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { GenerateHoaPacketSchema } from "@/lib/validation/schemas";
import { RateLimiters } from "@/lib/security/rate-limit";
import type { FenceProjectInput } from "@/lib/fence-graph/types";
import {
  buildHoaPacketPdf,
  summarizeGateCount,
  type HoaPacketCoverData,
} from "./generatePacket";

// Turn the raw productLineId from input_json into something a homeowner
// or HOA reviewer would recognize. Keep the map small — unknown lines
// fall through to a decent generic label.
function fenceTypeLabel(productLineId: string, heightFt: number): string {
  const HEIGHT = `${heightFt}'`;
  const map: Record<string, string> = {
    vinyl_privacy_6ft:  `Vinyl Privacy ${HEIGHT}`,
    vinyl_privacy_8ft:  `Vinyl Privacy ${HEIGHT}`,
    vinyl_picket_4ft:   `Vinyl Picket ${HEIGHT}`,
    vinyl_picket_6ft:   `Vinyl Picket ${HEIGHT}`,
    wood_privacy_6ft:   `Wood Privacy ${HEIGHT}`,
    wood_privacy_8ft:   `Wood Privacy ${HEIGHT}`,
    wood_picket_4ft:    `Wood Picket ${HEIGHT}`,
    chain_link_4ft:     `Chain Link ${HEIGHT}`,
    chain_link_6ft:     `Chain Link ${HEIGHT}`,
    aluminum_4ft:       `Aluminum ${HEIGHT}`,
    aluminum_6ft:       `Aluminum ${HEIGHT}`,
  };
  return map[productLineId] ?? `Custom ${HEIGHT}`;
}

function totalLinearFeet(input: FenceProjectInput): number {
  const runs = (input as unknown as { runs?: Array<{ linearFeet?: number }> }).runs;
  if (!Array.isArray(runs)) return 0;
  let total = 0;
  for (const r of runs) {
    if (typeof r?.linearFeet === "number" && Number.isFinite(r.linearFeet)) {
      total += r.linearFeet;
    }
  }
  return Math.round(total);
}

// Main server action: generate an HOA packet PDF for a saved estimate.
// Returns the PDF bytes as base64 (client decodes and triggers download).
export async function generateHoaPacket(input: unknown): Promise<{
  success: boolean;
  pdf?: string;          // base64
  filename?: string;
  error?: string;
}> {
  try {
    const validated = GenerateHoaPacketSchema.parse(input);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);

    // Rate limit — see rate-limit.ts comment on why HOA packets have
    // their own budget separate from pdfGeneration.
    const rateLimit = RateLimiters.hoaPacketGeneration(profile.org_id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error ?? "Rate limit exceeded. Try again later." };
    }

    Sentry.setContext("hoa_packet", {
      org_id: profile.org_id,
      estimate_id: validated.estimateId,
    });
    Sentry.setUser({ id: user.id });

    const admin = createAdminClient();

    // Pull the estimate + confirm it belongs to this org. RLS on
    // fence_graphs should filter this, but we use admin client + explicit
    // org_id check because admin bypasses RLS.
    const { data: estimate, error: estErr } = await admin
      .from("fence_graphs")
      .select("id, name, org_id, input_json")
      .eq("id", validated.estimateId)
      .maybeSingle();

    if (estErr || !estimate) {
      return { success: false, error: "Estimate not found." };
    }
    if (estimate.org_id !== profile.org_id) {
      return { success: false, error: "You don't have access to this estimate." };
    }

    const estimateInput = estimate.input_json as unknown as FenceProjectInput;
    if (!estimateInput || typeof estimateInput !== "object") {
      return { success: false, error: "Estimate data is missing or corrupt." };
    }

    // Org branding + contact info for the cover page
    const [{ data: org }, { data: branding }, { data: certRow }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", profile.org_id).single(),
      admin
        .from("org_branding")
        .select("phone, email, address")
        .eq("org_id", profile.org_id)
        .maybeSingle(),
      admin
        .from("org_hoa_docs")
        .select("storage_path")
        .eq("org_id", profile.org_id)
        .eq("doc_type", "insurance_cert")
        .maybeSingle(),
    ]);

    // Download the insurance cert if one exists. This uses the admin
    // client because the server action runs as the owner and needs to
    // read the file regardless of storage RLS nuances — we've already
    // validated the user is authenticated and in the right org above.
    let certBytes: Uint8Array | null = null;
    if (certRow?.storage_path) {
      try {
        const { data, error } = await admin.storage
          .from("hoa-docs")
          .download(certRow.storage_path);
        if (error) throw error;
        if (data) {
          const buf = await data.arrayBuffer();
          certBytes = new Uint8Array(buf);
        }
      } catch (err) {
        // Storage fetch failed — log but don't block packet. The
        // buildHoaPacketPdf warning page will surface the issue.
        console.error("HOA packet: insurance cert download failed:", err);
        Sentry.captureException(err, {
          tags: { hoa_packet: "cert_download" },
        });
      }
    }

    const coverData: HoaPacketCoverData = {
      projectName: estimate.name || validated.customerName || "Fence Project",
      customerName: validated.customerName,
      customerAddress: validated.customerAddress,
      customerCity: validated.customerCity || null,
      customerState: validated.customerState || null,
      customerZip: validated.customerZip || null,
      hoaName: validated.hoaName || null,
      org: {
        name: org?.name ?? "Your Company",
        phone: (branding as { phone?: string } | null)?.phone ?? "",
        email: (branding as { email?: string } | null)?.email ?? "",
        address: (branding as { address?: string } | null)?.address ?? "",
      },
      project: {
        linearFeet: totalLinearFeet(estimateInput),
        fenceHeightFt: Number(estimateInput.fenceHeight) || 6,
        gateCount: summarizeGateCount(estimateInput),
        fenceType: fenceTypeLabel(
          estimateInput.productLineId ?? "",
          Number(estimateInput.fenceHeight) || 6
        ),
        generatedAt: new Date(),
      },
    };

    const pdfBytes = await buildHoaPacketPdf(coverData, estimateInput, certBytes);
    const safeName = (estimate.name || "fence-project")
      .replace(/[^a-z0-9\-_]+/gi, "-")
      .slice(0, 60)
      .toLowerCase() || "packet";

    return {
      success: true,
      pdf: Buffer.from(pdfBytes).toString("base64"),
      filename: `hoa-packet-${safeName}.pdf`,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return { success: false, error: `Validation failed: ${first?.message ?? "invalid input"}` };
    }
    Sentry.captureException(err, { tags: { feature: "hoa_packet" }, level: "error" });
    console.error("generateHoaPacket error:", err);
    return { success: false, error: "Failed to generate packet. Please try again." };
  }
}
