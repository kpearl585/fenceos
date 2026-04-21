"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";
import { recordHoaDocUpload, deleteHoaDoc } from "@/lib/hoa/hoaDocs";

interface InsuranceCertUploadProps {
  orgId: string;
  existing: {
    filename: string;
    fileSizeBytes: number;
    uploadedAt: string;
    expiresAt: string | null;
  } | null;
}

const MAX_SIZE_MB = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysUntil(dateStr: string): number | null {
  const ms = new Date(dateStr).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

export default function InsuranceCertUpload({ orgId, existing }: InsuranceCertUploadProps) {
  const [current, setCurrent] = useState(existing);
  const [uploading, setUploading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File, expiresAtValue: string) {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const supabase = createClient();
      const path = `${orgId}/insurance_cert.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("hoa-docs")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const result = await recordHoaDocUpload({
        docType: "insurance_cert",
        storagePath: path,
        filename: file.name,
        fileSizeBytes: file.size,
        expiresAt: expiresAtValue || undefined,
      });

      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      setCurrent({
        filename: file.name,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        expiresAt: expiresAtValue || null,
      });
    } catch (err) {
      console.error("Insurance cert upload:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, expiresAt);
    e.target.value = "";
  }

  async function handleRemove() {
    if (!confirm("Remove your insurance certificate?")) return;
    setUploading(true);
    setError("");
    const result = await deleteHoaDoc("insurance_cert");
    if (result.error) {
      setError(result.error);
    } else {
      setCurrent(null);
      setExpiresAt("");
    }
    setUploading(false);
  }

  const expDays = current?.expiresAt ? daysUntil(current.expiresAt) : null;
  const expiringSoon = expDays !== null && expDays <= 30 && expDays >= 0;
  const expired = expDays !== null && expDays < 0;

  return (
    <div className="space-y-3">
      {current ? (
        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-gray-900 truncate">{current.filename}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatSize(current.fileSizeBytes)} · Uploaded {formatDate(current.uploadedAt)}
              {current.expiresAt && (
                <>
                  {" · "}
                  <span className={expired ? "text-red-600 font-medium" : expiringSoon ? "text-amber-600 font-medium" : ""}>
                    {expired ? "Expired " : "Expires "}
                    {formatDate(current.expiresAt)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-fence-700 border border-fence-300 hover:bg-fence-50 px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 hover:border-fence-400 hover:bg-fence-50 rounded-lg p-6 text-center transition-colors disabled:opacity-50"
        >
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            {uploading ? "Uploading…" : "Upload insurance certificate (PDF)"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Max {MAX_SIZE_MB}MB</p>
        </button>
      )}

      {!current && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Expiration date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={uploading}
            className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none disabled:opacity-50"
          />
          <p className="text-xs text-gray-400 mt-1">We&rsquo;ll warn you 30 days before it expires.</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      {expired && current && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          This certificate has expired. Replace it before generating new HOA packets.
        </p>
      )}
      {expiringSoon && !expired && current && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Heads up — this certificate expires in {expDays} day{expDays === 1 ? "" : "s"}. Request a renewal from your insurer.
        </p>
      )}
    </div>
  );
}
