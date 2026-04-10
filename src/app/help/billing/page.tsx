import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & Payment FAQ - FenceEstimatePro Help",
  description: "Common questions about subscriptions, invoices, and cancellation",
  robots: { index: true, follow: true },
};

export default function BillingPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Billing &amp; Payment FAQ</h1>
          <p className="text-lg text-white/70">Common questions about subscriptions, invoices, and cancellation</p>
          <div className="mt-4 text-sm text-white/50">4 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Payment Methods */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Payment Methods</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
                <p className="text-white/70 mb-3">We accept all major payment methods:</p>
                <ul className="space-y-2 text-white/80">
                  <li>✓ Credit cards (Visa, Mastercard, American Express, Discover)</li>
                  <li>✓ Debit cards with major card logos</li>
                  <li>✓ ACH bank transfers (Business plan and above)</li>
                  <li>✓ PayPal (available in select regions)</li>
                </ul>
                <p className="text-white/70 text-sm mt-3">
                  All payments are processed securely through Stripe. We never store your full card details.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How do I update my payment method?</h3>
                <p className="text-white/70">
                  Dashboard → Settings → Billing → Manage Payment Methods → Add or Update Card
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">When will I be charged?</h3>
                <p className="text-white/70">
                  <strong className="text-white">Free Trial:</strong> No charge for 14 days. Your card is only charged if you continue after the trial ends.
                  <br /><br />
                  <strong className="text-white">Monthly:</strong> Charged on the same day each month (subscription anniversary).
                  <br /><br />
                  <strong className="text-white">Annual:</strong> Charged upfront for the full year.
                </p>
              </div>
            </div>
          </section>

          {/* Invoices & Receipts */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Invoices &amp; Receipts</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Where can I find my invoices?</h3>
                <p className="text-white/70 mb-3">
                  Dashboard → Settings → Billing → Invoice History
                </p>
                <p className="text-white/70 text-sm">
                  You can view, download, and print all past invoices. Invoices are also emailed to your account email address after each payment.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I get a receipt for tax purposes?</h3>
                <p className="text-white/70">
                  Yes. Every invoice serves as an official receipt for tax purposes. It includes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm mt-2">
                  <li>Invoice number and date</li>
                  <li>Your company information</li>
                  <li>Itemized charges</li>
                  <li>Payment method used</li>
                  <li>Our tax ID (EIN)</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">I need invoices addressed to my company, not my personal name</h3>
                <p className="text-white/70">
                  Update your billing information: Settings → Billing → Billing Details → Update Company Name & Address.
                  Future invoices will use your updated information.
                </p>
              </div>
            </div>
          </section>

          {/* Subscription Management */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Subscription Management</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How do I upgrade my plan?</h3>
                <p className="text-white/70 mb-3">
                  Dashboard → Settings → Upgrade → Select New Plan → Confirm
                </p>
                <p className="text-white/70 text-sm">
                  Upgrades take effect immediately. You&apos;re charged a prorated amount for the remainder of the current billing period,
                  then the full new plan price on your next billing date.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How do I downgrade my plan?</h3>
                <p className="text-white/70">
                  Settings → Billing → Change Plan → Select Lower Tier → Confirm Downgrade
                </p>
                <p className="text-white/70 text-sm mt-2">
                  Downgrades apply at the end of your current billing period. You keep full access to your current plan until then.
                  No partial refunds for downgrades.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I pause my subscription instead of canceling?</h3>
                <p className="text-white/70">
                  Yes! You can downgrade to the Free plan (coming soon) which lets you keep your data but stops all billing.
                  You can upgrade back to a paid plan anytime.
                </p>
              </div>
            </div>
          </section>

          {/* Cancellation & Refunds */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Cancellation &amp; Refunds</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How do I cancel my subscription?</h3>
                <p className="text-white/70 mb-3">
                  Dashboard → Settings → Billing → Cancel Subscription → Confirm Cancellation
                </p>
                <p className="text-white/70 text-sm">
                  Your subscription remains active until the end of the current billing period. After that, you lose access but your data is retained
                  for 30 days in case you want to reactivate.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What is your refund policy?</h3>
                <p className="text-white/70 mb-3">
                  <strong className="text-white">Monthly plans:</strong> No refunds for partial months. Canceling stops future billing but doesn&apos;t refund the current month.
                </p>
                <p className="text-white/70 mb-3">
                  <strong className="text-white">Annual plans:</strong> Prorated refunds available if you cancel within the first 60 days.
                  After 60 days, no refunds, but you keep access until your annual term ends.
                </p>
                <p className="text-white/70">
                  <strong className="text-white">Free trial:</strong> Cancel anytime during the trial with no charge.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What happens to my data if I cancel?</h3>
                <p className="text-white/70">
                  Your data is retained for 30 days after cancellation. During this time, you can:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm mt-2">
                  <li>Export all your data</li>
                  <li>Reactivate your subscription and keep everything</li>
                  <li>View estimates (read-only mode)</li>
                </ul>
                <p className="text-white/70 text-sm mt-3">
                  After 30 days, your data is permanently deleted unless you reactivate.
                </p>
              </div>
            </div>
          </section>

          {/* Failed Payments */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Failed Payments</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What happens if my payment fails?</h3>
                <p className="text-white/70 mb-3">
                  If a payment fails, we&apos;ll:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-white/80">
                  <li>Email you immediately about the failed payment</li>
                  <li>Retry the payment 3 times over 7 days</li>
                  <li>Give you a 7-day grace period to update payment info</li>
                  <li>Downgrade your account to read-only if payment isn&apos;t resolved</li>
                </ol>
                <p className="text-white/70 text-sm mt-3">
                  Your data is never deleted due to failed payments. Update your payment method to restore full access.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Common reasons for failed payments</h3>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm">
                  <li>Expired card</li>
                  <li>Insufficient funds</li>
                  <li>Card issuer declined the charge (fraud protection)</li>
                  <li>Incorrect billing address</li>
                  <li>Card number entered incorrectly</li>
                </ul>
                <p className="text-white/70 text-sm mt-3">
                  Contact your bank or update your payment method to resolve.
                </p>
              </div>
            </div>
          </section>

          {/* Taxes */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Taxes</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Do you charge sales tax?</h3>
                <p className="text-white/70">
                  Sales tax is charged based on your business location for applicable U.S. states and international VAT requirements.
                  Tax rates are automatically calculated at checkout.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I get a tax exemption?</h3>
                <p className="text-white/70">
                  Yes. If your business qualifies for tax exemption (non-profit, reseller, etc.), email your tax exemption certificate to
                  <strong className="text-white"> billing@fenceestimatepro.com</strong>. We&apos;ll apply the exemption to future invoices.
                </p>
              </div>
            </div>
          </section>

          {/* Enterprise Billing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Enterprise Billing</h2>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                Enterprise and custom plan customers can request:
              </p>
              <ul className="space-y-2 text-white/80">
                <li>✓ Invoice billing (NET 30 payment terms)</li>
                <li>✓ Purchase orders</li>
                <li>✓ Custom billing cycles</li>
                <li>✓ Multi-year contracts with discounts</li>
                <li>✓ Consolidated billing for multiple organizations</li>
              </ul>
              <p className="text-white/70 text-sm mt-4">
                Contact <strong className="text-white">sales@fenceestimatepro.com</strong> to set up enterprise billing.
              </p>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/plans" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Pricing Plans & Features →</h3>
                <p className="text-white/70 text-sm">Compare plans and pricing details</p>
              </Link>
              <Link href="/help/account-deletion" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Account Deletion →</h3>
                <p className="text-white/70 text-sm">What happens when you cancel</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">Billing question not answered here?</h3>
            <p className="text-white/70 mb-4">
              Our billing team is here to help with invoices, payment issues, or custom billing arrangements.
            </p>
            <a
              href="mailto:billing@fenceestimatepro.com"
              className="inline-block bg-fence-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-fence-700 transition-colors"
            >
              Contact Billing Support
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
