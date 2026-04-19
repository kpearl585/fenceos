# AR Asset Manifest

This document describes the 3D asset pipeline for the AR Quote feature in
FenceEstimatePro. It covers where the models come from, how they are
processed, and how they end up in Supabase Storage for the app to load.

## Purpose

The AR Quote feature lets a homeowner (or estimator) tap a button on a
quote and see the proposed fence rendered in their actual yard via their
phone's camera. It uses the
[`<model-viewer>`](https://modelviewer.dev/) web component, which supports
both Android ARCore (via GLB + scene-viewer) and iOS ARKit (via USDZ + Quick
Look).

To serve that, we need per-style GLB + USDZ files for every fence type we
offer. This manifest documents the **first** such asset: a wood privacy
fence panel that doubles as the placeholder until we have our own captures.

## Asset: `wood_privacy_6ft_8panel`

The first AR fence model in our catalog. Represents a short run of a 6-foot
wood privacy fence (intended to be tiled along a path in AR).

### Source

- **Model:** "CC0 - Wooden Fence" by **plaggy** on Sketchfab
- **URL:** https://sketchfab.com/3d-models/cc0-woode-fence-39c5f9ac62a64259aa3478040339fa2a
- **License:** [CC0 1.0 Universal (Public Domain Dedication)](https://creativecommons.org/publicdomain/zero/1.0/)
- **Attribution:** Not legally required under CC0. We still credit
  **plaggy** in this document as a matter of good practice.

### File details

- Triangles: ~222
- Vertices: ~240
- PBR textures: 4096 x 4096, covering:
  - Albedo (base color)
  - Normal map
  - Metallic
  - Roughness
  - Ambient occlusion (AO)
  - ORM (packed occlusion + roughness + metallic, for glTF pipelines)
- Shipped download formats: **FBX, DAE (Collada), OBJ, glTF / GLB, USDZ**

The GLB and USDZ variants are both provided directly by the author, so we
do not need to convert between formats ourselves.

## Pipeline overview

```
Sketchfab download  -->  public/ar-assets/raw/  --(script)-->  public/ar-assets/panels/  -->  Supabase Storage bucket `ar-assets`
     (manual)            (gitignored staging)     (optimize)      (committed output)         (manual upload by Director)
```

- `public/ar-assets/raw/` is **not committed** (see `.gitignore`). It is a
  local staging area for the original, unoptimized downloads.
- `public/ar-assets/panels/` **is committed** and holds the optimized
  output plus the thumbnail.
- The final serving location is the `ar-assets` Supabase Storage bucket,
  where the `ar_model_assets` table (seeded by the parallel migration in
  Session A) points.

## Manual download steps (Director)

Sketchfab requires an authenticated account to download, so this step is
done by a human, not the agent.

1. Open https://sketchfab.com/3d-models/cc0-woode-fence-39c5f9ac62a64259aa3478040339fa2a
   in a browser.
2. Sign in with a free Sketchfab account if prompted.
3. Click **"Download 3D Model"**.
4. Choose **"Original format"** in the download dialog. This returns a
   single ZIP archive containing all shipped formats (FBX, DAE, OBJ, glTF,
   USDZ).
5. Unzip the archive somewhere local.
6. Inside the archive, locate:
   - The **glTF-Binary** variant, a file ending in `.glb`.
   - The **USDZ** variant, a file ending in `.usdz`.
7. Copy and rename them into the repo's staging directory:
   ```bash
   cp /path/to/extracted/<model>.glb   public/ar-assets/raw/wooden-fence.glb
   cp /path/to/extracted/<model>.usdz  public/ar-assets/raw/wooden-fence.usdz
   ```
8. From the repo root, run the optimization script:
   ```bash
   bash scripts/ar-asset-optimize.sh
   ```
9. Verify the output:
   ```bash
   ls -lh public/ar-assets/panels/
   ```
   Expected (approximate) sizes after optimization:
   - `wood_privacy_6ft_8panel.glb`  — **under 200 KB**
   - `wood_privacy_6ft_8panel.usdz` — **under 500 KB**

If the GLB is significantly larger than 200 KB, re-check that
`gltf-transform optimize` ran with `--texture-compress webp`; the 4K
textures dominate the file size and must be compressed.

## Thumbnail generation

We ship a 512 x 512 JPG preview alongside the model for the asset picker
UI.

Save it as:
```
public/ar-assets/panels/wood_privacy_6ft_8panel.jpg
```

Any of these workflows will work:

- **Easiest:** Open the optimized `.glb` in [modelviewer.dev](https://modelviewer.dev/editor/)
  editor, frame the model, take a screenshot, crop to 512 x 512, save as
  JPG.
- **Blender:** Import the GLB, set camera to a 3/4 front view, render at
  512 x 512, export JPG.
- **Any 3D viewer** that can show the GLB (e.g. Windows 3D Viewer,
  macOS Preview via Quick Look, or Reality Composer) — screenshot, crop,
  save.

Keep the background neutral (transparent is fine, but JPG will flatten it
to white). Center the panel with a small margin.

## Upload to Supabase Storage (Director)

After the three files land in `public/ar-assets/panels/`:

1. Go to the Supabase dashboard -> Storage -> `ar-assets` bucket.
2. If a `panels/` folder does not yet exist, create it.
3. Upload all three files into `panels/`:
   - `wood_privacy_6ft_8panel.glb`
   - `wood_privacy_6ft_8panel.usdz`
   - `wood_privacy_6ft_8panel.jpg`
4. Confirm the public URLs resolve. Replace `${SUPABASE_URL}` with the
   project URL (e.g. `https://abcd1234.supabase.co`):
   ```
   ${SUPABASE_URL}/storage/v1/object/public/ar-assets/panels/wood_privacy_6ft_8panel.glb
   ${SUPABASE_URL}/storage/v1/object/public/ar-assets/panels/wood_privacy_6ft_8panel.usdz
   ${SUPABASE_URL}/storage/v1/object/public/ar-assets/panels/wood_privacy_6ft_8panel.jpg
   ```
   Each should return `200 OK` with the correct `Content-Type`.

## Database wiring

The `ar_model_assets` table (created in Session A's parallel migration) is
already seeded with a row pointing at these paths. Once the upload
completes, the AR Quote UI will resolve the asset automatically — no code
change required.

If you ever rename the slug or change paths, update the matching row in
`ar_model_assets`.

## Re-running / updating the asset

To refresh the asset (new version, better capture, etc.):

1. Replace `public/ar-assets/raw/wooden-fence.glb` and
   `public/ar-assets/raw/wooden-fence.usdz` with the new files.
2. Re-run `bash scripts/ar-asset-optimize.sh`.
3. Commit the updated files under `public/ar-assets/panels/`.
4. Re-upload to Supabase Storage (overwriting the existing objects).

Because the filenames are stable (`wood_privacy_6ft_8panel.*`), no database
update is needed for a refresh — the app will pick up the new binary on
the next load (cache-busting handled by the `updated_at` column /
`Cache-Control` headers on the bucket).
