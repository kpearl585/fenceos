/**
 * CALC-003: Spacing Optimizer
 * Optimizes post spacing within [6ft, 8ft] to avoid stub bays
 * Pure function - calculates optimal spacing for a section
 */

import type { FenceSection, SpacingResult } from './types'

/**
 * Optimize post spacing for a fence section
 *
 * @param section - Fence section to optimize
 * @param minSpacing - Minimum allowed spacing (default: 6ft)
 * @param maxSpacing - Maximum allowed spacing (default: 8ft)
 * @returns Optimized spacing and bay count
 *
 * Algorithm:
 * 1. Calculate minimum bays needed: ceil(length / maxSpacing)
 * 2. Redistribute length evenly across bays
 * 3. Validate spacing is within [minSpacing, maxSpacing]
 * 4. Throw ValidationError if impossible
 *
 * Examples:
 * - 24ft → 3 bays @ 8ft (perfect fit)
 * - 26ft → 4 bays @ 6.5ft (avoid 3@8ft + 2ft stub)
 * - 50ft → 7 bays @ 7.14ft
 */
export function optimizeSpacing(
  section: FenceSection,
  minSpacing: number = 6,
  maxSpacing: number = 8
): SpacingResult {
  const { length_ft } = section

  // Validate input
  if (length_ft <= 0) {
    throw new Error('Section length must be positive')
  }

  // Special case: Very short sections (< minSpacing)
  // These can occur between gates/corners and must be handled
  // Treat as single bay with tight spacing (will trigger warning in validation)
  if (length_ft < minSpacing) {
    return {
      bay_count: 1,
      post_spacing_ft: length_ft
    }
  }

  // Calculate minimum number of bays needed
  // Never exceed maxSpacing to prevent rail sag
  const bayCount = Math.ceil(length_ft / maxSpacing)

  // Redistribute evenly
  const post_spacing_ft = length_ft / bayCount

  // Edge case: Sections in the range (minSpacing, minSpacing * 2)
  // Example: 11.83ft → 2 bays @ 5.92ft is below 6ft minimum
  // but 1 bay @ 11.83ft exceeds 8ft maximum
  // Solution: Use the tighter spacing and let validation warn
  // This can happen with gates/corners creating odd-length sections
  if (post_spacing_ft < minSpacing) {
    // Return the optimized result anyway
    // Validation WARN rules will flag tight spacing
    return {
      bay_count: bayCount,
      post_spacing_ft
    }
  }

  if (post_spacing_ft > maxSpacing) {
    // This should never happen due to ceil() calculation above
    // But included for completeness
    throw new ValidationError(
      'SPACING_001',
      `Section too long: ${length_ft}ft requires spacing > ${maxSpacing}ft. ` +
      `Add intermediate posts.`
    )
  }

  return {
    post_spacing_ft: roundTo(post_spacing_ft, 2),
    bay_count: bayCount
  }
}

/**
 * Optimize spacing for all sections in a design
 *
 * @param sections - Array of fence sections
 * @returns Updated sections with post_spacing_ft and bay_count populated
 */
export function optimizeAllSections(sections: FenceSection[]): FenceSection[] {
  return sections.map(section => {
    try {
      const result = optimizeSpacing(section)

      return {
        ...section,
        post_spacing_ft: result.post_spacing_ft,
        bay_count: result.bay_count
      }
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof ValidationError) {
        throw error
      }

      // Wrap unexpected errors
      throw new Error(`Failed to optimize section ${section.id}: ${error}`)
    }
  })
}

/**
 * Calculate total bays across all sections
 */
export function calculateTotalBays(sections: FenceSection[]): number {
  return sections.reduce((sum, section) => {
    return sum + (section.bay_count || 0)
  }, 0)
}

/**
 * Round number to specified decimal places
 */
function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Validation Error - BLOCK level
 * Prevents estimate generation
 */
export class ValidationError extends Error {
  constructor(
    public rule_id: string,
    message: string,
    public severity: 'BLOCK' | 'WARN' = 'BLOCK',
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Get spacing recommendations for common scenarios
 * Used in UI to help users understand spacing constraints
 */
export function getSpacingRecommendations(length_ft: number): {
  recommended_bays: number
  recommended_spacing: number
  alternatives: Array<{ bays: number; spacing: number; quality: 'optimal' | 'acceptable' | 'poor' }>
} {
  const maxSpacing = 8
  const minSpacing = 6

  const recommended_bays = Math.ceil(length_ft / maxSpacing)
  const recommended_spacing = length_ft / recommended_bays

  const alternatives = []

  // Try different bay counts
  for (let bays = recommended_bays - 1; bays <= recommended_bays + 2; bays++) {
    if (bays <= 0) continue

    const spacing = length_ft / bays

    if (spacing < minSpacing || spacing > maxSpacing) continue

    let quality: 'optimal' | 'acceptable' | 'poor'

    if (spacing >= 7.5 && spacing <= 8) {
      quality = 'optimal' // Minimal waste, strong
    } else if (spacing >= 6.5 && spacing < 7.5) {
      quality = 'acceptable' // More posts = higher cost
    } else {
      quality = 'poor' // Very short spacing = expensive
    }

    alternatives.push({
      bays,
      spacing: roundTo(spacing, 2),
      quality
    })
  }

  // Sort by quality, then by spacing (prefer longer spacing)
  alternatives.sort((a, b) => {
    const qualityOrder = { optimal: 0, acceptable: 1, poor: 2 }
    if (qualityOrder[a.quality] !== qualityOrder[b.quality]) {
      return qualityOrder[a.quality] - qualityOrder[b.quality]
    }
    return b.spacing - a.spacing
  })

  return {
    recommended_bays,
    recommended_spacing: roundTo(recommended_spacing, 2),
    alternatives
  }
}
