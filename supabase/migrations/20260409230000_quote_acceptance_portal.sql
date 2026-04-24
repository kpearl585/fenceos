-- Migration: Add quote acceptance portal fields to fence_graphs
-- Created: 2026-04-09
-- Purpose: Enable public quote sharing and customer acceptance via unique tokens

-- Add quote acceptance fields to fence_graphs table
ALTER TABLE fence_graphs
  ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_signature TEXT,
  ADD COLUMN IF NOT EXISTS customer_ip_address TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_user_agent TEXT;

-- Create index on public_token for fast lookups (customers access via token)
CREATE INDEX IF NOT EXISTS idx_fence_graphs_public_token
  ON fence_graphs(public_token)
  WHERE public_token IS NOT NULL;

-- Create index on token expiration for cleanup queries
CREATE INDEX IF NOT EXISTS idx_fence_graphs_token_expires_at
  ON fence_graphs(token_expires_at)
  WHERE token_expires_at IS NOT NULL;

-- Create index on acceptance status for reporting
CREATE INDEX IF NOT EXISTS idx_fence_graphs_customer_accepted
  ON fence_graphs(customer_accepted_at)
  WHERE customer_accepted_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN fence_graphs.public_token IS 'Unique UUID for public quote sharing. Generated when contractor shares quote with customer.';
COMMENT ON COLUMN fence_graphs.token_expires_at IS 'Quote link expiration timestamp. Defaults to 30 days from generation.';
COMMENT ON COLUMN fence_graphs.customer_accepted_at IS 'Timestamp when customer accepted the quote.';
COMMENT ON COLUMN fence_graphs.customer_signature IS 'Customer e-signature (typed name or signature image data).';
COMMENT ON COLUMN fence_graphs.customer_ip_address IS 'Customer IP address at time of acceptance (legal record).';
COMMENT ON COLUMN fence_graphs.acceptance_user_agent IS 'Customer browser user agent at acceptance (fraud detection).';

-- Function to generate quote share link (called from app)
-- Sets token and expiration, returns the token
CREATE OR REPLACE FUNCTION generate_quote_token(
  estimate_id UUID,
  expiry_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token UUID;
BEGIN
  -- Generate new token and set expiration
  UPDATE fence_graphs
  SET
    public_token = gen_random_uuid(),
    token_expires_at = NOW() + (expiry_days || ' days')::INTERVAL
  WHERE id = estimate_id
  RETURNING public_token INTO new_token;

  RETURN new_token;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_quote_token(UUID, INTEGER) TO authenticated;

-- Function to check if token is valid (not expired)
CREATE OR REPLACE FUNCTION is_token_valid(token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  SELECT
    (token_expires_at IS NULL OR token_expires_at > NOW())
    AND customer_accepted_at IS NULL -- not already accepted
  INTO is_valid
  FROM fence_graphs
  WHERE public_token = token;

  RETURN COALESCE(is_valid, FALSE);
END;
$$;

-- Grant execute permission to anonymous users (customers viewing quotes)
GRANT EXECUTE ON FUNCTION is_token_valid(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_token_valid(UUID) TO authenticated;
