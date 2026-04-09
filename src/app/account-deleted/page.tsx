import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-fence-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Account Deleted</h1>
          <p className="text-white/60 text-sm">
            Your FenceEstimatePro account has been scheduled for deletion.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-white font-semibold mb-3 text-sm">What happens next</h2>
          <ul className="space-y-3 text-white/70 text-sm">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-fence-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Your subscription has been cancelled</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-fence-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your data will be retained for 30 days</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>After 30 days, all data will be permanently deleted</span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
          <p className="text-amber-300 text-xs">
            <strong>Changed your mind?</strong> Contact support@fenceestimatepro.com within 30 days to restore your account.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-fence-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-fence-700 transition-colors"
          >
            Return to Homepage
          </Link>
          <a
            href="mailto:support@fenceestimatepro.com"
            className="block w-full border border-white/20 text-white py-3 px-6 rounded-lg font-semibold hover:bg-white/5 transition-colors"
          >
            Contact Support
          </a>
        </div>

        <p className="text-white/40 text-xs mt-8">
          We're sorry to see you go. If you have feedback on how we could improve,
          we'd love to hear from you at feedback@fenceestimatepro.com
        </p>
      </div>
    </div>
  );
}
