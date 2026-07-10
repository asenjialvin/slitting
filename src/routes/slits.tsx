import { createFileRoute } from "@tanstack/react-router";
import { SpecCrud } from "@/components/spec-crud";

export const Route = createFileRoute("/slits")({
  head: () => ({ meta: [{ title: "Slits — Slitting Planner" }] }),
  component: () => <SpecCrud title="Slits" table="slit_spec" />,
});
