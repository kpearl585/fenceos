"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { acceptQuote } from "../actions";

interface Props {
  token: string;
}

export function QuoteAcceptanceForm({ token }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [printedName, setPrintedName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);

  async function handleAccept() {
    const sig = sigRef.current;
    if (!sig) return;

    if (!printedName.trim() || printedName.trim().length < 2) {
      setErrorMessage("Please enter your full name");
      return;
    }
    if (sig.isEmpty()) {
      setErrorMessage("Please draw your signature in the box below");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    // Serialize the signature canvas to a PNG blob. Using the canvas
    // toBlob path produces a smaller payload than toDataURL, which
    // keeps the server-action FormData under Vercel's request limit.
    const canvas = sig.getCanvas();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      setStatus("error");
      setErrorMessage("Failed to capture signature. Please try again.");
      setTimeout(() => setStatus("idle"), 5000);
      return;
    }

    const ipAddress = await fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => d.ip)
      .catch(() => "unknown");

    const fd = new FormData();
    fd.set("token", token);
    fd.set("name", printedName.trim());
    fd.set("email", customerEmail.trim());
    fd.set("ipAddress", ipAddress);
    fd.set("userAgent", navigator.userAgent);
    fd.set("signature", blob, "signature.png");

    const result = await acceptQuote(fd);

    if (result.success) {
      setStatus("success");
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Failed to accept quote. Please try again.");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  function clearSignature() {
    sigRef.current?.clear();
    setHasDrawn(false);
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">Quote Accepted!</h2>
        <p className="text-green-800">
          Thank you for accepting this quote. The contractor has been notified
          and your signed contract is being prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="bg-surface-2 border-b border-accent/30 px-6 py-4">
        <h2 className="text-lg font-bold text-text">Accept This Quote</h2>
        <p className="text-sm text-muted mt-1">
          Sign below to accept the scope, pricing, and terms outlined above. A
          copy of the signed contract will be emailed to you.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Printed name */}
        <div>
          <label htmlFor="printed-name" className="block text-sm font-semibold text-text mb-2">
            Full Name
          </label>
          <input
            id="printed-name"
            type="text"
            value={printedName}
            onChange={(e) => setPrintedName(e.target.value)}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-border-strong rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-accent"
            disabled={status === "submitting"}
            autoComplete="name"
          />
        </div>

        {/* Email — optional but powers the "signed contract" email */}
        <div>
          <label htmlFor="customer-email" className="block text-sm font-semibold text-text mb-2">
            Email <span className="text-muted font-normal">(optional — receive a copy of the signed contract)</span>
          </label>
          <input
            id="customer-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-border-strong rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-accent"
            disabled={status === "submitting"}
            autoComplete="email"
          />
        </div>

        {/* Drawn signature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-text">
              Signature
            </label>
            <button
              type="button"
              onClick={clearSignature}
              className="text-sm text-muted hover:text-text"
              disabled={status === "submitting"}
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-muted mb-3">
            Draw your signature in the box below using your mouse, trackpad, or finger.
          </p>
          <div className="border-2 border-border-strong rounded-lg bg-surface overflow-hidden touch-none">
            <SignatureCanvas
              ref={sigRef}
              penColor="#1f2937"
              canvasProps={{
                className: "w-full",
                style: { width: "100%", height: 180, display: "block" },
              }}
              onEnd={() => setHasDrawn(true)}
            />
          </div>
          {!hasDrawn && (
            <p className="text-xs text-muted mt-2">Not signed yet</p>
          )}
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-background border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text mb-2">Terms & Conditions</h3>
          <p className="text-xs text-muted">
            By signing, you agree to the legal and payment terms captured in this
            contract at the time it was sent to you. Those terms cannot be changed
            retroactively — the signed contract PDF is the binding record.
          </p>
        </div>

        <button
          onClick={handleAccept}
          disabled={status === "submitting"}
          className="w-full bg-accent hover:bg-accent-dark text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "submitting" ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing…</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Accept Quote &amp; Sign</span>
            </>
          )}
        </button>

        <p className="text-xs text-muted text-center">
          Your signature, IP address, and acceptance hash are recorded as legal
          evidence. Your information is never shared with third parties.
        </p>
      </div>
    </div>
  );
}
