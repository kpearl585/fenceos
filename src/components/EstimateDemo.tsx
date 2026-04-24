"use client";

import { useState, useMemo } from "react";
import MarginBadge from "./MarginBadge";

interface EstimateInputs {
  linearFeet: number;
  gates: number;
  materialCostPerFt: number;
  laborCostPerFt: number;
  targetMargin: number;
}

const GATE_MATERIAL_COST = 350;
const GATE_LABOR_COST = 150;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  id: string;
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  id,
}: NumberInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[#F2F2F2] mb-2">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] font-medium">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={`w-full bg-[#1C1C1C] border border-[rgba(255,255,255,0.07)] rounded-lg py-4 text-lg font-medium text-[#F2F2F2] focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] outline-none transition-shadow ${
            prefix ? "pl-9 pr-4" : suffix ? "pl-4 pr-10" : "px-4"
          }`}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  bold?: boolean;
}

function ResultRow({ label, value, bold = false }: ResultRowProps) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[rgba(255,255,255,0.07)] last:border-b-0">
      <span className={`text-[#6B7280] ${bold ? "font-bold text-[#F2F2F2]" : ""}`}>
        {label}
      </span>
      <span className={`text-lg ${bold ? "font-bold text-[#22C55E] text-xl font-display" : "font-medium text-[#F2F2F2]"}`}>
        {value}
      </span>
    </div>
  );
}

export default function EstimateDemo() {
  const [inputs, setInputs] = useState<EstimateInputs>({
    linearFeet: 150,
    gates: 1,
    materialCostPerFt: 28,
    laborCostPerFt: 12,
    targetMargin: 35,
  });

  const update = (field: keyof EstimateInputs) => (val: number) => {
    setInputs((prev) => ({ ...prev, [field]: val }));
  };

  const results = useMemo(() => {
    const { linearFeet, gates, materialCostPerFt, laborCostPerFt, targetMargin } =
      inputs;

    const fenceMaterialCost = linearFeet * materialCostPerFt;
    const gateMaterialCost = gates * GATE_MATERIAL_COST;
    const totalMaterialCost = fenceMaterialCost + gateMaterialCost;

    const fenceLaborCost = linearFeet * laborCostPerFt;
    const gateLaborCost = gates * GATE_LABOR_COST;
    const totalLaborCost = fenceLaborCost + gateLaborCost;

    const totalCost = totalMaterialCost + totalLaborCost;

    const marginDecimal = targetMargin / 100;
    const suggestedSalePrice =
      marginDecimal < 1 ? totalCost / (1 - marginDecimal) : totalCost;

    const actualMargin =
      suggestedSalePrice > 0
        ? ((suggestedSalePrice - totalCost) / suggestedSalePrice) * 100
        : 0;

    return {
      totalMaterialCost,
      totalLaborCost,
      totalCost,
      suggestedSalePrice,
      actualMargin,
      targetMargin,
    };
  }, [inputs]);

  return (
    <section id="demo" className="bg-[#080808] px-6 py-20 md:py-28">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F2F2F2] font-display">
            Try it yourself
          </h2>
          <p className="mt-4 text-lg text-[#6B7280]">
            Plug in your numbers. See your margin in real time.
          </p>
        </div>

        <div className="bg-[#0F0F0F] border border-[rgba(255,255,255,0.07)] rounded-2xl shadow-2xl overflow-hidden">
          {/* Inputs */}
          <div className="p-6 md:p-10">
            <h3 className="text-xl font-bold mb-6 text-[#F2F2F2] font-display">
              Job Inputs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <NumberInput
                id="linearFeet"
                label="Total Linear Feet"
                value={inputs.linearFeet}
                onChange={update("linearFeet")}
                min={0}
                step={10}
                suffix="ft"
              />
              <NumberInput
                id="gates"
                label="Number of Gates"
                value={inputs.gates}
                onChange={update("gates")}
                min={0}
                step={1}
              />
              <NumberInput
                id="materialCost"
                label="Material Cost / Linear Ft"
                value={inputs.materialCostPerFt}
                onChange={update("materialCostPerFt")}
                min={0}
                step={1}
                prefix="$"
              />
              <NumberInput
                id="laborCost"
                label="Labor Cost / Linear Ft"
                value={inputs.laborCostPerFt}
                onChange={update("laborCostPerFt")}
                min={0}
                step={1}
                prefix="$"
              />
              <div className="sm:col-span-2">
                <NumberInput
                  id="targetMargin"
                  label="Target Gross Margin"
                  value={inputs.targetMargin}
                  onChange={update("targetMargin")}
                  min={0}
                  max={99}
                  step={1}
                  suffix="%"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.07)]" />

          {/* Results */}
          <div className="p-6 md:p-10 bg-[#161616]">
            <h3 className="text-xl font-bold mb-6 text-[#F2F2F2] font-display">
              Estimate Breakdown
            </h3>

            <div className="mb-8">
              <ResultRow
                label="Estimated Material Cost"
                value={formatCurrency(results.totalMaterialCost)}
              />
              <ResultRow
                label="Estimated Labor Cost"
                value={formatCurrency(results.totalLaborCost)}
              />
              <ResultRow
                label="Total Job Cost"
                value={formatCurrency(results.totalCost)}
                bold
              />
              <ResultRow
                label="Suggested Sale Price"
                value={formatCurrency(results.suggestedSalePrice)}
                bold
              />
            </div>

            <MarginBadge
              actualMargin={results.actualMargin}
              targetMargin={results.targetMargin}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
