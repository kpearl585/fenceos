import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-6">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

      <div className="relative max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-danger/15 border border-danger/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-text mb-3">Account Deleted</h1>
          <p className="text-muted text-sm">
            Your FenceEstimatePro account has been scheduled for deletion.
          </p>
        </div>

        <div className="bg-surface-2 border border-border rounded-xl p-6 mb-8 text-left">
          <h2 className="text-text font-semibold mb-3 text-sm">What happens next</h2>
          <ul className="space-y-3 text-text/80 text-sm">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Your subscription has been cancelled</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your data will be retained for 30 days</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>After 30 days, all data will be permanently deleted</span>
            </li>
          </ul>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-8">
          <p className="text-warning text-xs">
            <strong>Changed your mind?</strong> Contact support@fenceestimatepro.com within 30 days to restore your account.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-accent hover:bg-accent-light text-background py-3 px-6 rounded-lg font-semibold transition-colors duration-150 accent-glow"
          >
            Return to Homepage
          </Link>
          <a
            href="mailto:support@fenceestimatepro.com"
            className="block w-full border border-border text-text py-3 px-6 rounded-lg font-semibold hover:bg-surface-3 hover:border-border-strong transition-colors duration-150"
          >
            Contact Support
          </a>
        </div>

        <p className="text-muted text-xs mt-8">
          We&apos;re sorry to see you go. If you have feedback on how we could improve,
          we&apos;d love to hear from you at feedback@fenceestimatepro.com
        </p>
      </div>
    </div>
  );
}
