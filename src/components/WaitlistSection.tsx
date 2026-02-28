'use client'
import { useState } from "react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="waitlist" className="bg-fence-950 py-24 px-6 border-t border-fence-800">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-fence-500/10 border border-fence-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-fence-400 animate-pulse"></span>
          <span className="text-fence-300 text-xs font-semibold tracking-wide uppercase">Coming Soon</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Be First In Line
        </h2>
        <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          FenceEstimatePro is opening to new contractors soon. Drop your email and we&apos;ll reach out when spots open up.
        </p>

        {status === "done" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-2xl">✓</div>
            <p className="text-white font-semibold text-lg">You&apos;re on the list.</p>
            <p className="text-white/40 text-sm">We&apos;ll reach out when spots open. Won&apos;t spam you.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-3.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3.5 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap disabled:opacity-50"
            >
              {status === "loading" ? "Saving..." : "Notify Me →"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-400 text-sm mt-3">Something went wrong — try again or email us directly.</p>
        )}

        <p className="text-white/20 text-xs mt-6">No spam. No credit card. Just a heads-up when we&apos;re ready.</p>
      </div>
    </section>
  );
}
