import { signup } from "../login/actions";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create Account | FenceEstimatePro" };

export default async function SignupPage(props: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    ref?: string;
    claim_token?: string;
    email?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error, message, ref, claim_token, email: prefilledEmail } =
    await props.searchParams;
  const safeClaimToken =
    claim_token && /^[0-9a-f-]{36}$/i.test(claim_token) ? claim_token : "";
  const safeEmail =
    prefilledEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefilledEmail)
      ? prefilledEmail
      : "";

  return (
    <div className="min-h-screen flex bg-background text-text">
      {/* Left brand panel — same visual grammar as login page */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-surface border-r border-border">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">FenceEstimate<span className="text-accent-light">Pro</span></span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="font-display text-text text-4xl font-bold mb-4 leading-tight">
            Stop guessing.<br/>
            <span className="gradient-text">Start knowing.</span>
          </h2>
          <p className="text-muted text-lg mb-10 leading-relaxed">The first estimating platform built specifically for fence contractors. Know your exact margin before you hand over the quote.</p>
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

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg">FenceEstimate<span className="text-accent-light">Pro</span></span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-text mb-2">Start your free trial</h1>
          <p className="text-muted text-sm mb-8">14 days free. No credit card required.</p>

          {error && (
            <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">{error}</div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-accent/10 border border-accent/30 text-accent-light rounded-lg text-sm">{message}</div>
          )}

          {safeClaimToken && (
            <div className="mb-5 p-3.5 bg-accent/10 border border-accent/30 text-accent-light rounded-lg text-sm">
              Creating your account will save your AI photo estimate to your
              dashboard.
            </div>
          )}

          <form action={signup} className="space-y-4">
            {ref && <input type="hidden" name="ref" value={ref} />}
            {safeClaimToken && (
              <input type="hidden" name="claim_token" value={safeClaimToken} />
            )}
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                required
                defaultValue={safeEmail}
                placeholder="you@company.com"
                className="w-full bg-surface-3 border border-border text-text rounded-xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-150"
              />
            </div>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-surface-3 border border-border text-text rounded-xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-150"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent-light accent-glow text-white font-semibold py-3 rounded-xl text-sm transition-colors duration-150 mt-2"
            >
              Create Free Account
            </button>
          </form>

          <p className="text-muted text-xs text-center mt-6">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-text hover:text-accent-light transition-colors duration-150">Terms</Link> and{" "}
            <Link href="/privacy" className="text-text hover:text-accent-light transition-colors duration-150">Privacy Policy</Link>.
          </p>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-light hover:text-accent font-medium transition-colors duration-150">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
