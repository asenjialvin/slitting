import { Badge } from "@/components/ui/badge";
import { fmtThickness } from "@/lib/formula";
import type { CombinationDetail } from "@/lib/types";

function SegmentBox({ numerator, denominator }: { numerator: string; denominator: string }) {
  return (
    <div className="inline-flex flex-col items-center overflow-hidden rounded-md border border-border bg-background text-[11px] shadow-sm">
      <div className="border-b-2 border-accent px-2 py-1 font-mono tabular-nums">{numerator}</div>
      <div className="px-2 py-1 font-medium">{denominator}</div>
    </div>
  );
}

export function CombinationCard({
  combo,
  right,
}: {
  combo: CombinationDetail;
  right?: React.ReactNode;
}) {
  const total = combo.total_slit_width_mm ?? 0;
  const scrap = Math.max(0, combo.coil.width_mm - total);
  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{combo.combination_id}</span>
          {combo.machines.map((m) => (
            <Badge key={m.code} variant="secondary" className="px-1.5 py-0 text-[10px]">
              {m.code} · {m.frequency}×
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            Coil{" "}
            <span className="font-mono">
              {fmtThickness(combo.coil.thickness_mm)}×{combo.coil.width_mm}
            </span>
            mm
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            Total <span className="font-medium text-foreground">{total}</span>/{combo.coil.width_mm}
          </span>
          <span>
            Scrap <span className="font-medium text-foreground">{scrap.toFixed(1)}</span>
          </span>
          {right}
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b p-3 md:border-b-0 md:border-r">
          <div className="flex flex-wrap gap-1.5">
            {combo.lines.map((line) => (
              <SegmentBox
                key={`${line.sequence}-${line.product}`}
                numerator={`(${fmtThickness(line.slit.width_mm)} × ${line.slit_count})`}
                denominator={line.product}
              />
            ))}
          </div>
        </div>
        <div className="border-b md:border-b-0">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left font-medium">Slit</th>
                <th className="px-3 py-1.5 text-left font-medium">Count</th>
                <th className="px-3 py-1.5 text-left font-medium">Product</th>
              </tr>
            </thead>
            <tbody>
              {combo.lines.map((l) => (
                <tr key={l.sequence} className="border-b last:border-0">
                  <td className="px-3 py-1.5 font-mono tabular-nums">
                    {fmtThickness(l.slit.thickness_mm)} × {l.slit.width_mm}
                  </td>
                  <td className="px-3 py-1.5 font-mono tabular-nums">×{l.slit_count}</td>
                  <td className="px-3 py-1.5 font-medium">{l.product}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
