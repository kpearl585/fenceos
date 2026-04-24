import { createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim your fence estimate | FenceEstimatePro",
  robots: { index: false, follow: false },
};

type EstimateJson = {
  totalLinearFeet?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  fenceTypeLabel?: string;
  gateCount?: number;
  bomSummary?: string;
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("public_photo_estimates")
    .select("claim_token, claimed_at, estimate_json, email")
    .eq("claim_token", token)
    .maybeSingle();

  if (!row) {
    notFound();
  }

  if (row.claimed_at) {
    redirect(`/login?next=/dashboard/advanced-estimate/saved`);
  }

  const estimate = (row.estimate_json ?? {}) as EstimateJson;
  const signupHref = `/signup?claim_token=${encodeURIComponent(
    token
  )}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <main className="relative min-h-screen bg-background overflow-hidden text-text">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl" />

      <section className="relative mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-2xl bg-surface-2 border border-border p-8 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-light">
            Your fence estimate
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-text">
            {estimate.fenceTypeLabel ?? "Ready to claim"}
          </h1>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-accent/10 border border-accent/30 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-accent-light">Length</dt>
              <dd className="mt-1 font-display text-xl font-bold text-text">
                {estimate.totalLinearFeet ?? "—"}
                <span className="ml-1 text-xs font-medium text-muted">ft</span>
              </dd>
            </div>
            <div className="rounded-xl bg-accent/10 border border-accent/30 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-accent-light">Gates</dt>
              <dd className="mt-1 font-display text-xl font-bold text-text">
                {estimate.gateCount ?? 0}
              </dd>
            </div>
            <div className="rounded-xl bg-accent/10 border border-accent/30 p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-accent-light">Est. range</dt>
              <dd className="mt-1 font-display text-base font-bold leading-tight text-text">
                {estimate.priceRangeLow && estimate.priceRangeHigh ? (
                  <>
                    ${estimate.priceRangeLow.toLocaleString()}–$
                    {estimate.priceRangeHigh.toLocaleString()}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          {estimate.bomSummary && (
            <p className="mt-6 italic text-muted">
              &ldquo;{estimate.bomSummary}&rdquo;
            </p>
          )}

          <div className="mt-8 rounded-xl border border-accent/30 bg-accent/10 p-5 accent-glow">
            <h2 className="font-display text-lg font-semibold text-text">
              Create your free account to save this
            </h2>
            <p className="mt-1 text-sm text-muted">
              Sign up to edit the runs, refine the estimate, get a full material
              breakdown, and send a contractor-ready proposal.
            </p>
            <a
              href={signupHref}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-light px-4 py-2 text-sm font-semibold text-background transition-colors duration-150"
            >
              Start free trial &rarr;
            </a>
            <p className="mt-3 text-xs text-muted">
              Already have an account?{" "}
              <a
                href={`/login?claim_token=${encodeURIComponent(token)}`}
                className="font-medium text-accent-light hover:text-accent underline-offset-4 hover:underline"
              >
                Sign in to claim
              </a>
              .
            </p>
          </div>

          <p className="mt-6 text-xs text-muted">
            Estimate ID:{" "}
            <code className="rounded bg-surface-3 border border-border px-1 py-0.5 text-text/80">
              {token.slice(0, 8)}
            </code>{" "}
            &middot; This estimate expires in 30 days.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Need help?{" "}
          <a
            href="mailto:support@fenceestimatepro.com"
            className="underline hover:text-text"
          >
            support@fenceestimatepro.com
          </a>
        </p>
      </section>
    </main>
  );
}
