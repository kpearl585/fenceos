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
    <div className="min-h-screen bg-fence-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/login" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-white font-bold">FenceEstimatePro</span>
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
        <p className="text-white/50 text-sm mb-8">Enter your email and we&apos;ll send a reset link.</p>
        {error && <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-5 p-3.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">{message}</div>}
        <form action={resetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
            <input name="email" type="email" required autoComplete="email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
              placeholder="you@company.com" />
          </div>
          <button type="submit" className="w-full py-3 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg transition-colors text-sm">
            Send Reset Link
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/40">
          Remember it?{" "}
          <Link href="/login" className="text-fence-400 hover:text-fence-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
