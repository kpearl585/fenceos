/**
 * API Response Type Definitions
 * Stable contract for Phase 1 API endpoints
 */

import type { BOM } from './bom-assembler'

/**
 * Job API Types
 */
export interface CreateJobRequest {
  customer_name: string
  customer_email?: string
  customer_phone?: string
  site_address?: string
  site_city?: string
  site_state?: string
  site_zip?: string
  notes?: string
}

export interface UpdateJobRequest {
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  site_address?: string
  site_city?: string
  site_state?: string
  site_zip?: string
  notes?: string
  status?: 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
}

export interface Job {
  id: string
  org_id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  site_address?: string
  site_city?: string
  site_state?: string
  site_zip?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
}

export interface CreateJobResponse {
  success: true
  job: Job
}

export interface GetJobResponse {
  success: true
  job: Job
}

export interface UpdateJobResponse {
  success: true
  job: Job
}

/**
 * Design API Types
 */
export interface CreateDesignRequest {
  total_linear_feet: number
  corner_count: number
  gates: Array<{
    width_ft: number
    position_ft?: number
  }>
  height_ft: 4 | 6 | 8
  fence_type_id?: string
  frost_zone?: 1 | 2 | 3 | 4
  soil_type?: 'normal' | 'sandy' | 'clay' | 'rocky'
}

export interface Design {
  id: string
  job_id: string
  total_linear_feet: number
  height_ft: number
  fence_type_id: string
  frost_zone: number
  soil_type: string
  created_at: string
  updated_at?: string
}

export interface GraphSummary {
  nodes: number
  sections: number
  gates: number
}

export interface CreateDesignResponse {
  success: true
  design: Design
  graph_summary: GraphSummary
}

export interface GetDesignResponse {
  success: true
  design: Design
  graph: {
    nodes: Array<any>
    sections: Array<any>
    gates: Array<any>
  }
}

/**
 * Estimate API Types
 */
export interface DesignSummary {
  total_linear_feet: number
  height_ft: number
  fence_type_id: string
  total_nodes: number
  total_sections: number
  total_gates: number
}

export interface PostCounts {
  line_4x4: number
  corner_4x4: number
  end_4x4: number
  gate_6x6: number
  total: number
}

export interface ValidationResult {
  can_proceed: boolean
  errors: Array<{
    rule_id: string
    severity: string
    message: string
  }>
  warnings: Array<{
    rule_id: string
    severity: string
    message: string
  }>
}

export interface PriceSummary {
  subtotal: number
  tax: number
  total: number
  note: string
}

export interface AuditMetadata {
  calculated_at: string
  calculation_time_ms: number
  estimator_version: string
}

export interface EstimateResponse {
  success: true
  estimate: {
    design_id: string
    design_summary: DesignSummary
    post_counts: PostCounts
    bom: BOM
    validation: ValidationResult
    price_summary: PriceSummary
    audit_metadata: AuditMetadata
  }
}

/**
 * BOM API Types
 */
export interface BOMLine {
  id: string
  bom_id: string
  category: string
  description: string
  unit: string
  raw_quantity: number
  waste_quantity: number
  insurance_quantity: number
  order_quantity: number
  calculation_notes: string
  sort_order: number
}

export interface GetBOMResponse {
  success: true
  design_summary: {
    id: string
    total_linear_feet: number
    height_ft: number
    fence_type_id: string
  }
  bom: {
    id: string
    design_id: string
    total_line_count: number
    summary: any
    created_at: string
    updated_at: string
  }
  lines: BOMLine[]
}

/**
 * Error Response Types
 */
export interface ErrorResponse {
  error: string
  code?: string
  details?: any
  message?: string
}
