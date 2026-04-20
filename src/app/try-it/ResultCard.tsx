"use client";

import { useState } from "react";

export interface PhotoEstimateResult {
  claim_token: string;
  extraction: {
    runs: Array<{
      linearFeet: number;
      fenceType: string;
      productLineId: string;
      heightFt: number;
      gates: Array<{ widthFt: number; type: string }>;
      soilType: string;
      runLabel: string;
    }>;
    confidence: number;
    flags: string[];
    rawSummary: string;
  };
  estimate: {
    totalLinearFeet: number;
    totalCost: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    bomSummary: string;
    fenceTypeLabel: string;
    gateCount: number;
  };
  displayMarkdown: string;
}

interface Props {
  data: PhotoEstimateResult;
  onTryAnother: () => void;
}

function confidenceLabel(confidence: number): {
  label: string;
  classes: string;
} {
  if (confidence >= 0.9) {
    return {
      label: "High confidence",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (confidence >= 0.7) {
    return {
      label: "Moderate confidence",
      classes: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }
  return {
    label: "Rough estimate — please verify",
    classes: "bg-orange-50 text-orange-800 border-orange-200",
  };
}

export default function ResultCard({ data, onTryAnother }: Props) {
  const { estimate, extraction } = data;
  const conf = confidenceLabel(extraction.confidence);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "invalid" | "submitting" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailStatus("invalid");
      return;
    }
    setEmailStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/public/photo-estimate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_token: data.claim_token, email: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailStatus("error");
        setErrorMessage(
          typeof json?.error === "string"
            ? json.error
            : "Something went wrong. Please try again."
        );
        return;
      }
      setEmailStatus("sent");
    } catch {
      setEmailStatus("error");
      setErrorMessage(
        "We couldn't reach the server. Check your connection and try again."
      );
    }
  }

  return (
    <div className="p-6 sm:p-10 text-gray-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-fence-700">
            Your fence estimate
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            {estimate.fenceTypeLabel}
          </h2>
        </div>
        <span
          className={`self-start rounded-full border px-3 py-1 text-xs font-medium ${conf.classes}`}
        >
          {conf.label}
        </span>
      </div>

      {/* Stats grid */}
      <dl className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
          <dt className="text-xs font-medium text-fence-700">Total length</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">
            {estimate.totalLinearFeet}
            <span className="ml-1 text-sm font-medium text-gray-500">ft</span>
          </dd>
        </div>
        <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
          <dt className="text-xs font-medium text-fence-700">Runs</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">
            {extraction.runs.length}
          </dd>
        </div>
        <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
          <dt className="text-xs font-medium text-fence-700">Gates</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">
            {estimate.gateCount}
          </dd>
        </div>
      </dl>

      {/* Price range */}
      <div className="mt-6 rounded-xl bg-gray-900 px-6 py-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-fence-200">
          Estimated price range
        </p>
        <p className="mt-1 text-3xl sm:text-4xl font-bold">
          ${estimate.priceRangeLow.toLocaleString()}
          <span className="mx-3 text-fence-300">–</span>
          ${estimate.priceRangeHigh.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-fence-200">
          Ballpark only. A precise quote comes from a site visit with your
          local contractor.
        </p>
      </div>

      {/* Persistent AI disclaimer — separate from the confidence chip so
          users with a high-confidence result don't miss the "not a bid"
          framing. This is the one piece of copy that has to survive any
          rush to ship. */}
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">This is an AI estimate from a photo, not a contract price.</span>{" "}
          Always walk the site and measure before bidding a real job.
          Measurements and counts are model-generated and may be wrong.
        </p>
      </div>

      {/* Summary */}
      {extraction.rawSummary && (
        <p className="mt-6 italic text-gray-600">“{extraction.rawSummary}”</p>
      )}

      {/* Flags */}
      {extraction.flags.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Heads up</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
            {extraction.flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Email capture — wired fully in Session D */}
      <div className="mt-8 rounded-xl border border-fence-200 bg-fence-50 p-5">
        <p className="text-base font-semibold text-gray-900">
          Save this estimate and get the full proposal
        </p>
        <p className="mt-1 text-sm text-gray-600">
          We&rsquo;ll email you a link to claim this estimate and start your
          free trial. No spam, no credit card.
        </p>
        <form
          onSubmit={handleEmailSubmit}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailStatus !== "idle" && emailStatus !== "sent") {
                setEmailStatus("idle");
                setErrorMessage(null);
              }
            }}
            disabled={emailStatus === "submitting" || emailStatus === "sent"}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-fence-500 focus:ring-1 focus:ring-fence-500 focus:outline-none disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={emailStatus === "submitting" || emailStatus === "sent"}
            className="inline-flex items-center justify-center rounded-lg bg-fence-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fence-700 disabled:opacity-50"
          >
            {emailStatus === "submitting"
              ? "Sending…"
              : emailStatus === "sent"
              ? "Check your inbox"
              : "Save estimate"}
          </button>
        </form>
        {emailStatus === "invalid" && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            Please enter a valid email address.
          </p>
        )}
        {emailStatus === "error" && errorMessage && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {errorMessage}
          </p>
        )}
        {emailStatus === "sent" && (
          <p className="mt-2 text-xs text-fence-700">
            We just emailed you a link to claim this estimate. Check your
            inbox (and spam folder, just in case).
          </p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <button
          type="button"
          onClick={onTryAnother}
          className="text-sm font-medium text-fence-700 hover:text-fence-800 underline-offset-4 hover:underline"
        >
          ← Try another photo
        </button>
        <p className="text-xs text-gray-500">
          Powered by FenceEstimatePro AI
        </p>
      </div>
    </div>
  );
}
