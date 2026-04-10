"use client";

import { useState } from "react";
import { acceptQuote } from "../actions";

interface Props {
  token: string;
}

export function QuoteAcceptanceForm({ token }: Props) {
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAccept() {
    if (!signature.trim()) {
      setErrorMessage("Please enter your name to sign");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    // Get client IP and user agent
    const ipAddress = await fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => "unknown");

    const userAgent = navigator.userAgent;

    const result = await acceptQuote(token, signature, ipAddress, userAgent);

    if (result.success) {
      setStatus("success");
      // Refresh page after 2 seconds to show success state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Failed to accept quote. Please try again.");
      setTimeout(() => setStatus("idle"), 5000);
    }
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
          Thank you for accepting this quote. The contractor has been notified.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-fence-50 border-b border-fence-200 px-6 py-4">
        <h2 className="text-lg font-bold text-gray-900">Accept This Quote</h2>
        <p className="text-sm text-gray-600 mt-1">
          By signing below, you agree to the terms and scope outlined in this quote.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* E-Signature Field */}
        <div>
          <label htmlFor="signature" className="block text-sm font-semibold text-gray-700 mb-2">
            Electronic Signature
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Type your full name below. This serves as your legal signature.
          </p>
          <input
            id="signature"
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-fence-500"
            disabled={status === "submitting"}
          />
          {signature && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Preview:</p>
              <p className="text-2xl font-signature text-gray-900">{signature}</p>
            </div>
          )}
        </div>

        {/* Error Message */}
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

        {/* Legal Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• This quote is valid for 30 days from the date issued</li>
            <li>• A deposit may be required before work begins</li>
            <li>• Final pricing is subject to site conditions and material availability</li>
            <li>• Installation timeline may vary based on weather and permits</li>
            <li>• You will receive a contract for final approval before work begins</li>
          </ul>
        </div>

        {/* Accept Button */}
        <button
          onClick={handleAccept}
          disabled={!signature.trim() || status === "submitting"}
          className="w-full bg-fence-600 hover:bg-fence-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "submitting" ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Accept Quote & Sign</span>
            </>
          )}
        </button>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          Your signature and IP address are recorded for legal purposes.
          Your information is kept confidential and never shared.
        </p>
      </div>
    </div>
  );
}
