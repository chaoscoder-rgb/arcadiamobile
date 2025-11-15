import { query } from "../config/database";

export interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  phase_hint: string | null;
}

export async function getSuggestedMaterials(phase: string): Promise<Material[]> {
  const result = await query<Material>(
    `SELECT id, sku, name, category, unit_of_measure, phase_hint
     FROM material_catalog
     WHERE is_active = TRUE
       AND (phase_hint = $1 OR phase_hint IS NULL)
     ORDER BY category, name
     LIMIT 50`,
    [phase]
  );
  return result.rows;
}