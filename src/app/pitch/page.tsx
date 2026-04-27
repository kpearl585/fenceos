import type { Metadata } from "next";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "Feature Overview — Fence Estimation Software",
  description:
    "FenceEstimatePro feature overview: FenceGraph engine, margin lock, digital proposals, job tracking, and supplier price sync. Built for fence contractors.",
  alternates: { canonical: "/pitch" },
  openGraph: {
    title: "FenceEstimatePro — Feature Overview",
    description:
      "The only run-based fence estimation engine built specifically for fence contractors. See every feature in one page.",
    url: "https://fenceestimatepro.com/pitch",
  },
  twitter: {
    title: "FenceEstimatePro — Feature Overview",
    description:
      "Run-based fence estimation, margin lock, digital proposals, job tracking. Built for fence contractors.",
  },
};

export default function PitchPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-text print:text-sm">
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
        <a
          href="https://fenceestimatepro.com"
          className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text shadow-card transition-colors hover:bg-surface-2"
        >
          ← Back to site
        </a>
      </div>

      {/* Page */}
      <div className="mx-auto max-w-[900px] px-8 py-12 print:px-6 print:py-8">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between border-b-2 border-accent pb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <span className="text-white font-black text-xl">F</span>
              </div>
              <div>
                <h1 className="text-2xl font-black leading-none text-text">FenceEstimatePro</h1>
                <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-accent-light">Fence Contractor Software</p>
              </div>
            </div>
            <p className="text-sm text-muted">fenceestimatepro.com</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-light"></span>
              <span className="text-xs font-bold uppercase tracking-wide text-accent-light">Private Beta — Request Access</span>
            </div>
            <p className="mt-2 text-xs text-muted">Built by a U.S. Navy Veteran · Florida</p>
          </div>
        </div>

        {/* Hero statement */}
        <div className="mb-10">
          <h2 className="mb-4 text-4xl font-black leading-tight text-text">
            Stop guessing quantities.<br />
            <span className="text-accent-light">Start winning jobs.</span>
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            FenceEstimatePro is the only software that models your fence run by run —
            auto-deriving post types, calculating exact concrete volume, and locking your
            margin before you ever touch the quote. Built specifically for fence contractors.
            No bloat. No learning curve.
          </p>
        </div>

        {/* The Problem / The Difference */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-danger">❌ Every Other Tool</p>
            <ul className="space-y-2 text-sm text-muted">
              {[
                "Total LF × materials per foot = rough guess",
                "Same post count regardless of corners",
                "Concrete in flat bags per post — ignores hole size",
                "Panel waste not calculated — you eat the loss",
                "Gets less accurate the more complex the job",
                "No code compliance (FL depths, wind load, pool gates)",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-danger/70">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-accent-light">✓ FenceEstimatePro</p>
            <ul className="space-y-2 text-sm text-muted">
              {[
                "Run-based geometry — model each segment independently",
                "Post types auto-derived: end, corner, line, gate hinge/latch",
                "Volumetric concrete: π × r² × depth per hole, exact",
                "Panel optimizer minimizes scrap and cut operations",
                "Self-calibrating: gets tighter with every closed job",
                "FL sandy soil, wind load mode, pool gate compliance built in",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 text-accent-light">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mb-10">
          <h3 className="mb-5 flex items-center gap-2 text-xl font-black text-text">
            <span className="inline-block h-6 w-1 rounded-full bg-accent"></span>
            Everything you need — nothing you don't
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: "⚙️",
                title: "FenceGraph Engine",
                body: "Run-based geometry. Post type derivation. Volumetric concrete. EWMA self-calibration from closed jobs.",
              },
              {
                icon: "📊",
                title: "Margin Lock",
                body: "Set your target. Warning fires before any quote goes out below it. P&L dashboard for owners.",
              },
              {
                icon: "📄",
                title: "Two-View PDF",
                body: "Customer proposal shows bid price only. Internal BOM shows full costs + audit trail. Zero cost exposure.",
              },
              {
                icon: "✍️",
                title: "Digital Acceptance",
                body: "Customer signs via link. Both parties receive signed contract PDF. Estimate status auto-updates.",
              },
              {
                icon: "📋",
                title: "Job Board",
                body: "Kanban board: Scheduled → Active → Complete. Assign to foreman. Change orders handled inline.",
              },
              {
                icon: "🧾",
                title: "Final Invoice",
                body: "Mark job paid → invoice PDF auto-generated and emailed to customer. Full job lifecycle closed.",
              },
              {
                icon: "🔄",
                title: "Supplier Price Sync",
                body: "Upload HD Pro or Lowe's Pro CSV. Fuzzy SKU matching auto-maps prices. Freshness tracking included.",
              },
              {
                icon: "📱",
                title: "Mobile-First",
                body: "Works in the sun on a job site. Big inputs, fast load, no app store required. Installs as PWA.",
              },
              {
                icon: "🔒",
                title: "Role-Based Access",
                body: "Owner sees margin and P&L. Foreman sees jobs only. Customer data locked to your org.",
              },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-surface-2">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h4 className="mb-1 text-sm font-bold text-text">{f.title}</h4>
                <p className="text-xs leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The Pipeline */}
        <div className="mb-10 rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-4 text-lg font-black text-text">The full job pipeline — zero re-entry</h3>
          <div className="flex items-center gap-1 flex-wrap text-sm font-semibold">
            {[
              { label: "New Estimate", color: "bg-info/15 text-info" },
              { label: "→", color: "text-muted" },
              { label: "Send to Customer", color: "bg-fence-500/15 text-fence-200" },
              { label: "→", color: "text-muted" },
              { label: "Digital Signature", color: "bg-warning/15 text-warning" },
              { label: "→", color: "text-muted" },
              { label: "Convert to Job", color: "bg-danger/15 text-danger/90" },
              { label: "→", color: "text-muted" },
              { label: "Change Orders", color: "bg-accent/10 text-accent-light" },
              { label: "→", color: "text-muted" },
              { label: "Mark as Paid", color: "bg-accent/15 text-accent-light" },
              { label: "→", color: "text-muted" },
              { label: "Complete ✓", color: "bg-accent text-accent-foreground" },
            ].map((step, i) => (
              step.label === "→"
                ? <span key={i} className="text-lg text-muted">{step.label}</span>
                : <span key={i} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${step.color}`}>{step.label}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Estimate data flows through every stage automatically. No copy-paste. No spreadsheets. No dropped details.</p>
        </div>

        {/* Pricing */}
        <div className="mb-10">
          <h3 className="mb-5 flex items-center gap-2 text-xl font-black text-text">
            <span className="inline-block h-6 w-1 rounded-full bg-accent"></span>
            Pricing — simple and predictable
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "/mo",
                highlight: false,
                features: ["Unlimited estimates", "Materials auto-calc", "Digital acceptance", "PDF proposals", "1 user"],
                note: "Best for solo operators",
              },
              {
                name: "Pro",
                price: "$89",
                period: "/mo",
                highlight: true,
                features: ["Everything in Starter", "Job tracking board", "Change orders", "Foreman access", "Custom PDF branding", "3 users", "P&L dashboard"],
                note: "Most popular",
              },
              {
                name: "Business",
                price: "$149",
                period: "/mo",
                highlight: false,
                features: ["Everything in Pro", "Advanced KPI metrics", "Unlimited users", "Priority support"],
                note: "Multi-crew operations",
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`rounded-xl p-5 border-2 ${plan.highlight
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface"
                }`}
              >
                {plan.highlight && (
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-accent-light">{plan.note}</div>
                )}
                <h4 className="text-lg font-black text-text">{plan.name}</h4>
                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-text">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                {!plan.highlight && <p className="mb-3 text-xs text-muted">{plan.note}</p>}
                <ul className="space-y-1.5 mt-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted">
                      <span className="mt-0.5 flex-shrink-0 text-accent-light">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted">Annual billing saves up to $300/yr · 14-day free trial · No credit card required to start</p>
        </div>

        {/* ROI Callout */}
        <div className="mb-10 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent to-[#123524] p-6 text-white">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-4xl font-black">41×</p>
              <p className="mt-1 text-sm font-semibold text-green-200">ROI on Pro plan</p>
              <p className="text-white/60 text-xs mt-1">$14,400 saved / $348 cost per year</p>
            </div>
            <div>
              <p className="text-4xl font-black">5 min</p>
              <p className="text-green-300 text-sm font-semibold mt-1">Average estimate time</p>
              <p className="text-white/60 text-xs mt-1">vs. 45–60 min manual process</p>
            </div>
            <div>
              <p className="text-4xl font-black">$1,200+</p>
              <p className="text-green-300 text-sm font-semibold mt-1">Avg saved per underbid job</p>
              <p className="text-white/60 text-xs mt-1">At 1 underbid per month, pays for itself 40×</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between border-t-2 border-accent pt-8">
          <div>
            <p className="text-lg font-bold text-text">Ready to see it in action?</p>
            <p className="mt-1 text-sm text-muted">Request early access at fenceestimatepro.com or reach out directly.</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-accent-light">fenceestimatepro.com</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <p className="text-xs text-muted">Veteran-owned · Built in Florida</p>
            </div>
          </div>
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 0.5in; size: letter; }
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
