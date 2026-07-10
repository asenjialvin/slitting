import { createFileRoute } from "@tanstack/react-router";
import { SpecCrud } from "@/components/spec-crud";

export const Route = createFileRoute("/coils")({
  head: () => ({ meta: [{ title: "Coils — Slitting Planner" }] }),
  component: () => <SpecCrud title="Coils" table="coil_spec" />,
});
