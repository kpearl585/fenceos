// ── Installation Timeline Calculator ─────────────────────────────
// Calculates realistic project duration based on fence specs.
// Used in customer proposals to set expectations.

import type { FenceEstimateResult } from "./types";

export interface ProjectTimeline {
  estimatedDurationDays: number;
  earliestStartDate: Date;
  estimatedStartDateString: string;
  estimatedCompletionDate: Date;
  estimatedCompletionDateString: string;
  breakdown: {
    activity: string;
    days: number;
  }[];
  weatherContingency: string;
}

/**
 * Calculate project timeline based on fence specifications
 *
 * Base rates (professional crew of 2-3):
 * - Standard fence: 100-150 LF per day
 * - Board-on-board: 50-75 LF per day (2x labor)
 * - Post setting day 1, panels day 2+
 * - Gates: +0.5 day per gate
 * - Concrete cure time: Accounted for in schedule
 */
export function calculateProjectTimeline(
  result: FenceEstimateResult,
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  woodStyle?: "dog_ear_privacy" | "flat_top_privacy" | "picket" | "board_on_board",
  businessDaysToSchedule: number = 7 // Days until crew available
): ProjectTimeline {
  const totalLF = result.graph.edges
    .filter(e => e.type === "segment")
    .reduce((sum, e) => sum + e.length_in / 12, 0);

  const postCount = result.graph.nodes.length;
  const gateCount = result.graph.edges.filter(e => e.type === "gate").length;

  const breakdown: { activity: string; days: number }[] = [];

  // ── Day 1: Post Hole Digging & Concrete Setting ──────────────────
  // Standard: 15-20 posts per day (depends on soil)
  const postSettingDays = Math.ceil(postCount / 16);
  breakdown.push({
    activity: "Post hole digging & concrete setting",
    days: postSettingDays
  });

  // ── Days 2+: Panel Installation ──────────────────────────────────
  let panelInstallRate = 125; // LF per day (baseline)

  // Adjust for fence type
  if (fenceType === "vinyl") {
    panelInstallRate = 120; // Vinyl panels, routed rails
  } else if (fenceType === "wood") {
    if (woodStyle === "board_on_board") {
      panelInstallRate = 60; // Board-on-board is 2x labor
    } else if (woodStyle === "picket") {
      panelInstallRate = 100; // Individual pickets slower
    } else {
      panelInstallRate = 110; // Standard wood privacy
    }
  } else if (fenceType === "chain_link") {
    panelInstallRate = 150; // Chain link faster
  } else if (fenceType === "aluminum") {
    panelInstallRate = 100; // Aluminum panels moderate
  }

  const panelDays = Math.ceil(totalLF / panelInstallRate);
  breakdown.push({
    activity: `${getFenceTypeLabel(fenceType, woodStyle)} installation`,
    days: panelDays
  });

  // ── Gate Installation ─────────────────────────────────────────────
  if (gateCount > 0) {
    // Gates: 0.5 day per gate (can do 2 per day)
    const gateDays = Math.ceil(gateCount * 0.5);
    breakdown.push({
      activity: `Gate installation (${gateCount} gate${gateCount > 1 ? 's' : ''})`,
      days: gateDays
    });
  }

  // ── Cleanup & Final Walkthrough ───────────────────────────────────
  breakdown.push({
    activity: "Final cleanup & walkthrough",
    days: 0.5
  });

  // ── Total Duration ────────────────────────────────────────────────
  const totalDays = breakdown.reduce((sum, item) => sum + item.days, 0);
  const roundedDays = Math.ceil(totalDays);

  // ── Calculate Dates ───────────────────────────────────────────────
  const today = new Date();

  // Earliest start = today + businessDaysToSchedule
  const earliestStart = addBusinessDays(today, businessDaysToSchedule);

  // Completion = start + roundedDays (working days)
  const completionDate = addBusinessDays(earliestStart, roundedDays);

  // ── Weather Contingency ───────────────────────────────────────────
  const weatherContingency = getWeatherContingency(earliestStart, roundedDays);

  return {
    estimatedDurationDays: roundedDays,
    earliestStartDate: earliestStart,
    estimatedStartDateString: formatDate(earliestStart),
    estimatedCompletionDate: completionDate,
    estimatedCompletionDateString: formatDate(completionDate),
    breakdown,
    weatherContingency
  };
}

/**
 * Add business days (skip weekends)
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * Format date for proposals (e.g., "April 15, 2026")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Get weather contingency message based on season
 */
function getWeatherContingency(startDate: Date, durationDays: number): string {
  const month = startDate.getMonth(); // 0-11

  // Winter (Dec-Feb): 0, 1, 11
  if (month === 11 || month === 0 || month === 1) {
    return "Winter weather may extend timeline by 1-3 days for concrete curing.";
  }

  // Spring (Mar-May): 2, 3, 4
  if (month >= 2 && month <= 4) {
    return "Spring weather is generally favorable. Rain delays possible.";
  }

  // Summer (Jun-Aug): 5, 6, 7
  if (month >= 5 && month <= 7) {
    if (durationDays > 3) {
      return "Summer heat requires early morning concrete pours. Afternoon thunderstorms may cause brief delays.";
    }
    return "Summer conditions are ideal for fence installation.";
  }

  // Fall (Sep-Nov): 8, 9, 10
  return "Fall weather is generally favorable for installation.";
}

/**
 * Get human-readable fence type label
 */
function getFenceTypeLabel(
  fenceType: "vinyl" | "wood" | "chain_link" | "aluminum",
  woodStyle?: string
): string {
  if (fenceType === "wood" && woodStyle) {
    const labels: Record<string, string> = {
      "dog_ear_privacy": "Wood privacy fence",
      "flat_top_privacy": "Wood privacy fence",
      "picket": "Wood picket fence",
      "board_on_board": "Board-on-board fence"
    };
    return labels[woodStyle] || "Wood fence";
  }

  const labels: Record<string, string> = {
    vinyl: "Vinyl fence",
    wood: "Wood fence",
    chain_link: "Chain link fence",
    aluminum: "Aluminum fence"
  };

  return labels[fenceType] || "Fence";
}

/**
 * Quick timeline summary (for UI display)
 */
export function getTimelineSummary(timeline: ProjectTimeline): string {
  const { estimatedDurationDays, estimatedStartDateString } = timeline;

  if (estimatedDurationDays === 1) {
    return `1 day installation starting ${estimatedStartDateString}`;
  }

  return `${estimatedDurationDays} day installation starting ${estimatedStartDateString}`;
}
