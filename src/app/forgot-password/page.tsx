import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Reset Password | FenceEstimatePro" };

async function resetPassword(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fenceestimatepro.com"}/auth/reset`,
  });
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect("/forgot-password?message=Check your email for a reset link");
}

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await props.searchParams;
  return (
    <div className="relative min-h-screen bg-background text-text flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="font-display font-bold">FenceEstimate<span className="text-accent-light">Pro</span></span>
        </Link>

        <h1 className="font-display text-3xl font-bold text-text mb-2">Reset your password</h1>
        <p className="text-muted text-sm mb-8">Enter your email and we&rsquo;ll send a reset link.</p>

        {error && <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-5 p-3.5 bg-accent/10 border border-accent/30 text-accent-light rounded-lg text-sm">{message}</div>}

        <form action={resetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Email</label>
            <input name="email" type="email" required autoComplete="email"
              className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm transition-colors duration-150"
              placeholder="you@company.com" />
          </div>
          <button type="submit" className="w-full py-3 bg-accent hover:bg-accent-light accent-glow text-white font-semibold rounded-lg transition-colors duration-150 text-sm">
            Send Reset Link
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Remember it?{" "}
          <Link href="/login" className="text-accent-light hover:text-accent font-medium transition-colors duration-150">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
