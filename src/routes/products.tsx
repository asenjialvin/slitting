import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — Slitting Planner" }] }),
  component: ProductsPage,
});

type Row = { product_id: number; label: string };

function normalizeHoop(label: string) {
  const upper = label.trim().toUpperCase();
  if (upper === "HPS" || upper === "HOOPS" || upper === "HOOP(S)" || upper === "HOOP")
    return "HOOP(S)";
  return label.trim();
}

function ProductsPage() {
  const qc = useQueryClient();
  const rows = useQuery({
    queryKey: ["product"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product")
        .select("product_id, label")
        .order("label");
      if (error) throw error;
      return data as Row[];
    },
  });
  const [label, setLabel] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [eLabel, setELabel] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const val = normalizeHoop(label);
      if (!val) throw new Error("Label required");
      const { error } = await supabase.from("product").insert({ label: val });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      toast.success("Product added");
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async (id: number) => {
      const val = normalizeHoop(eLabel);
      if (!val) throw new Error("Label required");
      const { error } = await supabase.from("product").update({ label: val }).eq("product_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("product").delete().eq("product_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("violates foreign key")
          ? "In use by a combination — remove those first."
          : e.message,
      ),
  });

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight">Products</h1>
        <div className="text-xs text-muted-foreground">{rows.data?.length ?? 0} records</div>
      </div>
      <div className="flex items-end gap-2 rounded-md border bg-card p-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Label (HOOP variants auto-normalize to HOOP(S))
          </label>
          <Input
            className="h-8 text-xs"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. HR, CR, HOOP(S)…"
          />
        </div>
        <Button
          size="sm"
          className="h-8 gap-1"
          onClick={() => add.mutate()}
          disabled={add.isPending}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Label</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((r) => (
              <tr key={r.product_id} className="border-t">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.product_id}</td>
                {editId === r.product_id ? (
                  <>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-7 text-xs"
                        value={eLabel}
                        onChange={(e) => setELabel(e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => update.mutate(r.product_id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-1.5 font-medium">{r.label}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditId(r.product_id);
                          setELabel(r.label);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => del.mutate(r.product_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
