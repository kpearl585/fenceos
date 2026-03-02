"use client";
import { useState } from "react";
import { sendEstimateEmail } from "@/app/dashboard/estimates/shareActions";

interface ShareEstimatePanelProps {
  estimateId: string;
  acceptToken: string;
  customerEmail?: string | null;
}

export function ShareEstimatePanel({
  estimateId,
  acceptToken,
  customerEmail,
}: ShareEstimatePanelProps) {
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailInput, setEmailInput] = useState(customerEmail || "");

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/accept/${estimateId}/${acceptToken}`
      : `https://fenceestimatepro.com/accept/${estimateId}/${acceptToken}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput) return;
    setEmailStatus("sending");
    const fd = new FormData();
    fd.append("estimateId", estimateId);
    fd.append("to", emailInput);
    const result = await sendEstimateEmail(fd);
    setEmailStatus(result.success ? "sent" : "error");
    setTimeout(() => setEmailStatus("idle"), 4000);
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-green-900">Share with Customer</h3>
          <p className="text-xs text-green-700">Customer views, signs &amp; accepts online — you get notified instantly</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-600 truncate focus:outline-none"
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={copyLink}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            copied ? "bg-green-600 text-white" : "bg-white border border-green-300 text-green-700 hover:bg-green-50"
          }`}
        >
          {copied ? " Copied!" : "Copy Link"}
        </button>
      </div>

      <form onSubmit={handleEmail} className="flex gap-2">
        <input
          type="email"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="customer@email.com"
          className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          disabled={emailStatus === "sending" || emailStatus === "sent"}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            emailStatus === "sent" ? "bg-green-600 text-white"
            : emailStatus === "error" ? "bg-red-100 text-red-700"
            : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {emailStatus === "sending" ? "Sending..." : emailStatus === "sent" ? " Sent!" : emailStatus === "error" ? "Error" : "Email Customer"}
        </button>
      </form>
      {emailStatus === "error" && (
        <p className="text-xs text-red-600 mt-1.5">Failed — RESEND_API_KEY not configured yet.</p>
      )}
      <p className="text-xs text-green-600 mt-3">
         Customer clicks the link, reads the estimate, draws their signature, and hits Accept. You get an email the moment they sign.
      </p>
    </div>
  );
}
