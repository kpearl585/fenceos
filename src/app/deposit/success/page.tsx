import Link from "next/link";

export default async function DepositSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ estimateId?: string }>;
}) {
  const { estimateId } = await searchParams;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center p-4">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />

      <div className="relative bg-surface-2 border border-border rounded-2xl shadow-2xl shadow-black/40 max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-accent/15 border border-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 accent-glow">
          <svg className="w-8 h-8 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-text mb-2">
          Deposit Received
        </h1>
        <p className="text-muted mb-6">
          Thank you! Your deposit payment has been processed successfully.
          The contractor will be notified and your project will move forward.
        </p>
        {estimateId && (
          <Link
            href={`/dashboard/estimates/${estimateId}`}
            className="inline-block bg-accent hover:bg-accent-light text-background px-6 py-3 rounded-xl font-semibold transition-colors duration-150 accent-glow"
          >
            View Estimate
          </Link>
        )}
      </div>
    </div>
  );
}
