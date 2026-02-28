import { signup } from "../login/actions";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Start Free Trial | FenceEstimatePro" };

export default async function SignupPage(props: {
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
          <h2 className="text-white font-bold text-2xl mb-4">Join 200+ fence contractors who stopped guessing.</h2>
          <ul className="space-y-3">
            {["Build professional quotes in 5 minutes", "Know your margin before you hand it over", "Track every job from estimate to completion", "No contract. Cancel any time."].map(f => (
              <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                <span className="w-5 h-5 rounded-full bg-fence-500/20 text-fence-400 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-white/30 text-xs">© 2026 FenceEstimatePro. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span className="text-white font-bold text-lg">FenceEstimatePro</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-fence-500/10 border border-fence-500/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-fence-400 animate-pulse"></span>
            <span className="text-fence-300 text-xs font-medium">Free 14-day trial · No credit card required</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-white/50 text-sm mb-8">Start your free trial in under 2 minutes</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">{message}</div>
          )}

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">Work Email</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                placeholder="you@yourcompany.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 focus:border-transparent text-sm"
                placeholder="Min. 6 characters" />
            </div>
            <button formAction={signup}
              className="w-full py-3 px-4 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg transition-colors text-sm mt-2">
              Start Free Trial →
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-white/30">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-white/50 hover:text-white/70">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-white/50 hover:text-white/70">Privacy Policy</Link>
          </p>

          <p className="mt-6 text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-fence-400 hover:text-fence-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
