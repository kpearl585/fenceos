"use client";

import { useState, useTransition } from "react";
import { generateJobDoc } from "@/lib/docs/generateJobDoc";
import { DOC_SKUS, type DocSku } from "@/lib/docs/data";

type Status =
  | { kind: "idle" }
  | { kind: "generating"; sku: DocSku }
  | { kind: "ready"; sku: DocSku; url: string }
  | { kind: "error"; sku: DocSku; error: string };

export default function GenerateDocsPanel({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function handleGenerate(sku: DocSku) {
    setStatus({ kind: "generating", sku });
    startTransition(async () => {
      const result = await generateJobDoc({ jobId, sku });
      if (result.success) {
        setStatus({ kind: "ready", sku, url: result.url });
      } else {
        setStatus({ kind: "error", sku, error: result.error });
      }
    });
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-border p-5 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-text">Documents</h3>
          <p className="text-xs text-muted mt-1">
            Generate a pre-filled contract, lien waiver, or change order from this job&apos;s customer + scope.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-accent-light font-bold">
          via ContractorDocuments.com
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DOC_SKUS.map(({ sku, label }) => {
          const busy = pending && status.kind === "generating" && status.sku === sku;
          const ready = status.kind === "ready" && status.sku === sku;
          const err = status.kind === "error" && status.sku === sku;
          return (
            <div
              key={sku}
              className="flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2 bg-surface-3"
            >
              <span className="text-sm text-text font-medium">{label}</span>
              {ready ? (
                <a
                  href={(status as { url: string }).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-accent/15 text-accent-light hover:bg-accent/25 transition-colors duration-150"
                >
                  Open PDF ↗
                </a>
              ) : (
                <button
                  onClick={() => handleGenerate(sku)}
                  disabled={pending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-accent hover:bg-accent-light text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {busy ? "Generating…" : "Generate"}
                </button>
              )}
              {err && (
                <span className="text-[10px] text-danger">
                  {(status as { error: string }).error.slice(0, 40)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
