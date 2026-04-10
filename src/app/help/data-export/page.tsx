import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Export & Backup - FenceEstimatePro Help",
  description: "Download your data, export estimates, and backup your account",
  robots: { index: true, follow: true },
};

export default function DataExportPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Data Export &amp; Backup</h1>
          <p className="text-lg text-white/70">Download your data, export estimates, and backup your account</p>
          <div className="mt-4 text-sm text-white/50">3 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Your Data, Your Control</h2>
            <p className="text-white/80 mb-4">
              FenceEstimatePro gives you complete control over your data. You can export everything
              at any time — no restrictions, no fees.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-3">
                <strong className="text-white">What you can export:</strong>
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ All fence estimates and proposals</li>
                <li>✓ Customer contact information</li>
                <li>✓ Material prices and settings</li>
                <li>✓ Organization branding and preferences</li>
                <li>✓ Job history and closeout data</li>
              </ul>
            </div>
          </section>

          {/* Full Account Export */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Full Account Data Export</h2>
            <p className="text-white/80 mb-4">
              Export a complete copy of all your data in JSON format.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">How to Export</h3>
              <ol className="list-decimal list-inside space-y-3 text-white/80">
                <li>Navigate to <strong className="text-white">Settings</strong> in the dashboard</li>
                <li>Scroll to <strong className="text-white">Data & Privacy</strong> section</li>
                <li>Click <strong className="text-white">&quot;Export All Data&quot;</strong></li>
                <li>Wait 5-10 seconds while we package your data</li>
                <li>JSON file downloads automatically</li>
              </ol>
            </div>

            <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">What&apos;s Included</h3>
              <div className="space-y-3 text-white/80">
                <div>
                  <strong className="text-white">Organization Info:</strong> Company name, settings, branding
                </div>
                <div>
                  <strong className="text-white">Estimates:</strong> All saved estimates with full input/output data
                </div>
                <div>
                  <strong className="text-white">Customers:</strong> Names, addresses, contact info, project history
                </div>
                <div>
                  <strong className="text-white">Materials:</strong> SKUs, prices, descriptions
                </div>
                <div>
                  <strong className="text-white">Settings:</strong> Labor rates, waste percentages, calibration data
                </div>
              </div>
            </div>

            <p className="text-white/70 text-sm">
              💡 <strong className="text-white">Tip:</strong> The export is in JSON format — readable by any programming language
              or can be imported into spreadsheet software for analysis.
            </p>
          </section>

          {/* Individual Estimate Export */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Exporting Individual Estimates</h2>
            <p className="text-white/80 mb-4">
              Export single estimates as PDFs for customer proposals or Excel files for internal use.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">PDF Proposal</h3>
                <p className="text-white/70 text-sm mb-3">Professional customer-facing document with:</p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• Your company branding</li>
                  <li>• Project scope and pricing</li>
                  <li>• Installation timeline</li>
                  <li>• Terms and warranty</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Excel BOM</h3>
                <p className="text-white/70 text-sm mb-3">Internal bill of materials with:</p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• Itemized material list</li>
                  <li>• Quantities and costs</li>
                  <li>• Labor breakdown</li>
                  <li>• Sortable/editable format</li>
                </ul>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Export Steps</h3>
              <ol className="list-decimal list-inside space-y-2 text-white/80">
                <li>Open the estimate from your dashboard</li>
                <li>Click <strong className="text-white">&quot;Generate Customer Proposal&quot;</strong> or <strong className="text-white">&quot;Internal BOM&quot;</strong></li>
                <li>File downloads to your computer</li>
                <li>Email to customer or print for crew</li>
              </ol>
            </div>
          </section>

          {/* Backup Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Backup Best Practices</h2>

            <div className="space-y-4">
              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Monthly Full Export</h3>
                <p className="text-white/70 text-sm">
                  On the first of each month, export all your data and save to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm mt-2">
                  <li>Cloud storage (Dropbox, Google Drive, OneDrive)</li>
                  <li>External hard drive</li>
                  <li>Company backup server</li>
                </ul>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Archive Completed Jobs</h3>
                <p className="text-white/70 text-sm">
                  After job completion, export the final estimate and proposal PDFs to a local folder structure:
                </p>
                <div className="bg-black/30 rounded p-4 font-mono text-sm text-white/70 mt-3">
                  <p>Completed Jobs/</p>
                  <p className="ml-4">├── 2026/</p>
                  <p className="ml-8">├── January/</p>
                  <p className="ml-12">└── Smith_Backyard_Privacy.pdf</p>
                  <p className="ml-8">├── February/</p>
                  <p className="ml-8">└── March/</p>
                </div>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Keep Offline Copies</h3>
                <p className="text-white/70 text-sm">
                  Don&apos;t rely solely on cloud storage. Keep a local copy of critical data on an external drive
                  or backup NAS in case of internet outages or cloud service issues.
                </p>
              </div>
            </div>
          </section>

          {/* Data Portability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Data Portability</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-4">
              <p className="text-white/80 mb-4">
                Your data is yours. You can:
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ <strong className="text-white">Export anytime:</strong> No restrictions, export hourly if needed</li>
                <li>✓ <strong className="text-white">No lock-in:</strong> Standard JSON format works anywhere</li>
                <li>✓ <strong className="text-white">Take it with you:</strong> If you leave FenceEstimatePro, your data comes too</li>
                <li>✓ <strong className="text-white">Import elsewhere:</strong> JSON can be converted to CSV, Excel, database formats</li>
              </ul>
            </div>
            <p className="text-white/70 text-sm">
              This is part of our GDPR and CCPA compliance commitment — you have the right to data portability.
            </p>
          </section>

          {/* What Happens to Data After Account Deletion */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">After Account Deletion</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                If you delete your account:
              </p>
              <ol className="list-decimal list-inside space-y-3 text-white/80">
                <li>
                  <strong className="text-white">30-day grace period:</strong> Data is marked for deletion but still recoverable
                  if you change your mind
                </li>
                <li>
                  <strong className="text-white">Export before deletion:</strong> We recommend exporting all data before
                  initiating account deletion
                </li>
                <li>
                  <strong className="text-white">Permanent deletion:</strong> After 30 days, all data is permanently deleted
                  and cannot be recovered
                </li>
                <li>
                  <strong className="text-white">No backups retained:</strong> We don&apos;t keep backups of deleted accounts
                </li>
              </ol>
            </div>
            <p className="text-white/70 text-sm mt-4">
              <Link href="/help/account-deletion" className="text-fence-400 hover:text-fence-300">
                Learn more about account deletion →
              </Link>
            </p>
          </section>

          {/* Common Questions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Common Questions</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I automate exports?</h3>
                <p className="text-white/70">
                  Not currently, but it&apos;s on the roadmap. For now, you&apos;ll need to manually trigger exports
                  from the Settings page.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What format is the JSON export?</h3>
                <p className="text-white/70">
                  It&apos;s a single JSON file with top-level keys for each data type (estimates, customers, materials, etc.).
                  Each key contains an array of records. Well-formatted and readable.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is there a size limit on exports?</h3>
                <p className="text-white/70">
                  No. If you have 10,000 estimates, you can export all of them. Large exports may take 15-30 seconds
                  to process.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I re-import exported data?</h3>
                <p className="text-white/70">
                  Not currently through the UI, but our support team can assist with bulk data imports if you&apos;re
                  migrating back or need to restore from a backup. Contact support for help.
                </p>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/account-deletion" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Account Deletion →</h3>
                <p className="text-white/70 text-sm">How to delete your account and data retention policy</p>
              </Link>
              <Link href="/help/export" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Exporting Estimates →</h3>
                <p className="text-white/70 text-sm">PDF and Excel export guide</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">Need help with data export?</h3>
            <p className="text-white/70 mb-4">
              Our support team can assist with bulk exports, data migration, or backup strategies.
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
