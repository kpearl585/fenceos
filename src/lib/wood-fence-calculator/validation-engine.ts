/**
 * VAL-001: Validation Engine Core
 * Framework for running BLOCK and WARN validation rules
 */

import type { FenceNode, FenceSection, Gate } from './types'
import type { BOM } from './bom-assembler'

export type ValidationSeverity = 'BLOCK' | 'WARN'

export interface ValidationError {
  rule_id: string
  severity: ValidationSeverity
  message: string
  affected_entity_type?: 'design' | 'node' | 'section' | 'gate' | 'bom' | 'bom_line'
  affected_entity_id?: string
  recommended_action?: string
}

export interface ValidationResult {
  errors: ValidationError[] // BLOCK severity
  warnings: ValidationError[] // WARN severity
  canProceed: boolean // false if any BLOCK errors
  blockers: number
  alerts: number
}

export interface FenceDesignForValidation {
  id: string
  total_linear_feet: number
  height_ft: 4 | 6 | 8
  fence_type_id: string
  frost_zone: 1 | 2 | 3 | 4
  soil_type: string
  nodes: FenceNode[]
  sections: FenceSection[]
  gates: Gate[]
}

export type ValidationRule = (
  design: FenceDesignForValidation,
  bom: BOM
) => ValidationError | null

/**
 * Run all validation rules against design and BOM
 *
 * @param design - Complete fence design with graph
 * @param bom - Generated BOM
 * @param rules - Validation rules to run
 * @returns Validation result with errors/warnings
 *
 * Execution order:
 * 1. Run all BLOCK rules first
 * 2. If any BLOCK errors, return immediately (canProceed = false)
 * 3. Run WARN rules
 * 4. Return complete result
 */
export function validateEstimate(
  design: FenceDesignForValidation,
  bom: BOM,
  rules: ValidationRule[]
): ValidationResult {
  const allErrors: ValidationError[] = []

  // Run all rules
  rules.forEach(rule => {
    const error = rule(design, bom)
    if (error) {
      allErrors.push(error)
    }
  })

  // Separate BLOCK and WARN
  const errors = allErrors.filter(e => e.severity === 'BLOCK')
  const warnings = allErrors.filter(e => e.severity === 'WARN')

  const canProceed = errors.length === 0

  return {
    errors,
    warnings,
    canProceed,
    blockers: errors.length,
    alerts: warnings.length
  }
}

/**
 * Create a validation error
 */
export function createValidationError(
  rule_id: string,
  severity: ValidationSeverity,
  message: string,
  options?: {
    affected_entity_type?: ValidationError['affected_entity_type']
    affected_entity_id?: string
    recommended_action?: string
  }
): ValidationError {
  return {
    rule_id,
    severity,
    message,
    affected_entity_type: options?.affected_entity_type,
    affected_entity_id: options?.affected_entity_id,
    recommended_action: options?.recommended_action
  }
}
