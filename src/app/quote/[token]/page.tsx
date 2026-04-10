import { getQuoteByToken } from "../actions";
import { QuoteAcceptanceForm } from "./QuoteAcceptanceForm";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "View Quote - FenceEstimatePro",
  description: "Review and accept your fence installation quote",
  robots: { index: false, follow: false }, // Don't index quote pages
};

interface Props {
  params: { token: string };
}

export default async function QuoteViewPage({ params }: Props) {
  const { token } = params;
  const result = await getQuoteByToken(token);

  // Error state
  if (!result.success || !result.quote) {
    return (
      <div className="min-h-screen bg-fence-950 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">
            {result.error || "This quote link is invalid or has expired."}
          </p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the contractor who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  const { quote } = result;
  const isExpired = quote.token_expires_at && new Date(quote.token_expires_at) < new Date();
  const isAccepted = !!quote.customer_accepted_at;

  // Calculate display values
  const input = quote.input_json;
  const result_data = quote.result_json;
  const totalLF = input.runs.reduce((sum, run) => sum + run.linearFeet, 0);
  const totalGates = input.gates?.length ?? 0;

  // Determine fence type from productLineId
  const fenceType = input.productLineId?.includes("vinyl") ? "Vinyl"
    : input.productLineId?.includes("wood") ? "Wood"
    : input.productLineId?.includes("chain") ? "Chain Link"
    : input.productLineId?.includes("aluminum") ? "Aluminum"
    : "Fence";
  const fenceHeight = input.fenceHeight || 6;

  return (
    <div className="min-h-screen bg-fence-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-fence-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-fence-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{quote.name}</h1>
                <p className="text-white/70 text-sm">{quote.org.name}</p>
              </div>
            </div>
            {isAccepted && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-green-300">Accepted</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Accepted Message */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-green-900 mb-2">Quote Accepted!</h2>
                <p className="text-green-800 mb-4">
                  Thank you for accepting this quote. Your contractor has been notified and will contact you shortly to schedule the installation.
                </p>
                <p className="text-sm text-green-700">
                  Accepted on {new Date(quote.customer_accepted_at!).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && !isAccepted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-yellow-900 mb-2">Quote Expired</h2>
                <p className="text-yellow-800">
                  This quote expired on {new Date(quote.token_expires_at!).toLocaleDateString()}.
                  Please contact {quote.org.name} to request an updated quote.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quote Details */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Project Details</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Scope */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Scope of Work</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Fence Type</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{fenceType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Height</p>
                  <p className="text-lg font-semibold text-gray-900">{fenceHeight} feet</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Linear Feet</p>
                  <p className="text-lg font-semibold text-gray-900">{totalLF.toFixed(0)} LF</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Gates</p>
                  <p className="text-lg font-semibold text-gray-900">{totalGates} {totalGates === 1 ? "gate" : "gates"}</p>
                </div>
              </div>
            </div>

            {/* Fence Runs */}
            {input.runs.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Fence Sections</h3>
                <div className="space-y-2">
                  {input.runs.map((run, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Section {idx + 1}</span>
                        <span className="text-sm text-gray-600">{run.linearFeet} LF</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {run.startType} to {run.endType}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Investment</h3>
              <div className="bg-fence-50 border border-fence-200 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Project Cost</span>
                  <span className="text-3xl font-bold text-fence-900">
                    ${quote.total_cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Includes all materials, labor, and installation
                </p>
              </div>
            </div>

            {/* What's Included */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">What&apos;s Included</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-fence-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">All materials (posts, rails, panels, concrete, hardware)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-fence-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Professional installation by experienced crew</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-fence-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Site cleanup and debris removal</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-fence-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">2-year workmanship warranty</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-fence-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Manufacturer materials warranty (varies by product)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Acceptance Form or Contact Info */}
        {!isAccepted && !isExpired ? (
          <QuoteAcceptanceForm token={token} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              {quote.org.phone && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${quote.org.phone}`} className="text-fence-600 hover:text-fence-700 font-medium">
                    {quote.org.phone}
                  </a>
                </div>
              )}
              {quote.org.email && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${quote.org.email}`} className="text-fence-600 hover:text-fence-700 font-medium">
                    {quote.org.email}
                  </a>
                </div>
              )}
              {quote.org.address && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{quote.org.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-white/50">
            Powered by <Link href="/" className="text-fence-400 hover:text-fence-300">FenceEstimatePro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
