import type { CombinationDetail } from "./types";

function fmtNum(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Thickness must always render with at least 1 decimal place.
 * "3" → "3.0", "1.43" → "1.43", "0.7" → "0.7".
 */
export function fmtThickness(n: number): string {
  const s = n.toString();
  return s.includes(".") ? s : `${s}.0`;
}

export function coilLabel(t: number, w: number) {
  return `${fmtThickness(t)}×${fmtNum(w)}`;
}

export function slitLabel(t: number, w: number) {
  return `${fmtThickness(t)}×${fmtNum(w)}`;
}

/**
 * [Coil size -> (Slit_size X Count)/Product + ... => Total width , Scrap]
 */
export function combinationFormula(c: CombinationDetail): string {
  const coil = coilLabel(c.coil.thickness_mm, c.coil.width_mm);
  const parts = c.lines
    .slice()
    .sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence)
    .map(
      (l) => `(${slitLabel(l.slit.thickness_mm, l.slit.width_mm)} × ${l.slit_count})/${l.product}`,
    )
    .join(" + ");
  const total =
    c.total_slit_width_mm ??
    c.lines.reduce((s: number, l) => s + l.slit.width_mm * l.slit_count, 0);
  const scrap = Math.max(0, c.coil.width_mm - total);
  return `[${coil} → ${parts} ⇒ ${fmtNum(total)} , ${fmtNum(scrap)}]`;
}

export function planLineFormula(c: CombinationDetail, dateRange: string): string {
  const coil = coilLabel(c.coil.thickness_mm, c.coil.width_mm);
  const parts = c.lines
    .slice()
    .sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence)
    .map(
      (l) => `(${slitLabel(l.slit.thickness_mm, l.slit.width_mm)} × ${l.slit_count})/${l.product}`,
    )
    .join(" + ");
  const total = c.total_slit_width_mm ?? 0;
  return `[${coil} → ${parts} ⇒ ${fmtNum(total)} , ${dateRange}]`;
}
