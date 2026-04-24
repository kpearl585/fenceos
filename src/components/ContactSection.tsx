"use client";
import { useState } from "react";

// Post-launch rebrand of the old WaitlistSection. Same /api/waitlist
// backend (accepts legacy { email } plus the new { email, message }
// shape), rebranded to a general contact form. Anchor id is now
// `contact`, not `waitlist`.
export default function ContactSection() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setFeedback("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          // Omit empty message — keeps backend's "signup" email template
          // when the contractor just leaves their address.
          ...(msg.trim() ? { message: msg.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setFeedback("Got it — we'll get back to you within one business day.");
        setEmail("");
        setMsg("");
      } else {
        setStatus("error");
        setFeedback(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Try again.");
    }
  }

  return (
    <section id="contact" className="bg-[#080808] py-20 px-6">
      <div className="max-w-xl mx-auto text-center">
        <p className="text-[#16A34A] text-sm font-semibold uppercase tracking-widest mb-3">Questions?</p>
        <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display mb-4">
          Contact us
        </h2>
        <p className="text-[#6B7280] text-lg mb-8">
          Want a demo, have a question about pricing, or need help getting started?
          Drop us a line and a real person will get back to you within one business day.
        </p>

        {status === "success" ? (
          <div className="bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.3)] rounded-xl px-6 py-5">
            <p className="text-[#F2F2F2] font-semibold">{feedback}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md mx-auto text-left">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={status === "loading"}
                className="px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.07)] text-[#F2F2F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Message (optional)</span>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Tell us what you're trying to solve, or ask a question..."
                rows={4}
                maxLength={2000}
                disabled={status === "loading"}
                className="px-4 py-3 rounded-xl bg-[#161616] border border-[rgba(255,255,255,0.07)] text-[#F2F2F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm resize-y"
              />
            </label>
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-[#16A34A] hover:bg-[#22C55E] disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {status === "loading" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-[#EF4444] text-sm">{feedback}</p>
        )}

        <p className="mt-5 text-sm text-[#6B7280]">
          Prefer the app? <a href="/signup" className="text-[#16A34A] hover:text-[#22C55E] underline underline-offset-2">Start your 14-day free trial</a> — no credit card required.
        </p>
      </div>
    </section>
  );
}
