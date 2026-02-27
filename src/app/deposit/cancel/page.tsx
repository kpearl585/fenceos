import Link from "next/link";

export default async function DepositCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ estimateId?: string }>;
}) {
  const { estimateId } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your deposit payment was not completed. You can return to the
          estimate and try again when ready.
        </p>
        {estimateId && (
          <Link
            href={`/dashboard/estimates/${estimateId}`}
            className="inline-block bg-fence-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-fence-700 transition-colors"
          >
            Back to Estimate
          </Link>
        )}
      </div>
    </div>
  );
}
