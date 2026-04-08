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
    <div className="bg-white min-h-screen font-sans print:text-sm">
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
        <a
          href="https://fenceestimatepro.com"
          className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold shadow hover:bg-gray-50 transition-colors"
        >
          ← Back to site
        </a>
      </div>

      {/* Page */}
      <div className="max-w-[900px] mx-auto px-8 py-12 print:px-6 print:py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 pb-8 border-b-2 border-[#2D6A4F]">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#2D6A4F] rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-xl">F</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 leading-none">FenceEstimatePro</h1>
                <p className="text-[#2D6A4F] text-xs font-bold uppercase tracking-widest mt-0.5">Fence Contractor Software</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">fenceestimatepro.com</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
              <span className="text-[#2D6A4F] text-xs font-bold uppercase tracking-wide">Private Beta — Request Access</span>
            </div>
            <p className="text-gray-400 text-xs mt-2">Built by a U.S. Navy Veteran · Florida</p>
          </div>
        </div>

        {/* Hero statement */}
        <div className="mb-10">
          <h2 className="text-4xl font-black text-gray-900 leading-tight mb-4">
            Stop guessing quantities.<br />
            <span className="text-[#2D6A4F]">Start winning jobs.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
            FenceEstimatePro is the only software that models your fence run by run —
            auto-deriving post types, calculating exact concrete volume, and locking your
            margin before you ever touch the quote. Built specifically for fence contractors.
            No bloat. No learning curve.
          </p>
        </div>

        {/* The Problem / The Difference */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700 font-bold text-sm uppercase tracking-wide mb-3">❌ Every Other Tool</p>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                "Total LF × materials per foot = rough guess",
                "Same post count regardless of corners",
                "Concrete in flat bags per post — ignores hole size",
                "Panel waste not calculated — you eat the loss",
                "Gets less accurate the more complex the job",
                "No code compliance (FL depths, wind load, pool gates)",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-xl p-6">
            <p className="text-[#2D6A4F] font-bold text-sm uppercase tracking-wide mb-3">✓ FenceEstimatePro</p>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                "Run-based geometry — model each segment independently",
                "Post types auto-derived: end, corner, line, gate hinge/latch",
                "Volumetric concrete: π × r² × depth per hole, exact",
                "Panel optimizer minimizes scrap and cut operations",
                "Self-calibrating: gets tighter with every closed job",
                "FL sandy soil, wind load mode, pool gate compliance built in",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#2D6A4F] mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mb-10">
          <h3 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2D6A4F] rounded-full inline-block"></span>
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
              <div key={f.title} className="border border-gray-200 rounded-xl p-4 hover:border-[#2D6A4F]/40 transition-colors">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The Pipeline */}
        <div className="mb-10 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">The full job pipeline — zero re-entry</h3>
          <div className="flex items-center gap-1 flex-wrap text-sm font-semibold">
            {[
              { label: "New Estimate", color: "bg-blue-100 text-blue-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Send to Customer", color: "bg-purple-100 text-purple-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Digital Signature", color: "bg-yellow-100 text-yellow-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Convert to Job", color: "bg-orange-100 text-orange-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Change Orders", color: "bg-amber-100 text-amber-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Mark as Paid", color: "bg-green-100 text-green-800" },
              { label: "→", color: "text-gray-400" },
              { label: "Complete ✓", color: "bg-[#2D6A4F] text-white" },
            ].map((step, i) => (
              step.label === "→"
                ? <span key={i} className="text-gray-400 text-lg">{step.label}</span>
                : <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${step.color}`}>{step.label}</span>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-4">Estimate data flows through every stage automatically. No copy-paste. No spreadsheets. No dropped details.</p>
        </div>

        {/* Pricing */}
        <div className="mb-10">
          <h3 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-6 bg-[#2D6A4F] rounded-full inline-block"></span>
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
                  ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                  : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="text-[#2D6A4F] text-xs font-bold uppercase tracking-wide mb-2">{plan.note}</div>
                )}
                <h4 className="font-black text-gray-900 text-lg">{plan.name}</h4>
                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                {!plan.highlight && <p className="text-gray-400 text-xs mb-3">{plan.note}</p>}
                <ul className="space-y-1.5 mt-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-[#2D6A4F] flex-shrink-0 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-3 text-center">Annual billing saves up to $300/yr · 14-day free trial · No credit card required to start</p>
        </div>

        {/* ROI Callout */}
        <div className="mb-10 bg-[#2D6A4F] rounded-xl p-6 text-white">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-4xl font-black">41×</p>
              <p className="text-green-300 text-sm font-semibold mt-1">ROI on Pro plan</p>
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
        <div className="border-t-2 border-[#2D6A4F] pt-8 flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-bold text-lg">Ready to see it in action?</p>
            <p className="text-gray-500 text-sm mt-1">Request early access at fenceestimatepro.com or reach out directly.</p>
          </div>
          <div className="text-right">
            <p className="text-[#2D6A4F] font-black text-lg">fenceestimatepro.com</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c9a84c"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <p className="text-gray-400 text-xs">Veteran-owned · Built in Florida</p>
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
