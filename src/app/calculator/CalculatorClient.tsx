"use client";

import { useState } from "react";

const PRICING = {
  "Wood Privacy":         { minLF: 28, maxLF: 42, minGate: 350, maxGate: 600 },
  "Chain Link":           { minLF: 18, maxLF: 28, minGate: 250, maxGate: 450 },
  "Vinyl":                { minLF: 38, maxLF: 55, minGate: 400, maxGate: 700 },
  "Aluminum / Ornamental":{ minLF: 35, maxLF: 55, minGate: 400, maxGate: 750 },
  "Aluminum":     { minLF: 35, maxLF: 55, minGate: 350, maxGate: 650 },
  "Split Rail":   { minLF: 20, maxLF: 32, minGate: 280, maxGate: 450 },
};

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

export default function CalculatorClient() {
  const [fenceType, setFenceType] = useState("Wood Privacy");
  const [linearFeet, setLinearFeet] = useState(150);
  const [gates, setGates] = useState(1);
  const [height, setHeight] = useState("6ft");
  const [location, setLocation] = useState("Standard");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const p = PRICING[fenceType as keyof typeof PRICING];
  const heightMult = height === "8ft" ? 1.25 : height === "4ft" ? 0.85 : 1.0;
  const locMult = ["Florida", "California", "Northeast", "Other High-Cost"].includes(location) ? 1.15 : 1.0;

  const minTotal = (p.minLF * linearFeet * heightMult * locMult) + (p.minGate * gates * locMult);
  const maxTotal = (p.maxLF * linearFeet * heightMult * locMult) + (p.maxGate * gates * locMult);

  const minMaterials = minTotal * 0.45;
  const maxMaterials = maxTotal * 0.45;
  const minLabor = minTotal * 0.35;
  const maxLabor = maxTotal * 0.35;
  const minFence = p.minLF * linearFeet * heightMult * locMult;
  const maxFence = p.maxLF * linearFeet * heightMult * locMult;
  const minGateTotal = p.minGate * gates * locMult;
  const maxGateTotal = p.maxGate * gates * locMult;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "calculator" }),
      });
      setSubmitted(true);
    } catch {}
    setLoading(false);
  }

  return (
    <section className="px-6 pb-24">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-white">Your Fence Details</h2>

          <div>
            <label className="block text-sm font-semibold text-fence-200 mb-2">Fence Type</label>
            <select
              value={fenceType}
              onChange={e => setFenceType(e.target.value)}
              className="w-full bg-fence-800 border border-fence-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fence-500"
            >
              {Object.keys(PRICING).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-fence-200 mb-2">Linear Feet: <span className="text-white font-bold">{linearFeet} ft</span></label>
            <input
              type="range" min={50} max={1000} step={10}
              value={linearFeet}
              onChange={e => setLinearFeet(Number(e.target.value))}
              className="w-full accent-fence-500"
            />
            <div className="flex justify-between text-xs text-fence-400 mt-1"><span>50 ft</span><span>1,000 ft</span></div>
            <input
              type="number" min={50} max={1000}
              value={linearFeet}
              onChange={e => setLinearFeet(Number(e.target.value))}
              className="mt-2 w-full bg-fence-800 border border-fence-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fence-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-fence-200 mb-2">Number of Gates</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setGates(Math.max(0, gates - 1))} className="w-10 h-10 rounded-xl bg-fence-700 text-white font-bold text-xl hover:bg-fence-600 transition-colors">−</button>
              <span className="text-white font-bold text-xl w-8 text-center">{gates}</span>
              <button onClick={() => setGates(Math.min(10, gates + 1))} className="w-10 h-10 rounded-xl bg-fence-700 text-white font-bold text-xl hover:bg-fence-600 transition-colors">+</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-fence-200 mb-2">Height</label>
            <div className="flex gap-3">
              {["4ft", "6ft", "8ft"].map(h => (
                <button
                  key={h}
                  onClick={() => setHeight(h)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${height === h ? "bg-fence-500 text-white" : "bg-fence-800 text-fence-300 hover:bg-fence-700"}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-fence-200 mb-2">Location</label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-fence-800 border border-fence-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fence-500"
            >
              <option>Standard</option>
              <option>Florida</option>
              <option>California</option>
              <option>Northeast</option>
              <option>Other High-Cost</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-fence-300 text-sm font-semibold uppercase tracking-wide mb-2">Estimated Range</p>
            <p className="text-4xl md:text-5xl font-bold text-white">
              {fmt(minTotal)} — {fmt(maxTotal)}
            </p>
            <p className="text-fence-400 text-sm mt-2">Installed cost including labor</p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-fence-800/50 rounded-xl p-4">
                <p className="text-xs text-fence-400 mb-1">Materials (~45%)</p>
                <p className="text-white font-bold">{fmt(minMaterials)} — {fmt(maxMaterials)}</p>
              </div>
              <div className="bg-fence-800/50 rounded-xl p-4">
                <p className="text-xs text-fence-400 mb-1">Labor (~35%)</p>
                <p className="text-white font-bold">{fmt(minLabor)} — {fmt(maxLabor)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-fence-300">Fence panels ({linearFeet} ft)</span>
                <span className="text-white font-semibold">{fmt(minFence)} — {fmt(maxFence)}</span>
              </div>
              {gates > 0 && (
                <div className="flex justify-between py-2 border-b border-white/10">
                  <span className="text-fence-300">{gates} gate{gates > 1 ? "s" : ""}</span>
                  <span className="text-white font-semibold">{fmt(minGateTotal)} — {fmt(maxGateTotal)}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-fence-300">Install labor</span>
                <span className="text-white font-semibold">{fmt(minLabor)} — {fmt(maxLabor)}</span>
              </div>
            </div>

            <p className="mt-6 text-xs text-fence-400 bg-fence-800/30 rounded-lg p-3">
              This is a rough estimate. Actual costs vary by supplier, terrain, and local labor rates. Get an exact quote from a licensed contractor.
            </p>
          </div>

          {/* Email capture */}
          <div className="bg-fence-700/30 border border-fence-600/40 rounded-2xl p-6">
            {submitted ? (
              <div className="text-center py-2">
                <p className="text-green-400 font-bold text-lg">Check your inbox!</p>
                <p className="text-fence-200 text-sm mt-1">Also — you&apos;re on the FenceEstimatePro waitlist.</p>
              </div>
            ) : (
              <>
                <p className="text-white font-bold mb-1">Want the detailed breakdown?</p>
                <p className="text-fence-300 text-sm mb-4">We&apos;ll send a full cost breakdown with material-by-material estimates.</p>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 bg-white/10 border border-white/20 text-white placeholder-fence-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fence-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-fence-500 hover:bg-fence-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {loading ? "Sending…" : "Send My Full Estimate →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
