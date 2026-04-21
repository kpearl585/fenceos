"use client";

import { useRouter } from "next/navigation";
import MaterialImport from "@/components/materials/MaterialImport";
import { bulkAddMaterials } from "./actions";

type Material = { id: string; name: string; sku: string | null; unit: string; unit_cost: number; unit_price: number; category: string | null; supplier: string | null };
type ParsedRow = { name: string; sku: string; unit: string; unit_cost: string; unit_price: string; category: string; supplier: string };

export default function MaterialsImportBar({ materials }: { materials: Material[] }) {
  const router = useRouter();

  async function handleImport(rows: ParsedRow[]) {
    const result = await bulkAddMaterials(rows);
    if (result.imported > 0) router.refresh();
    return result;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">{materials.length} items</span>
      <MaterialImport onImport={handleImport} />
    </div>
  );
}
