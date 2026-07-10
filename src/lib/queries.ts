import { supabase } from "@/integrations/supabase/client";
import type { CombinationDetail } from "./types";

export async function fetchCoils() {
  const { data, error } = await supabase
    .from("coil_spec")
    .select("spec_id, thickness_mm, width_mm, source")
    .order("thickness_mm")
    .order("width_mm");
  if (error) throw error;
  return data;
}

export async function fetchSlits() {
  const { data, error } = await supabase
    .from("slit_spec")
    .select("spec_id, thickness_mm, width_mm, source")
    .order("thickness_mm")
    .order("width_mm");
  if (error) throw error;
  return data;
}

export async function fetchProducts() {
  const { data, error } = await supabase.from("product").select("product_id, label").order("label");
  if (error) throw error;
  return data;
}

export async function fetchMachines() {
  const { data, error } = await supabase
    .from("machine")
    .select("machine_id, code, name")
    .order("code");
  if (error) throw error;
  return data;
}

type ComboRow = {
  combination_id: number;
  total_slit_width_mm: number | null;
  no_of_coils_typical: number | null;
  coil_spec: { spec_id: number; thickness_mm: number; width_mm: number } | null;
  combination_machine: Array<{
    frequency: number;
    machine: { code: string } | null;
  }>;
  combination_line: Array<{
    sequence: number;
    slit_count: number;
    slit_spec: { spec_id: number; thickness_mm: number; width_mm: number } | null;
    product: { product_id: number; label: string } | null;
  }>;
};

const COMBO_SELECT = `
  combination_id,
  total_slit_width_mm,
  no_of_coils_typical,
  coil_spec:coil_spec_id ( spec_id, thickness_mm, width_mm ),
  combination_machine ( frequency, machine:machine_id ( code ) ),
  combination_line ( sequence, slit_count,
    slit_spec:slit_spec_id ( spec_id, thickness_mm, width_mm ),
    product:product_id ( product_id, label )
  )
`;

function toDetail(r: ComboRow): CombinationDetail | null {
  if (!r.coil_spec) return null;
  return {
    combination_id: r.combination_id,
    coil: r.coil_spec,
    total_slit_width_mm: r.total_slit_width_mm,
    no_of_coils_typical: r.no_of_coils_typical,
    machines: r.combination_machine
      .filter((m) => m.machine)
      .map((m) => ({ code: m.machine!.code, frequency: m.frequency }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    lines: r.combination_line
      .filter((l) => l.slit_spec && l.product)
      .map((l) => ({
        sequence: l.sequence,
        slit_count: l.slit_count,
        slit: l.slit_spec!,
        product: l.product!.label,
        product_id: l.product!.product_id,
      }))
      .sort((a, b) => a.sequence - b.sequence),
  };
}

export async function fetchCombinationsForCoil(
  coilSpecId: number,
  filters: { slitSpecId?: number | null; productId?: number | null } = {},
): Promise<CombinationDetail[]> {
  const { data, error } = await supabase
    .from("combination")
    .select(COMBO_SELECT)
    .eq("coil_spec_id", coilSpecId);
  if (error) throw error;
  let details = (data as unknown as ComboRow[])
    .map(toDetail)
    .filter((x): x is CombinationDetail => x !== null);
  if (filters.slitSpecId != null) {
    details = details.filter((d) => d.lines.some((l) => l.slit.spec_id === filters.slitSpecId));
  }
  if (filters.productId != null) {
    details = details.filter((d) => d.lines.some((l) => l.product_id === filters.productId));
  }
  return details.sort((a, b) => {
    const fa = a.machines.reduce((s, m) => s + m.frequency, 0);
    const fb = b.machines.reduce((s, m) => s + m.frequency, 0);
    return fb - fa;
  });
}

export async function fetchAllCombinations(machineCode?: string | null) {
  const { data, error } = await supabase.from("combination").select(COMBO_SELECT);
  if (error) throw error;
  let details = (data as unknown as ComboRow[])
    .map(toDetail)
    .filter((x): x is CombinationDetail => x !== null);
  if (machineCode) {
    details = details.filter((d) => d.machines.some((m) => m.code === machineCode));
  }
  return details.sort((a, b) => a.combination_id - b.combination_id);
}
