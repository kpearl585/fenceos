import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advanced Estimate Builder - FenceEstimatePro Help",
  description: "Master fence runs, gates, and complex configurations with the Advanced Estimate Builder",
  robots: { index: true, follow: true },
};

export default function AdvancedEstimatePage() {
  return (
    <div className="min-h-screen bg-fence-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-fence-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/help" className="flex items-center gap-2 mb-6 text-white/60 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Help Center</span>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">Advanced Estimate Builder</h1>
          <p className="text-lg text-white/70">Master fence runs, gates, and complex configurations</p>
          <div className="mt-4 text-sm text-white/50">8 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">When to Use Advanced Mode</h2>
            <p className="text-white/80 mb-4">
              The Advanced Estimate Builder is designed for complex projects with:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <ul className="space-y-2 text-white/80">
                <li>✓ Multiple fence runs with different heights or styles</li>
                <li>✓ Various gate types and sizes</li>
                <li>✓ Terrain changes requiring different installation approaches</li>
                <li>✓ Mixed materials (e.g., wood privacy + aluminum decorative)</li>
                <li>✓ Complex property layouts (L-shapes, irregular boundaries)</li>
              </ul>
            </div>
          </section>

          {/* Fence Runs */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Understanding Fence Runs</h2>
            <p className="text-white/80 mb-4">
              A <strong className="text-white">fence run</strong> is a continuous section of fence between corners or gates.
              Breaking your project into runs gives you precise control over each section.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Example: L-Shaped Backyard</h3>
              <div className="space-y-3 text-white/80">
                <div>
                  <strong className="text-white">Run 1:</strong> Back property line (150 LF, 6&apos; privacy)
                </div>
                <div>
                  <strong className="text-white">Run 2:</strong> Left side yard (80 LF, 4&apos; picket)
                </div>
                <div>
                  <strong className="text-white">Run 3:</strong> Right side with gate (60 LF, 6&apos; privacy)
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3">Creating a Fence Run</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <ol className="list-decimal list-inside space-y-3 text-white/80">
                <li>Click <strong className="text-white">&quot;+ Add Fence Run&quot;</strong></li>
                <li>Enter linear footage for this specific section</li>
                <li>Set fence height (can differ from other runs)</li>
                <li>Choose fence style (if different from main type)</li>
                <li>Note any special conditions (slope, obstacles, soil type)</li>
              </ol>
            </div>
          </section>

          {/* Gates */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Adding Gates</h2>
            <p className="text-white/80 mb-4">
              Gates add significant cost and installation time. The Advanced Builder accounts for:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Single Gates</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li><strong className="text-white">3&apos; wide:</strong> Standard walk-through</li>
                  <li><strong className="text-white">4&apos; wide:</strong> ADA compliant, wheelbarrows</li>
                  <li><strong className="text-white">5&apos; wide:</strong> Riding mower access</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Double Gates</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li><strong className="text-white">8&apos;-10&apos; wide:</strong> Small vehicle access</li>
                  <li><strong className="text-white">12&apos;-14&apos; wide:</strong> Standard driveway</li>
                  <li><strong className="text-white">16&apos;+ wide:</strong> RV/boat access</li>
                </ul>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3">Gate Installation Considerations</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <ul className="space-y-3 text-white/80">
                <li>
                  <strong className="text-white">Post Sizing:</strong> Gates require larger/stronger posts (4x4&quot; minimum, 6x6&quot; for double gates)
                </li>
                <li>
                  <strong className="text-white">Hardware:</strong> Heavy-duty hinges, latches, drop rods for double gates
                </li>
                <li>
                  <strong className="text-white">Concrete:</strong> Extra concrete for gate posts (deeper holes, more mix)
                </li>
                <li>
                  <strong className="text-white">Labor Time:</strong> Gates take 2-4x longer than equivalent linear footage of fence
                </li>
                <li>
                  <strong className="text-white">Adjustments:</strong> Gates require precise leveling and swing clearance
                </li>
              </ul>
            </div>
          </section>

          {/* Material Overrides */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Material Overrides &amp; Adjustments</h2>
            <p className="text-white/80 mb-4">
              Sometimes you need to override automatic calculations for specific project needs:
            </p>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Waste Factor Adjustment</h3>
                <p className="text-white/70 mb-3">
                  Default waste factor is 5-10% depending on material. Increase for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm">
                  <li>Novice crew (bump to 12-15%)</li>
                  <li>Complex angles or curves (add 5-10%)</li>
                  <li>Lower-quality materials (known for defects)</li>
                  <li>Difficult site access (more breakage during transport)</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Post Spacing Override</h3>
                <p className="text-white/70 mb-3">
                  Standard spacing is 8&apos; on-center. Adjust for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm">
                  <li><strong className="text-white">6&apos; spacing:</strong> High-wind areas, heavy gates nearby</li>
                  <li><strong className="text-white">10&apos; spacing:</strong> Commercial chain link (check local codes)</li>
                  <li><strong className="text-white">Irregular:</strong> Obstacles like trees, utilities, property corners</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Concrete Quantity</h3>
                <p className="text-white/70 mb-3">
                  Default assumes 50-60 lbs per post (3&apos; deep hole, standard frost line). Increase for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm">
                  <li>Deeper frost line (northern climates: 4&apos;-5&apos; deep)</li>
                  <li>Sandy/loose soil (wider holes for stability)</li>
                  <li>Wind exposure (extra concrete for lateral strength)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Terrain & Site Conditions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Terrain &amp; Site Conditions</h2>
            <p className="text-white/80 mb-4">
              The Advanced Builder lets you document site challenges that affect labor and materials:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Slopes</h3>
                <p className="text-white/70 text-sm mb-2">
                  <strong className="text-white">Stepped fence:</strong> Posts stay vertical, fence line steps down
                </p>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Racked fence:</strong> Fence line follows slope (limited to ~30° max)
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Soil Type</h3>
                <p className="text-white/70 text-sm mb-2">
                  <strong className="text-white">Rocky:</strong> Requires rock removal, possibly drilling
                </p>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Clay:</strong> Difficult digging, may need gravel base
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Obstacles</h3>
                <p className="text-white/70 text-sm">
                  Tree roots, underground utilities, irrigation systems, existing structures
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Access</h3>
                <p className="text-white/70 text-sm">
                  Limited gate width, no driveway access, steep driveway, long carry from street
                </p>
              </div>
            </div>

            <p className="text-white/70 text-sm mt-4">
              💡 <strong className="text-white">Tip:</strong> Document these conditions in the estimate notes.
              They justify higher labor rates and protect you if the job takes longer than expected.
            </p>
          </section>

          {/* Mixed Material Projects */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Mixed Material Projects</h2>
            <p className="text-white/80 mb-4">
              Some projects combine multiple fence types for function and aesthetics:
            </p>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Common Combinations</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>
                    <strong className="text-white">Backyard privacy + front yard picket:</strong>
                    6&apos; wood/vinyl privacy fence in back, 3&apos;-4&apos; decorative picket in front
                  </li>
                  <li>
                    <strong className="text-white">Pool fence + perimeter fence:</strong>
                    4&apos; aluminum pool fence (code required), 6&apos; privacy around property line
                  </li>
                  <li>
                    <strong className="text-white">Chain link + wood gate:</strong>
                    Economical chain link perimeter with upgraded wood privacy gate for curb appeal
                  </li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How to Estimate Mixed Projects</h3>
                <ol className="list-decimal list-inside space-y-2 text-white/70 text-sm">
                  <li>Create separate fence runs for each material type</li>
                  <li>Select appropriate fence type for each run</li>
                  <li>Verify post count at material transitions (shared corner posts)</li>
                  <li>Account for extra labor coordinating multiple materials</li>
                  <li>Consider ordering all materials to arrive together (shipping efficiency)</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Best Practices</h2>
            <div className="space-y-4">
              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">1. Measure Twice, Build Once</h3>
                <p className="text-white/70 text-sm">
                  Walk the property with customer before finalizing estimate. Confirm measurements,
                  identify obstacles, and set expectations about terrain challenges.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">2. Document Everything</h3>
                <p className="text-white/70 text-sm">
                  Use the notes field to record site conditions, customer requests, and anything unusual.
                  Take photos during site visit and attach to estimate.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">3. Build in Contingency</h3>
                <p className="text-white/70 text-sm">
                  For complex projects, add 10-15% contingency to labor estimate. Rocky soil, hidden utilities,
                  and weather delays are common. Better to finish under budget than over.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">4. Review Material Breakdown</h3>
                <p className="text-white/70 text-sm">
                  Before sending proposal, review the Bill of Materials. Verify post count, concrete quantity,
                  and hardware make sense for your installation approach.
                </p>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/export" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Exporting Estimates →</h3>
                <p className="text-white/70 text-sm">Generate professional PDFs and Excel BOMs</p>
              </Link>
              <Link href="/help/pricing" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Material Price Management →</h3>
                <p className="text-white/70 text-sm">Update prices and sync with suppliers</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">Questions about complex projects?</h3>
            <p className="text-white/70 mb-4">
              Our team has decades of fence installation experience. We can help you estimate tricky jobs.
            </p>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="inline-block bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
