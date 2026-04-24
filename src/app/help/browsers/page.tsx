import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browser Compatibility - FenceEstimatePro Help",
  description: "Recommended browsers and known issues for FenceEstimatePro",
  robots: { index: true, follow: true },
};

export default function BrowsersPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Browser Compatibility</h1>
          <p className="text-lg text-text/80">Recommended browsers and known issues</p>
          <div className="mt-4 text-sm text-muted">2 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Recommended Browsers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Recommended Browsers</h2>
            <p className="text-text/80 mb-6">
              FenceEstimatePro works best on modern, up-to-date browsers:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-lg font-semibold text-text">Chrome</h3>
                </div>
                <p className="text-text/80 text-sm mb-2">
                  <strong className="text-text">Version 100+</strong> (recommended)
                </p>
                <p className="text-muted text-sm">
                  Best performance, full feature support
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-lg font-semibold text-text">Edge</h3>
                </div>
                <p className="text-text/80 text-sm mb-2">
                  <strong className="text-text">Version 100+</strong> (recommended)
                </p>
                <p className="text-muted text-sm">
                  Excellent compatibility (Chromium-based)
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-lg font-semibold text-text">Safari</h3>
                </div>
                <p className="text-text/80 text-sm mb-2">
                  <strong className="text-text">Version 15+</strong> (macOS/iOS)
                </p>
                <p className="text-muted text-sm">
                  Works well, some PDF features may vary
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-lg font-semibold text-text">Firefox</h3>
                </div>
                <p className="text-text/80 text-sm mb-2">
                  <strong className="text-text">Version 100+</strong>
                </p>
                <p className="text-muted text-sm">
                  Fully supported
                </p>
              </div>
            </div>
          </section>

          {/* Mobile Browsers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Mobile Browsers</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-4">
              <p className="text-text/80 mb-4">
                FenceEstimatePro is fully responsive and works on mobile devices:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>✓ <strong className="text-text">iOS Safari:</strong> iOS 15+ (iPhone, iPad)</li>
                <li>✓ <strong className="text-text">Chrome Mobile:</strong> Android 10+</li>
                <li>✓ <strong className="text-text">Samsung Internet:</strong> Latest version</li>
              </ul>
            </div>
            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Note:</strong> For the best experience creating estimates, we recommend using a desktop or laptop.
              Mobile is great for viewing estimates on job sites or sending proposals to customers.
            </p>
          </section>

          {/* Known Issues */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Known Issues</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Internet Explorer</h3>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="text-text/80 text-sm">
                      <strong className="text-text">Not supported.</strong> Internet Explorer is deprecated by Microsoft.
                      Please upgrade to Edge, Chrome, or Firefox.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Older Browser Versions</h3>
                <p className="text-text/80 text-sm mb-3">
                  Browsers older than 2 years may have issues:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                  <li>PDF downloads may fail</li>
                  <li>Layout issues on estimate builder</li>
                  <li>Slow performance</li>
                  <li>Security vulnerabilities</li>
                </ul>
                <p className="text-text/80 text-sm mt-3">
                  <strong className="text-text">Solution:</strong> Update your browser to the latest version.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Safari Private Mode</h3>
                <p className="text-text/80 text-sm">
                  Some features may not work correctly in Safari&apos;s Private Browsing mode due to storage restrictions.
                  Use regular mode for full functionality.
                </p>
              </div>
            </div>
          </section>

          {/* Feature Support */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Feature Support by Browser</h2>

            <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="text-left p-4 text-text font-semibold">Feature</th>
                    <th className="text-center p-4 text-text font-semibold">Chrome</th>
                    <th className="text-center p-4 text-text font-semibold">Safari</th>
                    <th className="text-center p-4 text-text font-semibold">Firefox</th>
                    <th className="text-center p-4 text-text font-semibold">Edge</th>
                  </tr>
                </thead>
                <tbody className="text-text/80">
                  <tr className="border-t border-border">
                    <td className="p-4">PDF Generation</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">Excel Export</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">AI Extraction</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">Drag & Drop</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">Offline Support</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">⚠️</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-muted text-sm mt-4">
              ⚠️ = Limited support or requires specific settings
            </p>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Troubleshooting Browser Issues</h2>

            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Clear Cache & Cookies</h3>
                <p className="text-text/80 text-sm mb-3">
                  If you experience strange behavior, clearing your browser cache often helps:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm">
                  <li><strong className="text-text">Chrome/Edge:</strong> Settings → Privacy → Clear browsing data</li>
                  <li><strong className="text-text">Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li><strong className="text-text">Firefox:</strong> Options → Privacy → Clear Data</li>
                </ul>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Disable Browser Extensions</h3>
                <p className="text-text/80 text-sm">
                  Ad blockers, privacy extensions, or password managers can sometimes interfere with FenceEstimatePro.
                  Try disabling extensions if you encounter issues.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Enable JavaScript</h3>
                <p className="text-text/80 text-sm">
                  FenceEstimatePro requires JavaScript to function. Make sure it&apos;s enabled in your browser settings.
                </p>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Allow Cookies</h3>
                <p className="text-text/80 text-sm">
                  We use cookies for authentication and session management. Blocking cookies will prevent login.
                </p>
              </div>
            </div>
          </section>

          {/* System Requirements */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">System Requirements</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <ul className="space-y-3 text-text/80">
                <li>
                  <strong className="text-text">Internet Connection:</strong> Broadband (1 Mbps+ recommended)
                </li>
                <li>
                  <strong className="text-text">Screen Resolution:</strong> 1280x720 minimum (1920x1080 recommended)
                </li>
                <li>
                  <strong className="text-text">RAM:</strong> 4GB minimum (8GB recommended)
                </li>
                <li>
                  <strong className="text-text">Operating System:</strong> Windows 10+, macOS 11+, or modern Linux
                </li>
              </ul>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Still having browser issues?</h3>
            <p className="text-text/80 mb-4">
              Contact support with your browser name and version, and we&apos;ll help troubleshoot.
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
