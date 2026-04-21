"use client";

import { useEffect, useRef, useState } from "react";
import {
  PHOTO_ESTIMATE_ALLOWED_MIMES,
  PHOTO_ESTIMATE_MAX_BYTES,
  isAllowedPhotoMime,
} from "@/lib/validation/photo-estimate-schemas";
import ResultCard, { type PhotoEstimateResult } from "./ResultCard";

type Phase =
  | { kind: "idle" }
  | { kind: "ready"; file: File; preview: string }
  | { kind: "submitting"; file: File; preview: string }
  | { kind: "error"; message: string; preview?: string }
  | { kind: "result"; data: PhotoEstimateResult };

export default function PhotoUploadForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [additionalContext, setAdditionalContext] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount / replacement to avoid leaks.
  useEffect(() => {
    return () => {
      if (phase.kind === "ready" || phase.kind === "submitting") {
        URL.revokeObjectURL(phase.preview);
      }
    };
  }, [phase]);

  function pickFile(file: File) {
    if (!isAllowedPhotoMime(file.type)) {
      setPhase({
        kind: "error",
        message: `Unsupported file type. Please upload ${PHOTO_ESTIMATE_ALLOWED_MIMES.join(
          ", "
        )}.`,
      });
      return;
    }
    if (file.size === 0) {
      setPhase({ kind: "error", message: "This file appears to be empty." });
      return;
    }
    if (file.size > PHOTO_ESTIMATE_MAX_BYTES) {
      setPhase({
        kind: "error",
        message: "That photo is too large. Please keep it under 8 MB.",
      });
      return;
    }
    setPhase({ kind: "ready", file, preview: URL.createObjectURL(file) });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  async function onSubmit() {
    if (phase.kind !== "ready") return;
    const { file, preview } = phase;
    setPhase({ kind: "submitting", file, preview });

    try {
      const form = new FormData();
      form.append("image", file);
      if (additionalContext.trim()) {
        form.append("additionalContext", additionalContext.trim());
      }
      if (locationHint.trim()) {
        form.append("locationHint", locationHint.trim());
      }

      const res = await fetch("/api/public/photo-estimate", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (!res.ok) {
        setPhase({
          kind: "error",
          message:
            typeof json?.error === "string"
              ? json.error
              : "Something went wrong. Please try again.",
          preview,
        });
        return;
      }

      setPhase({ kind: "result", data: json as PhotoEstimateResult });
    } catch {
      setPhase({
        kind: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
        preview,
      });
    }
  }

  function reset() {
    if (phase.kind === "ready" || phase.kind === "submitting") {
      URL.revokeObjectURL(phase.preview);
    }
    setAdditionalContext("");
    setLocationHint("");
    setPhase({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  if (phase.kind === "result") {
    return <ResultCard data={phase.data} onTryAnother={reset} />;
  }

  const preview =
    phase.kind === "ready" || phase.kind === "submitting"
      ? phase.preview
      : phase.kind === "error"
      ? phase.preview
      : undefined;
  const isSubmitting = phase.kind === "submitting";

  return (
    <div className="p-6 sm:p-10 space-y-6 text-text">
      {/* Drop zone — dashed border is the convention for drop targets
          (signals the interaction). Uses tokenized accent for active/hover
          states so it reads as on-brand with the landing page. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload a yard photo"
        className={[
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-colors duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
          isDragging
            ? "border-accent bg-accent/10"
            : preview
            ? "border-border-strong bg-surface-3"
            : "border-border bg-surface-3 hover:border-accent/60 hover:bg-accent/5",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ESTIMATE_ALLOWED_MIMES.join(",")}
          onChange={onFileChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

        {preview ? (
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Uploaded yard preview"
              className="mx-auto max-h-80 rounded-lg object-contain"
            />
            <p className="mt-3 text-center text-sm text-muted">
              Click to replace, or drag another photo in.
            </p>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
              <svg
                className="h-6 w-6 text-accent-light"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5M16.5 12 12 7.5m0 0L7.5 12M12 7.5v12"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-text">
              Drop a yard photo here
            </p>
            <p className="mt-1 text-sm text-muted">
              or click to browse — JPEG, PNG, or WebP up to 8 MB
            </p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {phase.kind === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {phase.message}
        </div>
      )}

      {/* Optional context — shown once a file is selected */}
      {(phase.kind === "ready" || phase.kind === "submitting") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-text">
              Notes (optional)
            </span>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. 6-ft wood privacy, two walk gates"
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-lg border border-border bg-surface-3 text-text px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-text">
              City / state (optional)
            </span>
            <input
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              maxLength={100}
              placeholder="Tampa, FL"
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-lg border border-border bg-surface-3 text-text px-3 py-2 text-sm placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:opacity-50"
            />
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Works best on daylight photos with the fence run clearly visible.
        </p>
        <div className="flex gap-2">
          {phase.kind !== "idle" && (
            <button
              type="button"
              onClick={reset}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-semibold text-muted hover:border-border-strong hover:text-text transition-colors duration-150 disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={phase.kind !== "ready"}
            className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-light accent-glow px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-75"
                  />
                </svg>
                Estimating…
              </>
            ) : (
              <>
                Estimate my fence
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 5l7 7-7 7M5 12h15"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {isSubmitting && (
        <p
          role="status"
          aria-live="polite"
          className="text-center text-sm text-muted"
        >
          Analyzing your yard… this usually takes 15–30 seconds.
        </p>
      )}
    </div>
  );
}
