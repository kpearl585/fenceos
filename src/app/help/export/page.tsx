import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exporting Estimates (PDF & Excel) - FenceEstimatePro Help",
  description: "Generate professional proposals and internal BOMs for your fence estimates",
  robots: { index: true, follow: true },
};

export default function ExportPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Exporting Estimates (PDF & Excel)</h1>
          <p className="text-lg text-text/80">Generate professional proposals and internal BOMs</p>
          <div className="mt-4 text-sm text-muted">5 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Two Types of Exports</h2>
            <p className="text-text/80 mb-6">
              FenceEstimatePro generates two different document types for different audiences:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-text mb-3">Customer Proposal (PDF)</h3>
                <p className="text-text/80 text-sm mb-4">
                  Professional, branded proposal for sending to customers
                </p>
                <ul className="space-y-2 text-text/80 text-sm">
                  <li>✓ Your company logo and branding</li>
                  <li>✓ Bid price with markup</li>
                  <li>✓ Installation timeline</li>
                  <li>✓ Warranty and terms</li>
                  <li>✓ Payment options</li>
                  <li>✓ Professional layout</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-text mb-3">Internal BOM (PDF)</h3>
                <p className="text-text/80 text-sm mb-4">
                  Detailed bill of materials for your crew and ordering
                </p>
                <ul className="space-y-2 text-text/80 text-sm">
                  <li>✓ Complete material list with SKUs</li>
                  <li>✓ Exact quantities needed</li>
                  <li>✓ Unit costs and totals</li>
                  <li>✓ Labor hours breakdown</li>
                  <li>✓ Cost analysis (no markup shown)</li>
                  <li>✓ Sortable and printable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Customer Proposal */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Generating a Customer Proposal</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Step-by-Step</h3>
              <ol className="list-decimal list-inside space-y-3 text-text/80">
                <li>Open your estimate from the dashboard</li>
                <li>Review all details (linear feet, gates, pricing, customer info)</li>
                <li>Set your <strong className="text-text">markup percentage</strong> (this is your profit margin)</li>
                <li>Click <strong className="text-text">&quot;Generate Customer Proposal&quot;</strong></li>
                <li>Wait 5-10 seconds while PDF is created</li>
                <li>PDF downloads automatically to your computer</li>
                <li>Email to customer or print and deliver in person</li>
              </ol>
            </div>

            <h3 className="text-lg font-semibold text-text mb-3">What&apos;s Included in the Proposal</h3>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <ul className="space-y-3 text-text/80">
                <li>
                  <strong className="text-text">Header:</strong> Your company name, logo, contact info, proposal date
                </li>
                <li>
                  <strong className="text-text">Customer Details:</strong> Name, property address, contact info
                </li>
                <li>
                  <strong className="text-text">Project Scope:</strong> Fence type, linear feet, height, gates
                </li>
                <li>
                  <strong className="text-text">Pricing:</strong> Total bid price (materials + labor + markup)
                </li>
                <li>
                  <strong className="text-text">Timeline:</strong> Estimated start date and duration
                </li>
                <li>
                  <strong className="text-text">Warranty:</strong> 2-year workmanship warranty, manufacturer materials warranty
                </li>
                <li>
                  <strong className="text-text">Terms:</strong> Payment schedule, deposit requirements, change order policy
                </li>
                <li>
                  <strong className="text-text">Next Steps:</strong> Acceptance process and scheduling
                </li>
              </ul>
            </div>

            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> Set your company branding in Settings → Company Profile
              to customize the proposal header with your logo and colors.
            </p>
          </section>

          {/* Internal BOM */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Generating an Internal BOM</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Step-by-Step</h3>
              <ol className="list-decimal list-inside space-y-3 text-text/80">
                <li>Open your estimate from the dashboard</li>
                <li>Click <strong className="text-text">&quot;Generate Internal BOM&quot;</strong> or <strong className="text-text">&quot;Export BOM&quot;</strong></li>
                <li>PDF downloads with complete material breakdown</li>
                <li>Print for crew or use for material ordering</li>
              </ol>
            </div>

            <h3 className="text-lg font-semibold text-text mb-3">What&apos;s Included in the BOM</h3>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <div className="space-y-4 text-text/80">
                <div>
                  <strong className="text-text">Material Categories:</strong>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm text-text/80">
                    <li>Posts (quantity, size, SKU, unit cost, total)</li>
                    <li>Rails (quantity, length, material, cost)</li>
                    <li>Panels/Pickets (quantity, dimensions, total coverage)</li>
                    <li>Gates (type, size, hardware included)</li>
                    <li>Concrete (bags needed per post, total bags)</li>
                    <li>Hardware (screws, brackets, caps, hinges, latches)</li>
                    <li>Optional: Stain, sealer, post hole digger rental</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-text">Labor Breakdown:</strong>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm text-text/80">
                    <li>Post installation hours</li>
                    <li>Panel/rail assembly hours</li>
                    <li>Gate installation hours</li>
                    <li>Cleanup and finishing hours</li>
                    <li>Total labor hours and cost</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-text">Cost Summary:</strong>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm text-text/80">
                    <li>Total material cost</li>
                    <li>Total labor cost</li>
                    <li>Subtotal (no markup shown — internal use only)</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> Print the BOM and keep it with your job folder.
              Check off materials as you load the truck to ensure nothing is forgotten.
            </p>
          </section>

          {/* Customization */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Customizing Your Proposals</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Company Branding</h3>
                <p className="text-text/80 text-sm mb-3">
                  Settings → Company Profile → Branding
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                  <li>Upload your logo (PNG or JPG, max 500KB)</li>
                  <li>Set primary brand color (used for headers and accents)</li>
                  <li>Add company tagline or mission statement</li>
                  <li>Update contact info (phone, email, website, address)</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Payment Terms</h3>
                <p className="text-text/80 text-sm mb-3">
                  Customize default payment terms shown in proposals:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                  <li>Deposit percentage (typically 25-50%)</li>
                  <li>Payment schedule (e.g., 50% upfront, 50% on completion)</li>
                  <li>Accepted payment methods</li>
                  <li>Late payment policy</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Warranty Information</h3>
                <p className="text-text/80 text-sm">
                  Standard warranty is 2 years workmanship. You can customize this in Settings → Company Profile → Warranty Terms.
                  Some contractors offer extended warranties for premium materials.
                </p>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Best Practices</h2>

            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">1. Review Before Sending</h3>
                <p className="text-text/80 text-sm">
                  Always open and review the PDF before emailing to customers. Check for typos, verify pricing,
                  and ensure customer details are correct.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">2. Save Proposals with Estimates</h3>
                <p className="text-text/80 text-sm">
                  Keep a copy of every proposal you send. If customer accepts, you have a record of exactly what was quoted.
                  If they request changes, you can reference the original proposal.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">3. Set Proposal Expiration</h3>
                <p className="text-text/80 text-sm">
                  Default expiration is 30 days. Material prices fluctuate, so protect yourself with a clear expiration date.
                  After expiration, you can revise and resend with updated pricing.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">4. Use BOM for Ordering</h3>
                <p className="text-text/80 text-sm">
                  Don&apos;t estimate material orders from memory. Use the BOM to call/email your supplier with exact quantities and SKUs.
                  This reduces waste and ensures you don&apos;t run short mid-job.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Troubleshooting Export Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">PDF doesn&apos;t download</h3>
                <p className="text-text/80 text-sm">
                  Check your browser&apos;s download settings. Some browsers block automatic downloads.
                  Allow downloads from fenceestimatepro.com in your browser settings.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">PDF looks wrong when I open it</h3>
                <p className="text-text/80 text-sm">
                  Make sure you&apos;re using a modern PDF reader (Adobe Acrobat, Preview on Mac, Edge on Windows).
                  Old PDF readers may not display formatting correctly.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Logo doesn&apos;t appear in proposal</h3>
                <p className="text-text/80 text-sm">
                  Upload your logo in Settings → Company Profile → Branding. Logo must be PNG or JPG format, max 500KB.
                  After uploading, regenerate the proposal to see the logo.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Export is very slow</h3>
                <p className="text-text/80 text-sm">
                  PDF generation typically takes 5-10 seconds. If it&apos;s taking longer than 30 seconds, check your internet connection.
                  Complex estimates with many fence runs or gates may take slightly longer.
                </p>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/getting-started" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Creating Your First Estimate →</h3>
                <p className="text-text/80 text-sm">Learn how to build estimates before exporting</p>
              </Link>
              <Link href="/help/pricing" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Material Price Management →</h3>
                <p className="text-text/80 text-sm">Update prices for accurate estimates</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Problems with exports?</h3>
            <p className="text-text/80 mb-4">
              Our support team can help troubleshoot PDF issues or answer questions about customizing proposals.
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
