"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveEstimatorSetupField, type WizardField } from "./actions";

const REGION_OPTIONS = [
  { value: "base",          label: "National Average (use if you work nationally)" },
  { value: "northeast",     label: "Northeast — ME, NH, VT, MA, CT, RI, NY, NJ, PA" },
  { value: "southeast",     label: "Southeast — DE, MD, VA, WV, NC, SC, GA, AL, MS, TN, KY" },
  { value: "florida",       label: "Florida — sandy-soil defaults apply" },
  { value: "midwest",       label: "Midwest — OH, IN, IL, MI, WI, MN, IA, MO" },
  { value: "south_central", label: "South Central — LA, AR, OK, TX" },
  { value: "southwest",     label: "Southwest — NM, AZ, NV" },
  { value: "west",          label: "West Coast — CA, OR, WA" },
  { value: "northwest",     label: "Northwest — ID, MT, WY" },
  { value: "mountain",      label: "Mountain — CO, UT, NE, KS, SD, ND" },
];

type Step = 0 | 1 | 2 | 3 | 4;

interface Props {
  initial: {
    region: string;
    hoursPerDay: number;
    wastePct: number;
  };
}

export default function EstimatorSetupWizard({ initial }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [region, setRegion] = useState(initial.region);
  const [hoursPerDay, setHoursPerDay] = useState<number>(initial.hoursPerDay);
  const [wastePct, setWastePct] = useState<number>(initial.wastePct);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  async function save(field: WizardField, value: string | number): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await saveEstimatorSetupField({ field, value });
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Something went wrong.");
      return false;
    }
    return true;
  }

  async function next() {
    if (step === 1) {
      const ok = await save("region", region);
      if (!ok) return;
    } else if (step === 2) {
      const ok = await save("hoursPerDay", hoursPerDay);
      if (!ok) return;
    } else if (step === 3) {
      const ok = await save("wastePct", wastePct);
      if (!ok) return;
    }
    setStep((s) => (Math.min(4, s + 1) as Step));
  }

  function skip() {
    setError(null);
    setStep((s) => (Math.min(4, s + 1) as Step));
  }

  function back() {
    setError(null);
    setStep((s) => (Math.max(0, s - 1) as Step));
  }

  return (
    <div className="min-h-screen bg-fence-950 flex flex-col">
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-fence-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm">FenceEstimatePro</span>
        </div>
        <Link
          href="/dashboard"
          className="text-white/40 text-xs hover:text-white/70"
        >
          Skip &amp; go to dashboard
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Progress bar (hidden on intro + done) */}
          {step > 0 && step < 4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Step {step} of {totalSteps - 1}</span>
                <span>{Math.round((step / (totalSteps - 1)) * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-fence-500 transition-all duration-300"
                  style={{ width: `${(step / (totalSteps - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div>
              <div className="w-12 h-12 bg-fence-500/10 border border-fence-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-fence-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49 2.83-2.83" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                Tune the estimator to your business
              </h1>
              <p className="text-white/60 text-base leading-relaxed mb-8">
                Three quick questions so your first estimate lands close to the mark. Takes about 90&nbsp;seconds. You can change any of this later in Settings.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 bg-fence-600 hover:bg-fence-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Let&rsquo;s go
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                  </svg>
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 font-medium px-4 py-3"
                >
                  Not now
                </Link>
              </div>
            </div>
          )}

          {/* ── Step 1: Region ── */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Where do you mostly work?
              </h1>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                We&rsquo;ll adjust your default labor rates and material prices based on the region. Pick the one that best matches your primary service area.
              </p>
              <label className="block text-xs font-medium uppercase tracking-wide text-white/40 mb-1.5">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-fence-500 focus:ring-1 focus:ring-fence-500"
                disabled={busy}
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-fence-950 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Step 2: Crew hours ── */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                How many hours does your crew put in per day?
              </h1>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Productive install time &mdash; not counting travel or lunch. Most residential crews run <span className="text-white">6&ndash;8 hours</span>. This tells the engine how to convert labor hours into calendar days.
              </p>
              <label className="block text-xs font-medium uppercase tracking-wide text-white/40 mb-1.5">
                Hours per work day
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={4}
                  max={14}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-36 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-fence-500 focus:ring-1 focus:ring-fence-500"
                  disabled={busy}
                />
                <span className="text-white/40 text-sm">hours</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Waste ── */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                How much extra material do you order?
              </h1>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Beyond what the plan calls for &mdash; cut scrap, broken pickets, spare posts. <span className="text-white">5% is the industry default</span> for a seasoned crew. The engine learns from your closed jobs and adjusts this over time.
              </p>
              <label className="block text-xs font-medium uppercase tracking-wide text-white/40 mb-1.5">
                Default waste allowance
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={25}
                  step={0.5}
                  value={wastePct}
                  onChange={(e) => setWastePct(Number(e.target.value))}
                  className="w-36 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-fence-500 focus:ring-1 focus:ring-fence-500"
                  disabled={busy}
                />
                <span className="text-white/40 text-sm">percent</span>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-6">
                <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">You&rsquo;re all set.</h1>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md mx-auto">
                The estimator is tuned to your business. Every setting we just walked through (and more) is available anytime under <span className="font-semibold text-white">Settings &rarr; Estimator</span>.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/advanced-estimate")}
                  className="inline-flex items-center gap-2 bg-fence-600 hover:bg-fence-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Make your first estimate
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                  </svg>
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 font-medium px-4 py-3"
                >
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Error + nav */}
          {error && step > 0 && step < 4 && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}

          {step > 0 && step < 4 && (
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={back}
                disabled={busy}
                className="text-white/40 hover:text-white/70 text-sm font-medium disabled:opacity-50"
              >
                &larr; Back
              </button>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={skip}
                  disabled={busy}
                  className="text-white/40 hover:text-white/70 text-sm font-medium disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-fence-600 hover:bg-fence-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? "Saving…" : step === 3 ? "Finish" : "Next"}
                  {!busy && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
