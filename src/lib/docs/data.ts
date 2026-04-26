export const DOC_SKUS = [
  { sku: "contractor-agreement", label: "Service Agreement / Contract" },
  { sku: "change-order", label: "Change Order Form" },
  { sku: "lien-waiver-conditional", label: "Conditional Lien Waiver" },
  { sku: "lien-waiver-final", label: "Final Lien Waiver" },
  { sku: "scope-of-work", label: "Scope of Work" },
  { sku: "warranty-certificate", label: "Warranty Certificate" },
] as const;

export type DocSku = (typeof DOC_SKUS)[number]["sku"];
