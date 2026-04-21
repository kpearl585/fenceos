"use client";
import { PRODUCT_LINES, type FenceType, type WoodStyle } from "@/lib/fence-graph/engine";
import type { SoilType } from "@/lib/fence-graph/types";
import { HelpTooltip } from "@/components/Tooltip";
import ToggleSwitch from "./ToggleSwitch";
import {
  DEFAULT_LABOR_RATE,
  DEFAULT_WASTE_PCT,
  DEFAULT_MARKUP_PCT,
  LABOR_RATE_MIN,
  LABOR_RATE_MAX,
  WASTE_PCT_MIN,
  WASTE_PCT_MAX,
  MARKUP_PCT_MIN,
  MARKUP_PCT_MAX,
  LABOR_EFFICIENCY_MIN,
  LABOR_EFFICIENCY_MAX,
  LABOR_EFFICIENCY_STEP,
} from "../constants";

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
  clay: "Clay (firm, cohesive)",
  rocky: "Rocky / Hard (caliche, shale, decomposed granite)",
  sandy_loam: "Sandy Loam (inland, well-drained)",
  sandy: "Sandy (coastal, loose)",
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

const INPUT_CLASS = "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const LABEL_CLASS = "block text-xs font-semibold text-muted uppercase tracking-wider mb-1";

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
    <div className="bg-surface-2 rounded-xl border border-border p-5">
      <h2 className="font-semibold text-text mb-4">Project Setup</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="est-project-name" className={LABEL_CLASS}>Project Name</label>
          <input
            id="est-project-name"
            type="text" placeholder="e.g. Smith Residence — Backyard Privacy"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        {/* Fence Type Selector */}
        <div className="sm:col-span-2">
          <label className={`${LABEL_CLASS} mb-2`}>Fence Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FENCE_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => {
                  onFenceTypeChange(ft.value);
                  onProductLineIdChange(PRODUCT_LINE_BY_TYPE[ft.value][0]);
                }}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors duration-150 ${fenceType === ft.value ? "bg-accent text-white border-accent" : "bg-surface-3 text-muted border-border hover:border-accent/60 hover:text-text"}`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="est-product-line" className={LABEL_CLASS}>Product / Height</label>
          <select
            id="est-product-line"
            value={productLineId}
            onChange={(e) => onProductLineIdChange(e.target.value)}
            className={INPUT_CLASS}
          >
            {PRODUCT_LINE_BY_TYPE[fenceType].map((id) => (
              <option key={id} value={id}>{PRODUCT_LINES[id]?.name ?? id}</option>
            ))}
          </select>
        </div>
        {fenceType === "wood" && (
          <div>
            <label htmlFor="est-wood-style" className={LABEL_CLASS}>Wood Style</label>
            <select
              id="est-wood-style"
              value={woodStyle}
              onChange={(e) => onWoodStyleChange(e.target.value as WoodStyle)}
              className={INPUT_CLASS}
            >
              {WOOD_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="est-soil-type" className={`${LABEL_CLASS} flex items-center gap-1`}>
            Soil Type
            <HelpTooltip content="Soil type affects concrete depth and hole diameter. Sandy soil needs deeper holes, clay allows shallower holes. This impacts concrete quantity and post stability." />
          </label>
          <select
            id="est-soil-type"
            value={soilType}
            onChange={(e) => onSoilTypeChange(e.target.value as SoilType)}
            className={INPUT_CLASS}
          >
            {(Object.entries(SOIL_LABELS) as [SoilType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Business settings — collapsible so the contractor sees fence
          type + measurements first, and these secondary options only
          when they need to adjust from their defaults. */}
      <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer flex items-center justify-between hover:text-text text-muted transition-colors duration-150">
          <span className="text-xs font-semibold uppercase tracking-wider">Business Settings</span>
          <span className="text-xs">
            ${laborRate}/hr · {markupPct}% markup · {wastePct}% waste
          </span>
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="est-labor-rate" className={`${LABEL_CLASS} flex items-center gap-1`}>
              Labor Rate ($/hr)
              <HelpTooltip content="Your crew's hourly rate including wages, insurance, and benefits. Typical range: $50-80/hr for 2-person crew. System calculates hours based on fence complexity." />
            </label>
            <input
              id="est-labor-rate"
              type="number" min={LABOR_RATE_MIN} max={LABOR_RATE_MAX} value={laborRate}
              onChange={(e) => onLaborRateChange(parseNumber(e, DEFAULT_LABOR_RATE))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="est-waste-pct" className={`${LABEL_CLASS} flex items-center gap-1`}>
              Waste (%)
              <HelpTooltip content="Extra material to account for cuts, defects, and installation errors. Typical: 5-7%. System learns your actual waste from completed jobs and adjusts this automatically." />
            </label>
            <input
              id="est-waste-pct"
              type="number" min={WASTE_PCT_MIN} max={WASTE_PCT_MAX} value={wastePct}
              onChange={(e) => onWastePctChange(parseNumber(e, DEFAULT_WASTE_PCT))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="est-markup-pct" className={`${LABEL_CLASS} flex items-center gap-1`}>
              Markup (%)
              <HelpTooltip content="Your profit margin over total cost (materials + labor). Typical: 30-40%. This determines your bid price and gross profit." />
            </label>
            <input
              id="est-markup-pct"
              type="number" min={MARKUP_PCT_MIN} max={MARKUP_PCT_MAX} value={markupPct}
              onChange={(e) => onMarkupPctChange(Math.max(0, parseNumber(e, DEFAULT_MARKUP_PCT)))}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <ToggleSwitch
            label="Wind Mode / Hurricane Zone"
            checked={windMode}
            onToggle={onWindModeToggle}
            activeBadge={
              <span className="text-xs text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded">
                Deeper posts + aluminum inserts + rebar applied
              </span>
            }
          />
          <ToggleSwitch
            label="Existing Fence Removal"
            checked={existingFenceRemoval}
            onToggle={onExistingFenceRemovalToggle}
            activeBadge={
              <span className="text-xs text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded">
                Tear-down labor + post extraction + disposal
              </span>
            }
          />
        </div>

        {/* Site Difficulty — preset buttons instead of a slider.
            Contractors think "easy lot" or "tough site", not "1.15x". */}
        <div className="mt-3">
          <label className={`${LABEL_CLASS} flex items-center gap-1 mb-2`}>
            Site Difficulty
            <HelpTooltip content="Adjusts labor time for site conditions. Tough sites (rocky soil, tight access, slopes) take longer. Easy lots (flat, open, good access) are faster." />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {([
              { label: "Easy", value: 0.85, desc: "−15% labor" },
              { label: "Standard", value: 1.0, desc: "baseline" },
              { label: "Tough", value: 1.2, desc: "+20% labor" },
              { label: "Very Hard", value: 1.4, desc: "+40% labor" },
            ] as const).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onLaborEfficiencyChange(preset.value)}
                className={`py-2 px-1 rounded-lg text-center border transition-colors duration-150 ${
                  Math.abs(laborEfficiency - preset.value) < 0.05
                    ? "bg-accent text-white border-accent"
                    : "bg-surface-3 text-muted border-border hover:border-accent/60 hover:text-text"
                }`}
              >
                <span className="block text-xs font-semibold">{preset.label}</span>
                <span className="block text-[10px] mt-0.5 opacity-70">{preset.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
