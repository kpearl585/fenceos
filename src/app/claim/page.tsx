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
    <main className="min-h-screen bg-fence-950 text-white">
      <section className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-2xl bg-white p-8 text-gray-900 shadow-xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-wide text-fence-700">
            Your fence estimate
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {estimate.fenceTypeLabel ?? "Ready to claim"}
          </h1>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
              <dt className="text-xs font-medium text-fence-700">Length</dt>
              <dd className="mt-1 text-xl font-bold">
                {estimate.totalLinearFeet ?? "—"}
                <span className="ml-1 text-xs font-medium text-gray-500">ft</span>
              </dd>
            </div>
            <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
              <dt className="text-xs font-medium text-fence-700">Gates</dt>
              <dd className="mt-1 text-xl font-bold">
                {estimate.gateCount ?? 0}
              </dd>
            </div>
            <div className="rounded-xl bg-fence-50 border border-fence-200 p-4">
              <dt className="text-xs font-medium text-fence-700">Est. range</dt>
              <dd className="mt-1 text-base font-bold leading-tight">
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
            <p className="mt-6 italic text-gray-600">
              &ldquo;{estimate.bomSummary}&rdquo;
            </p>
          )}

          <div className="mt-8 rounded-xl border border-fence-200 bg-fence-50 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Create your free account to save this
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Sign up to edit the runs, refine the estimate, get a full material
              breakdown, and send a contractor-ready proposal.
            </p>
            <a
              href={signupHref}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-fence-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fence-700"
            >
              Start free trial &rarr;
            </a>
            <p className="mt-3 text-xs text-gray-500">
              Already have an account?{" "}
              <a
                href={`/login?claim_token=${encodeURIComponent(token)}`}
                className="font-medium text-fence-700 hover:text-fence-800 underline-offset-4 hover:underline"
              >
                Sign in to claim
              </a>
              .
            </p>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Estimate ID:{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5">
              {token.slice(0, 8)}
            </code>{" "}
            &middot; This estimate expires in 30 days.
          </p>
        </div>
      </section>
    </main>
  );
}
