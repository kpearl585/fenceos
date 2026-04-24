import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Deletion & Data Retention - FenceEstimatePro Help",
  description: "How to delete your account and what happens to your data",
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
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
          <h1 className="text-4xl font-bold text-text mb-3">Account Deletion &amp; Data Retention</h1>
          <p className="text-lg text-text/80">How to delete your account and what happens to your data</p>
          <div className="mt-4 text-sm text-muted">4 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert max-w-none">
          {/* Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Before You Delete</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
              <p className="text-yellow-200 font-semibold mb-3">
                ⚠️ Account deletion is permanent
              </p>
              <p className="text-text/80">
                Once the 30-day grace period ends, your data cannot be recovered. Make sure you&apos;ve exported
                any information you need before proceeding.
              </p>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">Consider These Alternatives</h3>
              <ul className="space-y-2 text-text/80">
                <li>
                  <strong className="text-text">Downgrade to Free Plan:</strong> Keep your data but stop billing
                </li>
                <li>
                  <strong className="text-text">Pause Subscription:</strong> Temporarily stop billing while keeping account active
                </li>
                <li>
                  <strong className="text-text">Export Data First:</strong> Download everything before deletion
                </li>
              </ul>
            </div>
          </section>

          {/* How to Delete */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">How to Delete Your Account</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Step-by-Step Process</h3>
              <ol className="list-decimal list-inside space-y-4 text-text/80">
                <li>
                  <strong className="text-text">Export your data</strong> (recommended)
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Settings → Data & Privacy → Export All Data
                  </p>
                </li>
                <li>
                  <strong className="text-text">Cancel active subscription</strong> (if applicable)
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Settings → Billing → Cancel Subscription
                  </p>
                </li>
                <li>
                  <strong className="text-text">Navigate to account deletion</strong>
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Settings → Scroll to Danger Zone → Delete Account
                  </p>
                </li>
                <li>
                  <strong className="text-text">Confirm deletion</strong>
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Read the warning, click &quot;I understand, delete my account&quot;
                  </p>
                </li>
                <li>
                  <strong className="text-text">Type DELETE to confirm</strong>
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Safety measure to prevent accidental deletion
                  </p>
                </li>
                <li>
                  <strong className="text-text">Final confirmation</strong>
                  <p className="text-text/80 text-sm ml-6 mt-1">
                    Account is marked for deletion, 30-day grace period begins
                  </p>
                </li>
              </ol>
            </div>

            <p className="text-text/80 text-sm">
              💡 <strong className="text-text">Tip:</strong> You&apos;ll receive a confirmation email with instructions
              for restoring your account during the grace period.
            </p>
          </section>

          {/* What Happens */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">What Happens After Deletion</h2>

            <div className="space-y-6">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">Immediate Effects (Day 0)</h3>
                <ul className="space-y-2 text-text/80">
                  <li>✓ You&apos;re logged out automatically</li>
                  <li>✓ Account access is disabled</li>
                  <li>✓ Active subscription is canceled (no refunds for partial months)</li>
                  <li>✓ Email confirmation sent with deletion date</li>
                  <li>✓ 30-day countdown begins</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">During Grace Period (Days 1-30)</h3>
                <ul className="space-y-2 text-text/80">
                  <li>✓ Data is soft-deleted (marked for deletion but not removed)</li>
                  <li>✓ You can restore your account by contacting support</li>
                  <li>✓ Dashboard shows a countdown to permanent deletion</li>
                  <li>✓ All data remains intact and recoverable</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-3">After Grace Period (Day 31+)</h3>
                <ul className="space-y-2 text-text/80">
                  <li>✓ All data is permanently deleted from our servers</li>
                  <li>✓ Backups are purged</li>
                  <li>✓ Email address becomes available for new signups</li>
                  <li>✓ Recovery is <strong className="text-text">impossible</strong></li>
                </ul>
              </div>
            </div>
          </section>

          {/* What Gets Deleted */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">What Gets Deleted</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Permanently Removed</h3>
              <ul className="space-y-2 text-text/80">
                <li>• All fence estimates and proposals</li>
                <li>• Customer contact information</li>
                <li>• Material prices and settings</li>
                <li>• Organization branding and logos</li>
                <li>• Job history and closeout data</li>
                <li>• Payment methods and billing history</li>
                <li>• User account and authentication credentials</li>
              </ul>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">What We Keep (Legal Requirements)</h3>
              <ul className="space-y-2 text-text/80">
                <li>
                  <strong className="text-text">Financial Records (7 years):</strong> Invoices, payment transactions
                  (required by tax law)
                </li>
                <li>
                  <strong className="text-text">Anonymized Analytics:</strong> Aggregated usage stats with no personal identifiers
                </li>
                <li>
                  <strong className="text-text">Legal Compliance Logs:</strong> Audit trails if required by court order or legal investigation
                </li>
              </ul>
            </div>

            <p className="text-text/80 text-sm mt-4">
              These retained records cannot be used to identify you and are kept only to comply with financial and legal regulations.
            </p>
          </section>

          {/* Restoring Account */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Restoring a Deleted Account</h2>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-text mb-3">Within 30 Days</h3>
              <p className="text-text/80 mb-4">
                If you change your mind during the grace period:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-text/80">
                <li>Email <strong className="text-text">support@fenceestimatepro.com</strong> from your account email</li>
                <li>Subject: &quot;Restore my account&quot;</li>
                <li>Include your organization name for verification</li>
                <li>We&apos;ll reactivate your account within 24 hours</li>
                <li>All data will be restored exactly as it was</li>
              </ol>
            </div>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text mb-3">After 30 Days</h3>
              <p className="text-text/80">
                <strong className="text-text">Recovery is not possible.</strong> Data is permanently deleted.
                You&apos;ll need to create a new account and re-enter all your information.
              </p>
            </div>
          </section>

          {/* Billing After Deletion */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Billing After Deletion</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Active Subscription</h3>
                <p className="text-text/80 text-sm">
                  If you have an active subscription when you delete your account:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>Subscription is immediately canceled</li>
                  <li>No refunds for the current billing period</li>
                  <li>No future charges will occur</li>
                  <li>You keep access until the current period ends, then deletion begins</li>
                </ul>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Outstanding Invoices</h3>
                <p className="text-text/80 text-sm">
                  If you have unpaid invoices:
                </p>
                <ul className="list-disc list-inside space-y-1 text-text/80 ml-4 text-sm mt-2">
                  <li>You must pay outstanding invoices before deletion</li>
                  <li>Account deletion is blocked until invoices are settled</li>
                  <li>Contact support if you need a payment plan</li>
                </ul>
              </div>
            </div>
          </section>

          {/* GDPR/CCPA Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Your Privacy Rights</h2>

            <div className="bg-surface-2 border border-border rounded-lg p-6">
              <p className="text-text/80 mb-4">
                Under GDPR (Europe) and CCPA (California), you have the right to:
              </p>
              <ul className="space-y-2 text-text/80">
                <li>
                  <strong className="text-text">Right to Access:</strong> Request a copy of all data we have about you
                </li>
                <li>
                  <strong className="text-text">Right to Erasure:</strong> Request immediate deletion (we comply within 30 days)
                </li>
                <li>
                  <strong className="text-text">Right to Portability:</strong> Export data in machine-readable format
                </li>
                <li>
                  <strong className="text-text">Right to Rectification:</strong> Correct inaccurate data
                </li>
              </ul>
            </div>

            <p className="text-text/80 text-sm mt-4">
              To exercise these rights, contact <strong className="text-text">privacy@fenceestimatepro.com</strong>
            </p>
          </section>

          {/* Common Questions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Common Questions</h2>

            <div className="space-y-4">
              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Can I delete just some of my data?</h3>
                <p className="text-text/80">
                  Yes. You can delete individual estimates, customers, or materials from within the dashboard.
                  Account deletion removes <em>everything</em>.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">What if I&apos;m the organization owner?</h3>
                <p className="text-text/80">
                  Deleting your account as the owner will delete the entire organization and all team members&apos; access.
                  Make sure to transfer ownership first if you want the organization to continue.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Will customers be notified?</h3>
                <p className="text-text/80">
                  No. Customers are not notified of your account deletion. If they have saved proposals, those remain in their email/files.
                </p>
              </div>

              <div className="bg-surface-2 border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text mb-2">Can I sign up again later with the same email?</h3>
                <p className="text-text/80">
                  Yes, but not until after the 30-day grace period. Once permanent deletion is complete (Day 31+),
                  your email becomes available for new signups.
                </p>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/data-export" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Export Your Data First →</h3>
                <p className="text-text/80 text-sm">Download everything before deleting</p>
              </Link>
              <Link href="/help/billing" className="block p-6 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent/40 transition-all duration-150">
                <h3 className="text-lg font-semibold text-text mb-2">Billing & Payment FAQ →</h3>
                <p className="text-text/80 text-sm">Questions about subscriptions and cancellation</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-accent/10 border border-accent/30 rounded-xl">
            <h3 className="text-xl font-bold text-text mb-2">Having second thoughts?</h3>
            <p className="text-text/80 mb-4">
              Before you delete, let&apos;s talk. Maybe there&apos;s a way we can help solve the issue you&apos;re facing.
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
