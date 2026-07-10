
SELECT setval('public.coil_spec_spec_id_seq', (SELECT MAX(spec_id) FROM public.coil_spec));
SELECT setval('public.slit_spec_spec_id_seq', (SELECT MAX(spec_id) FROM public.slit_spec));
SELECT setval('public.product_product_id_seq', (SELECT MAX(product_id) FROM public.product));
SELECT setval('public.machine_machine_id_seq', (SELECT MAX(machine_id) FROM public.machine));
SELECT setval('public.combination_combination_id_seq', (SELECT MAX(combination_id) FROM public.combination));
SELECT setval('public.combination_line_line_id_seq', (SELECT MAX(line_id) FROM public.combination_line));
