import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creating Your First Estimate - FenceEstimatePro Help",
  description: "Step-by-step guide to building your first fence estimate in FenceEstimatePro",
  robots: { index: true, follow: true },
};

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/help" className="flex items-center gap-2 mb-6 text-muted hover:text-text transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Help Center</span>
          </Link>
          <h1 className="text-4xl font-bold text-text mb-3">Creating Your First Estimate</h1>
          <p className="text-lg text-text/80">Step-by-step guide to building a fence estimate</p>
          <div className="mt-4 text-sm text-muted">5 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Quick Start */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Quick Start</h2>
            <p className="text-text/80 mb-4">
              FenceEstimatePro makes it easy to create professional fence estimates in minutes.
              Here&apos;s everything you need to know to get started.
            </p>
          </section>

          {/* Step 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 1: Access the Estimate Builder</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <ol className="list-decimal list-inside space-y-3 text-text/80">
                <li>Log in to your FenceEstimatePro dashboard</li>
                <li>Click <strong className="text-text">&quot;New Estimate&quot;</strong> in the navigation menu</li>
                <li>Or click the <strong className="text-text">&quot;+ Create Estimate&quot;</strong> button on the dashboard</li>
              </ol>
            </div>
            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> You can also use AI extraction to auto-fill estimates from customer emails or texts.
              See our <Link href="/help/ai-extraction" className="text-accent-light hover:text-accent-light">AI Extraction guide</Link>.
            </p>
          </section>

          {/* Step 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 2: Enter Basic Information</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Required Fields:</h3>
              <ul className="space-y-3 text-text/80">
                <li>
                  <strong className="text-text">Customer Name:</strong> Enter the property owner&apos;s full name
                </li>
                <li>
                  <strong className="text-text">Property Address:</strong> Full address including city and state
                </li>
                <li>
                  <strong className="text-text">Contact Information:</strong> Phone and email (at least one required)
                </li>
                <li>
                  <strong className="text-text">Project Name:</strong> Brief description (e.g., &quot;Backyard Privacy Fence&quot;)
                </li>
              </ul>
            </div>
          </section>

          {/* Step 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 3: Select Fence Type</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-surface-2 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text mb-2">Vinyl</h3>
                <p className="text-text/80 text-sm">Durable, low-maintenance option. Popular for privacy and picket styles.</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text mb-2">Wood</h3>
                <p className="text-text/80 text-sm">Classic look. Choose from dog ear, flat top, picket, or board-on-board.</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text mb-2">Chain Link</h3>
                <p className="text-text/80 text-sm">Affordable security option. Available in galvanized or vinyl-coated.</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-text mb-2">Aluminum</h3>
                <p className="text-text/80 text-sm">Elegant, rust-proof fencing. Great for decorative applications.</p>
              </div>
            </div>
            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> Fence type affects material costs, labor time, and installation complexity.
              The estimate will automatically adjust based on your selection.
            </p>
          </section>

          {/* Step 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 4: Enter Fence Measurements</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Linear Footage</h3>
              <p className="text-text/80 mb-4">
                Enter the total linear feet of fence needed. You can measure this by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-text/80 ml-4">
                <li>Walking the property line with a measuring wheel</li>
                <li>Using satellite imagery (Google Maps, etc.) with measurement tools</li>
                <li>Referencing property survey documents</li>
              </ul>

              <h3 className="text-lg font-semibold text-text mb-3 mt-6">Height</h3>
              <p className="text-text/80">
                Standard heights: 4&apos;, 5&apos;, 6&apos;, 8&apos;. Privacy fences are typically 6&apos;.
              </p>

              <h3 className="text-lg font-semibold text-text mb-3 mt-6">Gates</h3>
              <p className="text-text/80 mb-2">Specify number and size of gates:</p>
              <ul className="list-disc list-inside space-y-1 text-text/80 ml-4">
                <li><strong className="text-text">Single gates:</strong> 3&apos; or 4&apos; wide (walk-through)</li>
                <li><strong className="text-text">Double gates:</strong> 8&apos; to 16&apos; wide (drive-through)</li>
              </ul>
            </div>
          </section>

          {/* Step 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 5: Review Material Breakdown</h2>
            <p className="text-text/80 mb-4">
              FenceEstimatePro automatically calculates all required materials:
            </p>
            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <ul className="space-y-3 text-text/80">
                <li>✓ <strong className="text-text">Posts:</strong> Calculated based on 8&apos; spacing (industry standard)</li>
                <li>✓ <strong className="text-text">Rails:</strong> Adjusted for fence type and height</li>
                <li>✓ <strong className="text-text">Panels/Pickets:</strong> Exact quantities with waste factor</li>
                <li>✓ <strong className="text-text">Concrete:</strong> 50-60 lbs per post (frost line depth)</li>
                <li>✓ <strong className="text-text">Hardware:</strong> Screws, nails, hinges, latches, caps</li>
                <li>✓ <strong className="text-text">Stain/Sealer:</strong> For wood fences (optional)</li>
              </ul>
            </div>
          </section>

          {/* Step 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 6: Set Labor Rate &amp; Markup</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-text mb-3">Labor Rate</h3>
              <p className="text-text/80 mb-4">
                Set your hourly labor rate. Industry average: <strong className="text-text">$45-75/hour</strong> depending on region and complexity.
              </p>

              <h3 className="text-lg font-semibold text-text mb-3">Markup Percentage</h3>
              <p className="text-text/80 mb-2">
                Add profit margin on top of material and labor costs. Typical ranges:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text/80 ml-4">
                <li><strong className="text-text">Standard projects:</strong> 20-30%</li>
                <li><strong className="text-text">Complex installs:</strong> 30-50%</li>
                <li><strong className="text-text">Premium materials:</strong> 15-25%</li>
              </ul>
            </div>
            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> Your markup covers overhead (insurance, licensing, vehicle costs, admin time)
              plus profit. Don&apos;t undercharge!
            </p>
          </section>

          {/* Step 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 7: Generate Proposal</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <p className="text-text/80 mb-4">Once your estimate looks good:</p>
              <ol className="list-decimal list-inside space-y-3 text-text/80">
                <li>Click <strong className="text-text">&quot;Generate Customer Proposal&quot;</strong></li>
                <li>Professional PDF is created with:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-text/80">
                    <li>Your company branding and contact info</li>
                    <li>Project scope and specifications</li>
                    <li>Itemized pricing (or lump sum option)</li>
                    <li>Installation timeline with start date</li>
                    <li>Warranty information</li>
                    <li>Payment terms and next steps</li>
                  </ul>
                </li>
                <li>Download PDF and email to customer</li>
              </ol>
            </div>
          </section>

          {/* Step 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Step 8: Save Your Estimate</h2>
            <p className="text-text/80 mb-4">
              Don&apos;t forget to save! Click <strong className="text-text">&quot;Save Estimate&quot;</strong> to:
            </p>
            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <ul className="space-y-2 text-text/80">
                <li>✓ Store estimate in your dashboard for future reference</li>
                <li>✓ Track proposal status (sent, accepted, declined)</li>
                <li>✓ Access for revisions if customer requests changes</li>
                <li>✓ Convert to job when customer accepts</li>
                <li>✓ Reference for future similar projects</li>
              </ul>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/advanced-estimate" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Advanced Estimate Builder →</h3>
                <p className="text-text/80 text-sm">Learn about fence runs, gates, and complex configurations</p>
              </Link>
              <Link href="/help/ai-extraction" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">AI Extraction →</h3>
                <p className="text-text/80 text-sm">Auto-fill estimates from customer emails and texts</p>
              </Link>
            </div>
          </section>

          {/* Common Questions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Common Questions</h2>
            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">How accurate are the material calculations?</h3>
                <p className="text-text/80">
                  Material quantities are calculated using industry-standard formulas with a built-in waste factor (typically 5-10%).
                  This accounts for cuts, defects, and installation errors.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Can I edit an estimate after saving?</h3>
                <p className="text-text/80">
                  Yes! Go to your dashboard, find the estimate, and click &quot;Edit&quot;. You can revise measurements, pricing, or any other details.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">What if my material prices are different?</h3>
                <p className="text-text/80">
                  Update your material prices in Settings → Materials. Your custom prices will be used for all future estimates.
                  You can also sync prices from supplier catalogs.
                </p>
              </div>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Still have questions?</h3>
            <p className="text-text/80 mb-4">
              Our support team is here to help you succeed.
            </p>
            <a
              href="mailto:support@fenceestimatepro.com"
              className="inline-block bg-accent text-background px-6 py-3 rounded-lg font-semibold hover:bg-accent-light transition-colors duration-150"
            >
              Contact Support
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
