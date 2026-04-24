#!/bin/bash
# AR Asset Optimization Pipeline
# Runs gltf-transform on raw GLB files to produce mobile-optimized versions
# and mirrors USDZ files from raw/ to panels/.
#
# Usage: bash scripts/ar-asset-optimize.sh

set -e
cd "$(dirname "$0")/.."

RAW_DIR="public/ar-assets/raw"
OUT_DIR="public/ar-assets/panels"
NAME="wood_privacy_6ft_8panel"

mkdir -p "$OUT_DIR"

if [ ! -f "$RAW_DIR/wooden-fence.glb" ]; then
  echo "ERROR: $RAW_DIR/wooden-fence.glb not found."
  echo "See docs/ar-asset-manifest.md for manual download instructions."
  exit 1
fi

echo "Optimizing GLB with gltf-transform (meshopt + webp textures)..."
npx -y @gltf-transform/cli optimize \
  "$RAW_DIR/wooden-fence.glb" \
  "$OUT_DIR/$NAME.glb" \
  --compress meshopt --texture-compress webp

if [ -f "$RAW_DIR/wooden-fence.usdz" ]; then
  cp "$RAW_DIR/wooden-fence.usdz" "$OUT_DIR/$NAME.usdz"
  echo "Copied USDZ to $OUT_DIR/$NAME.usdz"
else
  echo "WARNING: No USDZ found in $RAW_DIR. iOS Quick Look will fall back to model-viewer auto-conversion."
fi

echo ""
echo "=== Results ==="
ls -lh "$OUT_DIR/"
