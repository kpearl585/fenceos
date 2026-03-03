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
        className="inline-flex items-center gap-2 bg-fence-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors"
      >
        Mark as Paid
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Mark Job as Paid
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              This will generate a PDF invoice and send it to the customer.
              The job will be moved to Completed.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Job</span>
                <span className="font-medium text-gray-900 text-right max-w-[60%]">
                  {jobTitle}
                </span>
              </div>
              {customerEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice sent to</span>
                  <span className="text-gray-700">{customerEmail}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total Due</span>
                <span className="font-bold text-fence-600 text-lg">
                  {fmt(totalDue)}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-fence-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-fence-700 transition-colors disabled:opacity-60"
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
