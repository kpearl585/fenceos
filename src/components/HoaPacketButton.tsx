"use client";
import { useState } from "react";
import { generateHoaPacket } from "@/lib/hoa/packetActions";
import { captureEvent } from "@/lib/analytics/posthog-client";

interface HoaPacketButtonProps {
  estimateId: string;
  estimateName: string;
}

// Decode base64 to Blob without blowing up on large PDFs (atob +
// Uint8Array). Browsers decode 5-10MB reliably this way.
function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function HoaPacketButton({ estimateId, estimateName }: HoaPacketButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [hoaName, setHoaName] = useState("");

  async function handleGenerate() {
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    if (!customerAddress.trim()) { setError("Customer address is required."); return; }

    setBusy(true);
    setError("");
    try {
      const result = await generateHoaPacket({
        estimateId,
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity.trim() || undefined,
        customerState: customerState.trim() || undefined,
        customerZip: customerZip.trim() || undefined,
        hoaName: hoaName.trim() || undefined,
      });

      if (!result.success || !result.pdf) {
        setError(result.error ?? "Failed to generate packet.");
        setBusy(false);
        return;
      }

      const blob = base64ToBlob(result.pdf, "application/pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename ?? "hoa-packet.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Fire funnel event. No PII — no customer name/address. Only
      // dimensions that help us see which contractors are using the
      // feature and whether HOA-name is being filled in (signal of
      // mature vs ad-hoc usage).
      captureEvent("hoa_packet_generated", {
        estimate_id: estimateId,
        has_hoa_name: !!hoaName.trim(),
      });

      setOpen(false);
    } catch (err) {
      console.error("HOA packet download error:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(""); }}
        className="w-full bg-fence-50 border border-fence-200 text-fence-800 hover:bg-fence-100 hover:border-fence-300 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generate HOA Packet
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-fence-900">HOA Packet</h3>
                <p className="text-xs text-gray-500 mt-0.5">For &ldquo;{estimateName}&rdquo;</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500">
                Packet includes your insurance certificate plus a cover page with these details.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer name <span className="text-red-500">*</span>
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={busy}
                  placeholder="Jane & John Homeowner"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Property address <span className="text-red-500">*</span>
                </label>
                <input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={busy}
                  placeholder="123 Oak Street"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    disabled={busy}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <input
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    disabled={busy}
                    maxLength={2}
                    placeholder="FL"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  value={customerZip}
                  onChange={(e) => setCustomerZip(e.target.value)}
                  disabled={busy}
                  maxLength={10}
                  className="w-full max-w-[140px] border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  HOA name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={hoaName}
                  onChange={(e) => setHoaName(e.target.value)}
                  disabled={busy}
                  placeholder="Roan Hills Homeowners Association"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-fence-500 focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy}
                className="bg-fence-700 hover:bg-fence-800 text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Generating…" : "Download packet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
