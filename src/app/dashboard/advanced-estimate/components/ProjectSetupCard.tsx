"use client";
import { PRODUCT_LINES, type FenceType, type WoodStyle } from "@/lib/fence-graph/engine";
import type { SoilType } from "@/lib/fence-graph/types";
import { HelpTooltip } from "@/components/Tooltip";

const FENCE_TYPES: { value: FenceType; label: string }[] = [
  { value: "vinyl", label: "Vinyl" },
  { value: "wood", label: "Wood" },
  { value: "chain_link", label: "Chain Link" },
  { value: "aluminum", label: "Aluminum / Ornamental" },
];

const WOOD_STYLES: { value: WoodStyle; label: string }[] = [
  { value: "dog_ear_privacy", label: "Dog Ear Privacy" },
  { value: "flat_top_privacy", label: "Flat Top Privacy" },
  { value: "picket", label: "Picket" },
  { value: "board_on_board", label: "Board on Board" },
];

export const PRODUCT_LINE_BY_TYPE: Record<FenceType, string[]> = {
  vinyl: ["vinyl_privacy_6ft", "vinyl_privacy_8ft", "vinyl_picket_4ft", "vinyl_picket_6ft"],
  wood: ["wood_privacy_6ft", "wood_privacy_8ft", "wood_picket_4ft"],
  chain_link: ["chain_link_4ft", "chain_link_6ft"],
  aluminum: ["aluminum_4ft", "aluminum_6ft"],
};

const SOIL_LABELS: Record<SoilType, string> = {
  standard: "Standard / Mixed",
  clay: "Clay (firm)",
  rocky: "Rocky / Caliche",
  sandy_loam: "Sandy Loam (FL inland)",
  sandy: "Sandy (FL coastal)",
  wet: "Wet / High Water Table",
};

interface ProjectSetupCardProps {
  projectName: string;
  onProjectNameChange: (v: string) => void;
  fenceType: FenceType;
  onFenceTypeChange: (v: FenceType) => void;
  productLineId: string;
  onProductLineIdChange: (v: string) => void;
  woodStyle: WoodStyle;
  onWoodStyleChange: (v: WoodStyle) => void;
  soilType: SoilType;
  onSoilTypeChange: (v: SoilType) => void;
  laborRate: number;
  onLaborRateChange: (v: number) => void;
  wastePct: number;
  onWastePctChange: (v: number) => void;
  markupPct: number;
  onMarkupPctChange: (v: number) => void;
  windMode: boolean;
  onWindModeToggle: () => void;
  existingFenceRemoval: boolean;
  onExistingFenceRemovalToggle: () => void;
  laborEfficiency: number;
  onLaborEfficiencyChange: (v: number) => void;
}

function parseNumber(e: React.ChangeEvent<HTMLInputElement>, fallback: number): number {
  const v = e.target.valueAsNumber;
  return Number.isFinite(v) ? v : fallback;
}

export default function ProjectSetupCard({
  projectName, onProjectNameChange,
  fenceType, onFenceTypeChange,
  productLineId, onProductLineIdChange,
  woodStyle, onWoodStyleChange,
  soilType, onSoilTypeChange,
  laborRate, onLaborRateChange,
  wastePct, onWastePctChange,
  markupPct, onMarkupPctChange,
  windMode, onWindModeToggle,
  existingFenceRemoval, onExistingFenceRemovalToggle,
  laborEfficiency, onLaborEfficiencyChange,
}: ProjectSetupCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-fence-900 mb-4">Project Setup</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Name</label>
          <input
            type="text" placeholder="e.g. Smith Residence — Backyard Privacy"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        {/* Fence Type Selector */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fence Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FENCE_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => {
                  onFenceTypeChange(ft.value);
                  onProductLineIdChange(PRODUCT_LINE_BY_TYPE[ft.value][0]);
                }}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${fenceType === ft.value ? "bg-fence-600 text-white border-fence-600" : "bg-white text-gray-600 border-gray-200 hover:border-fence-400"}`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product / Height</label>
          <select
            value={productLineId}
            onChange={(e) => onProductLineIdChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          >
            {PRODUCT_LINE_BY_TYPE[fenceType].map((id) => (
              <option key={id} value={id}>{PRODUCT_LINES[id]?.name ?? id}</option>
            ))}
          </select>
        </div>
        {fenceType === "wood" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Wood Style</label>
            <select
              value={woodStyle}
              onChange={(e) => onWoodStyleChange(e.target.value as WoodStyle)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
            >
              {WOOD_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Soil Type
            <HelpTooltip content="Soil type affects concrete depth and hole diameter. Sandy soil needs deeper holes, clay allows shallower holes. This impacts concrete quantity and post stability." />
          </label>
          <select
            value={soilType}
            onChange={(e) => onSoilTypeChange(e.target.value as SoilType)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          >
            {(Object.entries(SOIL_LABELS) as [SoilType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Labor Rate ($/hr)
            <HelpTooltip content="Your crew's hourly rate including wages, insurance, and benefits. Typical range: $50-80/hr for 2-person crew. System calculates hours based on fence complexity." />
          </label>
          <input
            type="number" min={20} max={200} value={laborRate}
            onChange={(e) => onLaborRateChange(parseNumber(e, 65))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Waste Factor (%)
            <HelpTooltip content="Extra material to account for cuts, defects, and installation errors. Typical: 5-7%. System learns your actual waste from completed jobs and adjusts this automatically." />
          </label>
          <input
            type="number" min={1} max={20} value={wastePct}
            onChange={(e) => onWastePctChange(parseNumber(e, 5))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Markup Over Cost (%)
            <HelpTooltip content="Your profit margin over total cost (materials + labor). Typical: 30-40%. This determines your bid price and gross profit." />
          </label>
          <input
            type="number" min={0} max={200} value={markupPct}
            onChange={(e) => onMarkupPctChange(Math.max(0, parseNumber(e, 35)))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onWindModeToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${windMode ? "bg-fence-600" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${windMode ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">Wind Mode / Hurricane Zone</span>
          {windMode && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Deeper posts + aluminum inserts + rebar applied</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExistingFenceRemovalToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${existingFenceRemoval ? "bg-fence-600" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${existingFenceRemoval ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">Existing Fence Removal</span>
          {existingFenceRemoval && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Tear-down labor + post extraction + disposal</span>}
        </div>
      </div>

      {/* Labor Efficiency Slider */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Site Difficulty Adjustment
          <HelpTooltip content="Adjusts labor time for site conditions. Rocky soil, tight access, or difficult terrain = slide right (+). Wide open, easy access = slide left (-). Affects total labor hours and cost." />
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0.7} max={1.5} step={0.05}
            value={laborEfficiency}
            onChange={(e) => onLaborEfficiencyChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fence-600"
          />
          <span className="text-sm font-bold text-fence-900 w-14 text-right">
            {Math.abs(laborEfficiency - 1.0) < 1e-6 ? "Normal" : `${laborEfficiency > 1 ? "+" : ""}${Math.round((laborEfficiency - 1) * 100)}%`}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Slide right for harder sites (rocky, tight access). Slide left for easy, open lots.
        </p>
      </div>
    </div>
  );
}
