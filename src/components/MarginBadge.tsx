interface MarginBadgeProps {
  actualMargin: number;
  targetMargin: number;
}

export default function MarginBadge({
  actualMargin,
  targetMargin,
}: MarginBadgeProps) {
  const isBelowTarget = actualMargin < targetMargin;
  const displayMargin = isFinite(actualMargin)
    ? actualMargin.toFixed(1)
    : "0.0";

  return (
    <div
      className={`rounded-xl p-6 text-center transition-colors ${
        isBelowTarget
          ? "bg-red-50 border-2 border-red-300"
          : "bg-green-50 border-2 border-green-300"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
        Actual Gross Margin
      </p>
      <p
        className={`text-5xl font-bold ${
          isBelowTarget ? "text-red-600" : "text-green-600"
        }`}
      >
        {displayMargin}%
      </p>
      {isBelowTarget && (
        <p className="mt-3 text-red-700 font-semibold text-sm">
          ⚠ Below your {targetMargin}% target — you will lose money on this job.
        </p>
      )}
      {!isBelowTarget && (
        <p className="mt-3 text-green-700 font-semibold text-sm">
          Margin is at or above your {targetMargin}% target.
        </p>
      )}
    </div>
  );
}
