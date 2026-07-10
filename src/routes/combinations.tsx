import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllCombinations, fetchCoils, fetchProducts, fetchSlits } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { CombinationCard } from "@/components/combination-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { CombinationDetail } from "@/lib/types";

export const Route = createFileRoute("/combinations")({
  head: () => ({ meta: [{ title: "Combinations — Slitting Planner" }] }),
  component: Combinations,
});

type DraftLine = { slitSpecId: number | null; productId: number | null; count: number };
type DraftState = { coilSpecId: number | null; lines: DraftLine[] };

function emptyLine(): DraftLine {
  return { slitSpecId: null, productId: null, count: 1 };
}

function buildLinePayload(lines: DraftLine[]) {
  return lines
    .filter((line) => line.slitSpecId != null && line.productId != null)
    .map((line, index) => ({
      sequence: index + 1,
      slit_spec_id: line.slitSpecId,
      product_id: line.productId,
      slit_count: line.count,
    }));
}

function buildDraftFromCombo(combo: CombinationDetail): DraftState {
  return {
    coilSpecId: combo.coil.spec_id,
    lines: combo.lines.map((line) => ({
      slitSpecId: line.slit.spec_id,
      productId: line.product_id,
      count: line.slit_count,
    })),
  };
}

function Combinations() {
  const qc = useQueryClient();
  const [machine, setMachine] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState>({ coilSpecId: null, lines: [emptyLine()] });

  const combos = useQuery({
    queryKey: ["all-combos", machine || null],
    queryFn: () => fetchAllCombinations(machine || null),
  });
  const coils = useQuery({ queryKey: ["coils"], queryFn: fetchCoils });
  const slits = useQuery({ queryKey: ["slits"], queryFn: fetchSlits });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("combination").delete().eq("combination_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["all-combos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsert = useMutation({
    mutationFn: async (payload: { comboId: number | null; draft: DraftState }) => {
      const coil = coils.data?.find((item) => item.spec_id === payload.draft.coilSpecId);
      if (!coil) throw new Error("Choose a coil size first");
      const lines = buildLinePayload(payload.draft.lines);
      if (lines.length === 0) throw new Error("Add at least one slit line");
      const total = lines.reduce((sum, line) => {
        const slit = slits.data?.find((item) => item.spec_id === line.slit_spec_id);
        return sum + (slit?.width_mm ?? 0) * line.slit_count;
      }, 0);
      const scrap = coil.width_mm - total;

      if (payload.comboId != null) {
        const { error: updateError } = await supabase
          .from("combination")
          .update({
            coil_spec_id: coil.spec_id,
            total_slit_width_mm: total,
            scrap_mm: scrap,
            source: "curated",
          })
          .eq("combination_id", payload.comboId);
        if (updateError) throw updateError;
        const { error: lineDeleteError } = await supabase
          .from("combination_line")
          .delete()
          .eq("combination_id", payload.comboId);
        if (lineDeleteError) throw lineDeleteError;
        const { error: lineInsertError } = await supabase.from("combination_line").insert(
          lines.map((line) => ({
            combination_id: payload.comboId,
            sequence: line.sequence,
            slit_spec_id: line.slit_spec_id,
            product_id: line.product_id,
            slit_count: line.slit_count,
          })),
        );
        if (lineInsertError) throw lineInsertError;
        return { comboId: payload.comboId, duplicate: false };
      }

      const { data: comboData, error: comboError } = await supabase
        .from("combination")
        .insert({
          coil_spec_id: coil.spec_id,
          total_slit_width_mm: total,
          scrap_mm: scrap,
          source: "curated",
        })
        .select("combination_id")
        .single();
      if (comboError) throw comboError;
      const { error: lineInsertError } = await supabase.from("combination_line").insert(
        lines.map((line) => ({
          combination_id: comboData.combination_id,
          sequence: line.sequence,
          slit_spec_id: line.slit_spec_id,
          product_id: line.product_id,
          slit_count: line.slit_count,
        })),
      );
      if (lineInsertError) throw lineInsertError;
      return { comboId: comboData.combination_id, duplicate: false };
    },
    onSuccess: () => {
      toast.success("Combination saved");
      qc.invalidateQueries({ queryKey: ["all-combos"] });
      setDialogOpen(false);
      setEditingId(null);
      setDraft({ coilSpecId: null, lines: [emptyLine()] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setDraft({ coilSpecId: null, lines: [emptyLine()] });
    setDialogOpen(true);
  };

  const openEdit = (combo: CombinationDetail) => {
    setEditingId(combo.combination_id);
    setDraft(buildDraftFromCombo(combo));
    setDialogOpen(true);
  };

  const s = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return (combos.data ?? []).filter((c) => {
      if (!s) return true;
      if (`${c.coil.thickness_mm}×${c.coil.width_mm}`.includes(s)) return true;
      if (c.lines.some((line) => line.product.toLowerCase().includes(s))) return true;
      return false;
    });
  }, [combos.data, s]);

  const selectedCoil = coils.data?.find((item) => item.spec_id === draft.coilSpecId) ?? null;
  const total = useMemo(() => {
    return draft.lines.reduce((sum, line) => {
      if (line.slitSpecId == null) return sum;
      const slit = slits.data?.find((item) => item.spec_id === line.slitSpecId);
      return sum + (slit?.width_mm ?? 0) * line.count;
    }, 0);
  }, [draft.lines, slits.data]);
  const scrap = selectedCoil ? selectedCoil.width_mm - total : null;

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Combinations library</h1>
          <p className="text-xs text-muted-foreground">
            Create curated combinations, edit existing rows, and keep usage counts up to date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New combination
          </Button>
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {combos.data?.length ?? 0}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-card p-2">
        <div className="flex gap-1">
          {[
            { code: "", label: "All" },
            { code: "GMT", label: "GMT" },
            { code: "25T", label: "25T" },
          ].map((m) => (
            <Button
              key={m.label}
              size="sm"
              variant={machine === m.code ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setMachine(m.code)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <Input
          className="h-8 max-w-xs text-xs"
          placeholder="Search by coil size or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {combos.isLoading ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CombinationCard
              key={c.combination_id}
              combo={c}
              right={
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => {
                      if (confirm(`Delete combination #${c.combination_id}?`))
                        del.mutate(c.combination_id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingId ? "Edit combination" : "Create combination"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Coil size
                </Label>
                <Select
                  value={draft.coilSpecId?.toString() ?? ""}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, coilSpecId: Number(value) }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose coil" />
                  </SelectTrigger>
                  <SelectContent>
                    {coils.data?.map((coil) => (
                      <SelectItem key={coil.spec_id} value={coil.spec_id.toString()}>
                        {coil.thickness_mm} × {coil.width_mm} mm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                {selectedCoil ? (
                  <>
                    <div className="font-medium text-foreground">Preview</div>
                    <div>Total slit width: {total.toFixed(1)} mm</div>
                    <div>Estimated scrap: {scrap?.toFixed(1) ?? "—"} mm</div>
                  </>
                ) : (
                  "Choose a coil size to preview the line totals."
                )}
              </div>
            </div>
            <div className="space-y-2">
              {draft.lines.map((line, index) => (
                <div
                  key={`${line.slitSpecId ?? "empty"}-${index}`}
                  className="grid gap-2 rounded-md border p-3 md:grid-cols-[1.2fr_1fr_0.6fr_auto]"
                >
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Slit size
                    </Label>
                    <Select
                      value={line.slitSpecId?.toString() ?? ""}
                      onValueChange={(value) =>
                        setDraft((current) => {
                          const next = [...current.lines];
                          next[index] = { ...next[index], slitSpecId: Number(value) };
                          return { ...current, lines: next };
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose slit" />
                      </SelectTrigger>
                      <SelectContent>
                        {slits.data?.map((slit) => (
                          <SelectItem key={slit.spec_id} value={slit.spec_id.toString()}>
                            {slit.thickness_mm} × {slit.width_mm} mm
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Product
                    </Label>
                    <Select
                      value={line.productId?.toString() ?? ""}
                      onValueChange={(value) =>
                        setDraft((current) => {
                          const next = [...current.lines];
                          next[index] = { ...next[index], productId: Number(value) };
                          return { ...current, lines: next };
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.data?.map((product) => (
                          <SelectItem
                            key={product.product_id}
                            value={product.product_id.toString()}
                          >
                            {product.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Count
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      min="1"
                      value={line.count}
                      onChange={(event) =>
                        setDraft((current) => {
                          const next = [...current.lines];
                          next[index] = {
                            ...next[index],
                            count: Math.max(1, Number(event.target.value) || 1),
                          };
                          return { ...current, lines: next };
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 self-end"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        lines: current.lines.filter((_, currentIndex) => currentIndex !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  setDraft((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add line
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={upsert.isPending}
              onClick={() => upsert.mutate({ comboId: editingId, draft })}
            >
              Save combination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
