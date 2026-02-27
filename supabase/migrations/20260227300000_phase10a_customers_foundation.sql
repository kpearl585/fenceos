-- Phase 10A: Customers Foundation Layer
-- Adds email index and role-based RLS policies

-- 1. Add email index (idempotent)
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);

-- 2. Drop existing basic RLS policies and replace with role-based ones
DROP POLICY IF EXISTS "Org isolation select" ON public.customers;
DROP POLICY IF EXISTS "Org isolation insert" ON public.customers;
DROP POLICY IF EXISTS "Org isolation update" ON public.customers;
DROP POLICY IF EXISTS "Org isolation delete" ON public.customers;

-- SELECT: all roles can read within org
CREATE POLICY "customers_select_org"
  ON public.customers FOR SELECT
  USING (org_id = get_my_org_id());

-- INSERT: owner and sales can create customers
CREATE POLICY "customers_insert_owner_sales"
  ON public.customers FOR INSERT
  WITH CHECK (
    org_id = get_my_org_id()
    AND get_my_role() IN ('owner', 'sales')
  );

-- UPDATE: owner and sales can update customers
CREATE POLICY "customers_update_owner_sales"
  ON public.customers FOR UPDATE
  USING (
    org_id = get_my_org_id()
    AND get_my_role() IN ('owner', 'sales')
  );

-- DELETE: owner only can delete customers
CREATE POLICY "customers_delete_owner"
  ON public.customers FOR DELETE
  USING (
    org_id = get_my_org_id()
    AND get_my_role() = 'owner'
  );
