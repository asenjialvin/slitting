
-- MACHINE
CREATE TABLE public.machine (
  machine_id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  max_thickness_mm REAL,
  observed_min_thickness_mm REAL,
  observed_max_thickness_mm REAL
);
GRANT SELECT ON public.machine TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine TO authenticated;
GRANT ALL ON public.machine TO service_role;
ALTER TABLE public.machine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read machine" ON public.machine FOR SELECT USING (true);
CREATE POLICY "auth write machine" ON public.machine FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COIL_SPEC
CREATE TABLE public.coil_spec (
  spec_id SERIAL PRIMARY KEY,
  thickness_mm REAL NOT NULL,
  width_mm REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  UNIQUE (thickness_mm, width_mm)
);
GRANT SELECT ON public.coil_spec TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coil_spec TO authenticated;
GRANT ALL ON public.coil_spec TO service_role;
ALTER TABLE public.coil_spec ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read coil_spec" ON public.coil_spec FOR SELECT USING (true);
CREATE POLICY "auth write coil_spec" ON public.coil_spec FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SLIT_SPEC
CREATE TABLE public.slit_spec (
  spec_id SERIAL PRIMARY KEY,
  thickness_mm REAL NOT NULL,
  width_mm REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  UNIQUE (thickness_mm, width_mm)
);
GRANT SELECT ON public.slit_spec TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slit_spec TO authenticated;
GRANT ALL ON public.slit_spec TO service_role;
ALTER TABLE public.slit_spec ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read slit_spec" ON public.slit_spec FOR SELECT USING (true);
CREATE POLICY "auth write slit_spec" ON public.slit_spec FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRODUCT
CREATE TABLE public.product (
  product_id SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
);
GRANT SELECT ON public.product TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product TO authenticated;
GRANT ALL ON public.product TO service_role;
ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read product" ON public.product FOR SELECT USING (true);
CREATE POLICY "auth write product" ON public.product FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMBINATION (physical arrangement, machine-agnostic)
CREATE TABLE public.combination (
  combination_id SERIAL PRIMARY KEY,
  coil_spec_id INTEGER NOT NULL REFERENCES public.coil_spec(spec_id) ON DELETE RESTRICT,
  total_slit_width_mm REAL,
  no_of_coils_typical INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX combination_coil_idx ON public.combination(coil_spec_id);
GRANT SELECT ON public.combination TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combination TO authenticated;
GRANT ALL ON public.combination TO service_role;
ALTER TABLE public.combination ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read combination" ON public.combination FOR SELECT USING (true);
CREATE POLICY "auth write combination" ON public.combination FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMBINATION_MACHINE (many-to-many between combination and machine)
CREATE TABLE public.combination_machine (
  combination_id INTEGER NOT NULL REFERENCES public.combination(combination_id) ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES public.machine(machine_id) ON DELETE RESTRICT,
  frequency INTEGER NOT NULL DEFAULT 0,
  first_seen_file TEXT,
  first_seen_sheet TEXT,
  PRIMARY KEY (combination_id, machine_id)
);
GRANT SELECT ON public.combination_machine TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combination_machine TO authenticated;
GRANT ALL ON public.combination_machine TO service_role;
ALTER TABLE public.combination_machine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read combination_machine" ON public.combination_machine FOR SELECT USING (true);
CREATE POLICY "auth write combination_machine" ON public.combination_machine FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COMBINATION_LINE
CREATE TABLE public.combination_line (
  line_id SERIAL PRIMARY KEY,
  combination_id INTEGER NOT NULL REFERENCES public.combination(combination_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  slit_spec_id INTEGER NOT NULL REFERENCES public.slit_spec(spec_id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES public.product(product_id) ON DELETE RESTRICT,
  slit_count INTEGER NOT NULL CHECK (slit_count > 0),
  UNIQUE (combination_id, sequence)
);
CREATE INDEX combination_line_combo_idx ON public.combination_line(combination_id);
CREATE INDEX combination_line_slit_idx ON public.combination_line(slit_spec_id);
CREATE INDEX combination_line_product_idx ON public.combination_line(product_id);
GRANT SELECT ON public.combination_line TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combination_line TO authenticated;
GRANT ALL ON public.combination_line TO service_role;
ALTER TABLE public.combination_line ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read combination_line" ON public.combination_line FOR SELECT USING (true);
CREATE POLICY "auth write combination_line" ON public.combination_line FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COIL_SLIT_MAP (observed pairings)
CREATE TABLE public.coil_slit_map (
  coil_spec_id INTEGER NOT NULL REFERENCES public.coil_spec(spec_id) ON DELETE CASCADE,
  slit_spec_id INTEGER NOT NULL REFERENCES public.slit_spec(spec_id) ON DELETE CASCADE,
  observed_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (coil_spec_id, slit_spec_id)
);
GRANT SELECT ON public.coil_slit_map TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coil_slit_map TO authenticated;
GRANT ALL ON public.coil_slit_map TO service_role;
ALTER TABLE public.coil_slit_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read coil_slit_map" ON public.coil_slit_map FOR SELECT USING (true);
CREATE POLICY "auth write coil_slit_map" ON public.coil_slit_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SLIT_PRODUCT_MAP (observed pairings)
CREATE TABLE public.slit_product_map (
  slit_spec_id INTEGER NOT NULL REFERENCES public.slit_spec(spec_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.product(product_id) ON DELETE CASCADE,
  observed_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slit_spec_id, product_id)
);
GRANT SELECT ON public.slit_product_map TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slit_product_map TO authenticated;
GRANT ALL ON public.slit_product_map TO service_role;
ALTER TABLE public.slit_product_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read slit_product_map" ON public.slit_product_map FOR SELECT USING (true);
CREATE POLICY "auth write slit_product_map" ON public.slit_product_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger for combination
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_combination_updated_at BEFORE UPDATE ON public.combination
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
