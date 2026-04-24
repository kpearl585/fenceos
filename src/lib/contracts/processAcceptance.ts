// Shared acceptance processor used by both the /api/accept route
// (estimates table) and the acceptQuote server action (fence_graphs
// table). Kept generic over the record: takes the signature buffer +
// the PDF data the caller already assembled and returns the three
// durable artifacts — a public signature URL, an acceptance hash, and
// a 1-year signed URL to the generated contract PDF.
//
// The two flows target different tables but the ceremony is identical,
// so any drift between them was a bug-factory. This helper is the
// single implementation.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateEstimatePdfBuffer,
  type PdfEstimateData,
} from "@/lib/contracts/generateEstimatePdf";

export interface ProcessAcceptanceInput {
  supabase: SupabaseClient;
  orgId: string;
  recordId: string;             // estimate id OR fence_graph id
  signerName: string;
  signatureBuffer: Buffer;      // drawn signature PNG
  timestamp: string;            // ISO timestamp of acceptance
  total: number;
  lineItemsSummary: string;     // hashed to bind scope
  legalTermsSnapshot: string;   // hashed to bind terms
  pdfData: Omit<PdfEstimateData, "isSigned" | "acceptedByName" | "acceptedAt" | "acceptanceHash" | "acceptedSignatureDataUrl">;
}

export interface ProcessAcceptanceResult {
  signatureUrl: string;         // public URL of the uploaded signature PNG
  acceptanceHash: string;       // SHA-256 of (id|total|lineItems|legalTerms|timestamp)
  contractPdfUrl: string | null; // 1-year signed URL; null only if PDF storage fails
}

export async function processAcceptance(input: ProcessAcceptanceInput): Promise<ProcessAcceptanceResult> {
  const {
    supabase, orgId, recordId, signerName, signatureBuffer,
    timestamp, total, lineItemsSummary, legalTermsSnapshot, pdfData,
  } = input;

  // 1. Upload the signature PNG to the contracts bucket. Upsert so a
  //    retry (e.g. dev-tools "Retry") doesn't fail on duplicate key.
  const sigPath = `${orgId}/${recordId}/signature.png`;
  const { error: sigErr } = await supabase.storage
    .from("contracts")
    .upload(sigPath, signatureBuffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (sigErr) {
    throw new Error(`Signature upload failed: ${sigErr.message}`);
  }
  const { data: sigUrlData } = supabase.storage
    .from("contracts")
    .getPublicUrl(sigPath);
  const signatureUrl = sigUrlData.publicUrl;

  // 2. Compute the tamper-evident acceptance hash. The legal_terms
  //    snapshot is part of the payload so a contractor can't later
  //    edit org terms and claim the customer accepted the new version.
  const acceptanceHash = crypto
    .createHash("sha256")
    .update([
      recordId,
      Number(total).toFixed(2),
      lineItemsSummary,
      legalTermsSnapshot,
      timestamp,
    ].join("|"))
    .digest("hex");

  // 3. Render the signed PDF with the drawn signature embedded.
  //    Pass the buffer directly as a data URL — the generator doesn't
  //    need to fetch from storage.
  const signatureDataUrl = `data:image/png;base64,${signatureBuffer.toString("base64")}`;
  const pdfBuffer = await generateEstimatePdfBuffer({
    ...pdfData,
    isSigned: true,
    acceptedByName: signerName,
    acceptedAt: timestamp,
    acceptedSignatureDataUrl: signatureDataUrl,
    acceptanceHash,
  });

  // 4. Upload to private bucket, return a signed URL (1-year expiry
  //    matches the legal record we expect contractors to keep).
  const contractPath = `${orgId}/${recordId}/signed-contract.pdf`;
  const { error: pdfErr } = await supabase.storage
    .from("contracts")
    .upload(contractPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  let contractPdfUrl: string | null = null;
  if (!pdfErr) {
    const { data: signed } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contractPath, 31536000);
    contractPdfUrl = signed?.signedUrl ?? null;
  }
  // PDF upload failure is non-fatal — the signature + hash are already
  // captured, and we'd rather record the acceptance than reject it over
  // a storage blip. Caller logs the outcome.

  return { signatureUrl, acceptanceHash, contractPdfUrl };
}
