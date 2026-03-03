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
    <section id="waitlist" className="bg-fence-950 py-20 px-6">
      <div className="max-w-xl mx-auto text-center">
        <p className="text-fence-400 text-sm font-semibold uppercase tracking-widest mb-3">Early Access</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Join the Waitlist
        </h2>
        <p className="text-fence-300 text-lg mb-8">
          FenceEstimatePro is currently in private beta. Enter your email and we will reach out when your spot opens.
        </p>

        {status === "success" ? (
          <div className="bg-fence-800 border border-fence-600 rounded-xl px-6 py-5">
            <p className="text-white font-semibold">{message}</p>
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
              className="flex-1 px-4 py-3 rounded-xl bg-fence-900 border border-fence-700 text-white placeholder-fence-500 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-fence-500 hover:bg-fence-400 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              {status === "loading" ? "Submitting..." : "Request Access"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-red-400 text-sm">{message}</p>
        )}

        <p className="mt-5 text-sm text-fence-500">No spam. No credit card. Just early access.</p>
      </div>
    </section>
  );
}
