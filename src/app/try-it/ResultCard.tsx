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
      classes: "bg-accent/15 text-accent-light border-accent/30",
    };
  }
  if (confidence >= 0.7) {
    return {
      label: "Moderate confidence",
      classes: "bg-warning/15 text-warning border-warning/30",
    };
  }
  return {
    label: "Rough estimate — please verify",
    classes: "bg-warning/10 text-warning border-warning/20",
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
    <div className="p-6 sm:p-10 text-text">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
            Your fence estimate
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-text">
            {estimate.fenceTypeLabel}
          </h2>
        </div>
        <span
          className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${conf.classes}`}
        >
          {conf.label}
        </span>
      </div>

      {/* Stats grid */}
      <dl className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-3 border border-border p-4">
          <dt className="text-xs font-medium text-muted uppercase tracking-wider">Total length</dt>
          <dd className="mt-1 text-2xl font-bold font-display text-text">
            {estimate.totalLinearFeet}
            <span className="ml-1 text-sm font-medium text-muted">ft</span>
          </dd>
        </div>
        <div className="rounded-xl bg-surface-3 border border-border p-4">
          <dt className="text-xs font-medium text-muted uppercase tracking-wider">Runs</dt>
          <dd className="mt-1 text-2xl font-bold font-display text-text">
            {extraction.runs.length}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-3 border border-border p-4">
          <dt className="text-xs font-medium text-muted uppercase tracking-wider">Gates</dt>
          <dd className="mt-1 text-2xl font-bold font-display text-text">
            {estimate.gateCount}
          </dd>
        </div>
      </dl>

      {/* Price range — signature moment. Dark background + accent glow so
          it reads as the hero stat, not just another card. */}
      <div className="mt-6 rounded-xl bg-background border border-accent/20 accent-glow px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-light">
          Estimated price range
        </p>
        <p className="mt-2 font-display text-3xl sm:text-4xl font-bold text-text">
          ${estimate.priceRangeLow.toLocaleString()}
          <span className="mx-3 text-muted">–</span>
          ${estimate.priceRangeHigh.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-muted">
          Ballpark only. A precise quote comes from a site visit with your
          local contractor.
        </p>
      </div>

      {/* Persistent AI disclaimer — separate from the confidence chip so
          users with a high-confidence result don't miss the "not a bid"
          framing. This is the one piece of copy that has to survive any
          rush to ship. */}
      <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
        <p className="text-sm text-warning">
          <span className="font-semibold">This is an AI estimate from a photo, not a contract price.</span>{" "}
          Always walk the site and measure before bidding a real job.
          Measurements and counts are model-generated and may be wrong.
        </p>
      </div>

      {/* Summary */}
      {extraction.rawSummary && (
        <p className="mt-6 italic text-muted">&ldquo;{extraction.rawSummary}&rdquo;</p>
      )}

      {/* Flags */}
      {extraction.flags.length > 0 && (
        <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-warning">Heads up</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-warning/90">
            {extraction.flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Email capture */}
      <div className="mt-8 rounded-xl border border-accent/20 bg-accent/5 p-5">
        <p className="text-base font-semibold text-text">
          Save this estimate and get the full proposal
        </p>
        <p className="mt-1 text-sm text-muted">
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
            className="flex-1 rounded-lg border border-border bg-surface-3 text-text px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={emailStatus === "submitting" || emailStatus === "sent"}
            className="inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent-light accent-glow px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-50 disabled:hover:bg-accent"
          >
            {emailStatus === "submitting"
              ? "Sending…"
              : emailStatus === "sent"
              ? "Check your inbox"
              : "Save estimate"}
          </button>
        </form>
        {emailStatus === "invalid" && (
          <p role="alert" className="mt-2 text-xs text-danger">
            Please enter a valid email address.
          </p>
        )}
        {emailStatus === "error" && errorMessage && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errorMessage}
          </p>
        )}
        {emailStatus === "sent" && (
          <p className="mt-2 text-xs text-accent-light">
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
          className="text-sm font-medium text-accent-light hover:text-accent underline-offset-4 hover:underline transition-colors duration-150"
        >
          ← Try another photo
        </button>
        <p className="text-xs text-muted">
          Powered by FenceEstimatePro AI
        </p>
      </div>
    </div>
  );
}
