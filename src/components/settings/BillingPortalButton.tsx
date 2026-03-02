"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BillingPortalButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        router.push(data.redirect);
      } else {
        // No billing account yet — go to upgrade page
        router.push("/dashboard/upgrade");
      }
    } catch {
      router.push("/dashboard/upgrade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-fence-600 hover:bg-fence-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "Loading..." : "Manage Billing"}
    </button>
  );
}
