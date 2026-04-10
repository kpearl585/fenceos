import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Extraction from Customer Messages - FenceEstimatePro Help",
  description: "Automatically extract fence specs from emails and texts using AI",
  robots: { index: true, follow: true },
};

export default function AIExtractionPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">AI Extraction from Customer Messages</h1>
          <p className="text-lg text-white/70">Automatically extract fence specs from emails and texts</p>
          <div className="mt-4 text-sm text-white/50">6 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">What is AI Extraction?</h2>
            <p className="text-white/80 mb-4">
              AI Extraction uses advanced language models to automatically read customer messages
              (emails, texts, inquiry forms) and extract fence project details like:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <ul className="space-y-2 text-white/80">
                <li>✓ Fence type (vinyl, wood, chain link, aluminum)</li>
                <li>✓ Linear footage and height</li>
                <li>✓ Number and size of gates</li>
                <li>✓ Property location and customer contact info</li>
                <li>✓ Special requests or preferences</li>
                <li>✓ Timeline and budget constraints</li>
              </ul>
            </div>
            <p className="text-white/70 text-sm mt-4">
              💡 <strong className="text-white">Time Savings:</strong> What takes 5-10 minutes to manually enter
              becomes a 30-second paste-and-extract operation.
            </p>
          </section>

          {/* How It Works */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <ol className="list-decimal list-inside space-y-4 text-white/80">
                <li>
                  <strong className="text-white">Copy customer message:</strong> From email, text, or contact form
                </li>
                <li>
                  <strong className="text-white">Click &quot;AI Extract&quot;:</strong> Found in New Estimate screen
                </li>
                <li>
                  <strong className="text-white">Paste message:</strong> Into the text box
                </li>
                <li>
                  <strong className="text-white">AI processes:</strong> Extracts specs in ~5 seconds
                </li>
                <li>
                  <strong className="text-white">Review &amp; refine:</strong> Verify extracted data, fill any gaps
                </li>
                <li>
                  <strong className="text-white">Generate estimate:</strong> Proceed normally with pre-filled form
                </li>
              </ol>
            </div>
          </section>

          {/* Example Messages */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Example Messages That Work Well</h2>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Example 1: Email Inquiry</h3>
                <div className="bg-black/30 rounded p-4 font-mono text-sm text-white/70 mb-4">
                  <p className="mb-2">Subject: Fence quote needed</p>
                  <p className="mb-2">Hi, I need a quote for a privacy fence in my backyard.</p>
                  <p className="mb-2">Address: 123 Oak Street, Austin, TX</p>
                  <p className="mb-2">I measured about 180 feet total. I want 6 foot height, wood or vinyl.</p>
                  <p className="mb-2">Need one 4-foot gate on the side. When can you start?</p>
                  <p>John Smith | 512-555-0123 | john@email.com</p>
                </div>
                <div className="text-sm">
                  <p className="text-white/70 mb-2"><strong className="text-white">AI Extracts:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Fence type: Wood or Vinyl (you choose)</li>
                    <li>Linear feet: 180 LF</li>
                    <li>Height: 6&apos;</li>
                    <li>Gates: 1 × 4&apos; single gate</li>
                    <li>Customer: John Smith, 512-555-0123, john@email.com</li>
                    <li>Address: 123 Oak Street, Austin, TX</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Example 2: Detailed Text Message</h3>
                <div className="bg-black/30 rounded p-4 font-mono text-sm text-white/70 mb-4">
                  <p className="mb-2">Hey, need a fence estimate.</p>
                  <p className="mb-2">Back fence along property line = 150 ft.</p>
                  <p className="mb-2">Both sides = 75 ft each = 150 more.</p>
                  <p className="mb-2">Total 300 feet.</p>
                  <p className="mb-2">Want chain link, 5 feet high. Need a 12 foot double gate for RV access.</p>
                  <p>Mary Johnson, 456 Elm Ave, Dallas. Call me 214-555-7890.</p>
                </div>
                <div className="text-sm">
                  <p className="text-white/70 mb-2"><strong className="text-white">AI Extracts:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Fence type: Chain Link</li>
                    <li>Linear feet: 300 LF</li>
                    <li>Height: 5&apos;</li>
                    <li>Gates: 1 × 12&apos; double gate</li>
                    <li>Customer: Mary Johnson, 214-555-7890</li>
                    <li>Address: 456 Elm Ave, Dallas</li>
                    <li>Note: RV access requirement</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Example 3: Complex Requirements</h3>
                <div className="bg-black/30 rounded p-4 font-mono text-sm text-white/70 mb-4">
                  <p className="mb-2">Looking for fence estimate. Property at 789 Pine Road, Houston.</p>
                  <p className="mb-2">Backyard privacy fence: 200 linear feet, 6 feet tall, prefer vinyl white.</p>
                  <p className="mb-2">Side yard decorative fence: 100 linear feet, 4 feet tall, aluminum black.</p>
                  <p className="mb-2">Need 1 walk-through gate (3 ft) on side and 1 double driveway gate (14 ft) in back.</p>
                  <p className="mb-2">Soil is very rocky, lots of tree roots. Sloped yard.</p>
                  <p>Budget around $8k. Can you do it in 2 weeks?</p>
                  <p>Contact: Robert Williams | 713-555-4321 | rwilliams@email.com</p>
                </div>
                <div className="text-sm">
                  <p className="text-white/70 mb-2"><strong className="text-white">AI Extracts:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-white/70 ml-4">
                    <li>Run 1: Vinyl, 200 LF, 6&apos; height, white</li>
                    <li>Run 2: Aluminum, 100 LF, 4&apos; height, black</li>
                    <li>Gates: 1 × 3&apos; single, 1 × 14&apos; double</li>
                    <li>Customer: Robert Williams, 713-555-4321, rwilliams@email.com</li>
                    <li>Address: 789 Pine Road, Houston</li>
                    <li>Notes: Rocky soil, tree roots, sloped yard, $8k budget, 2-week timeline</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* What AI Can't Extract */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">What AI Can&apos;t Extract (Yet)</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                AI is smart, but not perfect. You&apos;ll need to manually add or clarify:
              </p>
              <ul className="space-y-3 text-white/80">
                <li>
                  <strong className="text-white">Vague descriptions:</strong> &quot;A fence for my house&quot; (no specs)
                </li>
                <li>
                  <strong className="text-white">Ambiguous footage:</strong> &quot;A big backyard&quot; (needs measurement)
                </li>
                <li>
                  <strong className="text-white">Missing contact info:</strong> Message doesn&apos;t include name/phone/email
                </li>
                <li>
                  <strong className="text-white">Conflicting info:</strong> Says 6 feet in one place, 5 feet in another
                </li>
                <li>
                  <strong className="text-white">Complex terrain:</strong> AI can note &quot;sloped&quot; but can&apos;t quantify angle
                </li>
                <li>
                  <strong className="text-white">Pricing expectations:</strong> AI extracts budget but doesn&apos;t validate feasibility
                </li>
              </ul>
            </div>
            <p className="text-white/70 text-sm mt-4">
              💡 <strong className="text-white">Pro Tip:</strong> Always review AI-extracted data before generating a proposal.
              Treat it as a time-saving assistant, not a replacement for your expertise.
            </p>
          </section>

          {/* Improving Extraction Accuracy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Improving Extraction Accuracy</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">1. Include Full Message Context</h3>
                <p className="text-white/70 text-sm">
                  Paste the entire email thread or message, including signatures and quoted text.
                  Context helps AI understand customer intent and catch details spread across multiple messages.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">2. Clean Up Formatting</h3>
                <p className="text-white/70 text-sm">
                  Remove excessive line breaks, email headers (Cc:, Bcc:), and legal disclaimers.
                  These can confuse the AI and reduce extraction quality.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">3. Train Customers Over Time</h3>
                <p className="text-white/70 text-sm mb-3">
                  After a few extractions, you&apos;ll notice what details customers commonly leave out.
                  Update your website inquiry form or email auto-responder to prompt for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm">
                  <li>Approximate linear footage (or property dimensions)</li>
                  <li>Desired fence height</li>
                  <li>Preferred material (if any)</li>
                  <li>Number and type of gates needed</li>
                  <li>Project address and timeline</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Privacy & Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Privacy &amp; Security</h2>
            <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                <strong className="text-white">Your customer data is protected:</strong>
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ Messages are processed securely and not stored permanently</li>
                <li>✓ AI extraction uses enterprise-grade OpenAI API with data privacy guarantees</li>
                <li>✓ Extracted data stays in your organization (not shared)</li>
                <li>✓ No training on your customer messages (zero data retention by AI provider)</li>
                <li>✓ Compliant with GDPR, CCPA, and standard privacy regulations</li>
              </ul>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Troubleshooting</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">AI extraction returns &quot;No data found&quot;</h3>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Solution:</strong> Message might be too vague or short.
                  Try pasting a longer message with more context, or manually enter the estimate details.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Extracted footage is way off</h3>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Solution:</strong> Customer may have stated footage ambiguously
                  (&quot;100 feet on each side&quot; could mean 100 total or 200 total). Always verify with customer before quoting.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Wrong fence type extracted</h3>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Solution:</strong> If customer said &quot;vinyl or wood, not sure,&quot;
                  AI picks one. You can easily change it in the form after extraction.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Extraction is slow or times out</h3>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">Solution:</strong> Very long messages (multiple pages) can take 10-15 seconds.
                  If it times out, try shortening the message or removing quoted email threads.
                </p>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Best Practices</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-4">
                <h3 className="text-md font-semibold text-white mb-2">✓ Do</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• Paste entire customer message</li>
                  <li>• Review all extracted fields</li>
                  <li>• Verify measurements before quoting</li>
                  <li>• Use AI for first draft, refine manually</li>
                  <li>• Call customer to confirm unclear details</li>
                </ul>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-4">
                <h3 className="text-md font-semibold text-white mb-2">✗ Don&apos;t</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>• Send proposals without verifying data</li>
                  <li>• Trust vague footage estimates blindly</li>
                  <li>• Skip site visit based on AI extraction</li>
                  <li>• Assume AI caught all customer requirements</li>
                  <li>• Use AI extraction as excuse for errors</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/getting-started" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Creating Your First Estimate →</h3>
                <p className="text-white/70 text-sm">Manual estimate creation walkthrough</p>
              </Link>
              <Link href="/help/export" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Exporting Estimates →</h3>
                <p className="text-white/70 text-sm">Generate PDFs and send to customers</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">AI extraction not working as expected?</h3>
            <p className="text-white/70 mb-4">
              Send us an example message and we&apos;ll help troubleshoot the extraction.
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
