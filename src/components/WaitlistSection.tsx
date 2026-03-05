"use client";
import { useState } from "react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list. We will reach out when access opens.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  return (
    <section id="waitlist" className="bg-[#080808] py-20 px-6">
      <div className="max-w-xl mx-auto text-center">
        <p className="text-[#16A34A] text-sm font-semibold uppercase tracking-widest mb-3">Early Access</p>
        <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display mb-4">
          Join the Waitlist
        </h2>
        <p className="text-[#6B7280] text-lg mb-8">
          FenceEstimatePro is currently in private beta. Enter your email and we will reach out when your spot opens.
        </p>

        {status === "success" ? (
          <div className="bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.3)] rounded-xl px-6 py-5">
            <p className="text-[#F2F2F2] font-semibold">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={status === "loading"}
              className="flex-1 px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.07)] text-[#F2F2F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#16A34A] hover:bg-[#22C55E] disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {status === "loading" ? "Submitting..." : "Request Access"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-[#EF4444] text-sm">{message}</p>
        )}

        <p className="mt-5 text-sm text-[#6B7280]">No spam. No credit card. Just early access.</p>
      </div>
    </section>
  );
}
