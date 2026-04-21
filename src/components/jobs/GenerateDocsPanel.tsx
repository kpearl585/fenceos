"use client";

import { useState, useTransition } from "react";
import { generateJobDoc, DOC_SKUS, type DocSku } from "@/lib/docs/generateJobDoc";
import {
  generateHoaPacketInCD,
  type GenerateHoaPacketInCDResult,
} from "@/lib/docs/generateHoaPacketInCD";

type DocStatus =
  | { kind: "idle" }
  | { kind: "generating"; sku: DocSku }
  | { kind: "ready"; sku: DocSku; url: string }
  | { kind: "error"; sku: DocSku; error: string };

type PacketStatus =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; result: GenerateHoaPacketInCDResult }
  | { kind: "error"; error: string; action?: "subscribe"; subscribeUrl?: string };

export default function GenerateDocsPanel({ jobId }: { jobId: string }) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <HoaPacketRow jobId={jobId} />
      <SingleDocsGrid jobId={jobId} />
    </div>
  );
}

function HoaPacketRow({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<PacketStatus>({ kind: "idle" });
  const [hoaName, setHoaName] = useState("");
  const [showHoaField, setShowHoaField] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setStatus({ kind: "generating" });
    startTransition(async () => {
      const result = await generateHoaPacketInCD({
        jobId,
        hoaName: hoaName.trim() || undefined,
      });
      if (result.success) {
        setStatus({ kind: "ready", result });
      } else {
        setStatus({
          kind: "error",
          error: result.error ?? "Failed to generate packet",
          action: result.action,
          subscribeUrl: result.subscribe_url,
        });
      }
    });
  }

  const ready = status.kind === "ready";
  const error = status.kind === "error";
  const busy = pending && status.kind === "generating";

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">
              HOA Submission Packet
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
              · via ContractorDocs
            </span>
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1">
            Generate a full HOA packet for this job
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-[520px]">
            Pulls your customer + fence spec from this job, attaches your saved
            COI + contractor license, builds a merged PDF with cover letter
            and setback statement. Review + send from ContractorDocs.
          </p>
        </div>
        {ready ? (
          <div className="flex flex-col items-end gap-2">
            <a
              href={(status as { result: GenerateHoaPacketInCDResult }).result.dashboard_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
            >
              Open packet ↗
            </a>
            {(status as { result: GenerateHoaPacketInCDResult }).result.download_url && (
              <a
                href={(status as { result: GenerateHoaPacketInCDResult }).result.download_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold tracking-wider uppercase"
              >
                Direct PDF ↓
              </a>
            )}
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={pending}
            className="text-sm font-semibold px-4 py-2 rounded-md bg-amber-500 text-gray-900 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {busy ? "Generating…" : "Generate HOA Packet"}
          </button>
        )}
      </div>

      {/* HOA name input (optional, folds open) */}
      {!ready && !error && (
        <div className="mt-3">
          {showHoaField ? (
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold whitespace-nowrap">
                HOA name
              </label>
              <input
                type="text"
                value={hoaName}
                onChange={e => setHoaName(e.target.value)}
                placeholder="Silverado Ranch HOA"
                className="flex-1 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-amber-400 focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHoaField(true)}
              className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold underline-offset-2 hover:underline"
            >
              + Add HOA name (optional)
            </button>
          )}
        </div>
      )}

      {/* Ready state — show missing credentials warning */}
      {ready && (() => {
        const missing = (status as { result: GenerateHoaPacketInCDResult }).result
          .missing_credentials;
        if (missing?.coi || missing?.license) {
          const parts: string[] = [];
          if (missing.coi) parts.push("COI");
          if (missing.license) parts.push("contractor license");
          return (
            <p className="text-[11px] text-amber-800 mt-3 leading-relaxed">
              <strong>Heads up:</strong> packet is missing your{" "}
              {parts.join(" and ")}. Upload{" "}
              <a
                href="https://contractordocuments.com/account/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                in ContractorDocs
              </a>{" "}
              and Rebuild on the packet detail page to include.
            </p>
          );
        }
        return null;
      })()}

      {/* Error state */}
      {error && (
        <div className="mt-3 text-xs text-red-700 leading-relaxed">
          {(status as { error: string }).error}
          {(status as { subscribeUrl?: string }).subscribeUrl && (
            <>
              {" "}
              <a
                href={(status as { subscribeUrl?: string }).subscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Start a ContractorDocs trial ↗
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SingleDocsGrid({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<DocStatus>({ kind: "idle" });
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Single documents</h3>
          <p className="text-xs text-gray-500 mt-1">
            Contract, change order, warranty, lien waiver — pre-filled from this job&apos;s customer + scope.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-violet-600 font-bold">
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
              className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
            >
              <span className="text-sm text-gray-800 font-medium">{label}</span>
              {ready ? (
                <a
                  href={(status as { url: string }).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-100 text-green-800 hover:bg-green-200"
                >
                  Open PDF ↗
                </a>
              ) : (
                <button
                  onClick={() => handleGenerate(sku)}
                  disabled={pending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "Generating…" : "Generate"}
                </button>
              )}
              {err && (
                <span className="text-[10px] text-red-600">
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
