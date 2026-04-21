import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans & Features - FenceEstimatePro Help",
  description: "Compare Starter, Pro, and Business plans to find the right fit for your fence company",
  robots: { index: true, follow: true },
};

export default function PlansPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Pricing Plans &amp; Features</h1>
          <p className="text-lg text-text/80">Compare plans to find the right fit for your fence company</p>
          <div className="mt-4 text-sm text-muted">3 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Choose Your Plan</h2>
            <p className="text-text/80 mb-6">
              FenceEstimatePro offers flexible pricing to grow with your business. All plans include core features
              with increasing limits and capabilities as you scale.
            </p>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
              <p className="text-text/80 mb-3">
                <strong className="text-text">All plans include:</strong>
              </p>
              <ul className="space-y-2 text-text/80">
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
            <h2 className="text-2xl font-bold text-text mb-6">Plan Comparison</h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="bg-surface-2 border border-border rounded-xl p-6">
                <h3 className="text-2xl font-bold text-text mb-2">Starter</h3>
                <div className="text-3xl font-bold text-text mb-4">
                  $49<span className="text-lg text-muted">/mo</span>
                </div>
                <p className="text-text/80 text-sm mb-6">
                  Perfect for solo contractors and small teams getting started
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">1 user account</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">50 estimates/month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">100 customers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">PDF & Excel export</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Email support (48hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted mt-0.5">✗</span>
                    <span className="text-muted">AI extraction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted mt-0.5">✗</span>
                    <span className="text-muted">Custom branding</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=starter"
                  className="mt-6 block w-full text-center bg-surface-3 hover:bg-surface-2 text-text px-4 py-3 rounded-lg font-semibold transition-colors duration-150"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-accent/15 border-2 border-accent rounded-xl p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-background px-3 py-1 rounded-full text-xs font-semibold">
                  MOST POPULAR
                </div>

                <h3 className="text-2xl font-bold text-text mb-2">Pro</h3>
                <div className="text-3xl font-bold text-text mb-4">
                  $99<span className="text-lg text-muted">/mo</span>
                </div>
                <p className="text-text/80 text-sm mb-6">
                  For growing companies that need advanced features and AI
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Up to 3 users</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Unlimited estimates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Unlimited customers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">AI extraction (200/mo)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Custom branding & logo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Priority support (24hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted mt-0.5">✗</span>
                    <span className="text-muted">API access</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=pro"
                  className="mt-6 block w-full text-center bg-accent hover:bg-accent-light text-background px-4 py-3 rounded-lg font-semibold transition-colors duration-150"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Business */}
              <div className="bg-surface-2 border border-border rounded-xl p-6">
                <h3 className="text-2xl font-bold text-text mb-2">Business</h3>
                <div className="text-3xl font-bold text-text mb-4">
                  $199<span className="text-lg text-muted">/mo</span>
                </div>
                <p className="text-text/80 text-sm mb-6">
                  For established companies with multiple crews and integrations
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Unlimited users</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Unlimited everything</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Unlimited AI extraction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Advanced reporting</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">API access</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Dedicated support (4hr)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent-light mt-0.5">✓</span>
                    <span className="text-text/80">Phone support</span>
                  </div>
                </div>

                <Link
                  href="/signup?plan=business"
                  className="mt-6 block w-full text-center bg-surface-3 hover:bg-surface-2 text-text px-4 py-3 rounded-lg font-semibold transition-colors duration-150"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </section>

          {/* Free Trial */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">14-Day Free Trial</h2>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
              <p className="text-text/80 mb-4">
                Try any plan free for 14 days — no credit card required:
              </p>
              <ul className="space-y-2 text-text/80">
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
            <h2 className="text-2xl font-bold text-text mb-4">Common Questions</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Can I change plans later?</h3>
                <p className="text-text/80">
                  Yes! Upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">What happens if I exceed my plan limits?</h3>
                <p className="text-text/80">
                  We&apos;ll notify you when you&apos;re approaching limits. You can upgrade to continue, or wait until next month when limits reset.
                  No overage fees.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Do you offer annual billing?</h3>
                <p className="text-text/80">
                  Yes! Save 20% with annual billing. Starter: $470/year, Pro: $950/year, Business: $1,900/year.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Is there a contract or commitment?</h3>
                <p className="text-text/80">
                  No contracts! Monthly plans are month-to-month. Cancel anytime. Annual plans are paid upfront but can be canceled for a prorated refund.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Can I add more users to Pro plan?</h3>
                <p className="text-text/80">
                  Pro includes up to 3 users. You can add extra users for $20/month each, or upgrade to Business for unlimited users.
                </p>
              </div>
            </div>
          </section>

          {/* Enterprise */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Enterprise / Custom Plans</h2>
            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <p className="text-text/80 mb-4">
                Need more than the Business plan? We offer custom enterprise plans with:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>✓ Custom user limits and features</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ SLA guarantees and uptime commitments</li>
                <li>✓ Custom integrations and API limits</li>
                <li>✓ On-premise deployment options</li>
                <li>✓ Volume pricing for large organizations</li>
              </ul>
              <p className="text-text/80 text-sm mt-4">
                Contact <strong className="text-text">sales@fenceestimatepro.com</strong> to discuss enterprise pricing.
              </p>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/billing" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Billing & Payment FAQ →</h3>
                <p className="text-text/80 text-sm">Payment methods, invoices, cancellation</p>
              </Link>
              <Link href="/signup" className="block p-6 bg-accent/15 border border-accent rounded-lg hover:bg-accent/30 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Start Free Trial →</h3>
                <p className="text-text/80 text-sm">14 days free, no credit card required</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Not sure which plan is right for you?</h3>
            <p className="text-text/80 mb-4">
              We&apos;ll help you choose the best plan for your business size and needs.
            </p>
            <a
              href="mailto:sales@fenceestimatepro.com"
              className="inline-block bg-accent text-background px-6 py-3 rounded-lg font-semibold hover:bg-accent-light transition-colors duration-150"
            >
              Contact Sales
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
