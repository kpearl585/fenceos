import Link from "next/link";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; email?: string }>;
}) {
  const { success = "", error = "", email = "" } = await searchParams;

  return (
    <div className="min-h-screen bg-[#f3f1e8] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[28px] border border-black/10 bg-white shadow-[0_18px_60px_rgba(20,32,16,0.08)]">
        <div className="border-b border-black/5 px-8 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2d6a4f]">
            FenceEstimatePro
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#102416]">Email Preferences</h1>
          <p className="mt-3 text-sm leading-6 text-[#53605a]">
            Stop receiving waitlist and trial reminder emails. Transactional emails about your account,
            estimates, deposits, and invoices may still be sent when required to deliver the service.
          </p>
        </div>

        <div className="px-8 py-8">
          {success ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">You have been unsubscribed.</p>
              <p className="mt-1">Marketing emails to {email || "this address"} will be suppressed.</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error === "valid_email"
                ? "Enter a valid email address."
                : "We could not update your preferences. Try again."}
            </div>
          ) : null}

          <form action="/api/unsubscribe" method="post" className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#102416]">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={email}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-2xl border border-[#d8ddd2] px-4 py-3 text-sm text-[#102416] outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#102416] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a3a24]"
            >
              Unsubscribe
            </button>
          </form>

          <p className="mt-6 text-xs leading-5 text-[#6f7a74]">
            If you join the waitlist or start a trial again later, that new opt-in can be treated as renewed consent.
          </p>

          <div className="mt-8 flex items-center justify-between text-xs text-[#6f7a74]">
            <Link href="/" className="font-semibold text-[#2d6a4f] hover:text-[#1f4b37]">
              Back to site
            </Link>
            <a href="mailto:support@fenceestimatepro.com" className="hover:text-[#102416]">
              support@fenceestimatepro.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
