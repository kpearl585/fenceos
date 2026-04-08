import { login } from "./actions";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In | FenceEstimatePro" };

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await props.searchParams;

  return (
    <div className="min-h-screen flex bg-fence-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-fence-800 to-fence-950">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">FenceEstimatePro</span>
          </Link>
        </div>
        <div>
          <blockquote className="text-white/80 text-xl font-medium leading-relaxed mb-6">
            "Know your profit before you hand over the quote."
          </blockquote>
          <div className="flex gap-6">
            {[["$1,200+", "avg. job profit protected"], ["35%", "avg. margin maintained"], ["5 min", "to build a quote"]].map(([val, label]) => (
              <div key={label}>
                <div className="text-fence-300 font-bold text-xl">{val}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/30 text-xs">© 2026 FenceEstimatePro. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-bold text-lg">FenceEstimatePro</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm mb-8">Sign in to your FenceEstimatePro account</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">{message}</div>
          )}

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                placeholder="you@company.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-white/70">Password</label>
                <Link href="/forgot-password" className="text-xs text-fence-400 hover:text-fence-300">Forgot password?</Link>
              </div>
              <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                placeholder="••••••••" />
            </div>
            <button formAction={login}
              className="w-full py-3 px-4 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg transition-colors text-sm mt-2">
              Sign In →
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            Don't have an account?{" "}
            <Link href="/signup" className="text-fence-400 hover:text-fence-300 font-medium">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
