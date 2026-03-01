"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("[dashboard] Error:", error.message); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center p-8">
      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-gray-900 font-bold text-lg mb-2">Something went wrong</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">An unexpected error occurred. Your data is safe.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 bg-fence-600 text-white text-sm font-semibold rounded-lg hover:bg-fence-700">
          Try Again
        </button>
        <Link href="/dashboard" className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
