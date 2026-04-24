"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrgEstimatorConfig } from "@/lib/fence-graph/config/types";
import type { DeepPartial } from "@/lib/fence-graph/config/types";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/fence-graph/config/defaults";
import { saveEstimatorConfig, resetEstimatorConfig } from "./actions";

// Shared dark-polish class patterns. Extracted so every input/label
// across the ~20 sections of this screen reads the same on dark.
const INPUT_CLASS =
  "w-full border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const NUM_INPUT_CLASS =
  "w-28 border border-border bg-surface-3 text-text rounded-lg px-3 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150";
const LABEL_CLASS =
  "block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wider";
// Tab-style pill, shared between Essentials pill and the advanced sub-nav.
const TAB_ACTIVE = "bg-accent text-white";
const TAB_IDLE = "text-muted hover:text-text hover:bg-surface-3";

const REGION_OPTIONS = [
  { value: "base", label: "Base (National Average)" },
  { value: "northeast", label: "Northeast (+15%)" },
  { value: "southeast", label: "Southeast (-5%)" },
  { value: "midwest", label: "Midwest (-12%)" },
  { value: "south_central", label: "South Central (-8%)" },
  { value: "southwest", label: "Southwest (+5%)" },
  { value: "west", label: "West Coast (+28%)" },
  { value: "florida", label: "Florida (+8%)" },
  { value: "northwest", label: "Northwest (+12%)" },
  { value: "mountain", label: "Mountain (-2%)" },
];

// Plain-English copy for each labor-hour activity. Keyed by the engine
// key so the Object.entries(config.labor[ft]) loop can look up a
// contractor-readable label + explanation instead of displaying the
// raw camelCase field name.
const LABOR_ACTIVITY_COPY: Record<string, { label: string; help: string }> = {
  holeDig:        { label: "Digging a post hole",          help: "Hours to auger one post hole. 0.25 hrs ≈ 15 min per hole." },
  postSet:        { label: "Setting a post",                help: "Hours to plumb, brace, and concrete one post in place." },
  sectionInstall: { label: "Installing one panel section",  help: "Hours to hang and fasten a complete section between two posts." },
  cutting:        { label: "Cutting a section to length",   help: "Hours when a run doesn’t end on a clean panel and you have to trim." },
  racking:        { label: "Racking / stepping for slope",  help: "Extra hours per section when the ground slopes enough to need racking." },
  concretePour:   { label: "Pouring concrete per post",     help: "Hours to mix and pour dry-set concrete into one post hole." },
  railInstall:    { label: "Hanging a wood rail",           help: "Hours to attach one horizontal rail between posts (2×4 or similar)." },
  boardNailing:   { label: "Nailing boards to rails",       help: "Hours to fasten a full section of vertical boards onto the rails." },
  bobInstall:     { label: "Board-on-board adder",          help: "Extra hours per section when doing board-on-board instead of flat boards." },
  topRail:        { label: "Installing chain-link top rail",help: "Hours to cut, assemble, and tie off the top rail on a chain-link run." },
  fabricStretch:  { label: "Stretching chain-link fabric",  help: "Hours per section to stretch and tie off the chain-link mesh." },
  tieWire:        { label: "Finishing with tie wire",       help: "Hours per section for finish ties after stretching the fabric." },
  panelInstall:   { label: "Installing an aluminum panel",  help: "Hours to hang and fasten one aluminum panel." },
};

interface Props {
  config: OrgEstimatorConfig;
  hasCustomConfig: boolean;
}

type FenceType = "vinyl" | "wood" | "chain_link" | "aluminum";
type SpeedPreset = "slow" | "average" | "fast" | "custom";

const SPEED_MULTIPLIER: Record<Exclude<SpeedPreset, "custom">, number> = {
  slow:    1.2, // 20% more hours per activity
  average: 1.0,
  fast:    0.8, // 20% fewer hours per activity
};

const SPEED_COPY: Record<Exclude<SpeedPreset, "custom">, { label: string; blurb: string }> = {
  slow:    { label: "Slower",  blurb: "Newer crew, tough terrain, or extra prep — pads labor ~20%." },
  average: { label: "Average", blurb: "Industry default — a seasoned two-person residential crew." },
  fast:    { label: "Faster",  blurb: "Experienced crew working quick access, flat ground — trims labor ~20%." },
};

const FENCE_TYPE_COPY: Record<FenceType, { label: string }> = {
  vinyl:      { label: "Vinyl" },
  wood:       { label: "Wood" },
  chain_link: { label: "Chain link" },
  aluminum:   { label: "Aluminum" },
};

// Compare the current per-activity hours for a fence type to the defaults.
// Returns "slow" / "average" / "fast" when every activity is uniformly
// scaled from defaults (within a small rounding tolerance). Returns
// "custom" if the user hand-tweaked individual activities so no single
// speed preset describes them.
function detectSpeedPreset(
  current: Record<string, number>,
  defaults: Record<string, number>
): SpeedPreset {
  const keys = Object.keys(defaults);
  const ratios: number[] = [];
  for (const k of keys) {
    const def = defaults[k];
    const cur = current[k];
    if (!def || cur === undefined) continue;
    ratios.push(cur / def);
  }
  if (ratios.length === 0) return "average";
  const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  const uniform = ratios.every((r) => Math.abs(r - avg) < 0.02);
  if (!uniform) return "custom";
  if (avg >= 1.1) return "slow";
  if (avg <= 0.9) return "fast";
  return "average";
}

function scaleActivitiesByPreset<T extends Record<string, number>>(
  defaults: T,
  preset: Exclude<SpeedPreset, "custom">
): T {
  const mult = SPEED_MULTIPLIER[preset];
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(defaults)) {
    out[k] = Math.round(v * mult * 1000) / 1000;
  }
  return out as T;
}

export default function EstimatorSettingsClient({ config: initialConfig, hasCustomConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Default contractors to the plain-English Essentials view. Industry-
  // constant and engine-internal settings stay hidden under the Advanced
  // disclosure until someone intentionally opens it.
  const [activeSection, setActiveSection] = useState<string>("essentials");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  // Per-activity labor hours are hidden under a disclosure inside the
  // Labor tab. 99% of contractors only need the speed preset.
  const [showPerActivity, setShowPerActivity] = useState<boolean>(false);

  function update<K extends keyof OrgEstimatorConfig>(section: K, value: OrgEstimatorConfig[K]) {
    setConfig(prev => ({ ...prev, [section]: value }));
  }

  function numField(
    label: string,
    value: number,
    onChange: (v: number) => void,
    opts: { min?: number; max?: number; step?: number; unit?: string; help?: string } = {}
  ) {
    return (
      <div>
        <label className={LABEL_CLASS}>{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={opts.min ?? 0}
            max={opts.max}
            step={opts.step ?? 0.01}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={NUM_INPUT_CLASS}
          />
          {opts.unit && <span className="text-xs text-muted">{opts.unit}</span>}
        </div>
        {opts.help && <p className="text-xs text-muted mt-0.5">{opts.help}</p>}
      </div>
    );
  }

  async function handleSave() {
    setSaveStatus("saving");

    // Build overrides: only include values that differ from defaults
    const overrides: DeepPartial<OrgEstimatorConfig> = {};

    // Compare each section against defaults and include changed values
    if (JSON.stringify(config.labor) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.labor)) {
      overrides.labor = config.labor;
    }
    if (JSON.stringify(config.gateLaborBase) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.gateLaborBase)) {
      overrides.gateLaborBase = config.gateLaborBase;
    }
    if (JSON.stringify(config.gateWidthMultipliers) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.gateWidthMultipliers)) {
      overrides.gateWidthMultipliers = config.gateWidthMultipliers;
    }
    if (config.gatePoolMultiplier !== DEFAULT_ESTIMATOR_CONFIG.gatePoolMultiplier) {
      overrides.gatePoolMultiplier = config.gatePoolMultiplier;
    }
    if (JSON.stringify(config.gateGaps) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.gateGaps)) {
      overrides.gateGaps = config.gateGaps;
    }
    if (JSON.stringify(config.concrete) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.concrete)) {
      overrides.concrete = config.concrete;
    }
    if (JSON.stringify(config.material) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.material)) {
      overrides.material = config.material;
    }
    if (JSON.stringify(config.overhead) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.overhead)) {
      overrides.overhead = config.overhead;
    }
    if (JSON.stringify(config.logistics) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.logistics)) {
      overrides.logistics = config.logistics;
    }
    if (JSON.stringify(config.equipment) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.equipment)) {
      overrides.equipment = config.equipment;
    }
    if (JSON.stringify(config.removal) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.removal)) {
      overrides.removal = config.removal;
    }
    if (JSON.stringify(config.pricing) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.pricing)) {
      overrides.pricing = config.pricing;
    }
    if (JSON.stringify(config.production) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.production)) {
      overrides.production = config.production;
    }
    if (JSON.stringify(config.waste) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.waste)) {
      overrides.waste = config.waste;
    }
    if (JSON.stringify(config.region) !== JSON.stringify(DEFAULT_ESTIMATOR_CONFIG.region)) {
      overrides.region = config.region;
    }

    const res = await saveEstimatorConfig(overrides);
    setSaveStatus(res.success ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }

  async function handleReset() {
    if (!confirm("Reset all estimator settings to defaults? This cannot be undone.")) return;
    const res = await resetEstimatorConfig();
    if (res.success) {
      setConfig({ ...DEFAULT_ESTIMATOR_CONFIG });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const advancedSections = [
    { id: "labor", label: "Crew labor hours" },
    { id: "overhead", label: "Job overhead" },
    { id: "concrete", label: "Concrete" },
    { id: "material", label: "Material assumptions" },
    { id: "gates", label: "Gates" },
    { id: "equipment", label: "Equipment rental" },
    { id: "logistics", label: "Delivery" },
    { id: "removal", label: "Old fence removal" },
    { id: "pricing", label: "Pricing rules" },
    { id: "region", label: "Region details" },
  ];

  function toggleAdvanced() {
    const next = !showAdvanced;
    setShowAdvanced(next);
    // Collapsing Advanced snaps back to Essentials so the content pane
    // never renders a section the user can no longer navigate to.
    if (!next && activeSection !== "essentials") setActiveSection("essentials");
  }

  return (
    <div className="space-y-4">
      {/* Section nav — two-level: Essentials pill + Advanced disclosure */}
      <div className="bg-surface-2 rounded-xl border border-border p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setActiveSection("essentials")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 ${
              activeSection === "essentials" ? TAB_ACTIVE : TAB_IDLE
            }`}
          >
            Essentials
          </button>
          <button
            onClick={toggleAdvanced}
            aria-expanded={showAdvanced}
            className="ml-auto px-3 py-1.5 text-xs font-semibold text-muted hover:text-accent-light flex items-center gap-1.5 transition-colors duration-150"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
          </button>
        </div>
        {showAdvanced && (
          <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-1">
            {advancedSections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 ${
                  activeSection === s.id
                    ? "bg-accent/15 text-accent-light border border-accent/30"
                    : TAB_IDLE
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-surface-2 rounded-xl border border-border p-6">

        {/* ── ESSENTIALS ── */}
        {activeSection === "essentials" && (
          <div>
            <h2 className="font-display text-lg font-semibold text-text mb-1">Essentials</h2>
            <p className="text-sm text-muted mb-6">
              The few settings most contractors actually set. The engine uses industry defaults for everything else &mdash; open
              <span className="font-medium text-text"> Show advanced settings</span> above only if you need to change crew labor hours, concrete math, gate multipliers, and similar internals.
            </p>

            <div className="space-y-4">
              {/* Region */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
                <label className="block font-semibold text-text mb-1">Where do you work?</label>
                <p className="text-sm text-muted mb-3">
                  We adjust labor and material averages based on your region.
                </p>
                <select
                  value={config.region.key}
                  onChange={(e) => update("region", { ...config.region, key: e.target.value })}
                  className="w-full max-w-md border border-border bg-surface-3 text-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-150"
                >
                  {REGION_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Waste */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
                <label className="block font-semibold text-text mb-1">Default material waste</label>
                <p className="text-sm text-muted mb-3">
                  Extra material ordered beyond what the plan calls for &mdash; cut scrap, broken pickets, spare posts. 5% is the industry norm for a seasoned crew. We&rsquo;ll also learn from your closed jobs and adjust this over time.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={25}
                    step={0.5}
                    value={Math.round(config.waste.defaultPct * 1000) / 10}
                    onChange={(e) => update("waste", { defaultPct: Number(e.target.value) / 100 })}
                    className={NUM_INPUT_CLASS}
                    aria-label="Default material waste percentage"
                  />
                  <span className="text-sm text-muted">percent</span>
                </div>
              </div>

              {/* Hours per day */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
                <label className="block font-semibold text-text mb-1">Crew hours per work day</label>
                <p className="text-sm text-muted mb-3">
                  How many hands-on install hours your crew puts in per day (not counting travel or lunch). Most residential crews run 6&ndash;8 productive hours.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={4}
                    max={14}
                    step={0.5}
                    value={config.production.hoursPerDay}
                    onChange={(e) => update("production", { hoursPerDay: Number(e.target.value) })}
                    className={NUM_INPUT_CLASS}
                    aria-label="Crew hours per work day"
                  />
                  <span className="text-sm text-muted">hours</span>
                </div>
              </div>
            </div>

            {/* Pointer to main Settings for labor rate + target margin */}
            <div className="mt-6 bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm text-warning">
              <span className="font-semibold">Looking for labor rate or target margin?</span>{" "}
              Those live on the main{" "}
              <Link href="/dashboard/settings" className="underline font-medium">Settings page</Link>{" "}
              &mdash; they apply across your whole account, not just the estimator.
            </div>
          </div>
        )}


        {/* ── CREW LABOR HOURS ── */}
        {activeSection === "labor" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Crew speed</h2>
            <p className="text-sm text-muted mb-5">
              How fast is your crew for each fence type? The defaults match a seasoned two-person residential crew. Pick <span className="font-medium text-text">Slower</span> or <span className="font-medium text-text">Faster</span> if your crew runs meaningfully off the average &mdash; we scale the whole install timeline behind the scenes.
            </p>

            <div className="space-y-2">
              {(["vinyl", "wood", "chain_link", "aluminum"] as const).map(ft => {
                const currentPreset = detectSpeedPreset(
                  config.labor[ft] as unknown as Record<string, number>,
                  DEFAULT_ESTIMATOR_CONFIG.labor[ft] as unknown as Record<string, number>
                );

                const applyPreset = (preset: Exclude<SpeedPreset, "custom">) => {
                  const scaled = scaleActivitiesByPreset(
                    DEFAULT_ESTIMATOR_CONFIG.labor[ft] as unknown as Record<string, number>,
                    preset
                  );
                  update("labor", {
                    ...config.labor,
                    [ft]: { ...config.labor[ft], ...scaled },
                  });
                };

                return (
                  <div key={ft} className="rounded-xl border border-border bg-surface-3 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-text">{FENCE_TYPE_COPY[ft].label}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {currentPreset === "custom"
                            ? "Custom per-activity hours set — pick a preset to reset, or scroll down to tweak individually."
                            : SPEED_COPY[currentPreset].blurb}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" role="radiogroup" aria-label={`${FENCE_TYPE_COPY[ft].label} crew speed`}>
                        {(["slow", "average", "fast"] as const).map((opt) => {
                          const active = currentPreset === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => applyPreset(opt)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 border ${
                                active
                                  ? "bg-accent text-white border-accent"
                                  : "bg-surface-2 text-muted border-border hover:border-accent/50 hover:text-text"
                              }`}
                            >
                              {SPEED_COPY[opt].label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per-activity disclosure for power users */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowPerActivity((v) => !v)}
                aria-expanded={showPerActivity}
                className="text-xs font-semibold text-muted hover:text-accent-light flex items-center gap-1.5 transition-colors duration-150"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showPerActivity ? "rotate-90" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {showPerActivity ? "Hide" : "Show"} per-activity hours (power-user tuning)
              </button>

              {showPerActivity && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted mb-4">
                    Edit the underlying labor hours per activity. Useful if your crew is unusually fast at one task but slow at another. Changes here pull the fence type out of any preset and into &quot;Custom.&quot;
                  </p>
                  {(["vinyl", "wood", "chain_link", "aluminum"] as const).map(ft => (
                    <div key={ft} className="mb-6">
                      <h3 className="text-sm font-bold text-text mb-2 capitalize">{ft.replace("_", " ")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(config.labor[ft]).map(([key, val]) => {
                          const copy = LABOR_ACTIVITY_COPY[key] ?? {
                            label: key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
                            help: "",
                          };
                          return numField(
                            copy.label,
                            val as number,
                            (v) => update("labor", {
                              ...config.labor,
                              [ft]: { ...config.labor[ft], [key]: v },
                            }),
                            { step: 0.01, unit: "hrs/unit", help: copy.help }
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
              <span className="font-semibold">Waste % and crew hours per day</span> moved to <span className="font-semibold">Essentials</span> above &mdash; most contractors want those at their fingertips.
            </div>
          </div>
        )}

        {/* ── JOB OVERHEAD ── */}
        {activeSection === "overhead" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Job overhead</h2>
            <p className="text-sm text-muted mb-4">
              The non-install hours every job eats no matter what: getting set up, laying out the run, cleaning up at the end. The engine adds these to every estimate so you don&rsquo;t bid the hands-on hours and eat the rest.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {numField("Getting set up at the job site", config.overhead.fixed.setupHrs,
                (v) => update("overhead", { ...config.overhead, fixed: { ...config.overhead.fixed, setupHrs: v } }),
                { unit: "hrs", help: "Unloading the truck, staging tools, prepping before install starts. Typical: 1–2 hrs." }
              )}
              {numField("Measuring and laying out the fence", config.overhead.fixed.layoutHrs,
                (v) => update("overhead", { ...config.overhead, fixed: { ...config.overhead.fixed, layoutHrs: v } }),
                { unit: "hrs", help: "Measure, stake corners, string lines, mark post locations. Typical: 0.5–1.5 hrs." }
              )}
              {numField("End-of-day cleanup", config.overhead.perDay.cleanupHrs,
                (v) => update("overhead", { ...config.overhead, perDay: { cleanupHrs: v } }),
                { unit: "hrs/day", help: "Sweep the site, load scraps, secure tools. Added every workday. Typical: 0.5 hrs." }
              )}
            </div>
          </div>
        )}

        {/* ── CONCRETE ── */}
        {activeSection === "concrete" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Concrete</h2>
            <p className="text-sm text-muted mb-4">
              How the engine figures out how many bags of concrete and gravel to order per post, and how deep the posts go on sandy or wet soil. These are physics-driven industry standards &mdash; most contractors never need to touch them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {numField("How much concrete does an 80-lb bag fill?", config.concrete.bagYieldCuFt,
                (v) => update("concrete", { ...config.concrete, bagYieldCuFt: v }),
                { step: 0.05, unit: "cu ft", help: "Industry standard: 0.6 cu ft per 80-lb bag. Only change if you use non-standard mix." }
              )}
              {numField("How much gravel does a 40-lb bag fill?", config.concrete.gravelBagCuFt,
                (v) => update("concrete", { ...config.concrete, gravelBagCuFt: v }),
                { step: 0.05, unit: "cu ft", help: "Industry standard: 0.5 cu ft per 40-lb bag. Rarely needs changing." }
              )}
              {numField("Post depth for sandy or wet soil (Florida)", config.concrete.floridaDepthIn,
                (v) => update("concrete", { ...config.concrete, floridaDepthIn: v }),
                { min: 24, max: 60, step: 1, unit: "inches", help: "Minimum post depth when soil is sandy or wet. Florida code minimum is typically 42 inches." }
              )}
            </div>
          </div>
        )}

        {/* ── MATERIAL ASSUMPTIONS ── */}
        {activeSection === "material" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Material assumptions</h2>
            <p className="text-sm text-muted mb-4">
              Spacing and sizing numbers the engine uses to figure out how many pickets, boards, rails, and fasteners to order. These are industry standards &mdash; only change them if your supplier ships unusual stock or you run a non-standard spacing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {numField("Vinyl pickets per foot of fence", config.material.vinylPicketsPerFoot,
                (v) => update("material", { ...config.material, vinylPicketsPerFoot: v }),
                { min: 1, max: 4, step: 0.5, help: "How many pickets in 1 linear foot. 6-inch on-center spacing = 2 pickets/ft. Rarely changes." }
              )}
              {numField("Actual width of a wood board", config.material.woodPicketWidth,
                (v) => update("material", { ...config.material, woodPicketWidth: v }),
                { step: 0.25, unit: "inches", help: "A nominal 1×6 board actually measures 5.5\" wide. Industry standard; only change for unusual stock." }
              )}
              {numField("Board-on-board overlap", config.material.woodBoBOverlapPct * 100,
                (v) => update("material", { ...config.material, woodBoBOverlapPct: v / 100 }),
                { min: 10, max: 40, step: 1, unit: "%", help: "On board-on-board privacy fences, how much each board overlaps the next. 24% is typical." }
              )}
              {numField("Screws or nails per fence section", config.material.screwsPerSection,
                (v) => update("material", { ...config.material, screwsPerSection: v }),
                { min: 10, max: 50, step: 1, help: "How many fasteners go into one panel. 25 is the industry average for a 6-ft privacy section." }
              )}
              {numField("Chain-link line post spacing", config.material.chainLinkPostOcFt,
                (v) => update("material", { ...config.material, chainLinkPostOcFt: v }),
                { min: 6, max: 12, step: 0.5, unit: "ft OC", help: "How far apart chain-link line posts sit. 10 feet on-center is the industry standard." }
              )}
              {numField("Chain-link top rail stock length", config.material.chainLinkTopRailStockFt,
                (v) => update("material", { ...config.material, chainLinkTopRailStockFt: v }),
                { min: 10, max: 24, step: 1, unit: "ft", help: "Standard top-rail pipe comes in 21-ft lengths. Only change if your supplier sells different stock." }
              )}
            </div>
          </div>
        )}

        {/* ── GATES ── */}
        {activeSection === "gates" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Gates</h2>
            <p className="text-sm text-muted mb-4">
              How the engine prices gates. Base install hours, extra time for wider gates, hinge and latch clearances, and the pool-code bump. Defaults reflect average residential gate work.
            </p>

            <h3 className="text-sm font-bold text-text mb-2">Base install hours</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {numField("Hours to install a single gate", config.gateLaborBase.single,
                (v) => update("gateLaborBase", { ...config.gateLaborBase, single: v }),
                { unit: "hrs", help: "Base time to hang, level, and latch a standard walk gate. Typical: 1.5 hrs." }
              )}
              {numField("Hours to install a double gate", config.gateLaborBase.double,
                (v) => update("gateLaborBase", { ...config.gateLaborBase, double: v }),
                { unit: "hrs", help: "Base time for a double drive gate — both leaves plus center alignment. Typical: 3 hrs." }
              )}
            </div>

            <h3 className="text-sm font-bold text-text mb-2">Gate size adjustment</h3>
            <p className="text-xs text-muted mb-2">Multiplier applied to base gate hours when the gate is wider than standard. 1.0 = no adjustment, 1.3 = +30%.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {numField("Small gate (up to 4 ft)", config.gateWidthMultipliers.small,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, small: v }),
                { step: 0.1, unit: "x", help: "Most walk gates. Baseline." }
              )}
              {numField("Standard gate (5–6 ft)", config.gateWidthMultipliers.standard,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, standard: v }),
                { step: 0.1, unit: "x", help: "Wider walk gate or narrow drive. Typical +10%." }
              )}
              {numField("Wide gate (7–12 ft)", config.gateWidthMultipliers.wide,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, wide: v }),
                { step: 0.1, unit: "x", help: "Typical single drive gate. Typical +30%." }
              )}
              {numField("Extra-wide gate (13 ft or wider)", config.gateWidthMultipliers.extraWide,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, extraWide: v }),
                { step: 0.1, unit: "x", help: "Large drive gate. Typical +50%." }
              )}
            </div>

            <h3 className="text-sm font-bold text-text mb-2">Clearance gaps</h3>
            <p className="text-xs text-muted mb-2">How much space the engine leaves between gate and post so the gate swings freely. Don&rsquo;t zero these out &mdash; you&rsquo;ll end up with gates that scrape or won&rsquo;t latch.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {numField("Hinge-side gap", config.gateGaps.hinge,
                (v) => update("gateGaps", { ...config.gateGaps, hinge: v }),
                { step: 0.25, unit: "inches", help: "Clearance between gate and post on the hinge side. Typical: 0.75\"." }
              )}
              {numField("Latch-side gap", config.gateGaps.latch,
                (v) => update("gateGaps", { ...config.gateGaps, latch: v }),
                { step: 0.25, unit: "inches", help: "Clearance on the latch side. Typical: 0.5\"." }
              )}
              {numField("Double-gate center gap", config.gateGaps.center,
                (v) => update("gateGaps", { ...config.gateGaps, center: v }),
                { step: 0.25, unit: "inches", help: "Clearance between the two halves of a double gate. Typical: 1\"." }
              )}
            </div>

            <h3 className="text-sm font-bold text-text mb-2">Pool-code adder</h3>
            <div className="max-w-md">
              {numField("Extra labor for pool-code gates", config.gatePoolMultiplier,
                (v) => setConfig(prev => ({ ...prev, gatePoolMultiplier: v })),
                { step: 0.1, unit: "x", help: "Multiplier on gate labor when pool-code compliance is required (self-closing hinges, latch height, etc.). Typical +20%." }
              )}
            </div>
          </div>
        )}

        {/* ── EQUIPMENT RENTAL ── */}
        {activeSection === "equipment" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Equipment rental</h2>
            <p className="text-sm text-muted mb-4">
              Day rates for tools and machines. The engine only adds these to jobs where they actually get used (a chop saw only on aluminum jobs, a stretcher only on chain link, etc.). Set the rate to what you pay at your rental yard &mdash; or $0 if you own the tool outright.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {numField("Post-hole auger", config.equipment.augerPerDay,
                (v) => update("equipment", { ...config.equipment, augerPerDay: v }),
                { unit: "$/day", help: "Added to every job — if you own yours, set this to 0." }
              )}
              {numField("Concrete mixer", config.equipment.mixerPerDay,
                (v) => update("equipment", { ...config.equipment, mixerPerDay: v }),
                { unit: "$/day", help: "Added only when the job needs 25+ concrete bags (larger pours)." }
              )}
              {numField("Chain-link stretcher", config.equipment.stretcherPerDay,
                (v) => update("equipment", { ...config.equipment, stretcherPerDay: v }),
                { unit: "$/day", help: "Added only on chain-link jobs." }
              )}
              {numField("Metal chop saw", config.equipment.sawPerDay,
                (v) => update("equipment", { ...config.equipment, sawPerDay: v }),
                { unit: "$/day", help: "Added only on aluminum jobs." }
              )}
            </div>
          </div>
        )}

        {/* ── DELIVERY ── */}
        {activeSection === "logistics" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Delivery</h2>
            <p className="text-sm text-muted mb-4">
              What your supplier charges to drop materials at the job site &mdash; passed through to the customer&rsquo;s estimate. Set the free-delivery threshold to match your supplier&rsquo;s waiver rule.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {numField("Material delivery fee", config.logistics.deliveryFee,
                (v) => update("logistics", { ...config.logistics, deliveryFee: v }),
                { unit: "$", help: "Flat fee added to every estimate unless the order exceeds the threshold below. Typical: $95." }
              )}
              {numField("Free delivery above", config.logistics.freeDeliveryThreshold,
                (v) => update("logistics", { ...config.logistics, freeDeliveryThreshold: v }),
                { unit: "$", help: "Material order total above which the delivery fee is waived. Typical: $500." }
              )}
            </div>
          </div>
        )}

        {/* ── OLD FENCE REMOVAL ── */}
        {activeSection === "removal" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Old fence removal</h2>
            <p className="text-sm text-muted mb-4">
              Tear-out is separate from install &mdash; the engine charges for it only when the estimate has removal turned on. Set these to what it actually costs your crew to take down an old fence, extract concrete footings, and haul the mess away.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {numField("Tear-out hours per foot", config.removal.laborPerLf,
                (v) => update("removal", { ...config.removal, laborPerLf: v }),
                { step: 0.01, unit: "hrs/LF", help: "Hours to tear down existing fence per linear foot. 0.08 ≈ 5 min/ft." }
              )}
              {numField("Extracting an old post + concrete footing", config.removal.postExtractionHrs,
                (v) => update("removal", { ...config.removal, postExtractionHrs: v }),
                { step: 0.05, unit: "hrs/post", help: "Hours per post to dig out the old concrete footing. Typical: 0.25 hrs." }
              )}
              {numField("Dumpster / disposal fee", config.removal.disposalCost,
                (v) => update("removal", { ...config.removal, disposalCost: v }),
                { unit: "$", help: "Flat cost for hauling the old fence and debris away. Typical: $325." }
              )}
            </div>
          </div>
        )}

        {/* ── PRICING RULES ── */}
        {activeSection === "pricing" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Pricing rules</h2>
            <p className="text-sm text-muted mb-4">
              Business rules applied on top of the calculated estimate. Today there&rsquo;s just one &mdash; a minimum charge below which you won&rsquo;t take a job.
            </p>
            <div className="max-w-md">
              {numField("Minimum job charge", config.pricing.minimumJobCharge,
                (v) => update("pricing", { minimumJobCharge: v }),
                { unit: "$", help: "Floor price regardless of scope, so tiny jobs still cover your overhead. Example: $500. Set to 0 to disable." }
              )}
            </div>
          </div>
        )}

        {/* ── REGION DETAILS ── */}
        {activeSection === "region" && (
          <div>
            <h2 className="font-display font-semibold text-text mb-1">Region details</h2>
            <p className="text-sm text-muted mb-4">
              Region is also in <span className="font-semibold text-text">Essentials</span> &mdash; this tab shows the raw multipliers the preset applies so you can fine-tune if your area is unusual. A &quot;1.0&quot; multiplier = national average.
            </p>
            <div className="mb-6">
              <label className={LABEL_CLASS}>Region</label>
              <select
                value={config.region.key}
                onChange={(e) => update("region", { ...config.region, key: e.target.value })}
                className={`${INPUT_CLASS} max-w-md`}
              >
                {REGION_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1">Picking a region sets material and labor multipliers below to the regional wholesale average.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {numField("Labor cost adjustment", config.region.laborMultiplier,
                (v) => update("region", { ...config.region, laborMultiplier: v }),
                { step: 0.05, unit: "x", help: "1.0 = national average. 1.15 = crew wages run 15% higher in your area." }
              )}
              {numField("Material cost adjustment", config.region.materialMultiplier,
                (v) => update("region", { ...config.region, materialMultiplier: v }),
                { step: 0.05, unit: "x", help: "1.0 = national average. Bump up for high-cost markets, down for low-cost." }
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save / Reset bar */}
      <div className="bg-surface-2 rounded-xl border border-border p-4 flex items-center justify-between sticky bottom-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="bg-accent hover:bg-accent-light accent-glow text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error — Retry" : "Save Settings"}
          </button>
          {hasCustomConfig && (
            <button
              onClick={handleReset}
              className="text-sm text-muted hover:text-danger transition-colors duration-150"
            >
              Reset to Defaults
            </button>
          )}
        </div>
        <p className="text-xs text-muted">Changes apply to all new estimates</p>
      </div>
    </div>
  );
}
