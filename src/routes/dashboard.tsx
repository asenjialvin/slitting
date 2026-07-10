import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Package, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllCombinations } from "@/lib/queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Slitting Planner" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const combos = useQuery({ queryKey: ["dashboard-combos"], queryFn: () => fetchAllCombinations() });

  const metrics = useMemo(() => {
    const rows = combos.data ?? [];
    const productCount = new Set(rows.flatMap((combo) => combo.lines.map((line) => line.product))).size;
    const coilCount = new Set(rows.map((combo) => combo.coil.spec_id)).size;
    const avgLines = rows.length ? rows.reduce((sum, combo) => sum + combo.lines.length, 0) / rows.length : 0;

    return {
      total: rows.length,
      products: productCount,
      coils: coilCount,
      avgLines: avgLines.toFixed(1),
    };
  }, [combos.data]);

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick overview of the currently available combination library and its coverage.
            </p>
          </div>
          <Link to="/combinations" className="text-sm font-medium text-primary hover:underline">
            Manage combinations
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Boxes className="h-4 w-4" /> Total combinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.total}</div>
            <p className="text-sm text-muted-foreground">Curated and available in the library.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" /> Products covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.products}</div>
            <p className="text-sm text-muted-foreground">Unique products referenced across combinations.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" /> Avg. line depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics.avgLines}</div>
            <p className="text-sm text-muted-foreground">Average slit lines per combination.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent combinations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(combos.data ?? []).slice(0, 6).map((combo) => (
              <div key={combo.combination_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <div className="font-medium">#{combo.combination_id}</div>
                  <div className="text-muted-foreground">{combo.lines.length} lines · {combo.coil.width_mm} mm coil</div>
                </div>
                <div className="flex items-center gap-2">
                  {combo.machines.slice(0, 2).map((machine) => (
                    <Badge key={`${combo.combination_id}-${machine.code}`} variant="secondary" className="text-[10px]">
                      {machine.code}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <Link to="/combinations" className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
              <span>Review curated combinations</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/" className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
              <span>Jump back into the planner</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
