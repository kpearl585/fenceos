"use client";
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-fence-950 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-fence-500/10 border border-fence-500/20 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-fence-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.288 8.288A5.25 5.25 0 0 0 12 7.5c2.9 0 5.25 2.35 5.25 5.25a5.24 5.24 0 0 1-.818 2.8M2.25 12a9.75 9.75 0 0 1 14.33-8.615m4.92 4.165A9.75 9.75 0 0 1 12 21.75a9.75 9.75 0 0 1-6.818-2.764" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-white mb-2">You&apos;re offline</h1>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-8">
        No connection right now. Any pages you&apos;ve visited recently are still available below.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
