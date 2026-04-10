import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Setup & Team Management - FenceEstimatePro Help",
  description: "Configure your organization, add team members, and set permissions",
  robots: { index: true, follow: true },
};

export default function AccountSetupPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Account Setup &amp; Team Management</h1>
          <p className="text-lg text-white/70">Configure your organization, add team members, and set permissions</p>
          <div className="mt-4 text-sm text-white/50">4 min read</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-invert prose-fence max-w-none">
          {/* Initial Setup */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Initial Account Setup</h2>
            <p className="text-white/80 mb-6">
              When you first sign up, you&apos;ll be prompted to complete your organization profile:
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Step 1: Company Information</h3>
              <ul className="space-y-2 text-white/80">
                <li>
                  <strong className="text-white">Company Name:</strong> Legal business name (appears on proposals)
                </li>
                <li>
                  <strong className="text-white">Phone Number:</strong> Main business line (shown to customers)
                </li>
                <li>
                  <strong className="text-white">Email:</strong> Company email (for customer communication)
                </li>
                <li>
                  <strong className="text-white">Address:</strong> Physical business address (optional but recommended)
                </li>
                <li>
                  <strong className="text-white">Website:</strong> Your company website URL (if applicable)
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Step 2: Branding</h3>
              <ul className="space-y-2 text-white/80">
                <li>
                  <strong className="text-white">Logo Upload:</strong> PNG or JPG, max 500KB, square aspect ratio recommended
                </li>
                <li>
                  <strong className="text-white">Brand Color:</strong> Primary color for proposals (hex code or color picker)
                </li>
                <li>
                  <strong className="text-white">Tagline:</strong> Optional slogan or mission statement
                </li>
              </ul>
              <p className="text-white/70 text-sm mt-3">
                Your branding appears on all customer proposals and quotes.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Step 3: Default Settings</h3>
              <ul className="space-y-2 text-white/80">
                <li>
                  <strong className="text-white">Labor Rate:</strong> Your hourly labor rate (default: $50/hr)
                </li>
                <li>
                  <strong className="text-white">Markup Percentage:</strong> Default profit margin (typical: 25-30%)
                </li>
                <li>
                  <strong className="text-white">Waste Factor:</strong> Material waste percentage (default: 5-10%)
                </li>
                <li>
                  <strong className="text-white">Payment Terms:</strong> Deposit amount and payment schedule
                </li>
              </ul>
              <p className="text-white/70 text-sm mt-3">
                These are defaults — you can override them on individual estimates.
              </p>
            </div>
          </section>

          {/* Adding Team Members */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Adding Team Members</h2>
            <p className="text-white/80 mb-4">
              Pro and Business plans support multiple users. Add office staff, project managers, or field crew:
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">How to Invite Team Members</h3>
              <ol className="list-decimal list-inside space-y-3 text-white/80">
                <li>Dashboard → Settings → Team</li>
                <li>Click <strong className="text-white">&quot;Invite Team Member&quot;</strong></li>
                <li>Enter their email address</li>
                <li>Select role (Admin, Estimator, or Viewer)</li>
                <li>Click <strong className="text-white">&quot;Send Invitation&quot;</strong></li>
                <li>They receive an email with signup link</li>
                <li>Once they create their account, they have access</li>
              </ol>
            </div>

            <p className="text-white/70 text-sm mb-6">
              💡 <strong className="text-white">Tip:</strong> Each team member gets their own login. No shared passwords.
              You can see who created/edited each estimate.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">User Limits by Plan</h3>
              <ul className="space-y-2 text-white/80">
                <li><strong className="text-white">Starter:</strong> 1 user (account owner only)</li>
                <li><strong className="text-white">Pro:</strong> Up to 3 users ($20/month each additional)</li>
                <li><strong className="text-white">Business:</strong> Unlimited users</li>
              </ul>
            </div>
          </section>

          {/* User Roles */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">User Roles &amp; Permissions</h2>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Admin */}
              <div className="bg-fence-500/10 border border-fence-500/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Admin</h3>
                <p className="text-white/70 text-sm mb-4">
                  Full access to everything
                </p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>✓ Create/edit/delete estimates</li>
                  <li>✓ Manage customers</li>
                  <li>✓ Update material prices</li>
                  <li>✓ Invite team members</li>
                  <li>✓ Change billing settings</li>
                  <li>✓ Access all reports</li>
                  <li>✓ Export data</li>
                </ul>
              </div>

              {/* Estimator */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Estimator</h3>
                <p className="text-white/70 text-sm mb-4">
                  Create and manage estimates
                </p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>✓ Create/edit/delete estimates</li>
                  <li>✓ Manage customers</li>
                  <li>✓ View material prices</li>
                  <li>✓ Generate proposals</li>
                  <li>✗ Update prices</li>
                  <li>✗ Manage team</li>
                  <li>✗ Change billing</li>
                </ul>
              </div>

              {/* Viewer */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Viewer</h3>
                <p className="text-white/70 text-sm mb-4">
                  Read-only access
                </p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li>✓ View estimates</li>
                  <li>✓ View customers</li>
                  <li>✓ Download proposals</li>
                  <li>✗ Create/edit estimates</li>
                  <li>✗ Update prices</li>
                  <li>✗ Manage team</li>
                  <li>✗ Change settings</li>
                </ul>
              </div>
            </div>

            <p className="text-white/70 text-sm">
              <strong className="text-white">Common Setup:</strong> Owner = Admin, Office Manager = Estimator,
              Field Crew = Viewer (can check estimates on job site).
            </p>
          </section>

          {/* Managing Team */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Managing Your Team</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Changing a User&apos;s Role</h3>
                <p className="text-white/70 text-sm">
                  Settings → Team → Click user → Edit Role → Select new role → Save
                </p>
                <p className="text-white/70 text-sm mt-2">
                  Changes take effect immediately. User will see different menus/options on next page load.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Removing a Team Member</h3>
                <p className="text-white/70 text-sm mb-3">
                  Settings → Team → Click user → Remove from Organization → Confirm
                </p>
                <p className="text-white/70 text-sm">
                  <strong className="text-white">What happens:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm mt-2">
                  <li>User loses access immediately</li>
                  <li>They receive an email notification</li>
                  <li>Estimates they created remain (not deleted)</li>
                  <li>You can re-invite them later if needed</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Viewing Team Activity</h3>
                <p className="text-white/70 text-sm">
                  Settings → Team → Activity Log shows:
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/70 ml-4 text-sm mt-2">
                  <li>Who created which estimates</li>
                  <li>Who updated material prices</li>
                  <li>Login history (last login time)</li>
                  <li>Actions taken (create, edit, delete)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Organization Settings */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Organization Settings</h2>

            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Company Profile</h3>
                <p className="text-white/70 text-sm mb-3">
                  Settings → Company Profile
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/70 ml-4 text-sm">
                  <li>Update company name, address, contact info</li>
                  <li>Upload/change logo</li>
                  <li>Modify brand colors</li>
                  <li>Edit warranty terms</li>
                  <li>Customize payment terms and deposit policy</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Calculation Defaults</h3>
                <p className="text-white/70 text-sm mb-3">
                  Settings → Calculation Settings
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/70 ml-4 text-sm">
                  <li>Default labor rate ($/hour)</li>
                  <li>Default markup percentage</li>
                  <li>Waste factor (material overhead)</li>
                  <li>Post spacing (8&apos; standard, 6&apos; for high-wind)</li>
                  <li>Concrete mix ratio per post</li>
                  <li>Installation rates (LF per day by fence type)</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Notifications</h3>
                <p className="text-white/70 text-sm mb-3">
                  Settings → Notifications
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/70 ml-4 text-sm">
                  <li>Email alerts for new customer inquiries</li>
                  <li>Material price change notifications (&gt;10%)</li>
                  <li>Team member activity summaries (daily/weekly)</li>
                  <li>Billing and payment reminders</li>
                  <li>Product updates and feature announcements</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Transferring Ownership */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Transferring Organization Ownership</h2>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-white/80 mb-4">
                If you need to transfer the organization to another team member:
              </p>
              <ol className="list-decimal list-inside space-y-3 text-white/80">
                <li>Settings → Team → Current Owner (you)</li>
                <li>Click <strong className="text-white">&quot;Transfer Ownership&quot;</strong></li>
                <li>Select new owner from team members</li>
                <li>Confirm transfer (you&apos;ll become an Admin instead of Owner)</li>
                <li>New owner receives email with next steps</li>
              </ol>
              <p className="text-white/70 text-sm mt-4">
                <strong className="text-white">Note:</strong> Only the owner can manage billing and cancel subscription.
                Transfer ownership before leaving the company.
              </p>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Best Practices</h2>

            <div className="space-y-4">
              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">1. Limit Admin Access</h3>
                <p className="text-white/70 text-sm">
                  Only give Admin role to trusted partners/managers. Most team members work fine as Estimators.
                  This prevents accidental changes to billing, pricing, or team settings.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">2. Use Individual Logins</h3>
                <p className="text-white/70 text-sm">
                  Never share login credentials. Each person should have their own account.
                  This improves security and lets you track who did what.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">3. Onboard New Users</h3>
                <p className="text-white/70 text-sm">
                  When adding a team member, walk them through creating their first estimate.
                  Show them where to find materials, how to save, and how to generate proposals.
                  15 minutes of training prevents hours of support requests.
                </p>
              </div>

              <div className="bg-fence-500/10 border border-fence-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3">4. Regular Branding Review</h3>
                <p className="text-white/70 text-sm">
                  Review your company profile quarterly. Update phone numbers, addresses, logo if rebranded.
                  Outdated contact info on proposals looks unprofessional.
                </p>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/getting-started" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Creating Your First Estimate →</h3>
                <p className="text-white/70 text-sm">Ready to start estimating</p>
              </Link>
              <Link href="/help/pricing" className="block p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-fence-500/50 transition-all">
                <h3 className="text-lg font-semibold text-white mb-2">Material Price Management →</h3>
                <p className="text-white/70 text-sm">Configure your material costs</p>
              </Link>
            </div>
          </section>

          {/* Need Help */}
          <div className="mt-16 p-8 bg-fence-500/10 border border-fence-500/20 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">Questions about account setup?</h3>
            <p className="text-white/70 mb-4">
              Our support team can help with team management, permissions, or organization configuration.
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
