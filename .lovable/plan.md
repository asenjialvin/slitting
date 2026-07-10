# Steel Coil Slitting Planner — Phased Build Plan

Decisions locked in:

- **Duplicates**: allowed; on save, compute canonical signature (coil_spec + machine + sorted [slit_spec, product, count] lines). If match exists → toast "Combination already exists", bump `frequency`, update `last_used_at`. No new row.
- **RBAC**: Viewer → Planner → Editor → Manager → Admin (cumulative).
- **Traceability**: every `plan_line` FK's a physical `coil` row (coil number / GRN). Inline "create coil" available in the picker.

## Phase 1 — Data foundation (schema only, no UI)

New / altered tables:

- `coil` (physical inventory): `coil_id`, `coil_number` (unique), `grn_number`, `coil_spec_id` FK, `weight_kg`, `received_at`, `status` enum(`available`,`reserved`,`consumed`,`scrapped`), `supplier`, `heat_no`, `notes`, timestamps.
- `combination`: add `signature` (text, unique, hash of canonical form), `scrap_mm` (generated / stored), `last_used_at`, `created_by`, `source` (`imported`/`manual`).
- `plan`: `plan_id`, `plan_number`, `machine_id`, `status` enum(`draft`,`released`,`in_progress`,`done`,`cancelled`), `planned_for` date, `created_by`, timestamps.
- `plan_line`: `plan_line_id`, `plan_id` FK, `sequence`, `combination_id` FK, `coil_id` FK **NOT NULL** (forced traceability), `expected_output_kg`, `actual_output_kg`, `status`.
- `app_role` enum(`viewer`,`planner`,`editor`,`manager`,`admin`); `user_roles` table (per user-roles guidance, separate table, `has_role()` SECURITY DEFINER).
- `audit_log`: `id`, `user_id`, `action`, `entity`, `entity_id`, `diff` jsonb, `created_at`.

Triggers/functions:

- `combination_signature()` trigger to compute signature on insert/update.
- `bump_combination(sig, ...)` RPC used by Phase 2 save flow.
- `update_updated_at_column` on all mutable tables.
- Generic `log_audit()` trigger attached to master + plan tables.

RLS + GRANTs added in same migration for every new public table; policies stub to `authenticated` for now (real role gating turned on in Phase 4).

## Phase 2 — Masters + combination library

- CRUD polish for `product`, `slit_spec`, `coil_spec` (already partial).
- Combination editor: build lines, live formula preview, live scrap. On **Save**:
  1. Compute canonical signature client-side (also enforced server-side).
  2. Call `upsert_combination` RPC → returns `{combination_id, was_duplicate}`.
  3. If duplicate → toast warning "Already exists — usage count updated", navigate to existing card.
- Combinations library: show `frequency`, `last_used_at`, `scrap_mm`, provenance badge.

## Phase 3 — Batch planning + XLSX export

- `/plans` list + `/plans/$id` editor.
- Plan editor: pick machine + date → add plan lines. Each line requires:
  - Pick combination (filtered by machine + coil_spec).
  - Pick physical coil via searchable picker (filter by `coil_spec_id`, `status=available`). Picker has "＋ New coil" inline form (coil_number, GRN, weight, supplier) → creates `coil` row, immediately selects it.
- Reserve coil on line save (`status=reserved`); release on delete.
- XLSX export per plan: cover sheet (plan meta) + one sheet per line (coil info, combination formula, slit breakdown, scrap). Uses `xlsx` skill conventions (formulas, not hardcoded totals).

## Phase 4 — Auth, RBAC, audit, dashboard

- Turn on Supabase auth (email + Google). Add `_authenticated` gate (integration-managed).
- Seed role assignment UI (admin only). `has_role(auth.uid(), 'x')` in every policy per matrix:
  - viewer: SELECT all business tables.
  - planner: + INSERT/UPDATE on `plan`, `plan_line`, `coil` (own drafts).
  - editor: + full write on `product`, `slit_spec`, `coil_spec`, `combination`.
  - manager: + SELECT on `audit_log`, override plan status.
  - admin: + write on `user_roles`.
- Audit log viewer (`/audit`, manager+).
- Dashboard `/`: KPIs (available coils, active plans, scrap % trend, top combinations), replaces current planner-first index (planner moves to `/planner`).

## Phase 5 — Styling pass (Tnk Calculator)

- Blocked on screenshots / tokens from you. Once provided: update `src/styles.css` design tokens (palette, radii, density), tighten component spacing, restyle cards/tables/inputs to match. No structural changes.

## Open questions before Phase 1

1. **Coil identity**: is `coil_number` globally unique, or unique per supplier/GRN? (Affects unique index.)
2. **Reserve semantics**: should reserving a coil on a draft plan already lock it from other planners, or only on plan release?
3. **Signature scope**: does machine belong in the signature (same slit layout on GMT vs 25T = different combinations), or should it be coil+lines only with machine tracked via `combination_machine`? Current schema suggests the latter — please confirm.
4. **Auth providers for Phase 4**: email+Google okay as default, or email-only?
