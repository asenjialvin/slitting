import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ClipboardList, Scissors } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Plans — Slitting Planner" }] }),
  component: PlansPage,
});

function PlansPage() {
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan")
        .select(
          `plan_id, plan_number, status, planned_for, created_at, machine:machine_id ( code, name ), plan_line ( plan_line_id, combination_id )`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        plan_id: number;
        plan_number: string;
        status: string;
        planned_for: string | null;
        created_at: string;
        machine: { code: string; name: string } | null;
        plan_line: Array<{ plan_line_id: number; combination_id: number }>;
      }>;
    },
  });

  const plannedActions = [
    "Review coil and slit availability before the next production run",
    "Validate recent curated combinations against current machine assignments",
    "Prepare a shortlist of combinations for the next shift handoff",
  ];

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Plans</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the day’s slitting production work moving with a simple planning board.
            </p>
          </div>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            Open planner
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4" /> Planned actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plannedActions.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4" /> Recent draft plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {plans.isLoading ? (
              <div className="text-sm">Loading plans…</div>
            ) : (plans.data?.length ?? 0) === 0 ? (
              <div className="rounded-md border bg-muted/40 p-3">No draft plans have been saved yet.</div>
            ) : (
              plans.data?.map((plan) => (
                <div key={plan.plan_id} className="rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{plan.plan_number}</span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {plan.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs">
                    {plan.machine ? `${plan.machine.code} · ${plan.machine.name}` : "No machine"}
                  </div>
                  <div className="mt-1 text-xs">
                    {plan.plan_line.length} line{plan.plan_line.length === 1 ? "" : "s"} · {plan.planned_for ?? "No date"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scissors className="h-4 w-4" /> Quick planning checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-md border p-3">Confirm the selected coil size and width.</div>
          <div className="rounded-md border p-3">Choose relevant slit sizes and linked products.</div>
          <div className="rounded-md border p-3">Save the combination as a draft plan for review.</div>
        </CardContent>
      </Card>
    </div>
  );
}
