// Maps fence_graphs.input_json.productLineId + fenceHeight to an
// ar_model_assets.fence_type_id key.
//
// Sprint 1 supports only wood_privacy_6ft. Additional types expand in Sprint 2.

export function deriveFenceTypeId(
  productLineId: string | undefined | null,
  fenceHeight: number | undefined | null
): string | null {
  if (!productLineId) return null;
  const pid = productLineId.toLowerCase();
  const height = fenceHeight ?? 6;

  if (pid.includes('wood') && height === 6) {
    return 'wood_privacy_6ft';
  }

  // No match — UI should hide AR button or show 3D fallback
  return null;
}

export function isARSupported(
  productLineId: string | undefined | null,
  fenceHeight: number | undefined | null
): boolean {
  return deriveFenceTypeId(productLineId, fenceHeight) !== null;
}
