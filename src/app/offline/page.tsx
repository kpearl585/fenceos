"use client";
export default function OfflinePage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center p-8 text-center">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center mb-6 accent-glow">
          <svg className="w-8 h-8 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.288 8.288A5.25 5.25 0 0 0 12 7.5c2.9 0 5.25 2.35 5.25 5.25a5.24 5.24 0 0 1-.818 2.8M2.25 12a9.75 9.75 0 0 1 14.33-8.615m4.92 4.165A9.75 9.75 0 0 1 12 21.75a9.75 9.75 0 0 1-6.818-2.764" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-text mb-2">You&apos;re offline</h1>
        <p className="text-muted text-sm max-w-xs leading-relaxed mb-8">
          No connection right now. Any pages you&apos;ve visited recently are still available below.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-accent hover:bg-accent-light text-background font-semibold rounded-lg text-sm transition-colors duration-150 accent-glow"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
