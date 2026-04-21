// Human-readable BOM line descriptions for gate hardware SKUs.
// One table so all four fence-type BOM builders (vinyl/wood/chain_link/
// aluminum) format the same contractor-selected upgrades identically.
// Unknown SKUs fall back to the passed-in default label so legacy data
// keeps rendering.

export function hingeDescription(sku: string, fallback: string): string {
  const map: Record<string, string> = {
    HINGE_HD:           "Heavy Duty Hinge (pair)",
    HINGE_SELF_CLOSING: "Self-Closing Hinge (pair)",
  };
  return map[sku] ?? fallback;
}

export function latchDescription(sku: string, fallback: string): string {
  const map: Record<string, string> = {
    GATE_LATCH:        "Gate Latch",
    GATE_LATCH_POOL:   "Pool-Code Self-Closing Latch",
    LATCH_LOKK_LATCH:  "LokkLatch (pool-code compliant)",
    LATCH_MAGNETIC:    "Magnetic Latch (pool-code compliant)",
    LATCH_SLIDE_BOLT:  "Slide Bolt Latch",
  };
  return map[sku] ?? fallback;
}

export function postInsertDescription(sku: string): string {
  const map: Record<string, string> = {
    ALUM_INSERT:   "Aluminum Post Insert (hinge post)",
    STEEL_INSERT:  "Steel Post Insert (hinge post)",
  };
  return map[sku] ?? "Post Insert (hinge post)";
}
