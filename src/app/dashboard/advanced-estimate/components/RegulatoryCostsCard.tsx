"use client";

interface RegulatoryCostsCardProps {
  permitCost: number;
  inspectionCost: number;
  engineeringCost: number;
  surveyCost: number;
  onPermitChange: (v: number) => void;
  onInspectionChange: (v: number) => void;
  onEngineeringChange: (v: number) => void;
  onSurveyChange: (v: number) => void;
}

function parseCost(e: React.ChangeEvent<HTMLInputElement>): number {
  const v = e.target.valueAsNumber;
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

export default function RegulatoryCostsCard({
  permitCost,
  inspectionCost,
  engineeringCost,
  surveyCost,
  onPermitChange,
  onInspectionChange,
  onEngineeringChange,
  onSurveyChange,
}: RegulatoryCostsCardProps) {
  return (
    <details className="bg-white rounded-xl border border-gray-200">
      <summary className="p-5 cursor-pointer">
        <span className="font-semibold text-fence-900">Regulatory Costs</span>
        <span className="text-xs text-gray-400 ml-2">(optional — permits, inspection, engineering, survey)</span>
      </summary>
      <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label htmlFor="est-permit-cost" className="block text-xs font-medium text-gray-500 mb-1">Permit ($)</label>
          <input
            id="est-permit-cost"
            type="number" min={0} value={permitCost || ""} placeholder="0"
            onChange={(e) => onPermitChange(parseCost(e))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        <div>
          <label htmlFor="est-inspection-cost" className="block text-xs font-medium text-gray-500 mb-1">Inspection ($)</label>
          <input
            id="est-inspection-cost"
            type="number" min={0} value={inspectionCost || ""} placeholder="0"
            onChange={(e) => onInspectionChange(parseCost(e))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        <div>
          <label htmlFor="est-engineering-cost" className="block text-xs font-medium text-gray-500 mb-1">Engineering ($)</label>
          <input
            id="est-engineering-cost"
            type="number" min={0} value={engineeringCost || ""} placeholder="0"
            onChange={(e) => onEngineeringChange(parseCost(e))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        <div>
          <label htmlFor="est-survey-cost" className="block text-xs font-medium text-gray-500 mb-1">Survey ($)</label>
          <input
            id="est-survey-cost"
            type="number" min={0} value={surveyCost || ""} placeholder="0"
            onChange={(e) => onSurveyChange(parseCost(e))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
      </div>
    </details>
  );
}
