export type EstimateStatus =
  | 'draft'
  | 'quoted'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'accepted'
  | 'deposit_paid'
  | 'converted'

export type JobStatus = 'scheduled' | 'active' | 'complete' | 'cancelled'
export type UserRole = 'owner' | 'sales' | 'foreman'
export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected'
export type FenceType = 'wood_privacy' | 'chain_link' | 'vinyl' | 'aluminum'
export type LineItemType = 'material' | 'labor'

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface User {
  id: string
  auth_id: string
  org_id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Customer {
  id: string
  org_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
}

export interface Material {
  id: string
  org_id: string
  name: string
  unit: string
  unit_cost: number
  unit_price: number
  category: string | null
  supplier: string | null
  notes: string | null
  created_at: string
  updated_at: string
  sku: string | null
}

export interface Estimate {
  id: string
  org_id: string
  customer_id: string | null
  title: string
  status: EstimateStatus
  total: number
  margin_pct: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  fence_type: FenceType | null
  linear_feet: number | null
  gate_count: number | null
  post_spacing: number | null
  height: number | null
  waste_factor_pct: number | null
  target_margin_pct: number | null
  labor_rate_per_hr: number | null
  materials_subtotal: number | null
  labor_subtotal: number | null
  estimated_cost: number | null
  gross_profit: number | null
  gross_margin_pct: number | null
  margin_status: string | null
  quoted_at: string | null
  legal_terms_snapshot: string | null
  payment_terms_snapshot: string | null
  legal_version: number | null
  snapshot_taken_at: string | null
  accepted_at: string | null
  accepted_by_name: string | null
  accepted_by_email: string | null
  accepted_ip: string | null
  accepted_signature_url: string | null
  acceptance_hash: string | null
  contract_pdf_url: string | null
  accept_token: string | null
  deposit_required_amount: number | null
  deposit_paid: boolean | null
  deposit_paid_at: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_payment_status: string | null
}

export interface EstimateLineItem {
  id: string
  estimate_id: string
  org_id: string
  description: string
  quantity: number
  unit: string | null
  unit_cost: number | null
  markup_pct: number | null
  total: number | null
  sort_order: number | null
  created_at: string
  sku: string | null
  type: LineItemType | null
  unit_price: number | null
  extended_cost: number | null
  extended_price: number | null
  meta: Record<string, unknown> | null
}

export interface Job {
  id: string
  org_id: string
  estimate_id: string | null
  customer_id: string | null
  title: string
  status: JobStatus
  scheduled_date: string | null
  completed_date: string | null
  assigned_foreman_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  total_price: number | null
  total_cost: number | null
  gross_profit: number | null
  gross_margin_pct: number | null
  created_by: string | null
}

export interface JobLineItem {
  id: string
  job_id: string
  sku: string | null
  name: string
  type: LineItemType | null
  unit: string | null
  qty: number
  unit_cost: number | null
  unit_price: number | null
  extended_cost: number | null
  extended_price: number | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface OrgSettings {
  org_id: string
  legal_terms: string | null
  payment_terms: string | null
  legal_version: number | null
  updated_at: string
}

export interface OrgBranding {
  org_id: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  font_family: string | null
  footer_note: string | null
  updated_at: string
}

export interface ChangeOrder {
  id: string
  job_id: string
  org_id: string
  description: string | null
  status: ChangeOrderStatus
  created_at: string
  updated_at: string
}

export interface JobOutcome {
  id: string
  job_id: string
  org_id: string
  estimated_total: number
  actual_material_cost: number | null
  actual_labor_hours: number | null
  actual_total_cost: number | null
  complications: string[] | null
  profit_margin: number | null
  notes: string | null
  created_at: string
  updated_at: string
}
