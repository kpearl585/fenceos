import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-6">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

      <div className="relative text-center max-w-md">
        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 accent-glow">
          <span className="text-background font-black text-2xl">F</span>
        </div>
        <div className="text-accent font-display font-bold text-8xl mb-4">404</div>
        <h1 className="font-display text-2xl font-bold text-text mb-2">Page not found</h1>
        <p className="text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-accent hover:bg-accent-light text-background px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors duration-150 accent-glow"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="border border-border text-muted px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-border-strong hover:text-text transition-colors duration-150"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/signup"
            className="border border-accent/30 text-accent-light px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-accent/50 transition-colors duration-150"
          >
            Start Free Trial
          </Link>
        </div>
        <p className="text-muted/60 text-xs mt-12">
          FenceEstimatePro &middot; Fence estimation software for contractors
        </p>
      </div>
    </div>
  );
}
