"use client";

import { useState } from "react";
import type { OrgEstimatorConfig } from "@/lib/fence-graph/config/types";
import type { DeepPartial } from "@/lib/fence-graph/config/types";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/fence-graph/config/defaults";
import { saveEstimatorConfig, resetEstimatorConfig } from "./actions";

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

interface Props {
  config: OrgEstimatorConfig;
  hasCustomConfig: boolean;
}

export default function EstimatorSettingsClient({ config: initialConfig, hasCustomConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeSection, setActiveSection] = useState<string>("labor");

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
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={opts.min ?? 0}
            max={opts.max}
            step={opts.step ?? 0.01}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
          />
          {opts.unit && <span className="text-xs text-gray-400">{opts.unit}</span>}
        </div>
        {opts.help && <p className="text-xs text-gray-400 mt-0.5">{opts.help}</p>}
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

  const sections = [
    { id: "labor", label: "Labor Rates" },
    { id: "overhead", label: "Overhead" },
    { id: "concrete", label: "Concrete" },
    { id: "material", label: "Materials" },
    { id: "gates", label: "Gates" },
    { id: "equipment", label: "Equipment" },
    { id: "logistics", label: "Logistics" },
    { id: "removal", label: "Removal" },
    { id: "pricing", label: "Pricing" },
    { id: "region", label: "Region" },
  ];

  return (
    <div className="space-y-4">
      {/* Section nav */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 flex flex-wrap gap-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSection === s.id
                ? "bg-fence-600 text-white"
                : "text-gray-500 hover:text-fence-700 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">

        {/* ── LABOR RATES ── */}
        {activeSection === "labor" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Labor Rates</h2>
            <p className="text-xs text-gray-400 mb-4">Hours per unit for each activity. Adjust to match your crew speed.</p>

            {(["vinyl", "wood", "chain_link", "aluminum"] as const).map(ft => (
              <div key={ft} className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2 capitalize">{ft.replace("_", " ")}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(config.labor[ft]).map(([key, val]) => (
                    numField(
                      key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
                      val as number,
                      (v) => update("labor", {
                        ...config.labor,
                        [ft]: { ...config.labor[ft], [key]: v },
                      }),
                      { step: 0.01, unit: "hrs/unit" }
                    )
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Production Schedule</h3>
              <div className="grid grid-cols-2 gap-3">
                {numField("Hours Per Work Day", config.production.hoursPerDay,
                  (v) => update("production", { hoursPerDay: v }),
                  { min: 4, max: 14, step: 0.5, unit: "hrs", help: "Productive install hours per day" }
                )}
                {numField("Default Waste %", config.waste.defaultPct * 100,
                  (v) => update("waste", { defaultPct: v / 100 }),
                  { min: 1, max: 25, step: 0.5, unit: "%", help: "Applied to material quantities" }
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── OVERHEAD ── */}
        {activeSection === "overhead" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Job Overhead</h2>
            <p className="text-xs text-gray-400 mb-4">Fixed time per job and daily cleanup. Added to every estimate.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField("Setup (per job)", config.overhead.fixed.setupHrs,
                (v) => update("overhead", { ...config.overhead, fixed: { ...config.overhead.fixed, setupHrs: v } }),
                { unit: "hrs", help: "Truck unload, tool staging" }
              )}
              {numField("Layout (per job)", config.overhead.fixed.layoutHrs,
                (v) => update("overhead", { ...config.overhead, fixed: { ...config.overhead.fixed, layoutHrs: v } }),
                { unit: "hrs", help: "Measure, stake, string lines" }
              )}
              {numField("Cleanup (per day)", config.overhead.perDay.cleanupHrs,
                (v) => update("overhead", { ...config.overhead, perDay: { cleanupHrs: v } }),
                { unit: "hrs", help: "End-of-day sweep, scrap loading" }
              )}
            </div>
          </div>
        )}

        {/* ── CONCRETE ── */}
        {activeSection === "concrete" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Concrete</h2>
            <p className="text-xs text-gray-400 mb-4">Bag yield and depth assumptions for post setting.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField("80lb Bag Yield", config.concrete.bagYieldCuFt,
                (v) => update("concrete", { ...config.concrete, bagYieldCuFt: v }),
                { step: 0.05, unit: "cu ft", help: "Yield per 80lb concrete bag" }
              )}
              {numField("Gravel Bag Yield", config.concrete.gravelBagCuFt,
                (v) => update("concrete", { ...config.concrete, gravelBagCuFt: v }),
                { step: 0.05, unit: "cu ft", help: "Yield per 40lb gravel bag" }
              )}
              {numField("FL Sandy Depth Override", config.concrete.floridaDepthIn,
                (v) => update("concrete", { ...config.concrete, floridaDepthIn: v }),
                { min: 24, max: 60, step: 1, unit: "inches", help: "Min depth for sandy/wet soil" }
              )}
            </div>
          </div>
        )}

        {/* ── MATERIAL ASSUMPTIONS ── */}
        {activeSection === "material" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Material Assumptions</h2>
            <p className="text-xs text-gray-400 mb-4">Spacing, sizing, and quantity assumptions for BOM calculation.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField("Vinyl Pickets/Foot", config.material.vinylPicketsPerFoot,
                (v) => update("material", { ...config.material, vinylPicketsPerFoot: v }),
                { min: 1, max: 4, step: 0.5, help: "Pickets per linear foot (6\" OC = 2)" }
              )}
              {numField("Wood Board Width", config.material.woodPicketWidth,
                (v) => update("material", { ...config.material, woodPicketWidth: v }),
                { step: 0.25, unit: "inches", help: "Actual width of 1x6 board" }
              )}
              {numField("Board-on-Board Overlap", config.material.woodBoBOverlapPct * 100,
                (v) => update("material", { ...config.material, woodBoBOverlapPct: v / 100 }),
                { min: 10, max: 40, step: 1, unit: "%", help: "Board overlap percentage" }
              )}
              {numField("Screws Per Section", config.material.screwsPerSection,
                (v) => update("material", { ...config.material, screwsPerSection: v }),
                { min: 10, max: 50, step: 1, help: "Screws needed per fence section" }
              )}
              {numField("CL Post Spacing", config.material.chainLinkPostOcFt,
                (v) => update("material", { ...config.material, chainLinkPostOcFt: v }),
                { min: 6, max: 12, step: 0.5, unit: "ft OC", help: "Chain link line post spacing" }
              )}
              {numField("CL Top Rail Stock", config.material.chainLinkTopRailStockFt,
                (v) => update("material", { ...config.material, chainLinkTopRailStockFt: v }),
                { min: 10, max: 24, step: 1, unit: "ft", help: "Standard top rail stock length" }
              )}
            </div>
          </div>
        )}

        {/* ── GATES ── */}
        {activeSection === "gates" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Gate Settings</h2>
            <p className="text-xs text-gray-400 mb-4">Base labor hours, width multipliers, clearance gaps.</p>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Base Labor Hours</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {numField("Single Gate", config.gateLaborBase.single,
                (v) => update("gateLaborBase", { ...config.gateLaborBase, single: v }),
                { unit: "hrs" }
              )}
              {numField("Double Gate", config.gateLaborBase.double,
                (v) => update("gateLaborBase", { ...config.gateLaborBase, double: v }),
                { unit: "hrs" }
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Width Multipliers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {numField("Small (<=4ft)", config.gateWidthMultipliers.small,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, small: v }),
                { step: 0.1, unit: "x" }
              )}
              {numField("Standard (5-6ft)", config.gateWidthMultipliers.standard,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, standard: v }),
                { step: 0.1, unit: "x" }
              )}
              {numField("Wide (7-12ft)", config.gateWidthMultipliers.wide,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, wide: v }),
                { step: 0.1, unit: "x" }
              )}
              {numField("Extra Wide (13ft+)", config.gateWidthMultipliers.extraWide,
                (v) => update("gateWidthMultipliers", { ...config.gateWidthMultipliers, extraWide: v }),
                { step: 0.1, unit: "x" }
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Clearance Gaps</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {numField("Hinge Gap", config.gateGaps.hinge,
                (v) => update("gateGaps", { ...config.gateGaps, hinge: v }),
                { step: 0.25, unit: "inches" }
              )}
              {numField("Latch Gap", config.gateGaps.latch,
                (v) => update("gateGaps", { ...config.gateGaps, latch: v }),
                { step: 0.25, unit: "inches" }
              )}
              {numField("Center Gap (dbl)", config.gateGaps.center,
                (v) => update("gateGaps", { ...config.gateGaps, center: v }),
                { step: 0.25, unit: "inches" }
              )}
            </div>

            {numField("Pool Gate Multiplier", config.gatePoolMultiplier,
              (v) => setConfig(prev => ({ ...prev, gatePoolMultiplier: v })),
              { step: 0.1, unit: "x", help: "Additional labor factor for pool code compliance" }
            )}
          </div>
        )}

        {/* ── EQUIPMENT ── */}
        {activeSection === "equipment" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Equipment Rental</h2>
            <p className="text-xs text-gray-400 mb-4">Daily rental costs added to estimates automatically.</p>
            <div className="grid grid-cols-2 gap-4">
              {numField("Post Hole Auger", config.equipment.augerPerDay,
                (v) => update("equipment", { ...config.equipment, augerPerDay: v }),
                { unit: "$/day", help: "Always included" }
              )}
              {numField("Concrete Mixer", config.equipment.mixerPerDay,
                (v) => update("equipment", { ...config.equipment, mixerPerDay: v }),
                { unit: "$/day", help: "Added when >= 25 concrete bags" }
              )}
              {numField("Fence Stretcher", config.equipment.stretcherPerDay,
                (v) => update("equipment", { ...config.equipment, stretcherPerDay: v }),
                { unit: "$/day", help: "Chain link jobs only" }
              )}
              {numField("Metal Chop Saw", config.equipment.sawPerDay,
                (v) => update("equipment", { ...config.equipment, sawPerDay: v }),
                { unit: "$/day", help: "Aluminum jobs only" }
              )}
            </div>
          </div>
        )}

        {/* ── LOGISTICS ── */}
        {activeSection === "logistics" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Delivery & Logistics</h2>
            <p className="text-xs text-gray-400 mb-4">Material delivery fee, waived above threshold.</p>
            <div className="grid grid-cols-2 gap-4">
              {numField("Delivery Fee", config.logistics.deliveryFee,
                (v) => update("logistics", { ...config.logistics, deliveryFee: v }),
                { unit: "$", help: "Flat delivery charge" }
              )}
              {numField("Free Delivery Above", config.logistics.freeDeliveryThreshold,
                (v) => update("logistics", { ...config.logistics, freeDeliveryThreshold: v }),
                { unit: "$", help: "Waived when materials exceed this amount" }
              )}
            </div>
          </div>
        )}

        {/* ── REMOVAL ── */}
        {activeSection === "removal" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Old Fence Removal</h2>
            <p className="text-xs text-gray-400 mb-4">Labor and disposal rates for existing fence tear-out.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {numField("Removal Labor", config.removal.laborPerLf,
                (v) => update("removal", { ...config.removal, laborPerLf: v }),
                { step: 0.01, unit: "hrs/LF", help: "Labor per linear foot of tear-down" }
              )}
              {numField("Post Extraction", config.removal.postExtractionHrs,
                (v) => update("removal", { ...config.removal, postExtractionHrs: v }),
                { step: 0.05, unit: "hrs/post", help: "Extract old concrete/posts" }
              )}
              {numField("Disposal Cost", config.removal.disposalCost,
                (v) => update("removal", { ...config.removal, disposalCost: v }),
                { unit: "$", help: "Flat dumpster/haul-away cost" }
              )}
            </div>
          </div>
        )}

        {/* ── PRICING ── */}
        {activeSection === "pricing" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Pricing Rules</h2>
            <p className="text-xs text-gray-400 mb-4">Commercial rules applied to final estimate totals.</p>
            {numField("Minimum Job Charge", config.pricing.minimumJobCharge,
              (v) => update("pricing", { minimumJobCharge: v }),
              { unit: "$", help: "Floor price regardless of scope. Set to 0 to disable." }
            )}
          </div>
        )}

        {/* ── REGION ── */}
        {activeSection === "region" && (
          <div>
            <h2 className="font-semibold text-fence-900 mb-1">Regional Pricing</h2>
            <p className="text-xs text-gray-400 mb-4">Adjust material and labor costs for your area.</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <select
                value={config.region.key}
                onChange={(e) => update("region", { ...config.region, key: e.target.value })}
                className="w-full max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fence-400"
              >
                {REGION_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Sets default material prices based on regional wholesale averages.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {numField("Labor Multiplier", config.region.laborMultiplier,
                (v) => update("region", { ...config.region, laborMultiplier: v }),
                { step: 0.05, unit: "x", help: "1.0 = base. 1.15 = 15% higher labor costs." }
              )}
              {numField("Material Multiplier", config.region.materialMultiplier,
                (v) => update("region", { ...config.region, materialMultiplier: v }),
                { step: 0.05, unit: "x", help: "Additional adjustment on top of region pricing." }
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save / Reset bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between sticky bottom-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="bg-fence-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-fence-700 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error — Retry" : "Save Settings"}
          </button>
          {hasCustomConfig && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Reset to Defaults
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">Changes apply to all new estimates</p>
      </div>
    </div>
  );
}
