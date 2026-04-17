-- Add phone, email, address to org_branding.
--
-- These three columns are READ in 5+ places (src/app/dashboard/advanced-estimate/actions.ts
-- getOrgInfo(), src/app/quote/actions.ts, src/app/dashboard/jobs/invoiceActions.ts,
-- src/app/api/accept/route.ts, src/lib/contracts/uploadContractPdf.ts) and rendered
-- in every customer-facing PDF (CustomerProposalPdf, InvoicePdf, quote acceptance
-- email, job contract). But the columns didn't exist and nothing in the UI ever
-- let the user enter them.
--
-- Result today: every customer proposal, invoice, and contract renders with a
-- blank "from" contact block and the footer literally reads:
--   "Questions? Call us or email support@fenceestimatepro.com"
-- ...pointing every customer at OUR support instead of the contractor's. Every
-- quote that has gone out has been trust-damaging in this small way.
--
-- Fix = three nullable text columns. Nullable so existing rows don't break,
-- and because contact info is optional per row (e.g. a company without a
-- dedicated email). Settings UI + saveBranding action wire up in the same
-- commit.

ALTER TABLE public.org_branding
  ADD COLUMN IF NOT EXISTS phone   text,
  ADD COLUMN IF NOT EXISTS email   text,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.org_branding.phone   IS 'Company phone number shown on customer-facing PDFs (proposals, invoices, contracts). Free-form string — UI validates format but DB stores as-is.';
COMMENT ON COLUMN public.org_branding.email   IS 'Company contact email for customer replies. Renders in the "from" block of PDFs and the acceptance-email reply-to.';
COMMENT ON COLUMN public.org_branding.address IS 'Company mailing address. Single text block (street + city/state/zip concatenated). Shown on PDFs.';
