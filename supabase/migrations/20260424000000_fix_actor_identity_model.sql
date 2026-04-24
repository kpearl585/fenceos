-- Align actor identity references on operational tables with public.users(id)
-- so app writes, role checks, and RLS all use the same user-row key.

-- Map auth.uid() -> public.users.id for RLS ownership checks.
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

-- Convert any persisted auth.users ids into public.users ids where a mapping exists.
UPDATE public.jobs j
SET created_by = u.id
FROM public.users u
WHERE j.created_by = u.auth_id;

UPDATE public.jobs j
SET assigned_foreman_id = u.id
FROM public.users u
WHERE j.assigned_foreman_id = u.auth_id;

UPDATE public.change_orders co
SET created_by = u.id
FROM public.users u
WHERE co.created_by = u.auth_id;

UPDATE public.change_orders co
SET approved_by = u.id
FROM public.users u
WHERE co.approved_by = u.auth_id;

UPDATE public.job_checklists jc
SET completed_by = u.id
FROM public.users u
WHERE jc.completed_by = u.auth_id;

UPDATE public.job_material_verifications jmv
SET verified_by = u.id
FROM public.users u
WHERE jmv.verified_by = u.auth_id;

UPDATE public.job_photos jp
SET uploaded_by = u.id
FROM public.users u
WHERE jp.uploaded_by = u.auth_id;

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.change_orders'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.change_orders'::regclass AND attname = 'created_by')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.change_orders DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id);

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.change_orders'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.change_orders'::regclass AND attname = 'approved_by')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.change_orders DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id);

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.job_checklists'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.job_checklists'::regclass AND attname = 'completed_by')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.job_checklists DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.job_checklists
  ADD CONSTRAINT job_checklists_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES public.users(id);

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.job_material_verifications'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.job_material_verifications'::regclass AND attname = 'verified_by')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.job_material_verifications DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.job_material_verifications
  ADD CONSTRAINT job_material_verifications_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.users(id);

DO $$
DECLARE
  fk_name text;
BEGIN
  FOR fk_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.job_photos'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.job_photos'::regclass AND attname = 'uploaded_by')
      ]
  LOOP
    EXECUTE format('ALTER TABLE public.job_photos DROP CONSTRAINT %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.job_photos
  ADD CONSTRAINT job_photos_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id);
