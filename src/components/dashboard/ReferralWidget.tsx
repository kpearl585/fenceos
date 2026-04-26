"use client";
import { useState, useEffect } from "react";

export default function ReferralWidget() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => {
        if (d.referralLink) setReferralLink(d.referralLink);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return null;

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl"></div>
        <div className="flex-1">
          <h3 className="font-semibold text-text text-sm">Refer a Contractor</h3>
          <p className="text-xs text-muted mt-0.5">
            Give a contractor 1 month free. You get 1 month free when they subscribe.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <input
              readOnly
              value={referralLink}
              className="flex-1 text-xs bg-surface-3 border border-border rounded-lg px-3 py-2 text-text font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 bg-accent hover:bg-accent-light text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
