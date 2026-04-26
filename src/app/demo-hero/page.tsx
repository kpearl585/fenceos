import Hero from "@/components/Hero";
import HeroRedesign from "@/components/HeroRedesign";

export default function DemoHeroPage() {
  return (
    <div className="min-h-screen bg-background text-text">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-surface/95 px-6 py-4 text-text backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Hero Redesign Comparison</h1>
          <div className="flex gap-4">
            <a href="#original" className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-3">
              View Original
            </a>
            <a href="#redesign" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90">
              View Redesign
            </a>
          </div>
        </div>
      </div>

      {/* Original Dark Hero */}
      <div id="original" className="relative border-b-8 border-danger">
        <div className="absolute top-0 left-0 right-0 z-10 bg-danger text-center text-sm font-bold text-white py-2">
          ⬇️ ORIGINAL - Dark Mode (Current)
        </div>
        <div className="pt-12">
          <Hero />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-danger py-2 text-center text-sm font-bold text-white">
          ⬆️ END ORIGINAL
        </div>
      </div>

      {/* Redesigned Light Hero */}
      <div id="redesign" className="relative border-b-8 border-accent">
        <div className="absolute top-0 left-0 right-0 z-10 bg-accent py-2 text-center text-sm font-bold text-accent-foreground">
          ⬇️ REDESIGN - Light Mode (Contractor-Focused)
        </div>
        <div className="pt-12">
          <HeroRedesign />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-accent py-2 text-center text-sm font-bold text-accent-foreground">
          ⬆️ END REDESIGN
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-background px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="mb-8 text-3xl font-bold text-text">Key Differences</h2>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <h3 className="mb-3 text-xl font-bold text-text">🎨 Visual Style</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-2 font-semibold text-danger">Original (Dark)</p>
                  <ul className="space-y-1 text-muted">
                    <li>• Dark background (#080808)</li>
                    <li>• Green glow effects</li>
                    <li>• Grid pattern background</li>
                    <li>• Tech startup aesthetic</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-accent-light">Redesign (Light)</p>
                  <ul className="space-y-1 text-muted">
                    <li>• White background</li>
                    <li>• Clean, professional</li>
                    <li>• Subtle texture only</li>
                    <li>• Business tool aesthetic</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <h3 className="mb-3 text-xl font-bold text-text">📝 Messaging</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-2 font-semibold text-danger">Original</p>
                  <ul className="space-y-1 text-muted">
                    <li>• "Stop Guessing Quantities"</li>
                    <li>• Features: FenceGraph engine</li>
                    <li>• Technical language</li>
                    <li>• "Request Early Access"</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-accent-light">Redesign</p>
                  <ul className="space-y-1 text-muted">
                    <li>• "5 Minutes. Not 45."</li>
                    <li>• Benefits: Time + money savings</li>
                    <li>• Contractor language</li>
                    <li>• "Start Free Trial"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <h3 className="mb-3 text-xl font-bold text-text">📸 Screenshot</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-2 font-semibold text-danger">Original</p>
                  <ul className="space-y-1 text-muted">
                    <li>• Complex mockup interface</li>
                    <li>• 3 fence runs shown</li>
                    <li>• Lots of data fields</li>
                    <li>• Looks like a demo</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-accent-light">Redesign</p>
                  <ul className="space-y-1 text-muted">
                    <li>• Simple estimate view</li>
                    <li>• 1 real job shown</li>
                    <li>• Key metrics only</li>
                    <li>• "Real Estimate" badge</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-accent/40 bg-accent/10 p-6">
              <h3 className="mb-3 text-xl font-bold text-accent-light">✅ Recommended Next Steps</h3>
              <ol className="space-y-2 text-muted">
                <li><strong>1.</strong> Test redesign on mobile device (contractors browse on phones)</li>
                <li><strong>2.</strong> Get feedback from 2-3 real contractors</li>
                <li><strong>3.</strong> Replace fake screenshot with REAL estimate from production</li>
                <li><strong>4.</strong> A/B test for 2 weeks, measure signup conversion</li>
                <li><strong>5.</strong> If redesign wins, apply same principles to rest of site</li>
              </ol>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              ← Back to Main Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
