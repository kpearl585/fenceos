"use client";

import Link from "next/link";

/* ── Hardcoded unit prices ─────────────────────────────── */
const PRICES: Record<string, number> = {
  WOOD_POST_4X4_8: 18,
  WOOD_POST_4X4_10: 22,
  WOOD_PANEL_6FT: 45,
  CONCRETE_80LB: 7,
  SCREWS_1LB: 12,
  GATE_WOOD_4FT: 85,
  HINGE_HD: 8,
  GATE_LATCH: 12,
};

const MARKUP = 0.35;

/* ── BOM line items (realistic for 80ft + 45ft privacy + 1 gate) ── */
interface BomLine {
  item: string;
  sku: string;
  qty: number;
  unit: string;
}

const BOM: BomLine[] = [
  { item: '4x4x8 Wood Post', sku: 'WOOD_POST_4X4_8', qty: 18, unit: 'ea' },
  { item: '4x4x10 Wood Post (gate/corner)', sku: 'WOOD_POST_4X4_10', qty: 4, unit: 'ea' },
  { item: '6ft Wood Privacy Panel', sku: 'WOOD_PANEL_6FT', qty: 16, unit: 'ea' },
  { item: '80lb Concrete (per post)', sku: 'CONCRETE_80LB', qty: 66, unit: 'bag' },
  { item: '#8 Deck Screws (1lb box)', sku: 'SCREWS_1LB', qty: 8, unit: 'box' },
  { item: '4ft Wood Gate', sku: 'GATE_WOOD_4FT', qty: 1, unit: 'ea' },
  { item: 'Heavy-Duty Gate Hinge', sku: 'HINGE_HD', qty: 2, unit: 'ea' },
  { item: 'Gate Latch', sku: 'GATE_LATCH', qty: 1, unit: 'ea' },
];

const LABOR_SUBTOTAL = 1650;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function DemoPage() {
  const materialLines = BOM.map((l) => {
    const unitCost = PRICES[l.sku];
    const total = unitCost * l.qty;
    return { ...l, unitCost, total };
  });

  const materialSubtotal = materialLines.reduce((s, l) => s + l.total, 0);
  const subtotal = materialSubtotal + LABOR_SUBTOTAL;
  const markupAmount = subtotal * MARKUP;
  const total = subtotal + markupAmount;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Amber demo banner ── */}
      <div className="bg-amber-500 text-amber-950 text-center text-sm font-semibold py-2 px-4">
        Demo Mode — This is a live preview. Sign up to save estimates.
      </div>

      {/* ── Header ── */}
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2D6A4F] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-lg">F</span>
          </div>
          <span className="font-bold text-lg tracking-tight">FenceEstimatePro</span>
        </div>
        <Link
          href="/"
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Back to site
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-32">
        {/* ── Project info ── */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Estimate #DEMO-001</h1>
          <p className="text-slate-400 text-sm">
            Client: <span className="text-white font-medium">Sample Homeowner</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
              80 ft — Wood Privacy 6ft
            </span>
            <span className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
              45 ft — Wood Privacy 6ft
            </span>
            <span className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
              1 Gate — 4ft Wood
            </span>
          </div>
        </section>

        {/* ── BOM Table ── */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-slate-300">Materials</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium text-center">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {materialLines.map((l) => (
                  <tr key={l.sku} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{l.item}</td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {l.qty} {l.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{fmt(l.unitCost)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/60 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>
                    Materials Subtotal
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(materialSubtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── Labor ── */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-slate-300">Labor</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 flex justify-between items-center">
            <span className="text-sm">Installation &amp; cleanup (125 linear ft)</span>
            <span className="font-semibold">{fmt(LABOR_SUBTOTAL)}</span>
          </div>
        </section>

        {/* ── Summary card ── */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-slate-300">Summary</h2>
          <div className="rounded-xl border border-[#2D6A4F]/40 bg-slate-800 p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Materials</span>
              <span>{fmt(materialSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Labor</span>
              <span>{fmt(LABOR_SUBTOTAL)}</span>
            </div>
            <div className="border-t border-slate-700 pt-3 flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Markup (35%)</span>
              <span className="text-[#2D6A4F]">+{fmt(markupAmount)}</span>
            </div>
            <div className="border-t border-slate-700 pt-3 flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-[#40C057]">{fmt(total)}</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400 hidden sm:block">
            Build estimates like this in minutes.
          </p>
          <Link
            href="/#waitlist"
            className="w-full sm:w-auto text-center bg-[#2D6A4F] hover:bg-[#245a42] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Start Your Free Trial — No credit card required
          </Link>
        </div>
      </div>
    </div>
  );
}
