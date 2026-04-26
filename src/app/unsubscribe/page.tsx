import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; email?: string }>;
}) {
  const { success = "", error = "", email = "" } = await searchParams;

  return (
    <div className="min-h-screen bg-background text-text px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[28px] border border-border bg-surface shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
        <div className="border-b border-border px-8 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-light">
            FenceEstimatePro
          </p>
          <h1 className="mt-3 text-3xl font-bold text-text">Email Preferences</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Stop receiving waitlist and trial reminder emails. Transactional emails about your account,
            estimates, deposits, and invoices may still be sent when required to deliver the service.
          </p>
        </div>

        <div className="px-8 py-8">
          {success ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-light">
              <p className="font-semibold">You have been unsubscribed.</p>
              <p className="mt-1">Marketing emails to {email || "this address"} will be suppressed.</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error === "valid_email"
                ? "Enter a valid email address."
                : "We could not update your preferences. Try again."}
            </div>
          ) : null}

          <form action="/api/unsubscribe" method="post" className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={email}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-2xl border border-border bg-surface-3 px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-light"
            >
              Unsubscribe
            </button>
          </form>

          <p className="mt-6 text-xs leading-5 text-muted">
            If you join the waitlist or start a trial again later, that new opt-in can be treated as renewed consent.
          </p>

          <div className="mt-8 flex items-center justify-between text-xs text-muted">
            <Link href="/" className="font-semibold text-accent-light hover:text-accent">
              Back to site
            </Link>
            <a href="mailto:support@fenceestimatepro.com" className="hover:text-text">
              support@fenceestimatepro.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
