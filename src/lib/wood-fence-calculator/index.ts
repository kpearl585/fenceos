/**
 * Wood Fence Calculator - Phase 1 MVP
 * Graph-based wood privacy fence estimation
 */

export * from './types'
export * from './graph-builder'
export * from './node-typer'
export * from './spacing-optimizer'
export * from './graph-repair'
export * from './post-calculator'
export * from './rail-calculator'
export * from './picket-calculator'
export * from './concrete-calculator'
export * from './gate-hardware-resolver'
export * from './bom-assembler'
export * from './validation-engine'
export * from './validation-block-rules'
export * from './validation-warn-rules'
export * from './estimator-service'
// Note: api-types NOT exported via wildcard to avoid duplicates
// API types are imported directly by route handlers

// Re-export main functions for convenience
export { buildDesignGraph, validateGraphTotals } from './graph-builder'
export { classifyAndConfigureNodes, countPostsByType } from './node-typer'
export {
  optimizeSpacing,
  optimizeAllSections,
  calculateTotalBays,
  getSpacingRecommendations,
  ValidationError
} from './spacing-optimizer'
export { insertLinePostNodes, validateGraphIntegrity } from './graph-repair'
export { calculatePosts, generatePostBOMLines } from './post-calculator'
export { calculateRails, generateRailBOMLine } from './rail-calculator'
export { calculatePickets, generatePicketBOMLine } from './picket-calculator'
export { calculateConcrete, generateConcreteBOMLine } from './concrete-calculator'
export { resolveGateHardware, resolveAllGates, aggregateGateHardware } from './gate-hardware-resolver'
export { assembleBOM, generateStandardHardware, sortBOMLines } from './bom-assembler'
export { validateEstimate, createValidationError } from './validation-engine'
export { BLOCK_RULES } from './validation-block-rules'
export { WARN_RULES } from './validation-warn-rules'
