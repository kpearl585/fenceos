# Sprint 1 Orchestration — Day 1 Parallel Build Kit (v2 — audited)

**Sprint goal:** AR Quote feature live on the customer-facing `/quote/[token]` portal by end of day, behind feature flag.

**Scope narrowed after codebase audit:**
- **IN:** Quote portal only (`/quote/[token]`) — this is the high-value customer moment
- **IN:** Wood privacy 6ft fence only (one asset)
- **OUT (deferred to Sprint 2):** Phase 1 estimator contractor preview, AI Photo Estimator, multi-panel sequencing, screenshot upload, AR catalog expansion

**Team:** 1 Director (you), 1 Orchestrator (me), up to 3 parallel Builder sessions.

---

## Critical Codebase Facts (builders must respect these)

These came from auditing the actual code. Several of my earlier assumptions were **wrong** — these overrides:

| Fact | Implication |
|------|-------------|
| The customer-facing estimating engine uses table `fence_graphs`, NOT `fence_designs` | All AR code for the quote portal targets `fence_graphs` |
| Quote token column: `fence_graphs.public_token` (UUID) | API routes look up by this |
| Token validation via existing RPC: `public.is_token_valid(token)` | Reuse, don't re-implement |
| Fence type for AR is derived from `fence_graphs.input_json.productLineId` (contains 'wood', 'vinyl', 'chain', 'aluminum' substrings) | AR asset lookup parses this string |
| Fence height from `fence_graphs.input_json.fenceHeight` (int 3-12) | Used for model variant |
| Linear feet = sum of `fence_graphs.input_json.runs[].linearFeet` | Used for panel count |
| Quote portal is a **Server Component** using `getQuoteByToken(token)` from `@/app/quote/actions` | AR section is added inside this RSC; AR button itself is Client Component |
| Quote portal design system: `bg-fence-950` / `bg-fence-900` backgrounds, `bg-white rounded-xl border border-gray-200` cards, `bg-fence-600 hover:bg-fence-700` primary buttons, `bg-fence-50 border border-fence-200` accent boxes | NOT the dark `#080808` theme — use fence-palette |
| Supabase clients: `createClient()` from `@/lib/supabase/server` (RLS-aware) and `createAdminClient()` (bypasses RLS, use for service operations) | Don't create new client patterns |
| Profile→org lookup: query `profiles` table `.eq('auth_id', user.id).select('org_id')` | Standard auth pattern |
| Rate limiter pattern: `RateLimiters.opName(orgId)` returns `{ success, error, remaining, resetAt }` | Add a new AR rate limiter |
| Migration storage bucket creation: `INSERT INTO storage.buckets (id, name, public) VALUES (...) ON CONFLICT (id) DO NOTHING;` | Use this exact pattern |
| Storage RLS pattern: `(storage.foldername(name))[1] = get_my_org_id()::text` | Path convention: `{org_id}/...` |
| RPC observability function exists: `track_phase1_event(...)` | Consider parallel `track_ar_event` for analytics |
| Sentry is wired with tags: `tags: { phase: 'phase1_estimator', step: 'estimation' }` | AR routes should tag `phase: 'ar_quote'` |
| Next.js route params — newer pattern: `{ params }: { params: Promise<{ x: string }> }` with `await params` | Use this pattern for all new routes |

---

## The 3-Wave Parallel Plan

```
WAVE 1 (3 builders parallel — ~60 min)
├── Session A: Database migration + storage buckets (target: fence_graphs)
├── Session B: 3D asset pipeline (CC0 wooden fence)
└── Session C: Frontend foundation (types, wrapper, device detection)

WAVE 2 (2 builders parallel — ~90 min, after Wave 1 commits)
├── Session D: AR API routes (token-based, customer-facing)
└── Session E: ARViewerButton component (fence-palette design)

WAVE 3 (1 builder or you — ~45 min)
└── Session F: Integrate AR into /quote/[token]/page.tsx only

WAVE 4 (you — 60 min)
└── Device testing + deploy to 3 pilot customers
```

---

## Git Strategy — File Ownership = No Conflicts

All builders work on branch `claude/elated-jones-e92a23`. Each brief **explicitly lists owned files**. No overlaps = no merge conflicts.

Before you start:
1. Verify `git status` is clean — commit any uncommitted work
2. All builders start by running `git pull origin claude/elated-jones-e92a23` before their work
3. Each session commits at the end of its work
4. Wave 2 sessions run `git pull` before starting to grab Wave 1 commits

---

## WAVE 1 — Start All Three Simultaneously

### 🏗️ SESSION A — Database Migration (paste brief below into a new Claude Code chat)

```
You are Builder Session A on FenceEstimatePro. I am the orchestrator.
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Create a single Supabase migration for the AR Quote feature.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- supabase/migrations/20260419010000_ar_quote_foundation.sql (create)

⚠️ DO NOT touch any other file. Other agents are working in parallel.

BEFORE YOU START:
1. `git pull origin claude/elated-jones-e92a23`
2. Read supabase/migrations/20260227040200_phase7_contracts_storage.sql for the bucket creation pattern
3. Read supabase/migrations/20260417140000_tighten_job_photos_storage_policies.sql for storage RLS pattern
4. Confirm `get_my_org_id()` function exists (grep migrations)

MIGRATION CONTENTS (exact requirements):

1. Create table ar_model_assets:
   - id UUID PK default gen_random_uuid()
   - fence_type_id TEXT NOT NULL (matching values like 'wood_privacy_6ft')
   - asset_type TEXT NOT NULL CHECK (asset_type IN ('panel','gate','corner_post'))
   - segment_length_ft DECIMAL(4,1) NOT NULL DEFAULT 8.0
   - height_ft DECIMAL(4,1)
   - glb_path TEXT NOT NULL
   - usdz_path TEXT NOT NULL
   - thumbnail_path TEXT
   - poly_count INTEGER
   - file_size_kb_glb INTEGER
   - file_size_kb_usdz INTEGER
   - is_active BOOL NOT NULL DEFAULT TRUE
   - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - Index: (fence_type_id, asset_type) WHERE is_active
   - Admin-only table (no RLS required — service role manages; read access via API routes using createAdminClient)
   - Actually: enable RLS, grant SELECT to authenticated + anon (so API routes and public quote reads work)
   
   Seed ONE row:
     fence_type_id='wood_privacy_6ft', asset_type='panel',
     glb_path='panels/wood_privacy_6ft_8panel.glb',
     usdz_path='panels/wood_privacy_6ft_8panel.usdz',
     thumbnail_path='panels/wood_privacy_6ft_8panel.jpg',
     height_ft=6, segment_length_ft=8

2. Create table ar_sessions:
   - id UUID PK default gen_random_uuid()
   - fence_graph_id UUID REFERENCES fence_graphs(id) ON DELETE CASCADE NOT NULL
   - org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
   - launched_by TEXT NOT NULL CHECK (launched_by IN ('contractor','customer'))
   - public_token UUID  -- copy of fence_graphs.public_token when customer-launched, NULL when contractor
   - device_type TEXT CHECK (device_type IN ('ios','android','desktop','unknown'))
   - ar_mode TEXT CHECK (ar_mode IN ('quick_look','scene_viewer','webxr','fallback_3d'))
   - user_agent TEXT
   - status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','launched','placed','screenshot_taken','abandoned','completed'))
   - initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - ar_launched_at TIMESTAMPTZ
   - first_placed_at TIMESTAMPTZ
   - completed_at TIMESTAMPTZ
   - duration_seconds INTEGER
   - panel_count INTEGER
   - total_linear_ft DECIMAL(8,2)
   - Indexes: (fence_graph_id), (org_id), (public_token) WHERE public_token IS NOT NULL
   - Enable RLS
   - Policy: authenticated users can SELECT/INSERT/UPDATE where org_id = get_my_org_id()
   - Policy: anon can INSERT and UPDATE where public_token matches a valid fence_graphs.public_token (use service role in API route instead — add a minimal anon INSERT policy that just checks bucket_id... actually use service role path instead; only authenticated gets RLS, anon goes through createAdminClient)
   
   Simpler: ONLY authenticated SELECT/INSERT via RLS. API route for anon customer uses createAdminClient after validating token.

3. Create table ar_screenshots (structure only, Phase 2 will use it):
   - id UUID PK default gen_random_uuid()
   - session_id UUID REFERENCES ar_sessions(id) ON DELETE CASCADE
   - fence_graph_id UUID REFERENCES fence_graphs(id) ON DELETE CASCADE NOT NULL
   - org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
   - storage_path TEXT NOT NULL
   - thumbnail_path TEXT
   - taken_by TEXT CHECK (taken_by IN ('contractor','customer'))
   - width_px INTEGER
   - height_px INTEGER
   - file_size_bytes INTEGER
   - included_in_proposal BOOL DEFAULT FALSE
   - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - Indexes: (fence_graph_id), (session_id)
   - RLS: authenticated only, org_id = get_my_org_id()

4. Alter fence_graphs to add AR readiness flag:
   ALTER TABLE fence_graphs ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN NOT NULL DEFAULT FALSE;
   ALTER TABLE fence_graphs ADD COLUMN IF NOT EXISTS ar_fence_type_hint TEXT;  -- optional manual override of derived fence_type_id

5. Create storage buckets:
   INSERT INTO storage.buckets (id, name, public) VALUES
     ('ar-assets', 'ar-assets', true),
     ('ar-screenshots', 'ar-screenshots', false)
   ON CONFLICT (id) DO NOTHING;

6. Storage RLS policies for ar-screenshots (mirror job-photos pattern):
   - SELECT policy: authenticated, bucket_id='ar-screenshots' AND (storage.foldername(name))[1] = get_my_org_id()::text
   - INSERT policy: same
   - DELETE policy: same
   
   ar-assets is public bucket — no RLS needed for read (the `public=true` handles it). Write access via service role only (no public policies = default deny).

7. Add a helper function `public.derive_ar_fence_type_id(product_line_id TEXT, fence_height INTEGER)` that returns TEXT:
   - Input: productLineId substring + height
   - Logic for MVP:
       IF product_line_id ILIKE '%wood%' AND fence_height = 6 THEN RETURN 'wood_privacy_6ft'
       ELSE RETURN NULL
   - This is a simple MVP version; will be expanded in Sprint 2

REQUIREMENTS:
- Idempotent where possible (IF NOT EXISTS, ON CONFLICT)
- Clear comment header at top of file explaining the feature
- Follow the exact style of the existing migrations you read
- DO NOT apply the migration — just create the file. Director will apply via Supabase CLI/dashboard.

DELIVERABLE:
- One new migration file
- Run `npm run build` (should pass — migration files aren't TS-checked but verify no TS regressions)
- git add, commit with message: "feat(ar): database foundation for AR Quote feature"
- git push origin claude/elated-jones-e92a23
- Report back: commit hash, filename, any issues
```

---

### 🎨 SESSION B — 3D Asset Pipeline (paste into new Claude Code chat)

```
You are Builder Session B on FenceEstimatePro.
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Download, optimize, and prepare the CC0 Wooden Fence 3D model for AR.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- public/ar-assets/ (entire subtree — new)
- docs/ar-asset-manifest.md (new)
- scripts/ar-asset-optimize.sh (optional)

⚠️ DO NOT touch any code files, package.json, or migrations.

BEFORE YOU START:
`git pull origin claude/elated-jones-e92a23`

STEPS:

1. Create directories:
   mkdir -p public/ar-assets/raw
   mkdir -p public/ar-assets/panels

2. Download the CC0 Wooden Fence model:
   Source: https://sketchfab.com/3d-models/cc0-woode-fence-39c5f9ac62a64259aa3478040339fa2a
   License: CC0 1.0 (public domain)
   Creator: plaggy (Sketchfab)
   
   Sketchfab requires account login to download. TWO OPTIONS:
   
   Option A (if you have curl/wget and a Sketchfab auth token):
     curl -L -H "Authorization: Token <token>" "<download-url>" -o public/ar-assets/raw/wooden-fence.zip
   
   Option B (manual — document for Director):
     Write detailed instructions in docs/ar-asset-manifest.md for the Director to manually:
     - Visit the Sketchfab URL
     - Download "Original format" (will be a zip)
     - Extract GLB and USDZ from the zip
     - Save to public/ar-assets/raw/wooden-fence.glb and public/ar-assets/raw/wooden-fence.usdz
     - Then run the optimization script
   
   EITHER WAY, proceed to create the optimization script and manifest doc.

3. Create scripts/ar-asset-optimize.sh:
   #!/bin/bash
   set -e
   cd "$(dirname "$0")/.."
   
   RAW_DIR="public/ar-assets/raw"
   OUT_DIR="public/ar-assets/panels"
   NAME="wood_privacy_6ft_8panel"
   
   if [ ! -f "$RAW_DIR/wooden-fence.glb" ]; then
     echo "ERROR: $RAW_DIR/wooden-fence.glb not found. Download from Sketchfab first."
     exit 1
   fi
   
   echo "Optimizing GLB..."
   npx -y @gltf-transform/cli optimize \
     "$RAW_DIR/wooden-fence.glb" \
     "$OUT_DIR/$NAME.glb" \
     --compress meshopt --texture-compress webp
   
   if [ -f "$RAW_DIR/wooden-fence.usdz" ]; then
     cp "$RAW_DIR/wooden-fence.usdz" "$OUT_DIR/$NAME.usdz"
     echo "Copied USDZ"
   else
     echo "WARNING: No USDZ found. Will use auto-conversion by model-viewer (quality may vary)."
   fi
   
   echo "Done. Files in $OUT_DIR:"
   ls -lh "$OUT_DIR/"

   Make it executable: chmod +x scripts/ar-asset-optimize.sh

4. If you have the raw files, run the script and verify file sizes.
   Target: GLB < 200KB after optimization, USDZ < 500KB.
   If GLB is larger, note in manifest — we may need manual Blender optimization.

5. Generate or placeholder a thumbnail:
   If you have ImageMagick or a screenshot tool, generate a 512×512 JPG thumbnail.
   Otherwise, document in manifest for Director to generate manually.
   Save to public/ar-assets/panels/wood_privacy_6ft_8panel.jpg

6. Create docs/ar-asset-manifest.md with:
   - Asset source URL + license + creator credit
   - Original file sizes
   - Optimized file sizes (once run)
   - Any manual steps required
   - Upload instructions: after local files exist, Director should upload to Supabase Storage bucket `ar-assets` at these paths:
     - panels/wood_privacy_6ft_8panel.glb
     - panels/wood_privacy_6ft_8panel.usdz
     - panels/wood_privacy_6ft_8panel.jpg

IMPORTANT:
- Do NOT attempt to upload to Supabase Storage from this session (bucket may not exist until Session A's migration runs).
- Do NOT commit actual asset files if they're large (>1MB total) — gitignore them. Document paths in manifest.
- If you can't get the assets, create the directory structure + manifest + optimization script. Director will manually download and run.

DELIVERABLE:
- public/ar-assets/ directory structure
- docs/ar-asset-manifest.md with full instructions
- scripts/ar-asset-optimize.sh executable
- (if you got assets) optimized GLB + USDZ + thumbnail in public/ar-assets/panels/
- gitignore entry for public/ar-assets/raw/ (large raw files shouldn't be committed)
- git commit: "feat(ar): 3D asset pipeline for CC0 wooden fence"
- git push
- Report: which option you used (A or B), file sizes, and any blockers
```

---

### ⚛️ SESSION C — Frontend Foundation (paste into new Claude Code chat)

```
You are Builder Session C on FenceEstimatePro (Next.js 16 + TypeScript + Tailwind).
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Install @google/model-viewer, create TypeScript declarations, a React wrapper, and device detection utility. NO page integrations yet.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- package.json (add @google/model-viewer only)
- package-lock.json or pnpm-lock.yaml (whichever exists)
- src/types/model-viewer.d.ts (create)
- src/lib/ar/device-detection.ts (create)
- src/lib/ar/asset-urls.ts (create)
- src/lib/ar/fence-type-mapper.ts (create)
- src/components/ar/ARModelViewer.tsx (create)

⚠️ DO NOT touch API routes, pages, database migrations, or any existing component.

BEFORE YOU START:
`git pull origin claude/elated-jones-e92a23`

CONTEXT:
- Dark-blue fence palette. Primary color: fence-600 (#xxx from tailwind.config.ts). DO NOT use black/green theme.
- Read src/components/ShareQuoteButton.tsx for existing button styling patterns to match.
- Quote portal pages use Server Components by default. This component is `'use client'` because it's interactive and uses window APIs.
- Read docs/AR-Fence-Visualizer-Research.md Section 9 if you want more context on model-viewer integration.

STEP-BY-STEP:

1. Install the package:
   npm install @google/model-viewer

2. Create src/types/model-viewer.d.ts:
   ```ts
   import '@google/model-viewer';
   
   declare global {
     namespace JSX {
       interface IntrinsicElements {
         'model-viewer': React.DetailedHTMLProps<
           React.HTMLAttributes<HTMLElement> &
             Partial<{
               src: string;
               'ios-src': string;
               alt: string;
               ar: boolean;
               'ar-modes': string;
               'ar-scale': string;
               'ar-placement': string;
               'camera-controls': boolean;
               'auto-rotate': boolean;
               'shadow-intensity': string;
               'environment-image': string;
               exposure: string;
               poster: string;
               loading: 'auto' | 'lazy' | 'eager';
               reveal: 'auto' | 'manual';
               'touch-action': string;
             }>,
           HTMLElement
         >;
       }
     }
   }
   
   export {};
   ```

3. Create src/lib/ar/device-detection.ts:
   Export type ARCapability = 'quick-look' | 'scene-viewer' | 'webxr' | 'fallback-3d' | 'unsupported';
   
   Export function detectARCapability(): ARCapability
   - SSR-safe (check `typeof window === 'undefined'`)
   - iOS Safari detection: /iPad|iPhone|iPod/.test(ua) AND !MSStream → 'quick-look'
   - Android Chrome: /Android/.test(ua) AND /Chrome/.test(ua) → 'scene-viewer'
   - Other Chromium with WebXR: 'xr' in navigator → 'webxr'
   - Otherwise: 'fallback-3d'
   
   Export function isMobile(): boolean
   
   Export function getDeviceType(): 'ios' | 'android' | 'desktop' | 'unknown'

4. Create src/lib/ar/asset-urls.ts:
   ```ts
   export function getARAssetUrls(glbPath: string, usdzPath: string, thumbnailPath?: string) {
     const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
     if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
     const storage = `${base}/storage/v1/object/public/ar-assets`;
     return {
       glbUrl: `${storage}/${glbPath}`,
       usdzUrl: `${storage}/${usdzPath}`,
       thumbnailUrl: thumbnailPath ? `${storage}/${thumbnailPath}` : undefined,
     };
   }
   ```

5. Create src/lib/ar/fence-type-mapper.ts:
   ```ts
   // Maps fence_graphs.input_json.productLineId + fenceHeight to ar_model_assets.fence_type_id
   // MVP: only supports wood_privacy_6ft. Expand in Sprint 2.
   
   export function deriveFenceTypeId(
     productLineId: string | undefined | null,
     fenceHeight: number | undefined | null
   ): string | null {
     if (!productLineId) return null;
     const pid = productLineId.toLowerCase();
     const height = fenceHeight ?? 6;
     
     if (pid.includes('wood') && height === 6) return 'wood_privacy_6ft';
     
     // Future mappings — not supported for AR yet, return null so UI falls back gracefully
     return null;
   }
   
   export function isARSupported(productLineId: string | undefined | null, fenceHeight: number | undefined | null): boolean {
     return deriveFenceTypeId(productLineId, fenceHeight) !== null;
   }
   ```

6. Create src/components/ar/ARModelViewer.tsx:
   - 'use client' directive at top
   - Props interface:
     interface Props {
       glbUrl: string;
       usdzUrl: string;
       thumbnailUrl?: string;
       alt?: string;
       autoRotate?: boolean;
       onArStatus?: (status: 'not-presenting' | 'session-started' | 'object-placed' | 'failed') => void;
     }
   - Dynamically import '@google/model-viewer' via useEffect with `if (typeof window !== 'undefined')` to avoid SSR issues
   - Render <model-viewer> with:
     - src={glbUrl}
     - ios-src={usdzUrl}
     - poster={thumbnailUrl}
     - alt={alt || 'Fence 3D model'}
     - ar
     - ar-modes="scene-viewer quick-look"
     - ar-scale="fixed"
     - ar-placement="floor"
     - camera-controls
     - auto-rotate={autoRotate}
     - shadow-intensity="1"
     - exposure="1"
     - loading="lazy"
     - touch-action="pan-y"
     - style={{ width: '100%', height: '500px', backgroundColor: '#0a1a2f', borderRadius: '0.75rem' }}
   - Attach event listener for 'ar-status' custom event that calls onArStatus

7. Verify:
   npm run build
   Should pass. If TypeScript complains about model-viewer element, double-check your .d.ts file.

DELIVERABLE:
- 5 new files (types, 3 lib files, 1 component) + 1 package.json update
- npm run build passes
- git add, commit: "feat(ar): frontend foundation (model-viewer wrapper, types, device detection)"
- git push
- Report: commit hash, files created, build status
```

---

## WAVE 2 — Starts When Wave 1 Commits Are Pushed

All three Wave 1 sessions should report done before launching Wave 2. Have builders pull before starting.

### 🔌 SESSION D — AR API Routes (paste into new Claude Code chat)

```
You are Builder Session D on FenceEstimatePro.
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Build the AR API route handlers. Token-based auth for customer flow.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- src/app/api/ar/assets/route.ts (create)
- src/app/api/ar/sessions/route.ts (create)
- src/app/api/ar/sessions/[session_id]/route.ts (create)
- src/lib/validation/ar-schemas.ts (create)
- src/lib/security/rate-limit.ts (add ONE new rate limiter — preserve all existing)

⚠️ DO NOT touch any other file.

BEFORE YOU START:
`git pull origin claude/elated-jones-e92a23`

CONTEXT — Read these files carefully first:
- src/app/api/designs/[design_id]/estimate/route.ts — example API route pattern
- src/app/quote/actions.ts — token validation pattern (uses `is_token_valid` RPC)
- src/lib/supabase/server.ts — createClient vs createAdminClient
- src/lib/security/rate-limit.ts — RateLimiters shape
- CLAUDE.md — security requirements

KEY PATTERNS TO MATCH:
- Use `const { params }: { params: Promise<{ session_id: string }> }` + `const { session_id } = await params`
- `createClient()` when requiring auth; `createAdminClient()` after validating a token (bypasses RLS)
- Zod for input validation; on ZodError return 400 with `error: firstIssue.message`
- Sentry.captureException on internal errors with tags `phase: 'ar_quote'`
- Sanitize errors — never leak DB details to client

ENDPOINT SPECS:

1. GET /api/ar/assets?token=[uuid]
   File: src/app/api/ar/assets/route.ts
   
   Flow:
   a) Parse searchParams.get('token'), validate as UUID via Zod
   b) Use createAdminClient() to call rpc('is_token_valid', { token }) → if false, 404
   c) Fetch fence_graphs row by public_token=validated, select input_json, ar_enabled, org_id
   d) If ar_enabled=false, return 404 { error: 'AR not available for this quote' }
   e) Extract productLineId and fenceHeight from input_json (these are strings/numbers at JSON path)
   f) Call rpc('derive_ar_fence_type_id', { product_line_id, fence_height }) → returns TEXT or NULL
      - Or do the derivation in TS using deriveFenceTypeId from src/lib/ar/fence-type-mapper.ts
   g) If no fence type match, return 404 { error: 'No AR model available for this fence type' }
   h) Query ar_model_assets where fence_type_id = derived AND asset_type = 'panel' AND is_active, limit 1
   i) Compute panelCount = Math.ceil(totalLinearFeet / segment_length_ft) where totalLinearFeet = sum of input_json.runs[].linearFeet
   j) Construct asset URLs via getARAssetUrls() from src/lib/ar/asset-urls.ts
   k) Return { glbUrl, usdzUrl, thumbnailUrl, panelCount, segmentLengthFt, fenceTypeId, heightFt }

2. POST /api/ar/sessions
   File: src/app/api/ar/sessions/route.ts
   
   Zod body schema:
     token: z.string().uuid() (customer flow),
     launchedBy: z.enum(['contractor','customer']),
     deviceType: z.enum(['ios','android','desktop','unknown']).optional(),
     arMode: z.enum(['quick_look','scene_viewer','webxr','fallback_3d']).optional(),
     userAgent: z.string().max(500).optional()
   
   Flow:
   a) Parse + validate body
   b) Validate token via rpc('is_token_valid')
   c) Fetch fence_graphs by public_token → extract id (graph_id), org_id, input_json
   d) Compute panel_count + total_linear_ft from input_json.runs
   e) Insert ar_sessions row via createAdminClient() (bypasses RLS since we're anon customer-facing):
      { fence_graph_id, org_id, launched_by, public_token: token, device_type, ar_mode, user_agent, status: 'initiated', panel_count, total_linear_ft }
   f) Return { sessionId }

3. PATCH /api/ar/sessions/[session_id]
   File: src/app/api/ar/sessions/[session_id]/route.ts
   
   Zod body:
     status: z.enum(['launched','placed','screenshot_taken','abandoned','completed']).optional(),
     arLaunchedAt: z.string().datetime().optional(),
     firstPlacedAt: z.string().datetime().optional(),
     completedAt: z.string().datetime().optional(),
     durationSeconds: z.number().int().min(0).max(3600).optional(),
     publicToken: z.string().uuid().optional()  // required if customer path (verify session belongs to token)
   
   Flow:
   a) Validate body
   b) Fetch session by session_id using createAdminClient()
   c) Customer path: if body.publicToken provided, verify session.public_token matches → update allowed
   d) Contractor path: use createClient(), check user auth, verify session.org_id = user's org_id
   e) Update the session with provided fields (only non-undefined ones)
   f) Return { success: true }

4. Rate limiter addition to src/lib/security/rate-limit.ts:
   Add to the RateLimiters object (preserve existing):
   ```ts
   /** AR sessions: 60 per hour per org (or per token for customer) */
   arSessionCreate: (key: string) =>
     checkRateLimit({
       key: `ar-session:${key}`,
       limit: 60,
       windowMs: 60 * 60 * 1000,
     }),
   ```

5. Zod schemas file src/lib/validation/ar-schemas.ts:
   Export the three schemas used above (ARAssetsQuerySchema, ARSessionCreateSchema, ARSessionUpdateSchema).

DELIVERABLE:
- 3 new route files + 1 schema file + 1 additional export in rate-limit.ts
- `npm run build` MUST pass
- Test one endpoint with curl if easy (GET /api/ar/assets with a known token)
- git commit: "feat(ar): API routes for AR assets and sessions (token-based)"
- git push
- Report: commit hash, build status, any auth/RLS edge cases you noticed
```

---

### 🖱️ SESSION E — ARViewerButton (paste into new Claude Code chat)

```
You are Builder Session E on FenceEstimatePro.
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Build the ARViewerButton component — smart, device-adaptive launch button with session tracking.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- src/components/ar/ARViewerButton.tsx (create)
- src/lib/ar/use-ar-session.ts (create — React hook)

⚠️ DO NOT touch pages, API routes, migrations, or existing components.

BEFORE YOU START:
`git pull origin claude/elated-jones-e92a23`

CONTEXT — Read these first:
- src/components/ShareQuoteButton.tsx — EXACTLY match this button/modal styling pattern
- src/components/ar/ARModelViewer.tsx (from Session C) — the underlying viewer
- src/lib/ar/device-detection.ts — detectARCapability()
- src/app/quote/[token]/page.tsx — see how fence-palette is used in quote portal

DESIGN SYSTEM (match existing fence-palette):
- Primary button: `bg-fence-600 hover:bg-fence-700 text-white` rounded-lg px-4 py-2 font-semibold
- Secondary button: `bg-white border-2 border-gray-300 hover:border-fence-500 text-gray-700 hover:text-fence-600`
- Modal backdrop: `fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50`
- Modal body: `bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`
- Info boxes (AR tips): `bg-blue-50 border border-blue-200 rounded-lg p-4`
- Error: `bg-red-50 border border-red-200 rounded-lg p-4 text-red-800`

COMPONENT SPECS:

1. src/lib/ar/use-ar-session.ts
   Custom React hook:
   ```ts
   type Status = 'idle' | 'loading' | 'ready' | 'launching' | 'error';
   
   interface UseARSessionOpts {
     token?: string;           // for customer flow (quote portal)
     launchedBy: 'contractor' | 'customer';
   }
   
   interface ARAssetData {
     glbUrl: string;
     usdzUrl: string;
     thumbnailUrl?: string;
     panelCount: number;
     fenceTypeId: string;
     heightFt: number;
   }
   
   export function useARSession(opts: UseARSessionOpts) {
     const [status, setStatus] = useState<Status>('idle');
     const [asset, setAsset] = useState<ARAssetData | null>(null);
     const [sessionId, setSessionId] = useState<string | null>(null);
     const [error, setError] = useState<string | null>(null);
     
     async function prepare() { /* fetch /api/ar/assets, set state */ }
     async function createSession(deviceType, arMode) { /* POST /api/ar/sessions */ }
     async function updateStatus(status, extras?) { /* PATCH /api/ar/sessions/[id] */ }
     
     return { status, asset, sessionId, error, prepare, createSession, updateStatus };
   }
   ```

2. src/components/ar/ARViewerButton.tsx
   ```ts
   'use client';
   
   interface Props {
     token?: string;                           // quote portal flow
     launchedBy: 'contractor' | 'customer';
     variant?: 'primary' | 'secondary';        // default 'primary'
     className?: string;
   }
   ```
   
   Behavior:
   a) On mount: detect ARCapability via detectARCapability(). Don't fetch asset yet (keep it lazy).
   b) Render button text + icon based on capability:
      - 'quick-look' or 'scene-viewer' or 'webxr' → "See Your Fence in AR" with AR icon
      - 'fallback-3d' → "3D Preview" with 3D icon
      - 'unsupported' → render nothing (return null)
   c) On click: call prepare() from hook. On success, open a modal with <ARModelViewer>
      - For iOS (quick-look): inside modal, show the model-viewer normally but ALSO render a hidden <a rel="ar" href={usdzUrl}> that we click programmatically to trigger Quick Look natively. Track session as 'launched'.
      - For Android (scene-viewer): inside modal, <ARModelViewer> component has `ar` attribute — tapping the AR button inside the viewer launches Scene Viewer.
      - For desktop/fallback: just show the <ARModelViewer> as a 3D orbital preview.
   d) On AR status events (from ARModelViewer's onArStatus), call updateStatus().
   e) Close modal button (X icon, top right). Completing session on close.
   
   Modal layout (match ShareQuoteButton.tsx structure):
   - Header with title, subtitle, close button
   - Body with:
     - AR tip bar at top: "Point your phone at your yard. Works best on grass or gravel."
     - The <ARModelViewer /> taking most of the space
     - A small "Powered by FenceEstimatePro" label
   
   Error handling:
   - If capability === 'unsupported': don't render
   - If fetch fails: error state inside modal with retry
   - If model fails to load: same
   
   Accessibility:
   - aria-label on button
   - Modal traps focus
   - Close on Escape key

3. AR icon SVG — use inline SVG matching heroicons style (same stroke-width=2 as ShareQuoteButton).
   Suggested AR icon path:
   ```
   <svg ... viewBox="0 0 24 24"><path d="M12 3L2 8l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"/></svg>
   ```
   (Layered box icon)

REQUIREMENTS:
- 'use client' directive
- SSR-safe (no window access during render)
- Must pass `npm run build`
- TypeScript strict (no `any`)
- Uses only existing Tailwind classes + fence-palette
- Imports ARModelViewer from src/components/ar/ARModelViewer
- Imports detectARCapability from src/lib/ar/device-detection
- Uses useARSession hook

DELIVERABLE:
- 2 new files
- `npm run build` passes
- git commit: "feat(ar): ARViewerButton with device-adaptive launch + session hook"
- git push
- Report: commit hash, build status
```

---

## WAVE 3 — Final Integration (you OR one builder)

### 🔗 SESSION F — Quote Portal Integration

```
You are Builder Session F on FenceEstimatePro. Final integration step.
Repo: /Users/pearllabs/Documents/GitHub/fenceos/.claude/worktrees/elated-jones-e92a23
Branch: claude/elated-jones-e92a23

TASK: Wire ARViewerButton into the customer quote portal.

⚠️ YOU MAY ONLY CREATE/MODIFY these files:
- src/app/quote/[token]/page.tsx

⚠️ DO NOT touch any other file. Sprint 1 scope is quote portal only.

BEFORE YOU START:
`git pull origin claude/elated-jones-e92a23`

CONTEXT:
- Read the full current src/app/quote/[token]/page.tsx first
- <ARViewerButton /> exists at src/components/ar/ARViewerButton.tsx
- Quote portal fetches quote via getQuoteByToken(token) from @/app/quote/actions
- The quote has: input_json.productLineId, input_json.fenceHeight, input_json.runs (with linearFeet), customer_accepted_at, etc.

IMPORTANT: getQuoteByToken result does NOT currently include ar_enabled. You need to either:
  Option A: Update src/app/quote/actions.ts getQuoteByToken() to also select `ar_enabled` from fence_graphs → pass through in the returned shape.
  Option B: Re-query server-side inside the page for just the ar_enabled field.
  
Prefer Option A — it's cleaner. BUT modifying actions.ts is outside your file allowlist. So use Option B: import createAdminClient in the page (it's a server component, that's fine), query fence_graphs for ar_enabled.
  
Actually, SIMPLER APPROACH: since we're adding a single boolean field, update getQuoteByToken by extending the file list. You are allowed to ALSO modify:
- src/app/quote/actions.ts (add `ar_enabled` to the SELECT and to the returned quote shape's type)

INTEGRATION:

1. In src/app/quote/actions.ts, add `ar_enabled` to the fence_graphs SELECT clause. Add `ar_enabled: boolean` to the return type's `quote` interface.

2. In src/app/quote/[token]/page.tsx:
   - Import ARViewerButton: `import ARViewerButton from '@/components/ar/ARViewerButton';`
   - Locate the <QuoteAcceptanceForm /> render in the JSX
   - ADD a new section ABOVE the acceptance form, inside the same max-w-4xl wrapper, ONLY when `quote.ar_enabled && !isAccepted && !isExpired`
   - Section markup:
     ```tsx
     {quote.ar_enabled && !isAccepted && !isExpired && (
       <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
         <div className="bg-fence-50 border-b border-fence-200 px-6 py-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-fence-600 rounded-lg flex items-center justify-center">
               {/* AR icon SVG */}
             </div>
             <div>
               <h2 className="text-lg font-bold text-gray-900">See Your Fence In AR</h2>
               <p className="text-sm text-gray-600">Point your phone at your yard to preview</p>
             </div>
           </div>
         </div>
         <div className="p-6">
           <ARViewerButton token={token} launchedBy="customer" variant="primary" />
           <p className="text-xs text-gray-500 mt-3">Works on most modern phones. No app download required.</p>
         </div>
       </div>
     )}
     ```

3. Verify the page still works for quotes where ar_enabled=false (should just not render the section).

4. Testing:
   - npm run build (MUST PASS)
   - npm run dev, then visit a real quote URL (Director can provide one)
   - Verify button appears only when ar_enabled=true
   - Verify existing acceptance flow still works

DELIVERABLE:
- 2 modified files (page.tsx, actions.ts)
- npm run build passes
- git commit: "feat(ar): integrate AR Quote into customer quote portal"
- git push
- Report: commit hash, build status, screenshot if possible
```

---

## WAVE 4 — Director Track (You, in parallel with builders)

### Customer Validation Calls (morning, 45 min — do while Wave 1 runs)

Pick 3 existing customers. Call them. Use this script:

> "Quick question — I'm shipping a new feature today and wanted to run it by you before I send it to customers. Imagine the homeowner gets your estimate, and when they open the link on their phone, they can tap 'See your fence in AR' and the fence appears in their yard through their camera. They take a screenshot, that photo auto-attaches to your proposal. Good for closing, or is it a gimmick?"
>
> Listen for:
> - Enthusiasm ("yes, that'd be huge") → ship confidence
> - "Yes but..." (they add requirements) → Sprint 2 priorities
> - Apathy or confusion → come back and rethink

Record every response. Tell me at end of day what you heard.

### Database Migration Apply (after Session A completes)

Once Session A commits the migration:
1. Pull latest: `git pull`
2. Apply to Supabase:
   - Via Supabase CLI: `npx supabase db push`
   - Or: copy the migration SQL, paste into Supabase dashboard SQL editor, run
3. Verify tables exist: check Supabase dashboard → Tables → `ar_model_assets`, `ar_sessions`, `ar_screenshots`
4. Verify buckets exist: Supabase dashboard → Storage → `ar-assets`, `ar-screenshots`
5. Report: "DB applied successfully"

### Asset Upload (after Session B completes)

Once Session B finishes:
1. If Session B couldn't auto-download, follow manual steps in `docs/ar-asset-manifest.md` to get the Sketchfab model
2. Run the optimization: `bash scripts/ar-asset-optimize.sh`
3. Upload the 3 files to Supabase Storage `ar-assets` bucket at path `panels/`:
   - Via Supabase dashboard → Storage → ar-assets → Upload → select files
   - File names must match: `wood_privacy_6ft_8panel.glb`, `.usdz`, `.jpg`

### Enable AR on Test Quote (after all waves complete)

Before device testing:
1. Pick 1 real test quote in your dashboard (use a dummy customer quote you created)
2. In Supabase dashboard → Table Editor → `fence_graphs` → find that row
3. Set `ar_enabled = true`
4. Copy the `public_token`
5. Visit `/quote/[that_token]` on your phone (not simulator)

### Device Testing (end of day, 30 min)

On your **physical iPhone**:
1. Open the quote URL in Safari
2. Tap "See Your Fence In AR" — Quick Look should launch
3. Point at your yard — fence renders
4. Tap camera shutter button to save screenshot
5. Screenshot saved to Camera Roll? ✅

On your **physical Android phone**:
1. Same URL in Chrome
2. Tap "See Your Fence In AR" — Scene Viewer should launch
3. Verify placement + camera shutter

Write findings to `docs/day-1-device-test.md`.

### Deploy Decision

If both devices work:
- Commit + push any hotfixes
- Merge to main (or let Vercel deploy the branch automatically)
- Enable `ar_enabled=true` on 3 real pilot customer quotes
- Text the 3 pilot customers: "Try this 60-second demo, new feature — [link]"

If devices don't work: come back here. Debug starts now, deploy tomorrow.

---

## End of Day 1 Checkpoint

Come back to this chat and tell me:
1. Which sessions completed? (A✅ B✅ C✅ D✅ E✅ F✅)
2. What the 3 customers said
3. Device test results
4. Deploy status (pilot live? blocked? how many sessions logged?)

I'll plan Day 2 (finish Sprint 1 hardening + kick off Sprint 2: AI Photo Estimator).

---

## Troubleshooting Playbook

**Builder says "TypeScript error with model-viewer JSX":**  
Verify Session C's `.d.ts` file imports `'@google/model-viewer'` at top. That loads its types into `HTMLElementTagNameMap`.

**Storage bucket upload denied:**  
Use Supabase dashboard with service_role (you're logged in as admin) — RLS doesn't block service role. If the dashboard still blocks, verify the bucket `public=true` for `ar-assets`.

**Migration fails with "function get_my_org_id does not exist":**  
Check it's actually defined in `supabase/migrations/20260226203310_rls_helper_function.sql` or similar. If missing from your DB, apply that migration first.

**Quote portal shows no AR button:**  
Verify (in this order): bucket files exist → ar_model_assets row seeded → ar_enabled=TRUE on the fence_graphs row → productLineId contains 'wood' → fenceHeight=6.

**Session has nothing to commit:**  
Probably it analyzed but didn't actually write files. Tell it explicitly: "Now create the files per the spec. Don't just plan."

---

*This doc is Sprint 1's source of truth. Any scope questions — come back here.*
