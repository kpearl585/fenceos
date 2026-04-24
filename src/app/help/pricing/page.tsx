import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Material Price Management - FenceEstimatePro Help",
  description: "Update prices, sync with suppliers, and track material costs",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Material Price Management</h1>
          <p className="text-lg text-text/80">Update prices, sync with suppliers, and track costs</p>
          <div className="mt-4 text-sm text-muted">7 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Why Price Management Matters */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Why Price Management Matters</h2>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 mb-6">
              <p className="text-text/80 mb-4">
                Accurate material pricing is the foundation of profitable estimates:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>✓ <strong className="text-text">Avoid underbidding:</strong> Outdated prices = lost profit</li>
                <li>✓ <strong className="text-text">Stay competitive:</strong> Know your true costs</li>
                <li>✓ <strong className="text-text">Track price trends:</strong> See when materials spike</li>
                <li>✓ <strong className="text-text">Quote confidently:</strong> Real-time pricing in every estimate</li>
              </ul>
            </div>
            <p className="text-text/80 text-sm">
              Material costs can fluctuate 10-30% seasonally. Regular price updates protect your margins.
            </p>
          </section>

          {/* Accessing Materials */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Accessing the Materials Manager</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <p className="text-text/80 mb-3">
                Dashboard → Settings → Materials
              </p>
              <p className="text-text/80 text-sm">
                You&apos;ll see a categorized list of all materials used in fence estimates:
                posts, rails, panels, concrete, hardware, gates, and finishing supplies.
              </p>
            </div>
          </section>

          {/* Updating Individual Prices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Updating Individual Prices</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Manual Price Update</h3>
              <ol className="list-decimal list-inside space-y-3 text-text/80">
                <li>Navigate to Settings → Materials</li>
                <li>Find the material by category or search by SKU/name</li>
                <li>Click the price field to edit</li>
                <li>Enter new unit cost (e.g., $12.50 per 8&apos; 4x4 post)</li>
                <li>Click &quot;Save&quot; or press Enter</li>
                <li>Price updates immediately for all new estimates</li>
              </ol>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">What to Update</h3>
              <p className="text-text/80 text-sm mb-3">
                At minimum, update these quarterly or when you receive a supplier price increase:
              </p>
              <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                <li><strong className="text-text">Posts:</strong> Wood 4x4, 6x6; vinyl line posts, terminal posts</li>
                <li><strong className="text-text">Rails:</strong> 2x4 rails, vinyl rails (per linear foot or per piece)</li>
                <li><strong className="text-text">Panels/Pickets:</strong> Vinyl panels, wood pickets, boards</li>
                <li><strong className="text-text">Concrete:</strong> 50lb bags, 60lb bags, 80lb bags</li>
                <li><strong className="text-text">Hardware:</strong> Screws (box price), hinges (per pair), latches</li>
                <li><strong className="text-text">Gates:</strong> Pre-fab gates (by size and material)</li>
              </ul>
            </div>
          </section>

          {/* Bulk Price Updates */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Bulk Price Updates</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">CSV Import (Pro & Business Plans)</h3>
                <p className="text-text/80 text-sm mb-3">
                  Upload a CSV file with updated prices for multiple materials at once:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text/80 text-sm">
                  <li>Export current material list: Materials → Export to CSV</li>
                  <li>Update prices in Excel/Google Sheets (keep SKUs unchanged)</li>
                  <li>Save as CSV format</li>
                  <li>Materials → Import CSV → Select file</li>
                  <li>Preview changes before confirming</li>
                  <li>Click &quot;Import&quot; to apply all updates</li>
                </ol>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Percentage Increase/Decrease</h3>
                <p className="text-text/80 text-sm mb-3">
                  Apply a blanket percentage change across a category:
                </p>
                <p className="text-text/80 text-sm">
                  Materials → Select Category → Bulk Actions → Adjust Prices → Enter % (e.g., +8% or -5%)
                </p>
                <p className="text-text/80 text-sm mt-3">
                  <strong className="text-text">Example:</strong> Your lumber supplier raised all wood prices by 12%.
                  Select &quot;Wood Materials&quot; category, apply +12%, and all wood posts, rails, and boards update instantly.
                </p>
              </div>
            </div>
          </section>

          {/* Supplier Sync */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Supplier Price Sync (Business Plan)</h2>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Automatic Price Updates</h3>
              <p className="text-text/80 mb-4">
                Connect directly to your supplier&apos;s pricing feed for real-time updates:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>✓ Prices update automatically daily or weekly</li>
                <li>✓ No manual entry needed</li>
                <li>✓ Notification when prices change significantly</li>
                <li>✓ Historical price tracking</li>
              </ul>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">Supported Suppliers</h3>
              <p className="text-text/80 text-sm mb-3">
                We have integrations with major fence suppliers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                <li>Lowe&apos;s Pro (via API)</li>
                <li>Home Depot Pro Xtra (via API)</li>
                <li>84 Lumber (via API)</li>
                <li>Menards (via CSV feed)</li>
                <li>Local suppliers (custom API setup)</li>
              </ul>
              <p className="text-text/80 text-sm mt-3">
                Contact <strong className="text-text">support@fenceestimatepro.com</strong> to set up supplier sync.
              </p>
            </div>
          </section>

          {/* Price History */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Price History &amp; Tracking</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Viewing Price Changes</h3>
              <p className="text-text/80 text-sm mb-3">
                Click any material → Price History tab to see:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                <li>Date of each price change</li>
                <li>Old price → New price</li>
                <li>% change</li>
                <li>Who updated it (user or auto-sync)</li>
                <li>Chart showing price trend over time</li>
              </ul>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">Why This Matters</h3>
              <p className="text-text/80 text-sm">
                <strong className="text-text">Scenario:</strong> Customer from 3 months ago calls back to accept your quote.
                You pull up the estimate and see lumber prices have risen 18% since then. You can:
              </p>
              <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                <li>Show customer the documented price increase</li>
                <li>Revise the quote with current pricing</li>
                <li>Honor original price if it&apos;s within your tolerance</li>
              </ul>
              <p className="text-text/80 text-sm mt-3">
                Price history gives you the data to make informed decisions.
              </p>
            </div>
          </section>

          {/* Custom Materials */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Adding Custom Materials</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">When to Add Custom Materials</h3>
              <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                <li>Specialty fence materials not in default catalog</li>
                <li>Decorative caps or finials</li>
                <li>Custom-built gates</li>
                <li>Solar lights, automation kits</li>
                <li>Local materials specific to your region</li>
              </ul>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">How to Add</h3>
              <ol className="list-decimal list-inside space-y-2 text-text/80 text-sm">
                <li>Materials → Add Custom Material</li>
                <li>Enter material name (e.g., &quot;Solar Post Cap - 4x4&quot;)</li>
                <li>Select category (Posts, Hardware, etc.)</li>
                <li>Enter SKU (optional, for your reference)</li>
                <li>Set unit price</li>
                <li>Choose unit of measure (each, linear foot, square foot, box)</li>
                <li>Save</li>
              </ol>
              <p className="text-text/80 text-sm mt-3">
                Custom materials appear in the estimate builder alongside standard materials.
              </p>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Best Practices</h2>

            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">1. Update Prices Before Quoting Season</h3>
                <p className="text-text/80 text-sm">
                  Spring is peak quoting season. Update all material prices in late winter (February/March)
                  before you start sending proposals. Lumber prices typically spike in spring.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">2. Set Price Alerts</h3>
                <p className="text-text/80 text-sm">
                  Materials → Settings → Price Alerts → Enable notifications for price changes &gt; 10%.
                  You&apos;ll get an email when a material price jumps significantly.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">3. Include Your Markup in Pricing Strategy</h3>
                <p className="text-text/80 text-sm">
                  Material prices in FenceEstimatePro are YOUR COST (what you pay the supplier).
                  Your profit comes from the markup % you add when generating customer proposals.
                  Don&apos;t inflate material costs — use markup instead.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">4. Use Consistent Units</h3>
                <p className="text-text/80 text-sm">
                  Some suppliers price rails by &quot;per piece&quot; (8&apos; rail = 1 piece).
                  Others price by linear foot (8&apos; rail = 8 LF). Pick one method and stay consistent
                  across all materials in a category.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">5. Factor in Delivery Costs</h3>
                <p className="text-text/80 text-sm">
                  If supplier charges delivery, either add it to material prices proportionally,
                  or create a &quot;Delivery Fee&quot; custom material that gets added to large orders.
                </p>
              </div>
            </div>
          </section>

          {/* Regional Pricing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Regional Pricing Variations</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <p className="text-text/80 mb-4">
                Material costs vary significantly by region:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>
                  <strong className="text-text">Urban vs. Rural:</strong> Materials 10-20% cheaper in rural areas (lower overhead)
                </li>
                <li>
                  <strong className="text-text">Coastal vs. Inland:</strong> Hurricane-rated materials cost more in coastal regions
                </li>
                <li>
                  <strong className="text-text">North vs. South:</strong> Treated lumber more expensive in wet/humid climates
                </li>
                <li>
                  <strong className="text-text">Freight Distance:</strong> Further from manufacturing = higher transport costs
                </li>
              </ul>
              <p className="text-text/80 text-sm mt-4">
                Don&apos;t compare your prices to contractors in other states — use local supplier pricing as your baseline.
              </p>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/getting-started" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Creating Your First Estimate →</h3>
                <p className="text-text/80 text-sm">Use updated prices in your estimates</p>
              </Link>
              <Link href="/help/export" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Exporting Estimates →</h3>
                <p className="text-text/80 text-sm">Generate proposals with current pricing</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Questions about pricing?</h3>
            <p className="text-text/80 mb-4">
              Our team can help set up supplier sync, import bulk pricing, or troubleshoot price issues.
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
