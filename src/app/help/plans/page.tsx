import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans & Features - FenceEstimatePro Help",
  description: "Compare Starter, Pro, and Business plans to find the right fit for your fence company",
  robots: { index: true, follow: true },
};

export default function PlansPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Pricing Plans &amp; Features</h1>
          <p className="text-lg text-white/70">Compare plans to find the right fit for your fence company</p>
          <div className="mt-4 text-sm text-white/50">3 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Choose Your Plan</h2>
            <p className="text-white/80 mb-6">
              FenceEstimatePro offers flexible pricing to grow with your business. All plans include core features
              with increasing limits and capabilities as you scale.
            </p>

            <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
              <p className="text-white/80 mb-3">
                <strong className="text-white">All plans include:</strong>
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ Unlimited fence estimates</li>
                <li>✓ Advanced estimate builder with fence runs & gates</li>
                <li>✓ Professional PDF proposals</li>
                <li>✓ Customer management</li>
                <li>✓ Material price tracking</li>
                <li>✓ Installation timeline calculator</li>
                <li>✓ Mobile-responsive interface</li>
                <li>✓ Email support</li>
              </ul>
            </div>
          </section>

          {/* Plan Comparison */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Plan Comparison</h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <div className="text-3xl font-bold text-white mb-4">
                  $49<span className="text-lg text-white/60">/mo</span>
                </div>
                <p className="text-white/70 text-sm mb-6">
                  Perfect for solo contractors and small teams getting started
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">1 user account</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">50 estimates/month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">100 customers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">PDF & Excel export</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Email support (48hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/30 mt-0.5">✗</span>
                    <span className="text-white/40">AI extraction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/30 mt-0.5">✗</span>
                    <span className="text-white/40">Custom branding</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=starter"
                  className="mt-6 block w-full text-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-fence-500/20 border-2 border-fence-500 rounded-xl p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-fence-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  MOST POPULAR
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-3xl font-bold text-white mb-4">
                  $99<span className="text-lg text-white/60">/mo</span>
                </div>
                <p className="text-white/70 text-sm mb-6">
                  For growing companies that need advanced features and AI
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Up to 3 users</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Unlimited estimates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Unlimited customers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">AI extraction (200/mo)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Custom branding & logo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Priority support (24hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/30 mt-0.5">✗</span>
                    <span className="text-white/40">API access</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=pro"
                  className="mt-6 block w-full text-center bg-fence-500 hover:bg-fence-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Business */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-white mb-2">Business</h3>
                <div className="text-3xl font-bold text-white mb-4">
                  $199<span className="text-lg text-white/60">/mo</span>
                </div>
                <p className="text-white/70 text-sm mb-6">
                  For established companies with multiple crews and integrations
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Unlimited users</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Unlimited everything</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Unlimited AI extraction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Advanced reporting</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">API access</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Dedicated support (4hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-fence-400 mt-0.5">✓</span>
                    <span className="text-white/80">Phone support</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=business"
                  className="mt-6 block w-full text-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </section>

          {/* Free Trial */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">14-Day Free Trial</h2>
            <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                Try any plan free for 14 days — no credit card required:
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ Full access to all plan features</li>
                <li>✓ No credit card needed to start</li>
                <li>✓ Cancel anytime during trial (no charge)</li>
                <li>✓ Easy upgrade/downgrade after trial</li>
                <li>✓ Data is yours to export if you cancel</li>
              </ul>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Common Questions</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I change plans later?</h3>
                <p className="text-white/70">
                  Yes! Upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What happens if I exceed my plan limits?</h3>
                <p className="text-white/70">
                  We&apos;ll notify you when you&apos;re approaching limits. You can upgrade to continue, or wait until next month when limits reset.
                  No overage fees.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Do you offer annual billing?</h3>
                <p className="text-white/70">
                  Yes! Save 20% with annual billing. Starter: $470/year, Pro: $950/year, Business: $1,900/year.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is there a contract or commitment?</h3>
                <p className="text-white/70">
                  No contracts! Monthly plans are month-to-month. Cancel anytime. Annual plans are paid upfront but can be canceled for a prorated refund.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I add more users to Pro plan?</h3>
                <p className="text-white/70">
                  Pro includes up to 3 users. You can add extra users for $20/month each, or upgrade to Business for unlimited users.
                </p>
              </div>
            </div>
          </section>

          {/* Enterprise */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Enterprise / Custom Plans</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                Need more than the Business plan? We offer custom enterprise plans with:
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ Custom user limits and features</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ SLA guarantees and uptime commitments</li>
                <li>✓ Custom integrations and API limits</li>
                <li>✓ On-premise deployment options</li>
                <li>✓ Volume pricing for large organizations</li>
              </ul>
              <p className="text-white/70 text-sm mt-4">
                Contact <strong className="text-white">sales@fenceestimatepro.com</strong> to discuss enterprise pricing.
              </p>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/billing" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Billing & Payment FAQ →</h3>
                <p className="text-white/70 text-sm">Payment methods, invoices, cancellation</p>
              </Link>
              <Link href="/signup" className="block p-6 bg-fence-500/20 border border-fence-500 rounded-lg hover:bg-fence-500/30 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Start Free Trial →</h3>
                <p className="text-white/70 text-sm">14 days free, no credit card required</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">Not sure which plan is right for you?</h3>
            <p className="text-white/70 mb-4">
              We&apos;ll help you choose the best plan for your business size and needs.
            </p>
            <a
              href="mailto:sales@fenceestimatepro.com"
              className="inline-block bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
