
DROP TRIGGER IF EXISTS plan_line_reserve_coil_trg ON public.plan_line;
DROP FUNCTION IF EXISTS public.plan_line_reserve_coil();
DROP TRIGGER IF EXISTS audit_coil ON public.coil;

ALTER TABLE public.plan_line DROP COLUMN IF EXISTS coil_id;
ALTER TABLE public.plan_line ADD COLUMN coil_spec_id INTEGER NOT NULL REFERENCES public.coil_spec(spec_id) ON DELETE RESTRICT;
ALTER TABLE public.plan_line ADD COLUMN no_of_coils INTEGER NOT NULL CHECK (no_of_coils > 0);
CREATE INDEX IF NOT EXISTS plan_line_coil_spec_idx ON public.plan_line(coil_spec_id);

DROP TABLE IF EXISTS public.coil;
DROP TYPE IF EXISTS public.coil_status;
