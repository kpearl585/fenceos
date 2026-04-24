import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Common Issues & Solutions - FenceEstimatePro Help",
  description: "Fix login problems, PDF generation errors, and more common issues",
  robots: { index: true, follow: true },
};

export default function TroubleshootingPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Common Issues &amp; Solutions</h1>
          <p className="text-lg text-text/80">Fix login problems, PDF generation errors, and more</p>
          <div className="mt-4 text-sm text-muted">6 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Login Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Login & Authentication Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Can&apos;t log in - &quot;Invalid email or password&quot;</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text/80 text-sm">
                  <li>Double-check your email address for typos</li>
                  <li>Make sure Caps Lock is off when entering password</li>
                  <li>Click &quot;Forgot Password&quot; to reset your password</li>
                  <li>Clear your browser cache and cookies, then try again</li>
                  <li>Try a different browser (Chrome, Edge, Firefox)</li>
                </ol>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Password reset email not arriving</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                  <li>Check your spam/junk folder</li>
                  <li>Add support@fenceestimatepro.com to your contacts</li>
                  <li>Wait 10 minutes (sometimes email delivery is delayed)</li>
                  <li>Request another reset email</li>
                  <li>Contact support if still not received after 30 minutes</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Automatically logged out frequently</h3>
                <p className="text-text/80 text-sm mb-3">
                  Sessions expire after 7 days of inactivity or if you clear browser cookies.
                </p>
                <p className="text-text/80 text-sm">
                  <strong className="text-text">Solutions:</strong> Enable &quot;Remember Me&quot; when logging in. Make sure your browser
                  allows cookies from fenceestimatepro.com. Disable browser extensions that block cookies.
                </p>
              </div>
            </div>
          </section>

          {/* PDF Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">PDF Generation Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">PDF download fails or is blank</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text/80 text-sm">
                  <li>Check browser settings — allow downloads from fenceestimatepro.com</li>
                  <li>Disable ad blockers or privacy extensions temporarily</li>
                  <li>Try a different browser (Chrome recommended for PDF generation)</li>
                  <li>Update your browser to the latest version</li>
                  <li>Check available disk space (PDFs need ~5MB free space)</li>
                </ol>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">PDF generation times out or takes forever</h3>
                <p className="text-text/80 text-sm mb-3">
                  Normal generation time is 5-10 seconds. If longer:
                </p>
                <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                  <li>Check your internet connection speed</li>
                  <li>Try generating during off-peak hours (6am-9am local time)</li>
                  <li>Simplify estimate if it has 50+ fence runs (break into multiple estimates)</li>
                  <li>Wait 1 minute before trying again (server may be processing)</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Logo not showing in PDF</h3>
                <p className="text-text/80 text-sm">
                  Settings → Company Profile → Branding → Upload Logo. Logo must be PNG or JPG, max 500KB.
                  After uploading, regenerate PDF to see logo appear.
                </p>
              </div>
            </div>
          </section>

          {/* Estimate Builder Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Estimate Builder Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Material prices are wrong or outdated</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                  <li>Go to Settings → Materials → Update Prices</li>
                  <li>Manually edit individual material prices</li>
                  <li>Import new pricing from supplier CSV (Business plan)</li>
                  <li>Contact support to sync with your supplier&apos;s API</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Calculations seem incorrect</h3>
                <p className="text-text/80 text-sm mb-3">
                  Our calculation engine uses industry-standard formulas:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                  <li>Posts: 1 per 8 feet (on-center spacing)</li>
                  <li>Concrete: 50-60 lbs per post (3&apos; deep)</li>
                  <li>Waste factor: 5-10% depending on material</li>
                  <li>Labor: Based on installation rates per linear foot</li>
                </ul>
                <p className="text-text/80 text-sm mt-3">
                  If results still seem off, check Settings → Calculation Settings for custom overrides.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Can&apos;t save estimate</h3>
                <p className="text-text/80 text-sm">
                  <strong className="text-text">Common causes:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>Missing required fields (customer name, linear feet)</li>
                  <li>Internet connection lost while saving</li>
                  <li>Estimate name contains special characters (use letters, numbers, spaces only)</li>
                  <li>Reached plan limit for saved estimates (upgrade or delete old estimates)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Extraction Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">AI Extraction Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">AI extraction returns &quot;No data found&quot;</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                  <li>Paste longer message with more context</li>
                  <li>Include the full email thread (not just one line)</li>
                  <li>Make sure message contains fence-related keywords</li>
                  <li>Try extracting from a different customer message</li>
                  <li>Fall back to manual entry if message is too vague</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Extracted data is incorrect</h3>
                <p className="text-text/80 text-sm">
                  AI extraction is a time-saving tool, not perfect. Always review extracted data:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>Verify linear footage matches customer&apos;s measurements</li>
                  <li>Check fence type and height</li>
                  <li>Confirm number and size of gates</li>
                  <li>Validate customer contact information</li>
                </ul>
                <p className="text-text/80 text-sm mt-3">
                  Edit any incorrect fields before saving the estimate.
                </p>
              </div>
            </div>
          </section>

          {/* Performance Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Performance & Speed Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">App is slow or laggy</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text/80 text-sm">
                  <li>Clear browser cache: Settings → Privacy → Clear browsing data</li>
                  <li>Close other browser tabs (each tab uses memory)</li>
                  <li>Restart your browser</li>
                  <li>Check internet speed (run speed test — need 5+ Mbps)</li>
                  <li>Try a different browser (Chrome is fastest for our app)</li>
                  <li>Update browser to latest version</li>
                  <li>Restart your computer (free up RAM)</li>
                </ol>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Pages take forever to load</h3>
                <p className="text-text/80 text-sm">
                  If pages are loading slowly, it&apos;s usually an internet connection issue:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>Run speed test — minimum 1 Mbps down, 5+ Mbps recommended</li>
                  <li>Move closer to WiFi router or use ethernet cable</li>
                  <li>Pause large downloads (streaming, cloud backups)</li>
                  <li>Try cellular hotspot if WiFi is unreliable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Data & Sync Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Changes aren&apos;t saving</h3>
                <p className="text-text/80 text-sm mb-3">
                  <strong className="text-text">Solutions:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-text/80 ml-4 text-sm">
                  <li>Check internet connection (top-right corner shows connection status)</li>
                  <li>Wait 5 seconds after making changes before closing tab</li>
                  <li>Click &quot;Save&quot; button explicitly (don&apos;t rely on auto-save)</li>
                  <li>Refresh page and check if changes persisted</li>
                  <li>If still not saving, contact support immediately</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Data from yesterday is missing</h3>
                <p className="text-text/80 text-sm">
                  We automatically back up all data every hour. Data loss is extremely rare.
                </p>
                <p className="text-text/80 text-sm mt-3">
                  <strong className="text-text">Steps:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)</li>
                  <li>Log out and log back in</li>
                  <li>Check if you&apos;re logged into the correct organization</li>
                  <li>Contact support immediately — we can restore from backups</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Mobile Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Mobile-Specific Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">App doesn&apos;t work well on phone</h3>
                <p className="text-text/80 text-sm">
                  FenceEstimatePro is optimized for desktop/laptop use. Mobile works for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>✓ Viewing saved estimates</li>
                  <li>✓ Downloading PDFs on job sites</li>
                  <li>✓ Quick customer lookups</li>
                  <li>✗ Creating complex estimates (use desktop)</li>
                </ul>
                <p className="text-text/80 text-sm mt-3">
                  For best experience, use a laptop or tablet with keyboard for estimate creation.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">PDFs won&apos;t download on iPhone/iPad</h3>
                <p className="text-text/80 text-sm">
                  iOS Safari requires special handling for downloads:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>When PDF generates, it opens in a new tab</li>
                  <li>Tap the Share button (box with arrow)</li>
                  <li>Select &quot;Save to Files&quot; or &quot;Save to iCloud Drive&quot;</li>
                  <li>Or select &quot;Open in...&quot; to open in another app</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Still Having Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Still Having Issues?</h2>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">When Contacting Support</h3>
              <p className="text-text/80 text-sm mb-4">
                Help us help you faster by including:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>✓ Your browser name and version (Chrome 120, Safari 17, etc.)</li>
                <li>✓ Operating system (Windows 11, macOS 14, etc.)</li>
                <li>✓ Screenshot of the error or issue</li>
                <li>✓ Steps to reproduce the problem</li>
                <li>✓ When the issue started (today, last week, always)</li>
                <li>✓ What you&apos;ve already tried</li>
              </ul>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/browsers" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Browser Compatibility →</h3>
                <p className="text-text/80 text-sm">Check recommended browsers and system requirements</p>
              </Link>
              <Link href="/help" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Browse Help Articles →</h3>
                <p className="text-text/80 text-sm">Find answers in other help topics</p>
              </Link>
            </div>
          </section>

          {/* Contact Support */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Can&apos;t find a solution?</h3>
            <p className="text-text/80 mb-4">
              Our support team is here to help. We typically respond within 24 hours (faster for urgent issues).
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
