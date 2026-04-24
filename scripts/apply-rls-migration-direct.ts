/**
 * Apply RLS Migration Directly
 * Uses service role to execute SQL statements
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyRLS() {
  console.log('🔧 Applying RLS policies to child tables\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // SQL statements to execute
  const statements = [
    // fence_nodes
    `ALTER TABLE public.fence_nodes ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "fence_nodes_access_via_design" ON public.fence_nodes
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.fence_designs
          WHERE fence_designs.id = fence_nodes.design_id
            AND fence_designs.org_id = (SELECT get_my_org_id())
        )
      )`,

    // fence_sections
    `ALTER TABLE public.fence_sections ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "fence_sections_access_via_design" ON public.fence_sections
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.fence_designs
          WHERE fence_designs.id = fence_sections.design_id
            AND fence_designs.org_id = (SELECT get_my_org_id())
        )
      )`,

    // gates
    `ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "gates_access_via_design" ON public.gates
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.fence_designs
          WHERE fence_designs.id = gates.design_id
            AND fence_designs.org_id = (SELECT get_my_org_id())
        )
      )`
  ]

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    console.log(`\n[${i + 1}/${statements.length}] Executing:`)
    console.log(stmt.substring(0, 100) + '...\n')

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: stmt
      }) as any

      if (error) {
        // exec_sql might not exist, try direct query
        console.log('⚠️  exec_sql not available, trying direct execution...')

        // For Postgres, we need to use a raw query approach
        // Unfortunately Supabase JS client doesn't expose raw SQL execution
        // This needs to be run manually in Supabase dashboard
        throw new Error('Cannot execute DDL statements via Supabase JS client')
      }

      console.log('✅ Success')
    } catch (err: any) {
      if (err.message.includes('Cannot execute DDL')) {
        console.error('\n❌ Cannot apply migration via script')
        console.error('DDL statements require Supabase Dashboard SQL Editor\n')
        console.log('📋 MANUAL STEPS REQUIRED:\n')
        console.log('1. Open: https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv/sql/new')
        console.log('2. Paste this SQL:\n')
        console.log('--- BEGIN SQL ---')
        console.log(statements.join(';\n\n'))
        console.log(';\n--- END SQL ---\n')
        console.log('3. Click "Run"')
        console.log('4. Rerun this script to verify')
        process.exit(1)
      }
      throw err
    }
  }

  console.log('\n🎉 All RLS policies applied successfully!')
}

applyRLS().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
