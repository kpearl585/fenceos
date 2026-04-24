# Phase 1 Migration Instructions

## Database Migration Required

Before testing the new features, you need to run the SQL migration to create the `job_outcomes` table.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy the contents of `docs/migrations/001_job_outcomes.sql`
5. Paste into the editor
6. Click "Run" to execute the migration

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref kgwfqyhfylfzizfzeulv

# Run the migration
supabase db push
```

### Verification

After running the migration, verify it worked:

1. Go to Supabase Dashboard → Table Editor
2. You should see a new table called `job_outcomes`
3. Check that it has the following columns:
   - id (uuid, primary key)
   - job_id (uuid, foreign key to jobs)
   - org_id (uuid, foreign key to organizations)
   - estimated_total (decimal)
   - actual_material_cost (decimal, nullable)
   - actual_labor_hours (decimal, nullable)
   - actual_total_cost (decimal, nullable)
   - complications (text array, nullable)
   - profit_margin (decimal, nullable)
   - notes (text, nullable)
   - created_at (timestamptz)
   - updated_at (timestamptz)

## Testing the Feature

1. Create or use an existing job
2. Mark the job as "complete"
3. Navigate to the job detail page
4. As an owner, you should see a new "Actual Job Costs" section
5. Click "Log Costs" to enter actual costs
6. Fill in the form and save
7. The variance between estimated and actual will be calculated automatically

## Rollback (if needed)

If you need to rollback the migration:

```sql
DROP TABLE IF EXISTS job_outcomes CASCADE;
```
