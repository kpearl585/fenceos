"use client";

import { useState, useRef, useEffect } from "react";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, name: string) => void;
}

export default function EmailCaptureModal({
  isOpen,
  onClose,
  onSuccess,
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && emailRef.current) {
      emailRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      await fetch("/api/leads/confirm", { method: "POST" });
      onSuccess(trimmedEmail, name.trim());
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-fence-900">
              Download Your Estimate
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Enter your email and we'll generate your PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="lead-name"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-lg focus:ring-2 focus:ring-fence-500 focus:border-fence-500 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="lead-email"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              ref={emailRef}
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full border border-gray-300 rounded-lg py-3 px-4 text-lg focus:ring-2 focus:ring-fence-500 focus:border-fence-500 outline-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fence-500 hover:bg-fence-600 disabled:bg-fence-300 text-white font-semibold text-lg py-4 rounded-lg transition-colors"
          >
            {loading ? "Sending..." : "Get My Estimate PDF"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            No spam. We just want to follow up when the full product launches.
          </p>
        </form>
      </div>
    </div>
  );
}
