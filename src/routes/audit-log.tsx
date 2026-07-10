import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllCombinations } from "@/lib/queries";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [{ title: "Audit log — Slitting Planner" }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const combos = useQuery({ queryKey: ["audit-combos"], queryFn: () => fetchAllCombinations() });

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="rounded-md border bg-card p-4">
        <h1 className="text-sm font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent combination records and their current status for review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent combination activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Record</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Lines</th>
                <th className="px-2 py-2">Products</th>
              </tr>
            </thead>
            <tbody>
              {(combos.data ?? []).slice(0, 8).map((combo) => (
                <tr key={combo.combination_id} className="border-t text-sm">
                  <td className="px-2 py-2 font-medium">#{combo.combination_id}</td>
                  <td className="px-2 py-2">
                    <Badge variant="secondary">Curated</Badge>
                  </td>
                  <td className="px-2 py-2">{combo.lines.length}</td>
                  <td className="px-2 py-2">{combo.lines.map((line) => line.product).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
