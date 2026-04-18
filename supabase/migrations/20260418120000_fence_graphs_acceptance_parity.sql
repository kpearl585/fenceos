-- Migration: fence_graphs acceptance parity with estimates table
-- Created: 2026-04-18
-- Purpose: Give the public /quote/[token] flow the same legal weight as
-- the /accept flow on the estimates table — legal/payment terms snapshot,
-- drawn signature URL, acceptance hash, and signed contract PDF URL.

ALTER TABLE fence_graphs
  ADD COLUMN IF NOT EXISTS legal_terms_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS accepted_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_hash TEXT,
  ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

COMMENT ON COLUMN fence_graphs.legal_terms_snapshot IS 'Immutable snapshot of org legal terms at the time the share link was generated. Matches the estimates.legal_terms_snapshot contract.';
COMMENT ON COLUMN fence_graphs.payment_terms_snapshot IS 'Immutable snapshot of org payment terms at the time the share link was generated.';
COMMENT ON COLUMN fence_graphs.accepted_signature_url IS 'Storage URL of the drawn signature PNG captured at acceptance. Legal record.';
COMMENT ON COLUMN fence_graphs.acceptance_hash IS 'SHA-256 hash binding the accepted total, scope, and legal terms. Tamper-evidence record.';
COMMENT ON COLUMN fence_graphs.contract_pdf_url IS 'Signed URL (1-year expiry) to the finalized signed-contract PDF.';
