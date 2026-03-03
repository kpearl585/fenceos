"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Supabase puts the token in the URL hash as #access_token=...&type=recovery
    // The client SDK picks it up automatically on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setStatus("loading");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setStatus("error"); return; }
    setStatus("done");
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  return (
    <div className="min-h-screen bg-fence-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="text-white font-bold">FenceEstimatePro</span>
        </div>

        {status === "done" ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>
            <h1 className="text-white font-bold text-xl mb-2">Password updated!</h1>
            <p className="text-white/40 text-sm">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-2">Set new password</h1>
            <p className="text-white/40 text-sm text-center mb-8">Enter a new password for your account.</p>

            {!ready && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300 text-xs text-center">
                Verifying reset link...
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-fence-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading" || !ready}
                className="w-full py-3 bg-fence-600 hover:bg-fence-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {status === "loading" ? "Updating..." : "Update Password →"}
              </button>
            </form>

            <p className="text-center text-xs text-white/20 mt-6">
              <Link href="/login" className="hover:text-white/40">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
