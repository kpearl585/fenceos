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
      <main className="bg-gradient-to-br from-fence-950 via-fence-900 to-fence-800 min-h-screen text-white pt-16">
        {/* Header */}
        <section className="px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-fence-700/50 border border-fence-600/50 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-fence-200 uppercase tracking-wide">Free Fence Cost Calculator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Estimate Your Fence Cost in 60 Seconds</h1>
          <p className="mt-4 text-lg text-fence-200 max-w-xl mx-auto">
            Get a ballpark before you call a contractor — or use it to check if your quote is fair.
          </p>
        </section>
        <CalculatorClient />
      </main>
    </>
  );
}
