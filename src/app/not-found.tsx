import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-screen bg-fence-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-fence-500 font-bold text-8xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/40 mb-8">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="bg-fence-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-fence-500 transition-colors">Go to Dashboard</Link>
          <Link href="/" className="border border-white/10 text-white/60 px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-white/20 transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
