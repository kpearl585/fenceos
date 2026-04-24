"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markJobPaidAndSendInvoice } from "@/app/dashboard/jobs/invoiceActions";

interface Props {
  jobId: string;
  jobTitle: string;
  totalDue: number;
  customerEmail?: string;
}

export default function MarkPaidModal({
  jobId,
  jobTitle,
  totalDue,
  customerEmail,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) =>
    `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await markJobPaidAndSendInvoice(jobId);
      if (result?.success) {
        router.refresh();
        setOpen(false);
      } else {
        setError(result?.error ?? "Something went wrong.");
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light accent-glow text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
      >
        Mark as Paid
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-text mb-1">
              Mark Job as Paid
            </h2>
            <p className="text-sm text-muted mb-6">
              This will generate a PDF invoice and send it to the customer.
              The job will be moved to Completed.
            </p>

            {/* Summary */}
            <div className="bg-surface-3 border border-border rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Job</span>
                <span className="font-medium text-text text-right max-w-[60%]">
                  {jobTitle}
                </span>
              </div>
              {customerEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Invoice sent to</span>
                  <span className="text-text">{customerEmail}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-text">Total Due</span>
                <span className="font-bold text-accent-light text-lg">
                  {fmt(totalDue)}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger mb-4 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 border border-border bg-surface-3 text-text py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-2 transition-colors duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent-light accent-glow text-white py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
              >
                {loading ? "Generating Invoice..." : "Confirm & Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
