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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎁</div>
        <div className="flex-1">
          <h3 className="font-semibold text-fence-900 text-sm">Refer a Contractor</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Give a contractor 1 month free. You get 1 month free when they subscribe.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <input
              readOnly
              value={referralLink}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 bg-fence-600 hover:bg-fence-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
