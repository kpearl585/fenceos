"use server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/bootstrap";
import { canAccess } from "@/lib/roles";
import { UploadHoaDocSchema } from "@/lib/validation/schemas";
import { RateLimiters } from "@/lib/security/rate-limit";

// Record (or replace) an HOA-doc upload. The file itself is uploaded
// client-side to Supabase Storage via the browser client and the
// `hoa_docs_insert` policy (owner-only). This action only records the
// metadata row after a successful upload.
export async function recordHoaDocUpload(input: unknown) {
  try {
    const validated = UploadHoaDocSchema.parse(input);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    if (!canAccess(profile.role, "owner")) {
      return { error: "Only the account owner can upload HOA documents." };
    }

    // Rate limit: re-uploading the same cert 50 times/hour means something
    // is wrong (script, bug, or abuse). Reuse pdfGeneration's budget —
    // unrelated op but similar blast radius.
    const rateLimit = RateLimiters.pdfGeneration(profile.org_id);
    if (!rateLimit.success) {
      return { error: rateLimit.error ?? "Too many uploads. Try again later." };
    }

    // Enforce the same-org folder prefix the RLS policy expects.
    // Storage already validated the upload itself — this check catches
    // mismatches before we write a bad storage_path to the DB.
    const expectedPrefix = `${profile.org_id}/`;
    if (!validated.storagePath.startsWith(expectedPrefix)) {
      return { error: "Invalid storage path for this organization." };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("org_hoa_docs")
      .upsert(
        {
          org_id: profile.org_id,
          doc_type: validated.docType,
          storage_path: validated.storagePath,
          filename: validated.filename,
          file_size_bytes: validated.fileSizeBytes,
          uploaded_by: user.id,
          expires_at: validated.expiresAt || null,
        },
        { onConflict: "org_id,doc_type" }
      );

    if (error) {
      console.error("recordHoaDocUpload error:", error);
      return { error: "Failed to record upload. Try again." };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return { error: `Validation failed: ${first?.message ?? "invalid input"}` };
    }
    console.error("recordHoaDocUpload unexpected:", err);
    return { error: "An unexpected error occurred." };
  }
}

// Remove a stored HOA doc (both the storage object and metadata).
export async function deleteHoaDoc(docType: string) {
  try {
    if (!["insurance_cert", "w9", "license"].includes(docType)) {
      return { error: "Unknown document type." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const profile = await ensureProfile(supabase, user);
    if (!canAccess(profile.role, "owner")) {
      return { error: "Only the account owner can remove HOA documents." };
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("org_hoa_docs")
      .select("storage_path")
      .eq("org_id", profile.org_id)
      .eq("doc_type", docType)
      .maybeSingle();

    if (existing?.storage_path) {
      await admin.storage.from("hoa-docs").remove([existing.storage_path]);
    }

    await admin
      .from("org_hoa_docs")
      .delete()
      .eq("org_id", profile.org_id)
      .eq("doc_type", docType);

    return { success: true };
  } catch (err) {
    console.error("deleteHoaDoc error:", err);
    return { error: "Failed to remove document." };
  }
}
