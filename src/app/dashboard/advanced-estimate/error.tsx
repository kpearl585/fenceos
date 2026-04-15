"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Route-level error boundary for the Advanced Estimator.
// Any render or client-side error in this subtree renders this fallback
// instead of a blank page, and gets captured in Sentry with the route tag.
export default function AdvancedEstimateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { route: "dashboard/advanced-estimate" },
      extra: { digest: error.digest },
      level: "error",
    });
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl border border-red-200 p-8">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            Something went wrong with the estimator
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            We&apos;ve logged the error and our team has been notified. You can try again, or come back in a few minutes.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mt-2 font-mono">
              Reference: {error.digest}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-fence-700 hover:bg-fence-600 text-white transition-colors"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
