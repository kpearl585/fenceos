"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const supabase = useMemo(
    () => {
      const url = getSupabaseUrl();
      const key = getSupabasePublicKey();
      if (!url || !key) {
        throw new Error(
          "Missing Supabase public env vars. Expected NEXT_PUBLIC_SUPABASE_URL and a publishable/anon key."
        );
      }
      return createBrowserClient(url, key);
    },
    []
  );

  useEffect(() => {
    // Supabase puts the token in the URL hash as #access_token=...&type=recovery
    // The client SDK picks it up automatically on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

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
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="text-text font-bold">FenceEstimatePro</span>
        </div>

        {status === "done" ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-7 h-7 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>
            <h1 className="text-text font-bold text-xl mb-2">Password updated!</h1>
            <p className="text-muted text-sm">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text text-center mb-2">Set new password</h1>
            <p className="text-muted text-sm text-center mb-8">Enter a new password for your account.</p>

            {!ready && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs text-center">
                Verifying reset link...
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 bg-surface-3 border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading" || !ready}
                className="w-full py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {status === "loading" ? "Updating..." : "Update Password →"}
              </button>
            </form>

            <p className="text-center text-xs text-muted/70 mt-6">
              <Link href="/login" className="hover:text-text">Back to sign in</Link>
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
