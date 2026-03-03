import Link from "next/link";

export default async function DepositSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ estimateId?: string }>;
}) {
  const { estimateId } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Deposit Received
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you! Your deposit payment has been processed successfully.
          The contractor will be notified and your project will move forward.
        </p>
        {estimateId && (
          <Link
            href={`/dashboard/estimates/${estimateId}`}
            className="inline-block bg-fence-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-fence-700 transition-colors"
          >
            View Estimate
          </Link>
        )}
      </div>
    </div>
  );
}
