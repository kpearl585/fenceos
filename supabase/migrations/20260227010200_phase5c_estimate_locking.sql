-- Phase 5C: Estimate locking after conversion
-- Prevents status reversion and blocks editing of converted estimates

-- Trigger function: block UPDATE on estimates with status = 'converted'
-- Only allow status changes (for the conversion itself)
CREATE OR REPLACE FUNCTION prevent_converted_estimate_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If old status is 'converted', block ALL updates except cancellation by owner
  IF OLD.status = 'converted' THEN
    RAISE EXCEPTION 'Cannot edit a converted estimate. It is locked.';
  END IF;

  -- Prevent reverting from quoted/converted back to draft
  IF OLD.status = 'quoted' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot revert a quoted estimate back to draft.';
  END IF;

  IF OLD.status = 'converted' AND NEW.status != 'converted' THEN
    RAISE EXCEPTION 'Cannot change status of a converted estimate.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_converted_estimate_edit ON public.estimates;
CREATE TRIGGER trg_prevent_converted_estimate_edit
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION prevent_converted_estimate_edit();
