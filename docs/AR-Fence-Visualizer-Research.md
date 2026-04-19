# AR Fence Visualizer — Research & Implementation Plan

**Project:** FenceEstimatePro  
**Date:** April 18, 2026  
**Status:** Pre-development research — ready for Phase 1 implementation

---

## Table of Contents

1. [Codebase Audit Summary](#1-codebase-audit-summary)
2. [AR Technology Decision](#2-ar-technology-decision)
3. [3D Fence Model Strategy](#3-3d-fence-model-strategy)
4. [Database Schema Additions](#4-database-schema-additions)
5. [Integration Points Map](#5-integration-points-map)
6. [Phased Implementation Plan](#6-phased-implementation-plan)
7. [Risk Assessment](#7-risk-assessment)
8. [Appendix: Competitive Landscape](#8-appendix-competitive-landscape)

---

## 1. Codebase Audit Summary

### 1.1 Architecture Overview

FenceEstimatePro is a **Next.js 16.2.1 App Router** SaaS on Vercel with Supabase as the database and auth provider. The stack is TypeScript-first with 361 source files, a custom Tailwind dark-theme design system (no shadcn/ui, no Radix), and a graph-based fence estimation engine at its core.

**Key stack facts relevant to AR:**
- React 18.3, TypeScript 5.9 — model-viewer integrates as a web component with a `'use client'` wrapper
- Supabase Storage already provisioned with two buckets (`contracts`, `job-photos`) — AR screenshots slot into a new bucket without new infrastructure
- No 3D/WebGL dependencies yet — clean slate for adding model-viewer
- `sharp` already in deps — usable for thumbnail generation from AR screenshot uploads
- Google Places `AddressAutocomplete` already wired — property coordinates are available at estimate time

### 1.2 Estimate Data Model (AR-Relevant Portions)

The estimate engine produces a **graph of nodes and sections**:

```
fence_designs
  ├── fence_nodes (posts: end_post | corner_post | line_post | gate_post)
  └── fence_sections (runs between nodes, each with length_ft, bay_count)
        └── gates (walk | drive_single | drive_double)
```

Each `fence_section` has:
- `length_ft` — critical for AR panel count
- `bay_count` — pre-calculated, drives 3D segment count
- `start_node_id` / `end_node_id` — spatial topology

Each `fence_design` has:
- `total_linear_feet` — total project length
- `fence_type_id` — maps to 3D model asset (wood_privacy_6ft, etc.)
- `height_ft` — drives model variant selection
- `zip_code` — unused today; available for geolocation

This topology is exactly what AR needs to sequence panel segments. **The estimation engine does the hard work before AR is involved.**

### 1.3 Customer-Facing Surfaces

AR should integrate into three surfaces (ranked by impact):

| Surface | Path | Auth | AR Use Case |
|---------|------|------|-------------|
| Quote portal | `/quote/[token]` | None (token) | Customer views AR from estimate link |
| Estimate creation | `/dashboard/phase1-estimator/[designId]` | Contractor auth | Contractor previews before sending |
| Public calculator | `/calculator` | None | Lead-gen demo (future) |

The **quote portal is the highest-value surface**: the customer is already looking at their estimate on their phone, the conversion moment is live, and AR visualization directly answers "what will this look like on my property?"

### 1.4 Existing File Handling

```
supabase storage buckets:
├── contracts/      — estimate PDFs, signatures
└── job-photos/     — site photos with org-scoped RLS
```

AR screenshots and GLB model assets will need a new `ar-assets` bucket and a new `ar-screenshots` bucket (or sub-path within `job-photos`).

### 1.5 UI System

The design system is all custom Tailwind, dark-mode-first (`background: #080808`), with a green accent (`#16A34A`). No component library to conflict with. AR UI (launch button, loading overlay, screenshot button) can be built with existing Tailwind patterns and will match the current visual language.

---

## 2. AR Technology Decision

### 2.1 The iOS Constraint

**iOS Safari has no WebXR AR support as of April 2026.** This is not a bug — Apple has not implemented it. Since the contractor customer base skews heavily toward iPhone, any web AR strategy must handle iOS natively.

The consequence: the AR stack is inherently **dual-path**:
- **Android** → WebXR (ARCore) or Google Scene Viewer
- **iOS** → Apple AR Quick Look (ARKit) via USDZ file link

The question is not which single API to use — the question is which wrapper handles the routing automatically.

### 2.2 Technology Comparison

#### model-viewer (WINNER)

Google's `<model-viewer>` web component is the recommended primary stack.

**Mechanism:**
- Android Chrome/Samsung Internet: triggers `ar-modes="scene-viewer"` → opens ARCore-based Google Scene Viewer native app with the GLB model placed in the real world
- iOS Safari: triggers `ar-modes="quick-look"` → opens ARKit-based AR Quick Look with the USDZ model

Both paths include a **native camera shutter button** for saving AR screenshots to the user's Camera Roll — no custom code needed for the core capture flow.

**Integration:** Load as a web component via CDN `<script>` tag. In Next.js 16, wrap in a `'use client'` component with `dynamic(() => import(...), { ssr: false })`. Total integration is ~80-100 lines. Pass GLB URL, USDZ URL, and configuration as attributes. Listen to `ar-status` events to show UI overlays.

**Cost:** Free, Apache 2.0, Google-maintained. No per-session pricing, no API key.

**Outdoor performance:** ARCore/ARKit handle typical residential yard surfaces (textured grass, gravel, concrete) well. Failure modes are featureless surfaces (smooth concrete, very dark mulch with no texture) and harsh noon sun creating specular glare. These are edge cases for the typical suburban/rural fence customer.

#### 8th Wall (ELIMINATED)

8th Wall hosted services shut down February 28, 2026. Infrastructure offline. Do not build on this platform.

#### AR.js (ELIMINATED)

AR.js is marker-based and GPS-location-based only. It does **not** perform markerless SLAM ground plane detection — the core capability needed to place a fence in a yard without physical markers. Architecturally unsuitable.

#### Apple AR Quick Look (Standalone)

AR Quick Look is the iOS half of model-viewer's dual-path strategy, not a separate option. As a standalone approach (HTML `<a rel="ar" href="model.usdz">`) it works on iOS but provides no Android path and no custom UI overlay. Use it via model-viewer, not directly.

#### Native RealityKit App

A native iOS app using RealityKit + ARKit would deliver the highest-quality AR — LiDAR precision on Pro iPhones, true object occlusion, multi-anchor panel placement — but introduces an app store download barrier before demos, 3-6 months of build time, and a parallel maintenance surface. Defer to Phase 3. Document as an upgrade path.

### 2.3 Final Stack Recommendation

```
Primary:  @google/model-viewer (web component)
Modes:    ar-modes="scene-viewer quick-look"
Assets:   .glb (Android/fallback) + .usdz (iOS, pre-converted)
Capture:  Native camera buttons in Scene Viewer and Quick Look
Fallback: model-viewer 3D orbit viewer (non-AR devices / desktop)
Phase 3:  Native iOS RealityKit app (premium feature)
```

### 2.4 Why Scene Viewer Over In-Browser WebXR

Forcing `ar-modes="webxr scene-viewer"` opens the AR session inside the browser tab on Android. This mode does **not** have a built-in screenshot button (confirmed in model-viewer GitHub issues #4256, #1326). Steering Android to Scene Viewer instead loses some AR interaction fidelity but preserves the native camera capture flow, which is critical for the "send this AR photo with your estimate" workflow. The UX tradeoff is worth it for Phase 1.

---

## 3. 3D Fence Model Strategy

### 3.1 The Drift Problem and its Solution

Placing a single 80-foot fence mesh as one AR object produces visible spatial drift beyond ~15 feet from the anchor point. This is an unsolved problem at the ARCore/ARKit hardware level. The solution is also the correct product design:

**Model fences as modular 8-foot panel segments, not as single meshes.**

This matches:
- How fences are sold (per panel, per section)
- How the estimate engine works (bay_count per section)
- How AR performs (each panel has its own anchor, drift stays local)
- How the user interaction should work (place first panel, drag-extend the run)

**Every 3D model asset should be a single 8-foot panel segment.** Multi-panel sequences are assembled in the AR session by placing repeated instances.

### 3.2 Model Catalog

Required fence types for MVP (aligned with `fence_type_id` values in schema):

| Fence Type | fence_type_id | Priority | 3D Complexity |
|------------|---------------|----------|---------------|
| Wood privacy 6ft | `wood_privacy_6ft` | P0 | Medium — vertical boards, rails |
| Wood privacy 8ft | `wood_privacy_8ft` | P0 | Same model, taller |
| Wood privacy 4ft | `wood_privacy_4ft` | P1 | Same model, shorter |
| Wood split-rail 2-rail | `wood_split_rail_2` | P1 | Low — two rails, no pickets |
| Wood split-rail 3-rail | `wood_split_rail_3` | P1 | Low — three rails |
| Chain-link 4ft | `chain_link_4ft` | P1 | High — mesh geometry is heavy |
| Vinyl privacy 6ft | `vinyl_privacy_6ft` | P2 | Similar to wood, different material |
| Aluminum picket 4ft | `aluminum_picket_4ft` | P2 | Low poly, metallic material |

Gate models (separate assets, placed at gate positions):

| Gate Type | gate_type |
|-----------|-----------|
| Walk gate 3ft | `walk_3ft` |
| Walk gate 4ft | `walk_4ft` |
| Drive gate single | `drive_single` |
| Drive gate double | `drive_double` |

Corner post models (for `corner_post` nodes):
- 90-degree corner post cap per fence type (6 variants)

### 3.3 Asset Sourcing

**Primary source:** CGTrader — search for "fence panel GLB" or "privacy fence PBR." Target commercial license, $20-60/model. Budget $200-400 total for MVP catalog.

**Secondary sources:**
- TurboSquid — free low-poly versions for chain-link (heavy geometry, needs manual LOD work anyway)
- Sketchfab/Fab.com — check CC-BY license terms before commercial use

**What to look for in each model:**
- PBR materials (BaseColor, Roughness, Metallic, Normal maps)
- 5,000-15,000 triangles per 8-foot panel (suitable for mobile WebGL)
- Correct scale (1 unit = 1 meter standard in glTF)
- UV-mapped for repeating wood grain or chain-link texture
- No internal hidden geometry (increases draw calls)

**Optimization pipeline:**
1. Source GLB from catalog
2. Open in Blender → verify scale, remove internal faces
3. Run Draco compression (glTF-transform or Blender export settings)
4. Target < 1 MB per panel GLB after compression
5. Export USDZ using Apple's Reality Converter or Blender's USDZ exporter
6. Validate on physical iPhone (Quick Look) and physical Android (Scene Viewer)
7. Upload to Supabase Storage `ar-assets` bucket

**Model naming convention:**
```
ar-assets/
├── panels/
│   ├── wood_privacy_6ft_8panel.glb
│   ├── wood_privacy_6ft_8panel.usdz
│   ├── wood_privacy_8ft_8panel.glb
│   ├── wood_privacy_8ft_8panel.usdz
│   └── ...
├── gates/
│   ├── walk_3ft_wood.glb
│   ├── walk_3ft_wood.usdz
│   └── ...
└── corners/
    ├── corner_post_wood_6ft.glb
    └── ...
```

### 3.4 AI-Generated Models

**Meshy.ai** (free tier): can generate fence panel GLBs from text prompts. Quality is adequate for prototype/placeholder, not for production. Use to rapidly prototype the AR integration before licensed assets arrive.

**Polycam**: useful for scanning an existing installed fence to create a site-specific reference model. Not for catalog assets. Could be a Phase 2 contractor tool ("scan your last job to add to your portfolio").

**Luma AI**: Gaussian Splat output is not compatible with model-viewer or Quick Look. Not suitable.

---

## 4. Database Schema Additions

### 4.1 New Tables

#### `ar_model_assets`

Catalog of 3D fence models stored in Supabase Storage. Populated by admin (not per-org).

```sql
CREATE TABLE ar_model_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_type_id TEXT REFERENCES fence_types(id),
  
  -- Asset classification
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('panel', 'gate', 'corner_post', 'end_post')),
  segment_length_ft DECIMAL(4,1) NOT NULL DEFAULT 8.0,
  height_ft   DECIMAL(4,1),

  -- Storage paths (Supabase Storage ar-assets bucket)
  glb_path    TEXT NOT NULL,
  usdz_path   TEXT NOT NULL,
  thumbnail_path TEXT,

  -- Asset metadata
  poly_count  INTEGER,
  file_size_kb_glb INTEGER,
  file_size_kb_usdz INTEGER,
  has_lod     BOOL DEFAULT FALSE,

  -- Status
  is_active   BOOL NOT NULL DEFAULT TRUE,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ar_model_assets_fence_type_idx ON ar_model_assets (fence_type_id, asset_type);
```

#### `ar_sessions`

One session per AR experience launch. Records device info, duration, and outcome.

```sql
CREATE TABLE ar_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id     UUID REFERENCES fence_designs(id) ON DELETE CASCADE,
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who launched it
  launched_by   TEXT NOT NULL CHECK (launched_by IN ('contractor', 'customer')),
  customer_token TEXT,  -- populated when launched from quote portal

  -- Device context
  device_type   TEXT CHECK (device_type IN ('ios', 'android', 'desktop', 'unknown')),
  ar_mode       TEXT CHECK (ar_mode IN ('quick_look', 'scene_viewer', 'webxr', 'fallback_3d')),
  user_agent    TEXT,

  -- Session state
  status        TEXT NOT NULL DEFAULT 'initiated'
                CHECK (status IN ('initiated', 'launched', 'placed', 'screenshot_taken', 'abandoned', 'completed')),

  -- Timestamps
  initiated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ar_launched_at TIMESTAMPTZ,
  first_placed_at TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Model state at session time
  panel_count   INTEGER,
  total_length_ft DECIMAL(8,2),
  fence_type_id TEXT
);

CREATE INDEX ar_sessions_design_id_idx ON ar_sessions (design_id);
CREATE INDEX ar_sessions_org_id_idx ON ar_sessions (org_id);
CREATE INDEX ar_sessions_customer_token_idx ON ar_sessions (customer_token) WHERE customer_token IS NOT NULL;

-- RLS
ALTER TABLE ar_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_sessions_org_policy" ON ar_sessions
  FOR ALL
  USING (org_id = get_my_org_id());
```

#### `ar_screenshots`

Screenshots saved during AR sessions (either from device Camera Roll upload or a future in-app share flow).

```sql
CREATE TABLE ar_screenshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES ar_sessions(id) ON DELETE CASCADE,
  design_id     UUID REFERENCES fence_designs(id) ON DELETE CASCADE,
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Storage path (Supabase Storage ar-screenshots bucket)
  storage_path  TEXT NOT NULL,
  thumbnail_path TEXT,

  -- Metadata
  taken_by      TEXT CHECK (taken_by IN ('contractor', 'customer')),
  device_type   TEXT,
  width_px      INTEGER,
  height_px     INTEGER,
  file_size_bytes INTEGER,

  -- Usage tracking
  included_in_proposal BOOL DEFAULT FALSE,
  proposal_sent_at TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ar_screenshots_design_id_idx ON ar_screenshots (design_id);
CREATE INDEX ar_screenshots_session_id_idx ON ar_screenshots (session_id);

-- RLS
ALTER TABLE ar_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_screenshots_org_policy" ON ar_screenshots
  FOR ALL
  USING (org_id = get_my_org_id());
```

### 4.2 Supabase Storage Buckets

Two new buckets alongside existing `contracts` and `job-photos`:

```sql
-- ar-assets: stores GLB and USDZ model files (public read, admin write)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ar-assets', 'ar-assets', TRUE, 52428800);  -- 50MB limit per file

-- ar-screenshots: stores customer/contractor AR photos (org-scoped)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ar-screenshots', 'ar-screenshots', FALSE, 20971520);  -- 20MB limit
```

RLS for `ar-screenshots` (mirrors `job-photos` pattern):
```sql
CREATE POLICY "ar_screenshots_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ar-screenshots'
    AND (storage.foldername(name))[1] = (get_my_org_id())::text
  );

CREATE POLICY "ar_screenshots_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ar-screenshots'
    AND (storage.foldername(name))[1] = (get_my_org_id())::text
  );
```

### 4.3 Schema Changes to Existing Tables

**`fence_designs`** — add AR readiness flag:
```sql
ALTER TABLE fence_designs
  ADD COLUMN ar_enabled BOOL NOT NULL DEFAULT FALSE,
  ADD COLUMN ar_model_asset_id UUID REFERENCES ar_model_assets(id);
```

**`quotes`** (or estimate-sharing table) — add AR screenshot attachment:
```sql
ALTER TABLE quotes
  ADD COLUMN ar_screenshot_id UUID REFERENCES ar_screenshots(id);
```

### 4.4 Derived Queries the AR Feature Will Need

```sql
-- Fetch AR assets for a design
SELECT 
  d.fence_type_id,
  d.height_ft,
  d.total_linear_feet,
  a.glb_path,
  a.usdz_path,
  a.segment_length_ft,
  CEIL(d.total_linear_feet / a.segment_length_ft) as panel_count
FROM fence_designs d
JOIN ar_model_assets a 
  ON a.fence_type_id = d.fence_type_id 
  AND a.asset_type = 'panel'
  AND a.is_active = TRUE
WHERE d.id = $design_id;

-- AR conversion funnel for analytics
SELECT 
  COUNT(*) FILTER (WHERE status = 'initiated') as initiated,
  COUNT(*) FILTER (WHERE status IN ('launched','placed','screenshot_taken','completed')) as launched,
  COUNT(*) FILTER (WHERE status IN ('placed','screenshot_taken','completed')) as placed,
  COUNT(*) FILTER (WHERE status = 'screenshot_taken') as screenshot_taken
FROM ar_sessions
WHERE org_id = get_my_org_id()
  AND initiated_at > NOW() - INTERVAL '30 days';
```

---

## 5. Integration Points Map

### 5.1 Entry Point: Quote Portal (`/quote/[token]`)

**File:** `src/app/quote/[token]/page.tsx`

This is where the customer lands after the contractor shares a quote. The AR button should appear here as the primary call-to-action alongside "Accept Quote."

```
Quote Portal Layout (current)
├── Quote header (contractor branding)
├── Fence summary (linear feet, fence type, price)
├── BOM breakdown (expandable)
├── Price total
└── Accept Quote button

Quote Portal Layout (with AR)
├── Quote header (contractor branding)
├── [NEW] AR visualization banner ("See your fence in your yard →")
├── [NEW] <ARViewerButton designId={} fenceTypeId={} totalLinearFt={} />
├── Fence summary
├── BOM breakdown
├── Price total
└── Accept Quote button
```

The `ARViewerButton` component:
1. Detects device (`navigator.userAgent`)
2. Fetches AR asset URLs from `/api/ar/assets?designId=...`
3. Records session via `POST /api/ar/sessions`
4. On iOS: renders `<a rel="ar" href={usdzUrl}>` (native Quick Look trigger)
5. On Android/desktop: renders `<model-viewer>` component inline with AR launch

### 5.2 Entry Point: Estimate Detail (`/dashboard/phase1-estimator/[designId]`)

**File:** `src/app/dashboard/phase1-estimator/[designId]/page.tsx`

Contractor-side preview before sending to customer. AR preview here lets contractors verify the visualization looks right before sharing.

```
Estimate Detail (current)
├── BOM table
├── Cost breakdown
├── Share/Send button
└── PDF download

Estimate Detail (with AR)
├── BOM table
├── Cost breakdown
├── [NEW] "Preview AR" button → opens ARViewer modal/page
├── Share/Send button  
└── PDF download
```

### 5.3 New API Routes

#### `GET /api/ar/assets`

Fetches the correct 3D model assets for a given design.

```typescript
// src/app/api/ar/assets/route.ts
// Query params: ?designId=uuid
// Returns: { glbUrl: string, usdzUrl: string, panelCount: number, segmentLengthFt: number }
// Auth: requires valid quote token OR authenticated user in same org
```

#### `POST /api/ar/sessions`

Creates a new AR session record when AR is launched.

```typescript
// src/app/api/ar/sessions/route.ts
// Body: { designId, launchedBy, deviceType, arMode, customerToken? }
// Returns: { sessionId: string }
// Auth: authenticated users OR valid quote token
```

#### `PATCH /api/ar/sessions/[sessionId]`

Updates session status as the user progresses through the AR experience.

```typescript
// src/app/api/ar/sessions/[sessionId]/route.ts
// Body: { status, arLaunchedAt?, firstPlacedAt?, completedAt? }
// Returns: { success: true }
```

#### `POST /api/ar/screenshots`

Called when a user uploads an AR screenshot from their Camera Roll (future - Phase 2 flow).

```typescript
// src/app/api/ar/screenshots/route.ts
// Body: FormData with image file + sessionId + designId
// Returns: { screenshotId, thumbnailUrl, fullUrl }
```

### 5.4 New React Components

```
src/components/ar/
├── ARViewerButton.tsx      — Smart launch button, handles iOS/Android detection
├── ARModelViewer.tsx       — model-viewer web component wrapper ('use client')
├── ARLaunchModal.tsx       — Pre-launch instructions overlay (device permissions tip)
├── ARScreenshotUpload.tsx  — Upload AR photo from Camera Roll to estimate
└── ARBadge.tsx             — "AR Ready" badge shown on quote/estimate cards
```

### 5.5 Device Detection Logic

```typescript
// src/lib/ar/device-detection.ts
export type ARCapability = 
  | 'quick-look'      // iOS 12+ Safari
  | 'scene-viewer'    // Android Chrome with Google Play Services  
  | 'webxr'           // Chromium with WebXR (desktop Chrome, Samsung Internet)
  | 'model-viewer-3d' // 3D orbit fallback (no AR)
  | 'unsupported';

export function detectARCapability(): ARCapability {
  if (typeof window === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  
  // iOS detection — Quick Look
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (isIOS) return 'quick-look';
  
  // Android with ARCore
  const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua);
  if (isAndroidChrome) return 'scene-viewer';
  
  // Desktop Chrome / Samsung Internet with WebXR
  if ('xr' in navigator) return 'webxr';
  
  // 3D fallback
  return 'model-viewer-3d';
}
```

### 5.6 AR Asset URL Generation

Assets live in public Supabase Storage. URLs are constructed from the bucket path:

```typescript
// src/lib/ar/asset-urls.ts
export function getARAssetUrls(glbPath: string, usdzPath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    glbUrl: `${base}/storage/v1/object/public/ar-assets/${glbPath}`,
    usdzUrl: `${base}/storage/v1/object/public/ar-assets/${usdzPath}`,
  };
}
```

---

## 6. Phased Implementation Plan

### Phase 1 — MVP (Estimated: 2-3 weeks)

**Goal:** Customer can tap "See in AR" from the quote portal on their phone, and see a model of the fence floating in their yard. Contractor can see an "AR preview" from the estimate page.

**Scope boundaries:**
- Single fence type only (wood_privacy_6ft — the most common)
- One panel segment placed at a time (no multi-panel sequencing yet)
- No screenshot upload workflow — device Camera Roll only
- No session analytics in contractor dashboard (just DB recording)

**Tasks:**

1. **Database migration**
   - Create `ar_model_assets` table
   - Create `ar_sessions` table
   - Create `ar_screenshots` table (structure only, no upload UI)
   - Create `ar-assets` Supabase Storage bucket (public)
   - Create `ar-screenshots` bucket (RLS-protected)
   - Seed one `ar_model_assets` row for `wood_privacy_6ft`

2. **Model assets**
   - Source or generate `wood_privacy_6ft_8panel.glb` (CGTrader or Meshy.ai placeholder)
   - Convert to `wood_privacy_6ft_8panel.usdz` (Reality Converter)
   - Optimize: Draco compression, target <1MB GLB
   - Validate on physical iPhone (Quick Look) and physical Android (Scene Viewer)
   - Upload to `ar-assets` bucket

3. **API routes**
   - `GET /api/ar/assets?designId=` — returns GLB/USDZ URLs + panel count
   - `POST /api/ar/sessions` — creates session record
   - Auth: support both authenticated requests AND quote token in header

4. **ARModelViewer component** (`src/components/ar/ARModelViewer.tsx`)
   - Dynamic import model-viewer CDN script (`ssr: false`)
   - Accept glbUrl, usdzUrl, alt props
   - Emit session events (placed, screenshot, error) via callbacks
   - Handle loading/error states with existing Tailwind patterns

5. **ARViewerButton component** (`src/components/ar/ARViewerButton.tsx`)
   - Detect device capability
   - Fetch AR assets via API
   - iOS path: render `<a rel="ar" href={usdzUrl}>` with AR icon
   - Android path: render ARModelViewer inline with AR launch button
   - Loading/unavailable states

6. **Quote portal integration** (`/quote/[token]/page.tsx`)
   - Add "See your fence in AR" section above Accept button
   - Show ARViewerButton with design data
   - Handle graceful degradation (no AR support → show 3D viewer)

7. **Estimate detail integration** (`/dashboard/phase1-estimator/[designId]/page.tsx`)
   - Add "Preview AR" button to contractor estimate page
   - Same ARViewerButton component, `launchedBy: 'contractor'`

8. **Build validation and device testing**
   - `npm run build` must pass
   - Manual test on physical iPhone (iOS 16+) in Safari
   - Manual test on physical Android (Chrome) in bright outdoor light
   - Verify session records appear in Supabase dashboard

**Deliverables:** AR-enabled quote portal, AR preview on estimate page, session telemetry in DB, one fence type working end-to-end.

---

### Phase 2 — Polish (Estimated: 3-4 weeks after Phase 1)

**Goal:** All major fence types available, screenshot upload to estimate, contractor analytics, improved UX.

**Tasks:**

1. **Complete model catalog**
   - Source and optimize all P0 and P1 fence types (see Section 3.2)
   - Add gate models per `gate_type`
   - Populate all `ar_model_assets` rows
   - Fence type auto-selection based on `design.fence_type_id`

2. **Multi-panel instruction flow**
   - Add in-app instruction overlay before AR launch: "Place one panel, then walk to place more"
   - Tip text about good AR conditions (textured surfaces, good lighting)

3. **Screenshot upload to estimate**
   - Post-AR prompt: "Share your AR photo with your estimate"
   - Device shares photo → phone native share sheet → app upload flow
   - Or: "Upload from Camera Roll" button → file picker → `POST /api/ar/screenshots`
   - Store in `ar-screenshots` bucket with org-scoped path
   - Show thumbnails on estimate detail page

4. **Include AR screenshot in proposal**
   - Add AR screenshot to PDF export (`generateEstimatePdf`)
   - New section: "Your Fence — AR Preview" with the photo
   - Toggle in estimate settings to include/exclude

5. **AR availability badge**
   - `ARBadge` component shown on estimate list cards
   - "AR Ready" indicator on quote portal links
   - Show on customer-facing quote summary

6. **Contractor AR analytics**
   - New card on `/dashboard/metrics` (or separate `/dashboard/ar`)
   - AR session funnel: Initiated → Launched → Placed → Screenshot
   - By fence type breakdown
   - Conversion correlation: do estimates with AR close faster?

7. **Height variants**
   - 4ft / 6ft / 8ft panel variants per fence type
   - Auto-selected from `design.height_ft`

---

### Phase 3 — Future Enhancements

**Goal:** Advanced features once AR proves conversion lift.

1. **Multi-section fence run**
   - Corner markers in AR for `corner_post` nodes
   - Sequential section placement following estimate topology
   - Total placed length counter in AR overlay

2. **Fence configurator in AR**
   - Tap to change fence type/height in AR
   - Triggers re-estimate with new parameters
   - Passes back to estimate engine

3. **Native iOS companion app (RealityKit)**
   - iOS app in App Store for "premium AR" tier
   - LiDAR-based ground detection (iPhone 12 Pro+)
   - Walk property line to measure + visualize simultaneously
   - Auto-creates estimate from AR measurement
   - Gated behind a higher subscription tier

4. **Contractor portfolio mode**
   - After job is installed, contractor scans completed fence with Polycam
   - Before/after AR overlay for marketing
   - Shareable to contractor's social media

5. **Lead-gen AR on public calculator** (`/calculator`)
   - Visitor enters linear feet → sees AR preview → requires email to unlock
   - Conversion funnel for contractor sign-ups

---

## 7. Risk Assessment

### 7.1 Technical Risks

#### Outdoor Surface Detection Failure
**Risk:** AR ground plane detection fails on challenging outdoor surfaces (smooth concrete, dark mulch, featureless light-colored pavers).  
**Likelihood:** Medium (30-40% of sessions will have suboptimal surfaces)  
**Mitigation:**
- Show pre-launch tips: "Works best on grass or gravel"
- Provide manual adjustment controls (up/down placement correction)
- Track failure rate by surface type in session data (Phase 2)
- AR is optional — estimate still works without it

#### Long Fence Drift
**Risk:** A 100-foot fence drifts and looks crooked in AR even if placed correctly.  
**Likelihood:** High for long runs (>40ft in a single session)  
**Mitigation:**
- Phase 1: one panel at a time, no multi-panel automation
- Phase 2: modular placement with user-guided sequencing
- Communication: "AR shows a sample section" — don't promise full-property visualization in Phase 1

#### USDZ Conversion Quality
**Risk:** Auto-converted USDZ from GLB shows incorrect materials or scale on iOS.  
**Likelihood:** Medium  
**Mitigation:**
- Pre-convert to USDZ using Reality Converter (not auto-generated by model-viewer)
- Store explicit `usdz_path` in `ar_model_assets`, never rely on on-the-fly conversion
- Test every model on physical iPhone before deployment

#### model-viewer CDN Dependency
**Risk:** Serving model-viewer from `modelviewer.dev` CDN adds latency and creates a third-party dependency.  
**Likelihood:** Low (Google SLA is excellent)  
**Mitigation:**
- Self-host the model-viewer script via npm package `@google/model-viewer`
- Add to `package.json`, serve as a local Next.js script — eliminates CDN dependency entirely
- This should be done in Phase 1

### 7.2 Device Compatibility Risks

#### iOS Safari Restrictions
**Risk:** Apple further restricts AR Quick Look in a future iOS update.  
**Likelihood:** Very Low  
**Mitigation:** Apple AR Quick Look is a first-party Apple technology actively promoted. No deprecation signals.

#### Android Fragmentation
**Risk:** Mid-range Android phones (Samsung Galaxy A-series, Google Pixel 6a) have inconsistent ARCore support.  
**Likelihood:** Medium  
**Mitigation:**
- `ar-modes="scene-viewer"` only requires Google Play Services with ARCore (installed on ~1.5B Android devices)
- Non-ARCore Android devices fall back to model-viewer 3D orbit mode gracefully
- Test on a Pixel 6a and Samsung Galaxy A54 before launch

#### Desktop/Laptop Users
**Risk:** Contractor previewing on desktop gets no AR experience.  
**Likelihood:** High (many contractors will preview on desktop)  
**Mitigation:** model-viewer 3D orbit mode provides a useful fallback — user can rotate and inspect the model in 3D without AR. Frame this as "3D Preview" on desktop and "AR Preview" on mobile.

### 7.3 Product Risks

#### Competitive Threat
**Risk:** RealityFence (native app, 4,500 users) already exists in this space.  
**Assessment:** RealityFence is a standalone app, not integrated into an estimating SaaS. The moat for FenceEstimatePro is the AR-to-estimate pipeline — customers take an AR photo → it appears on their proposal → they accept with more confidence. RealityFence can't do that without the estimate integration.  
**Mitigation:** Ship Phase 2 (screenshot upload to estimate) quickly to differentiate.

#### Customer Friction
**Risk:** Customers don't know they can do AR, or don't attempt it due to friction.  
**Likelihood:** Medium (unfamiliar technology for many residential customers)  
**Mitigation:**
- Clear "See Your Fence In AR" CTA with icon, above Accept button
- Short instruction text: "Point your camera at your yard"
- Don't require it — make it an enhancement, not a gate
- Contractor can demo it first ("I can show you what this will look like on your property")

#### Model Quality
**Risk:** Generic catalog models look nothing like the contractor's actual fence product.  
**Likelihood:** Medium  
**Mitigation:**
- Use PBR-textured models with realistic wood grain
- Phase 3: allow contractor to upload custom model photo for material matching
- The visualization is meant to convey scale and placement, not product-exact appearance

### 7.4 Performance Risks

**GLB file size on mobile:** Target < 1 MB per panel GLB. With Draco compression, wood privacy fence geometry compresses from ~3-4 MB to ~600-800 KB. Chain-link mesh is the hardest — raw geometry can be 5-10 MB; a baked texture approach (photo-realistic flat texture on simple geometry) is preferred over geometric mesh.

**Loading time on cellular:** 600KB GLB at 10 Mbps LTE = ~0.5 seconds. Acceptable. Show a skeleton/loading state during fetch.

**Memory on older iPhones:** iPhone XR (2018, still common in 2026) has 3 GB RAM. Each model-viewer instance with a 600KB GLB model uses ~50-80 MB GPU memory. Single-instance usage is safe. If multiple models are in the DOM simultaneously (estimate list page with AR badges), lazy-load model-viewer instances.

---

## 8. Competitive Landscape — Full Analysis

*Updated April 19, 2026 — based on direct App Store, LinkedIn, BBB, and press research*

### 8.1 RealityFence — Detailed Teardown

**Company facts:**
- Founded: December 19, 2022 (LLC, West Bloomfield, Michigan)
- Founder: Drew Baskin (Andrew Baskin) — single founder
- Team: 2–10 employees (LinkedIn: 5 listed), 60 company followers
- Funding: None disclosed. No VC on Crunchbase. Bootstrapped.
- Pricing: ~$200/month (from a single App Store review — no public pricing page)

**Marketing claims vs. evidence:**

| Claim | Evidence | Verdict |
|-------|----------|---------|
| "4,500+ users" | 12 App Store ratings, "1K+" Google Play installs, 60 LinkedIn followers | **Unverified. Almost certainly inflated.** A 4,500-user B2B SaaS has hundreds of ratings minimum. |
| "44% sales lift" | Self-reported on their homepage only. No methodology, no sample size. Repeated uncritically in trade press. | **Unverified marketing copy.** Plausible directionally, unverifiable in magnitude. |

**What RealityFence actually builds:**

*Genuine strengths:*
- Live AR camera overlay is the best fence-specific AR available — this is real product differentiation
- Voice-driven "Pro Sketch" property sketching with rough line-item cost breakdown
- Real-time material, color, and height swap during homeowner conversation
- AI photo editing (Pro Image) — transform a job site photo with AI
- Supports aluminum, vinyl, wood, chain link

*The hard stop — what happens after the sale:*
The product ends when the homeowner says yes. There is no bridge to any downstream workflow. The contractor closes with RealityFence, then manually re-enters everything into spreadsheets, email, or whatever system they use to actually run the job. **No data flows forward.**

**What RealityFence does NOT have:**
- Web application (mobile-only — no office use without a phone)
- CRM or customer/lead tracking
- Multi-user accounts or role-based access (single-contractor tool)
- Estimate revision workflow, approval, or change orders
- Invoicing, payments, or accounting export
- Job scheduling or crew dispatch
- Integration with Jobber, QuickBooks, Fence Cloud, TRUE, or any other platform
- Contract generation or e-signatures
- Organizational settings, multi-location, or team reporting
- Any B2B review platform presence (zero G2, Capterra, Trustpilot reviews)

**Marketplace feature:** Listed as "Early Preview" in the app — browse suppliers, "purchase directly coming soon." Not a live feature after multiple product cycles. Signals a team at capacity.

**Pricing context:**
At ~$200/month for a tool that only covers the demo moment, the value-per-dollar is vulnerable. Competitors with full estimating:
- Visual Fence Pro: $0–$299/month (includes full estimating)
- Dirtface: $99/month all-in
- mySalesman: $175/month

RealityFence charges premium pricing for a narrow point-of-sale function.

---

### 8.2 Catalyst Fence Solutions (Oldcastle APG / CRH)

**This is the bigger strategic threat.**

Catalyst Fence Solutions is owned by Oldcastle APG, a division of CRH — one of the world's largest building materials companies. They announced a contractor-first AR visualization + estimating platform at FenceTech 2026 (February 2026) with Spring 2026 launch.

**Why this matters more than RealityFence:**
- Oldcastle APG has Catalyst's full product catalog built in — AR visualization is tied to actual product SKUs with real inventory and real pricing, not generic fence styles
- A Fortune 500 materials supplier can bundle the AR tool at zero cost as a distribution incentive for contractors already buying from them
- Early testing claimed 35–40% faster decision-making and 75–80% close rates
- "Estimating logic + real product data" integration directly attacks the workflow gap RealityFence left open

**The threat model:** If Catalyst executes at even 20% of its ambition, they commoditize AR visualization as a supplier relationship benefit. Contractors who buy Oldcastle materials get AR for free. RealityFence's $200/month proposition collapses. FenceEstimatePro's AR feature becomes a commodity if the feature is positioned as visualization only.

**FenceEstimatePro's defense against Catalyst:** Material-agnostic workflow. Catalyst only works if the contractor sources exclusively from Oldcastle. FenceEstimatePro supports any supplier, any pricing, any material mix. The contractor's business data stays in FenceEstimatePro regardless of where they buy materials. Catalyst is a procurement tool wearing an AR suit — FenceEstimatePro is the business operating system.

---

### 8.3 Other Competitors

**Visual Fence Pro** — Web-based estimating with 3D visualization (not live AR). Strong on estimating workflow, weak on sales experience. Natural comparison for contractors who prioritize back-office over sales demo.

**FenceVisualizer** — Photo-based overlay tool (static, not live AR). Cheaper but less impressive in person.

**Fence Cloud / TRUE** — Full fence business management platforms. Strong on scheduling, CRM, job management. Weak on estimating accuracy and no AR.

**mySalesman** — Sales-focused CRM for fence contractors. Good pipeline tracking, no AR, basic estimating.

---

### 8.4 FenceEstimatePro's Defensible Position

**The clean strategic statement:**

> RealityFence wins the demo. Catalyst wins the materials transaction. FenceEstimatePro owns the job.

The moat is not better AR — it's the complete workflow that AR feeds into. When a contractor uses FenceEstimatePro AR:
1. They demo the fence in AR on the homeowner's property
2. The AR session is tied to the estimate already in the system
3. Homeowner accepts → signature, deposit, job record all flow from the same data
4. Contractor tracks margin, revisions, crew scheduling, and payment from one place
5. The business runs — not just the close

**RealityFence cannot replicate this without rebuilding from scratch.** Catalyst can only offer it for Oldcastle products. Every other fence contractor software player has either the workflow (Fence Cloud, TRUE) or the demo (RealityFence, Catalyst) — not both.

**Execution risk:** If RealityFence raises capital or gets acquired and adds CRM + job management, they combine the best demo experience with operational workflow. At 2–10 employees with no disclosed funding and a three-year runway at small-business pricing, that pivot appears unlikely near-term. Monitor.

**Tactical recommendation for the AR feature:** Position and name it as a workflow feature, not a visualization feature. Not "AR Fence Viewer" — "AR-to-Estimate." The experience should end with a confirmation screen that shows the estimate line items generated from the session, ready to send. That single UX moment communicates the entire competitive differentiation: the AR demo isn't just a closer, it's the first step in a job.

---

---

## 9. Open-Source GitHub Assets

*Addendum: April 19, 2026 — live GitHub search results*

### 9.1 Core AR Web Component

| Repo | Stars | License | What it gives you |
|------|-------|---------|-------------------|
| [google/model-viewer](https://github.com/google/model-viewer) | 8,013 | Apache-2.0 | The web component itself + TypeScript types via `@google/model-viewer` npm. Ships `HTMLElementTagNameMap['model-viewer']` types. No React wrapper included — write a 30-line `'use client'` wrapper yourself. |

**No maintained React/Next.js wrapper for model-viewer exists on GitHub with meaningful stars.** The two candidates found (`devhims/model-viewer-react` — 17 stars, Chakra UI dependency; `SwapnilRSharma/model-viewer-nextjs` — 2 stars, no license) are unusable for production. Build the wrapper in-house using the JSX type-declaration pattern documented at [dev.to/asross311](https://dev.to/asross311/a-strongly-typed-google-model-viewer-implementation-in-react-3m5c).

The canonical wrapper pattern:
```typescript
// src/types/model-viewer.d.ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': Partial<HTMLElementTagNameMap['model-viewer']> & {
        children?: React.ReactNode;
      };
    }
  }
}
```

### 9.2 3D Preview (Non-AR) Stack

| Repo | Stars | License | What it gives you |
|------|-------|---------|-------------------|
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 30,562 | MIT | React renderer for Three.js — use for the interactive 3D orbit preview on desktop/non-AR devices |
| [pmndrs/drei](https://github.com/pmndrs/drei) | 9,584 | MIT | Helpers: `useGLTF` (load GLBs with Draco), `<OrbitControls>`, `<ContactShadows>`, `<Environment>` (HDR lighting), `<Grid>` |
| [pmndrs/xr](https://github.com/pmndrs/xr) | 2,585 | MIT | WebXR sessions + hit-testing for Android Chrome — Phase 3 upgrade path when you want direct WebXR control |

**Decision:** Use `react-three-fiber` + `drei` for the 3D preview fallback (desktop, or before the user launches AR). This is the stack to build the interactive configurator — orbit controls, swap fence type, change color. model-viewer handles the AR launch. These two work together: user explores the model in R3F preview, then taps "See in AR" which hands off to model-viewer.

### 9.3 Free Fence 3D Models (CC0 — Zero Legal Friction)

| Asset | Source | License | Poly count | Formats |
|-------|--------|---------|------------|---------|
| [CC0 Wooden Fence](https://sketchfab.com/3d-models/cc0-woode-fence-39c5f9ac62a64259aa3478040339fa2a) by plaggy | Sketchfab | **CC0 1.0** | 222 triangles | glTF + **USDZ** + FBX |
| [CC0 Iron Fence](https://sketchfab.com/3d-models/cc0-iron-fence-9c5ad29c104c48e69a1227927655d489) by plaggy | Sketchfab | **CC0 1.0** | 1,920 triangles | glTF + USDZ |
| [City Kit Suburban](https://kenney.nl/assets/city-kit-suburban) | Kenney.nl | **CC0** | Low-poly game style | GLB + FBX |

**The CC0 Wooden Fence is Phase 1's starting asset.** It is 222 triangles, PBR-textured (4096×4096 albedo/normal/roughness), and already ships both glTF AND USDZ. Download → rename → upload to Supabase `ar-assets` bucket. No conversion required for prototype. For production, run through gltf-transform to compress the texture to WebP and target <50KB.

**Also check:** [Quaternius](https://quaternius.com) (all packs CC0, GLTF format) — their Urban Kit and Buildings Pack may include fence sections alongside other construction assets.

### 9.4 Procedural Fence Geometry

No Three.js fence generator with meaningful stars exists on GitHub. Build a `FenceGeometryBuilder` class in TypeScript. Reference materials:

| Repo | Stars | License | Reference value |
|------|-------|---------|-----------------|
| [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) | 1,284 | MIT | Architecture pattern: params → generator class → `InstancedMesh`. Directly adaptable to posts + rails + boards. |
| [Aljullu/threejs-procedural-building-generator](https://github.com/Aljullu/threejs-procedural-building-generator) | 43 | MIT | Iterating-along-axis pattern for placing repeated elements (windows/floors → posts/pickets) |
| [Sidorsson fence algorithm](https://sidorsson.com/portfolio/procedural-fence-generator/) | — | Reference | The algorithm: (1) place posts along spline at set spacing, (2) orient boards by post direction, (3) place rails at mid-point. Documents the exact logic needed. |

**Target implementation:** `FenceGeometryBuilder({ postHeight, postSpacing, railCount, picketSpacing, runLength })` → returns two `InstancedMesh` objects (posts, pickets) + an array of `BoxGeometry` rails. ~200 lines TypeScript. Use this for the R3F 3D preview; the AR launch uses a pre-baked GLB asset.

### 9.5 GLB Optimization Tools

| Repo | Stars | License | Usage |
|------|-------|---------|-------|
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | 1,856 | MIT | `npx @gltf-transform/cli optimize input.glb output.glb --compress meshopt --texture-compress webp` |
| [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) | 7,577 | MIT | C++ engine behind gltf-transform's `meshopt()` compression — no direct usage needed |
| [CesiumGS/gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) | 2,112 | Apache-2.0 | Draco compression only — use gltf-transform instead |

**Recommended command for every fence GLB:**
```bash
npx @gltf-transform/cli optimize raw/fence-wood-6ft.glb \
  public/ar-assets/panels/wood_privacy_6ft_8panel.glb \
  --compress meshopt --texture-compress webp
```
Expected output: 222-poly wooden fence panel → ~25-40 KB. Chain-link (baked texture approach) → ~80 KB.

### 9.6 USDZ Conversion (Offline Pre-processing)

| Repo | Stars | License | Usage |
|------|-------|---------|-------|
| [google/usd_from_gltf](https://github.com/google/usd_from_gltf) | 576 | Apache-2.0 | C++ CLI: `usd_from_gltf input.glb output.usdz` — best iOS compatibility |
| [kcoley/gltf2usd](https://github.com/kcoley/gltf2usd) | 275 | MIT | Python script; requires USD Python bindings (500MB install) — use as fallback |
| [PixarAnimationStudios/OpenUSD](https://github.com/PixarAnimationStudios/OpenUSD) | 7,217 | Modified Apache-2.0 | Foundation — `usd-core` pip package is the easiest install path |

**Recommended workflow:** Run conversion offline, not at runtime. Commit `.usdz` files alongside `.glb` files in Supabase Storage. Add a GitHub Actions step or Makefile target using `google/usd_from_gltf`. The CC0 wooden fence from Sketchfab already ships USDZ — no conversion needed for the Phase 1 prototype.

### 9.7 Open-Source Asset Summary for Phase 1

Everything Phase 1 needs is available and free:

| Need | Asset | Source | License | Work required |
|------|-------|--------|---------|---------------|
| Wood fence 6ft GLB+USDZ | CC0 Wooden Fence by plaggy | Sketchfab | CC0 | Download, rename, upload to Supabase |
| model-viewer npm package | @google/model-viewer | npm | Apache-2.0 | `npm install @google/model-viewer` |
| React wrapper | Write in-house | n/a | Own | ~30 lines using type-declaration pattern |
| GLB optimization | gltf-transform | npm | MIT | Single npx command per model |
| 3D fallback preview | react-three-fiber + drei | npm | MIT | Install packages, build component |

---

*Research compiled: April 18-19, 2026*  
*Next step: Phase 1 sprint planning*
