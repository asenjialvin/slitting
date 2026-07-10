
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['machine','coil_spec','slit_spec','product','combination','combination_machine','combination_line','coil_slit_map','slit_product_map'])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t);
    EXECUTE format('DROP POLICY IF EXISTS "phase1 anon write %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "phase1 anon write %I" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
