import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { fmtThickness } from "@/lib/formula";

type Row = { spec_id: number; thickness_mm: number; width_mm: number; source: string };

export function SpecCrud({ title, table }: { title: string; table: "coil_spec" | "slit_spec" }) {
  const qc = useQueryClient();
  const key = [table];
  const rows = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("spec_id, thickness_mm, width_mm, source")
        .order("thickness_mm")
        .order("width_mm");
      if (error) throw error;
      return data as Row[];
    },
  });

  const [t, setT] = useState("");
  const [w, setW] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [eT, setET] = useState("");
  const [eW, setEW] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const thickness = parseFloat(t);
      const width = parseFloat(w);
      if (!(thickness > 0) || !(width > 0)) throw new Error("Enter positive numbers");
      const { error } = await supabase
        .from(table)
        .insert({ thickness_mm: thickness, width_mm: width, source: "manual" });
      if (error) throw error;
    },
    onSuccess: () => {
      setT("");
      setW("");
      toast.success(`${title} added`);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (id: number) => {
      const thickness = parseFloat(eT);
      const width = parseFloat(eW);
      if (!(thickness > 0) || !(width > 0)) throw new Error("Enter positive numbers");
      const { error } = await supabase
        .from(table)
        .update({ thickness_mm: thickness, width_mm: width })
        .eq("spec_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      // Guard: block delete if referenced by any combination.
      if (table === "coil_spec") {
        const { count, error: cErr } = await supabase
          .from("combination")
          .select("combination_id", { count: "exact", head: true })
          .eq("coil_spec_id", id);
        if (cErr) throw cErr;
        if ((count ?? 0) > 0)
          throw new Error(
            `Blocked — used by ${count} combination${count === 1 ? "" : "s"}. Remove or reassign those first.`,
          );
      } else {
        const { count, error: cErr } = await supabase
          .from("combination_line")
          .select("combination_id", { count: "exact", head: true })
          .eq("slit_spec_id", id);
        if (cErr) throw cErr;
        if ((count ?? 0) > 0)
          throw new Error(
            `Blocked — used in ${count} combination line${count === 1 ? "" : "s"}. Remove those first.`,
          );
      }
      const { error } = await supabase.from(table).delete().eq("spec_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message, { duration: 6000 }),
  });

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        <div className="text-xs text-muted-foreground">{rows.data?.length ?? 0} records</div>
      </div>

      <div className="flex items-end gap-2 rounded-md border bg-card p-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Thickness (mm)
          </label>
          <Input
            className="h-8 w-24 text-xs"
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder="1.5"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
            Width (mm)
          </label>
          <Input
            className="h-8 w-24 text-xs"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder="1220"
            inputMode="decimal"
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
              <th className="px-3 py-2 text-left font-medium">Thickness</th>
              <th className="px-3 py-2 text-left font-medium">Width</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((r) => (
              <tr key={r.spec_id} className="border-t">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.spec_id}</td>
                {editId === r.spec_id ? (
                  <>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-7 w-20 text-xs"
                        value={eT}
                        onChange={(e) => setET(e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        className="h-7 w-24 text-xs"
                        value={eW}
                        onChange={(e) => setEW(e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.source}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => update.mutate(r.spec_id)}
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
                    <td className="px-3 py-1.5 font-mono tabular-nums">
                      {fmtThickness(r.thickness_mm)}
                    </td>
                    <td className="px-3 py-1.5 font-mono tabular-nums">{r.width_mm}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.source}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditId(r.spec_id);
                          setET(r.thickness_mm.toString());
                          setEW(r.width_mm.toString());
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => del.mutate(r.spec_id)}
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
