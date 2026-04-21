import { login } from "./actions";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In | FenceEstimatePro" };

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await props.searchParams;

  return (
    <div className="min-h-screen flex bg-background text-text">
      {/* Left brand panel — mirrors landing hero's visual grammar */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-surface border-r border-border">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">FenceEstimate<span className="text-accent-light">Pro</span></span>
          </Link>
        </div>

        <div className="relative">
          <blockquote className="font-display text-text text-2xl font-semibold leading-relaxed mb-6">
            &ldquo;Know your profit before you hand over the quote.&rdquo;
          </blockquote>
          <div className="flex gap-8">
            {[["$1,200+", "avg. job profit protected"], ["35%", "avg. margin maintained"], ["5 min", "to build a quote"]].map(([val, label]) => (
              <div key={label}>
                <div className="font-display text-text text-xl font-bold">{val}</div>
                <div className="text-muted text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-muted text-xs">© 2026 FenceEstimatePro. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="font-display font-bold text-lg">FenceEstimate<span className="text-accent-light">Pro</span></span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-text mb-2">Welcome back</h1>
          <p className="text-muted text-sm mb-8">Sign in to your FenceEstimatePro account</p>

          {error && (
            <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-accent/10 border border-accent/30 text-accent-light rounded-lg text-sm">{message}</div>
          )}

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-1.5">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm transition-colors duration-150"
                placeholder="you@company.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-text">Password</label>
                <Link href="/forgot-password" className="text-xs text-accent-light hover:text-accent transition-colors duration-150">Forgot password?</Link>
              </div>
              <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password"
                className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm transition-colors duration-150"
                placeholder="••••••••" />
            </div>
            <button formAction={login}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-light accent-glow text-white font-semibold rounded-lg transition-colors duration-150 text-sm mt-2">
              Sign In →
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent-light hover:text-accent font-medium transition-colors duration-150">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
