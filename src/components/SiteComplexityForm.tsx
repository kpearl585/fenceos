"use client";
import { useState } from "react";
import type { SiteComplexity } from "@/lib/fence-graph/accuracy-types";
import { calculateOverallComplexity, getSiteComplexityLabel, getSiteComplexityColor } from "@/lib/fence-graph/accuracy-types";

interface SiteComplexityFormProps {
  onComplexityChange: (complexity: Omit<SiteComplexity, "overall_score">) => void;
  initialComplexity?: Omit<SiteComplexity, "overall_score">;
}

export function SiteComplexityForm({ onComplexityChange, initialComplexity }: SiteComplexityFormProps) {
  const [complexity, setComplexity] = useState<Omit<SiteComplexity, "overall_score">>(
    initialComplexity ?? {
      access_difficulty: 2,
      obstacles: 2,
      ground_hardness: 2,
      demo_required: false,
      permit_complexity: 1,
    }
  );

  const handleChange = (field: keyof Omit<SiteComplexity, "overall_score">, value: number | boolean | "partial") => {
    const updated = { ...complexity, [field]: value };
    setComplexity(updated);
    onComplexityChange(updated);
  };

  const overallScore = calculateOverallComplexity(complexity);
  const label = getSiteComplexityLabel(overallScore);
  const color = getSiteComplexityColor(overallScore);

  const colorClasses: Record<string, string> = {
    green: "text-green-600 bg-green-50 border-green-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Site Complexity Assessment</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]}`}>
          {label} ({overallScore.toFixed(1)})
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Rate each factor from 1 (easiest) to 5 (most difficult). This helps improve future estimates.
      </p>

      {/* Access Difficulty */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Access Difficulty (30% weight)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={complexity.access_difficulty}
          onChange={(e) => handleChange("access_difficulty", parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 - Easy truck access</span>
          <span className="font-medium text-gray-900">{complexity.access_difficulty}</span>
          <span>5 - Tight backyard</span>
        </div>
      </div>

      {/* Obstacles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Obstacles (25% weight)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={complexity.obstacles}
          onChange={(e) => handleChange("obstacles", parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 - Clear yard</span>
          <span className="font-medium text-gray-900">{complexity.obstacles}</span>
          <span>5 - Dense trees/rocks</span>
        </div>
      </div>

      {/* Ground Hardness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ground Hardness (20% weight)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={complexity.ground_hardness}
          onChange={(e) => handleChange("ground_hardness", parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 - Soft soil</span>
          <span className="font-medium text-gray-900">{complexity.ground_hardness}</span>
          <span>5 - Rocky/concrete</span>
        </div>
      </div>

      {/* Demo Required */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Old Fence Removal (15% weight)
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="demo_required"
              checked={complexity.demo_required === false}
              onChange={() => handleChange("demo_required", false)}
              className="mr-2"
            />
            <span className="text-sm">None</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="demo_required"
              checked={complexity.demo_required === "partial"}
              onChange={() => handleChange("demo_required", "partial")}
              className="mr-2"
            />
            <span className="text-sm">Partial</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="demo_required"
              checked={complexity.demo_required === true}
              onChange={() => handleChange("demo_required", true)}
              className="mr-2"
            />
            <span className="text-sm">Full Removal</span>
          </label>
        </div>
      </div>

      {/* Permit Complexity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permit/HOA Complexity (10% weight)
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={complexity.permit_complexity}
          onChange={(e) => handleChange("permit_complexity", parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 - None required</span>
          <span className="font-medium text-gray-900">{complexity.permit_complexity}</span>
          <span>5 - Multiple permits/HOA</span>
        </div>
      </div>
    </div>
  );
}
