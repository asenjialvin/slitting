export type MachineTag = { code: string; frequency: number };

export type CombinationLine = {
  sequence: number;
  slit: { thickness_mm: number; width_mm: number; spec_id: number };
  product: string;
  product_id: number;
  slit_count: number;
};

export type CombinationDetail = {
  combination_id: number;
  coil: { thickness_mm: number; width_mm: number; spec_id: number };
  total_slit_width_mm: number | null;
  no_of_coils_typical: number | null;
  machines: MachineTag[];
  lines: CombinationLine[];
};
