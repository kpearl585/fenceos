// ── Segmentation Optimizer ───────────────────────────────────────
// Given a run length, partitions it into panel sections
// minimizing scrap, cut operations, and aesthetic variance.
// Every partition decision is traceable and explainable.

import type { Section } from "./types";

// Scoring weights (tunable)
const SCRAP_WEIGHT = 1.0;       // cost per inch of material waste
const CUT_OPS_PENALTY = 50.0;   // cost per cut operation
const TINY_PENALTY = 100.0;     // cost per section < 1.5 × W_min
const AESTHETIC_WEIGHT = 0.1;   // cost per unit of width variance

export interface SegmentationPlan {
  sections: Section[];
  totalScrap_in: number;
  cutOperations: number;
  score: number;
  explanation: string;
}

function variance(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length;
}

function scorePlan(sections: Section[], nominalWidth_in: number, minWidth_in: number): number {
  const widths = sections.map((s) => s.width_in);
  const scrap = sections.reduce((sum, s) => sum + s.scrap_in, 0);
  const cutOps = sections.filter((s) => s.isPartial).length;
  const tinyPartials = sections.filter((s) => s.width_in < minWidth_in * 1.5).length;
  const aestheticVar = variance(widths);

  return (
    scrap * SCRAP_WEIGHT +
    cutOps * CUT_OPS_PENALTY +
    tinyPartials * TINY_PENALTY +
    aestheticVar * AESTHETIC_WEIGHT
  );
}

function buildSections(
  partitionWidths: number[],
  nominalWidth_in: number
): Section[] {
  return partitionWidths.map((w) => ({
    width_in: w,
    isFull: w === nominalWidth_in,
    isPartial: w < nominalWidth_in,
    scrap_in: w < nominalWidth_in ? nominalWidth_in - w : 0,
  }));
}

function allocateSections(
  n: number,
  baseWidth: number,
  remainder: number,
  maxWidth: number,
  minWidth: number
): number[] | null {
  // Distribute remainder 1-inch at a time to first sections
  const sections = new Array(n).fill(baseWidth);
  for (let i = 0; i < remainder; i++) {
    sections[i] += 1;
  }
  // Validate all within bounds
  for (const w of sections) {
    if (w > maxWidth || w < minWidth) return null;
  }
  return sections;
}

/**
 * Segment a run into optimal panel widths.
 * @param length_in  Total run length in inches
 * @param nominalWidth_in  Standard panel width (96 inches)
 * @param minReducedWidth_in  Minimum acceptable partial panel (24 inches)
 * @param maxCenters_in  Max post-to-post spacing (96 inches)
 */
export function segmentRun(
  length_in: number,
  nominalWidth_in: number,
  minReducedWidth_in: number,
  maxCenters_in: number
): SegmentationPlan {
  const W = nominalWidth_in;
  const Wmin = minReducedWidth_in;

  // Bounds on number of sections
  const nMin = Math.ceil(length_in / maxCenters_in);
  const nMax = Math.floor(length_in / Wmin);

  let bestPlan: SegmentationPlan | null = null;
  let bestScore = Infinity;

  for (let n = nMin; n <= nMax; n++) {
    const baseWidth = Math.floor(length_in / n);
    const remainder = length_in - baseWidth * n;

    if (baseWidth > W) continue;
    if (baseWidth < Wmin) continue;

    const widths = allocateSections(n, baseWidth, remainder, W, Wmin);
    if (!widths) continue;

    const sections = buildSections(widths, W);
    const score = scorePlan(sections, W, Wmin);

    if (score < bestScore) {
      bestScore = score;
      const totalScrap = sections.reduce((s, sec) => s + sec.scrap_in, 0);
      const cuts = sections.filter((s) => s.isPartial).length;
      const fullPanels = sections.filter((s) => s.isFull).length;
      const partialPanels = sections.filter((s) => s.isPartial).length;

      bestPlan = {
        sections,
        totalScrap_in: totalScrap,
        cutOperations: cuts,
        score,
        explanation: `${length_in / 12}ft run → ${fullPanels} full panels${
          partialPanels > 0 ? ` + ${partialPanels} partial (${sections.filter(s => s.isPartial).map(s => `${s.width_in}"`).join(", ")})` : ""
        }. Scrap: ${totalScrap}". Cuts: ${cuts}.`,
      };
    }
  }

  // Fallback: just use ceil with one partial panel
  if (!bestPlan) {
    const fullPanels = Math.floor(length_in / W);
    const partial = length_in - fullPanels * W;
    const sections: Section[] = [];
    for (let i = 0; i < fullPanels; i++) {
      sections.push({ width_in: W, isFull: true, isPartial: false, scrap_in: 0 });
    }
    if (partial > 0) {
      sections.push({
        width_in: partial,
        isFull: false,
        isPartial: true,
        scrap_in: W - partial,
      });
    }
    const totalScrap = sections.reduce((s, sec) => s + sec.scrap_in, 0);
    bestPlan = {
      sections,
      totalScrap_in: totalScrap,
      cutOperations: partial > 0 ? 1 : 0,
      score: scorePlan(sections, W, Wmin),
      explanation: `Fallback: ${fullPanels} full panels${partial > 0 ? ` + 1 partial (${partial}")` : ""}. Scrap: ${totalScrap}".`,
    };
  }

  return bestPlan;
}

/**
 * Count panels to purchase from a segmentation plan.
 * Each partial section requires purchasing one full panel.
 */
export function countPanelsToBuy(plan: SegmentationPlan): number {
  return plan.sections.length; // each section requires one purchased panel
}
