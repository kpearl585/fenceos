import { signup } from "../login/actions";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create Account | FenceEstimatePro" };

export default async function SignupPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error, message } = await props.searchParams;

  return (
    <div className="min-h-screen flex bg-fence-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-fence-800 to-fence-950">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">FenceEstimatePro</span>
          </Link>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold mb-4">Stop guessing.<br/>Start knowing.</h2>
          <p className="text-white/60 text-lg mb-8">The first estimating platform built specifically for fence contractors. Know your exact margin before you hand over the quote.</p>
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

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg">FenceEstimatePro</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Start your free trial</h1>
          <p className="text-white/50 text-sm mb-8">14 days free. No credit card required.</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">{message}</div>
          )}

          <form action={signup} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@company.com"
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-fence-500 focus:ring-1 focus:ring-fence-500 transition"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-fence-500 focus:ring-1 focus:ring-fence-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-fence-600 hover:bg-fence-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2"
            >
              Create Free Account
            </button>
          </form>

          <p className="text-white/40 text-xs text-center mt-6">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-white/60 hover:text-white">Terms</Link> and{" "}
            <Link href="/privacy" className="text-white/60 hover:text-white">Privacy Policy</Link>.
          </p>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-fence-400 hover:text-fence-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
