import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-fence-950 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-fence-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-black text-2xl">F</span>
        </div>
        <div className="text-fence-500 font-bold text-8xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/40 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-fence-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-fence-500 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="border border-white/10 text-white/60 px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-white/20 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/#waitlist"
            className="border border-fence-500/30 text-fence-400 px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-fence-500/50 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
        <p className="text-white/20 text-xs mt-12">
          FenceEstimatePro &middot; Fence estimation software for contractors
        </p>
      </div>
    </div>
  );
}
