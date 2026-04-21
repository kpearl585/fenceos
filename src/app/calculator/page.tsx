import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Free Fence Cost Calculator 2026",
  description:
    "How much does a fence cost? Use our free calculator to get an instant estimate for wood, chain link, vinyl, or aluminum fencing. Takes 60 seconds.",
  alternates: { canonical: "/calculator" },
  keywords: [
    "fence cost calculator",
    "fence estimate calculator",
    "fence material calculator",
    "how much does a fence cost",
    "fence price calculator",
  ],
  openGraph: {
    title: "Free Fence Cost Calculator 2026 | FenceEstimatePro",
    description:
      "How much does a fence cost? Get an instant estimate for wood, chain link, vinyl, or aluminum fencing in 60 seconds.",
    url: "https://fenceestimatepro.com/calculator",
  },
  twitter: {
    title: "Free Fence Cost Calculator 2026 | FenceEstimatePro",
    description:
      "Free fence cost calculator — instant estimates for wood, chain link, vinyl, or aluminum. 60 seconds.",
  },
};

export default function CalculatorPage() {
  return (
    <>
      <SiteNav />
      <main className="relative bg-background min-h-screen text-text pt-16 overflow-hidden">
        {/* Ambient grid + glow */}
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl" />

        {/* Header */}
        <section className="relative px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse" />
            <span className="text-xs font-semibold text-accent-light uppercase tracking-wider">Free Fence Cost Calculator</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-text">Estimate Your Fence Cost in 60 Seconds</h1>
          <p className="mt-4 text-lg text-muted max-w-xl mx-auto">
            Get a ballpark before you call a contractor &mdash; or use it to check if your quote is fair.
          </p>
        </section>
        <CalculatorClient />
      </main>
    </>
  );
}
