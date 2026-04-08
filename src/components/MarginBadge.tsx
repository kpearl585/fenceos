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
          ? "bg-[rgba(239,68,68,0.1)] border-2 border-[rgba(239,68,68,0.3)]"
          : "bg-[rgba(22,163,74,0.1)] border-2 border-[rgba(22,163,74,0.3)]"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280] mb-1">
        Actual Gross Margin
      </p>
      <p
        className={`text-5xl font-bold font-display ${
          isBelowTarget ? "text-[#EF4444]" : "text-[#22C55E]"
        }`}
      >
        {displayMargin}%
      </p>
      {isBelowTarget && (
        <p className="mt-3 text-[#EF4444] font-semibold text-sm">
          Below your {targetMargin}% target - you will lose money on this job.
        </p>
      )}
      {!isBelowTarget && (
        <p className="mt-3 text-[#22C55E] font-semibold text-sm">
          Margin is at or above your {targetMargin}% target.
        </p>
      )}
    </div>
  );
}
