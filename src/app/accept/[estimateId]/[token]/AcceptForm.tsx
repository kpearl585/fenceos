"use client";

import { useRef, useState } from "react";

export default function AcceptForm({
  estimateId,
  token,
}: {
  estimateId: string;
  token: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    // Light stroke on dark surface — matches the text token color so the
    // signature is legible against the dark signing canvas.
    ctx.strokeStyle = "#F2F2F2";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (!agreed) return setError("You must agree to the terms.");
    if (!hasSigned) return setError("Please provide your signature.");

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmitting(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to capture signature");

      // Submit via FormData to API route
      const fd = new FormData();
      fd.append("estimateId", estimateId);
      fd.append("token", token);
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("signature", blob, "signature.png");

      const res = await fetch("/api/accept", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Acceptance failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-surface-2 border border-accent/20 accent-glow rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-accent/15 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="font-display text-xl font-bold text-text mb-2">
          Estimate Accepted
        </h2>
        <p className="text-muted">
          Thank you. Your signed contract will be available shortly. You will
          receive a confirmation email.
        </p>
      </div>
    );
  }

  const inputClass = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-2 rounded-2xl border border-border p-6"
    >
      <h2 className="font-semibold text-text mb-4">Accept Estimate</h2>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="John Smith"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="john@example.com"
            required
          />
        </div>

        {/* Signature Canvas — dark surface, light stroke for legibility */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Signature *
          </label>
          <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-surface-3 hover:border-accent/60 transition-colors duration-150">
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="mt-1 text-xs text-muted hover:text-text transition-colors duration-150"
          >
            Clear signature
          </button>
        </div>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border accent-accent"
          />
          <span className="text-sm text-muted">
            I have read and agree to the terms and conditions, payment terms, and
            scope of work described in this estimate. I understand that my
            electronic signature is legally binding.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !agreed || !hasSigned || !name || !email}
          className="w-full bg-accent hover:bg-accent-light accent-glow text-white py-3 rounded-lg font-semibold text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent"
        >
          {submitting ? "Processing..." : "Accept & Sign Estimate"}
        </button>
      </div>
    </form>
  );
}
