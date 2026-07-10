
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('viewer','planner','editor','manager','admin');
CREATE TYPE public.coil_status AS ENUM ('available','reserved','consumed','scrapped');
CREATE TYPE public.plan_status AS ENUM ('draft','released','in_progress','done','cancelled');
CREATE TYPE public.plan_line_status AS ENUM ('pending','in_progress','done','cancelled');
CREATE TYPE public.combination_source AS ENUM ('imported','manual');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.coil (
  coil_id BIGSERIAL PRIMARY KEY,
  coil_number TEXT NOT NULL UNIQUE,
  grn_number TEXT,
  coil_spec_id INTEGER NOT NULL REFERENCES public.coil_spec(spec_id) ON DELETE RESTRICT,
  weight_kg NUMERIC(10,2),
  received_at DATE,
  supplier TEXT,
  heat_no TEXT,
  status public.coil_status NOT NULL DEFAULT 'available',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coil TO authenticated;
GRANT ALL ON public.coil TO service_role;
ALTER TABLE public.coil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coil all authenticated" ON public.coil FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX coil_spec_idx ON public.coil(coil_spec_id);
CREATE INDEX coil_status_idx ON public.coil(status);
CREATE TRIGGER coil_updated_at BEFORE UPDATE ON public.coil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.combination
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS scrap_mm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source public.combination_source NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.compute_combination_signature(_combination_id BIGINT)
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT encode(digest(
    (SELECT coil_spec_id::text FROM public.combination WHERE combination_id = _combination_id)
    || '|' || COALESCE((
      SELECT string_agg(slit_spec_id || ':' || product_id || 'x' || slit_count, ',' ORDER BY slit_spec_id, product_id, slit_count)
      FROM public.combination_line WHERE combination_id = _combination_id
    ), '')
  , 'sha256'), 'hex')
$$;

UPDATE public.combination SET signature = public.compute_combination_signature(combination_id)
  WHERE signature IS NULL;

WITH ranked AS (
  SELECT combination_id, signature AS sig,
    ROW_NUMBER() OVER (PARTITION BY signature ORDER BY combination_id) AS rn
  FROM public.combination WHERE signature IS NOT NULL
)
UPDATE public.combination c SET signature = c.signature || '-legacy-' || c.combination_id
FROM ranked r WHERE c.combination_id = r.combination_id AND r.rn > 1;

CREATE UNIQUE INDEX combination_signature_uidx ON public.combination(signature);

UPDATE public.combination c
SET scrap_mm = cs.width_mm - c.total_slit_width_mm
FROM public.coil_spec cs
WHERE c.coil_spec_id = cs.spec_id AND c.scrap_mm IS NULL AND c.total_slit_width_mm IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.combination_machine'::regclass
      AND conname = 'combination_machine_uk'
  ) THEN
    ALTER TABLE public.combination_machine ADD CONSTRAINT combination_machine_uk UNIQUE (combination_id, machine_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_combination(
  _coil_spec_id INTEGER,
  _lines JSONB,
  _machine_id INTEGER,
  _total_slit_width_mm NUMERIC DEFAULT NULL,
  _scrap_mm NUMERIC DEFAULT NULL,
  _no_of_coils_typical INTEGER DEFAULT NULL
) RETURNS TABLE(combination_id BIGINT, was_duplicate BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _sig TEXT; _cid BIGINT; _existing BIGINT; _line JSONB;
BEGIN
  SELECT encode(digest(
    _coil_spec_id::text || '|' || COALESCE((
      SELECT string_agg(
        (l->>'slit_spec_id') || ':' || (l->>'product_id') || 'x' || (l->>'slit_count'),
        ',' ORDER BY (l->>'slit_spec_id')::int, (l->>'product_id')::int, (l->>'slit_count')::int
      )
      FROM jsonb_array_elements(_lines) l
    ), '')
  , 'sha256'), 'hex') INTO _sig;

  SELECT c.combination_id INTO _existing FROM public.combination c WHERE c.signature = _sig;

  IF _existing IS NOT NULL THEN
    UPDATE public.combination SET last_used_at = now(), updated_at = now()
      WHERE combination.combination_id = _existing;
    IF _machine_id IS NOT NULL THEN
      INSERT INTO public.combination_machine(combination_id, machine_id, frequency)
        VALUES (_existing, _machine_id, 1)
        ON CONFLICT (combination_id, machine_id)
          DO UPDATE SET frequency = public.combination_machine.frequency + 1;
    END IF;
    RETURN QUERY SELECT _existing, TRUE;
    RETURN;
  END IF;

  INSERT INTO public.combination(coil_spec_id, total_slit_width_mm, no_of_coils_typical, signature, scrap_mm, source, created_by, last_used_at)
    VALUES (_coil_spec_id, _total_slit_width_mm, _no_of_coils_typical, _sig, _scrap_mm, 'manual', auth.uid(), now())
    RETURNING combination.combination_id INTO _cid;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    INSERT INTO public.combination_line(combination_id, sequence, slit_spec_id, product_id, slit_count)
      VALUES (_cid, (_line->>'sequence')::int, (_line->>'slit_spec_id')::int,
              (_line->>'product_id')::int, (_line->>'slit_count')::int);
  END LOOP;

  IF _machine_id IS NOT NULL THEN
    INSERT INTO public.combination_machine(combination_id, machine_id, frequency)
      VALUES (_cid, _machine_id, 1);
  END IF;

  RETURN QUERY SELECT _cid, FALSE;
END; $$;

CREATE TABLE public.plan (
  plan_id BIGSERIAL PRIMARY KEY,
  plan_number TEXT NOT NULL UNIQUE,
  machine_id INTEGER NOT NULL REFERENCES public.machine(machine_id) ON DELETE RESTRICT,
  planned_for DATE,
  status public.plan_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan TO authenticated;
GRANT ALL ON public.plan TO service_role;
ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan all authenticated" ON public.plan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER plan_updated_at BEFORE UPDATE ON public.plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_line (
  plan_line_id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES public.plan(plan_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  combination_id BIGINT NOT NULL REFERENCES public.combination(combination_id) ON DELETE RESTRICT,
  coil_id BIGINT NOT NULL REFERENCES public.coil(coil_id) ON DELETE RESTRICT,
  expected_output_kg NUMERIC(10,2),
  actual_output_kg NUMERIC(10,2),
  status public.plan_line_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, sequence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_line TO authenticated;
GRANT ALL ON public.plan_line TO service_role;
ALTER TABLE public.plan_line ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_line all authenticated" ON public.plan_line FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX plan_line_plan_idx ON public.plan_line(plan_id);
CREATE INDEX plan_line_coil_idx ON public.plan_line(coil_id);
CREATE TRIGGER plan_line_updated_at BEFORE UPDATE ON public.plan_line
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.plan_line_reserve_coil()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.coil SET status = 'reserved' WHERE coil_id = NEW.coil_id AND status = 'available';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.coil SET status = 'available' WHERE coil_id = OLD.coil_id AND status = 'reserved';
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER plan_line_reserve_coil_trg AFTER INSERT OR DELETE ON public.plan_line
  FOR EACH ROW EXECUTE FUNCTION public.plan_line_reserve_coil();

CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read authenticated" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit insert authenticated" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX audit_entity_idx ON public.audit_log(entity, entity_id);
CREATE INDEX audit_created_idx ON public.audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pk TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _pk := (to_jsonb(OLD)->>(TG_ARGV[0]));
    INSERT INTO public.audit_log(user_id, action, entity, entity_id, diff)
      VALUES (auth.uid(), 'delete', TG_TABLE_NAME, _pk, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _pk := (to_jsonb(NEW)->>(TG_ARGV[0]));
    INSERT INTO public.audit_log(user_id, action, entity, entity_id, diff)
      VALUES (auth.uid(), 'update', TG_TABLE_NAME, _pk,
        jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    RETURN NEW;
  ELSE
    _pk := (to_jsonb(NEW)->>(TG_ARGV[0]));
    INSERT INTO public.audit_log(user_id, action, entity, entity_id, diff)
      VALUES (auth.uid(), 'insert', TG_TABLE_NAME, _pk, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END; $$;

CREATE TRIGGER audit_product AFTER INSERT OR UPDATE OR DELETE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('product_id');
CREATE TRIGGER audit_coil_spec AFTER INSERT OR UPDATE OR DELETE ON public.coil_spec
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('spec_id');
CREATE TRIGGER audit_slit_spec AFTER INSERT OR UPDATE OR DELETE ON public.slit_spec
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('spec_id');
CREATE TRIGGER audit_coil AFTER INSERT OR UPDATE OR DELETE ON public.coil
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('coil_id');
CREATE TRIGGER audit_combination AFTER INSERT OR UPDATE OR DELETE ON public.combination
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('combination_id');
CREATE TRIGGER audit_plan AFTER INSERT OR UPDATE OR DELETE ON public.plan
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('plan_id');
CREATE TRIGGER audit_plan_line AFTER INSERT OR UPDATE OR DELETE ON public.plan_line
  FOR EACH ROW EXECUTE FUNCTION public.log_audit('plan_line_id');
