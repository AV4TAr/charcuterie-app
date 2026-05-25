-- Seed curated chorizo & sausage recipes from traditional sources.
-- Creates a "curator" auth user (id frozen) and publishes a handful of
-- classic public recipes under that account. Idempotent: re-running is safe.

-- ---------------------------------------------------------------------------
-- 1. Curator auth user
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'curator@chorizo.lab',
  crypt('chorizo-curator-disabled', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"chorizolab","display_name":"Chorizo Lab"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

-- ensure profile exists (trigger usually handles it, but seed safety)
insert into public.profiles (id, username, display_name, bio)
values (
  '00000000-0000-0000-0000-000000000c01',
  'chorizolab',
  'Chorizo Lab',
  'Recetas tradicionales curadas para arrancar.'
)
on conflict (id) do update set
  display_name = excluded.display_name,
  bio = excluded.bio;

-- ---------------------------------------------------------------------------
-- 2. Helper: insert one recipe + version + ingredients
-- ---------------------------------------------------------------------------
create or replace function pg_temp.seed_recipe(
  p_slug text,
  p_title text,
  p_description text,
  p_meat_grams numeric,
  p_meat_unit text,
  p_instructions text,
  p_ingredients jsonb  -- array of {name, mode, percent_of_meat, amount_canonical, display_unit, sort_order}
) returns void language plpgsql as $$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000000c01';
  v_recipe_id uuid;
  v_version_id uuid;
  v_ing jsonb;
  v_ingredient_id uuid;
begin
  -- recipe
  insert into public.recipes (owner_id, slug, title, description, visibility)
  values (v_owner, p_slug, p_title, p_description, 'public')
  on conflict (owner_id, slug) do update set title = excluded.title
  returning id into v_recipe_id;

  if v_recipe_id is null then
    select id into v_recipe_id from public.recipes where owner_id = v_owner and slug = p_slug;
  end if;

  -- clear any existing version (re-seed cleanly)
  delete from public.recipe_versions where recipe_id = v_recipe_id;

  insert into public.recipe_versions (
    recipe_id, version_number, change_note, instructions,
    meat_base_weight_grams, meat_base_display_unit, created_by
  ) values (
    v_recipe_id, 1, 'Receta inicial curada', p_instructions,
    p_meat_grams, p_meat_unit::mass_unit, v_owner
  )
  returning id into v_version_id;

  update public.recipes set current_version_id = v_version_id where id = v_recipe_id;

  -- ingredients
  for v_ing in select * from jsonb_array_elements(p_ingredients) loop
    select id into v_ingredient_id from public.ingredients
      where name = (v_ing ->> 'name');
    if v_ingredient_id is null then
      raise notice 'Ingredient % not found, skipping', v_ing ->> 'name';
      continue;
    end if;

    insert into public.recipe_version_ingredients (
      version_id, ingredient_id, mode,
      percent_of_meat, amount_canonical,
      display_unit, sort_order
    ) values (
      v_version_id, v_ingredient_id, (v_ing ->> 'mode')::ingredient_mode,
      case when v_ing ? 'percent_of_meat' and v_ing->>'percent_of_meat' is not null
           then (v_ing ->> 'percent_of_meat')::numeric else null end,
      case when v_ing ? 'amount_canonical' and v_ing->>'amount_canonical' is not null
           then (v_ing ->> 'amount_canonical')::numeric else null end,
      (v_ing ->> 'display_unit')::display_unit,
      (v_ing ->> 'sort_order')::integer
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The recipes (5 classic traditions)
-- ---------------------------------------------------------------------------

-- A) Chorizo Criollo Argentino (fresco, para parrilla)
select pg_temp.seed_recipe(
  'chorizo-criollo-argentino',
  'Chorizo criollo argentino',
  'El clásico de parrilla: jugoso, magro-grasoso, con pimentón dulce y vino blanco. Ideal para asar a fuego directo.',
  1000, 'kg',
  'Picar carne y tocino por separado a placa de 6–8 mm. Mezclar con sal y especias previamente disueltas en el vino. Reposar en heladera 12 h. Embutir en tripa natural de cerdo y atar cada 12 cm. Conservar refrigerado y asar dentro de las 48 h.',
  '[
    {"name":"Carne de cerdo (magro)","mode":"percent","percent_of_meat":0.80,"display_unit":"g","sort_order":0},
    {"name":"Tocino / panceta","mode":"percent","percent_of_meat":0.20,"display_unit":"g","sort_order":1},
    {"name":"Sal fina","mode":"percent","percent_of_meat":0.025,"display_unit":"g","sort_order":2},
    {"name":"Pimentón dulce","mode":"percent","percent_of_meat":0.012,"display_unit":"g","sort_order":3},
    {"name":"Pimentón picante","mode":"percent","percent_of_meat":0.004,"display_unit":"g","sort_order":4},
    {"name":"Pimienta negra molida","mode":"percent","percent_of_meat":0.003,"display_unit":"g","sort_order":5},
    {"name":"Orégano seco","mode":"percent","percent_of_meat":0.002,"display_unit":"g","sort_order":6},
    {"name":"Vino blanco","mode":"percent","percent_of_meat":0.05,"display_unit":"ml","sort_order":7},
    {"name":"Diente de ajo","mode":"absolute","amount_canonical":4,"display_unit":"piece","sort_order":8},
    {"name":"Tripa natural de cerdo","mode":"absolute","amount_canonical":250,"display_unit":"cm","sort_order":9}
  ]'::jsonb
);

-- B) Chorizo Cantimpalos (español, secado)
select pg_temp.seed_recipe(
  'chorizo-cantimpalos',
  'Chorizo Cantimpalos (estilo español)',
  'Chorizo de secado lento al estilo de Cantimpalos, Segovia. Pimentón ahumado, nitrato y 4–6 semanas de curado en cámara fría a 12 °C y 75 % de humedad.',
  1000, 'kg',
  'Picar carne y tocino a placa de 5 mm. Mezclar todas las especias y la sal de cura disueltas en agua fría. Amasar 5 min hasta ligar. Reposar 24 h en frío. Embutir en tripa natural de cerdo bien apretada. Atar en herradura y pinchar para liberar aire. Curar 4–6 semanas a 12 °C / 75 % HR.',
  '[
    {"name":"Carne de cerdo (magro)","mode":"percent","percent_of_meat":0.80,"display_unit":"g","sort_order":0},
    {"name":"Tocino / panceta","mode":"percent","percent_of_meat":0.20,"display_unit":"g","sort_order":1},
    {"name":"Sal fina","mode":"percent","percent_of_meat":0.025,"display_unit":"g","sort_order":2},
    {"name":"Sal de cura #2 (nitrato + nitrito)","mode":"percent","percent_of_meat":0.0025,"display_unit":"g","sort_order":3},
    {"name":"Pimentón ahumado","mode":"percent","percent_of_meat":0.022,"display_unit":"g","sort_order":4},
    {"name":"Pimentón picante","mode":"percent","percent_of_meat":0.005,"display_unit":"g","sort_order":5},
    {"name":"Ajo en polvo","mode":"percent","percent_of_meat":0.003,"display_unit":"g","sort_order":6},
    {"name":"Orégano seco","mode":"percent","percent_of_meat":0.003,"display_unit":"g","sort_order":7},
    {"name":"Pimienta negra molida","mode":"percent","percent_of_meat":0.002,"display_unit":"g","sort_order":8},
    {"name":"Agua fría","mode":"percent","percent_of_meat":0.03,"display_unit":"ml","sort_order":9},
    {"name":"Tripa natural de cerdo","mode":"absolute","amount_canonical":250,"display_unit":"cm","sort_order":10}
  ]'::jsonb
);

-- C) Salchicha Parrillera Uruguaya (fresca)
select pg_temp.seed_recipe(
  'salchicha-parrillera-uruguaya',
  'Salchicha parrillera uruguaya',
  'Salchicha fresca, suave y jugosa. Perfecta para choripán uruguayo. Sin cura, consumo inmediato.',
  1000, 'kg',
  'Picar carne y panceta a placa de 8 mm. Mezclar con la leche fría donde se disolvió la sal y las especias. Amasar 3–4 min. Embutir en tripa de cerdo más fina (calibre 24/26 mm). Atar en tira continua o cortar cada 15 cm. Refrigerar y asar dentro de 24 h.',
  '[
    {"name":"Carne de cerdo (magro)","mode":"percent","percent_of_meat":0.80,"display_unit":"g","sort_order":0},
    {"name":"Tocino / panceta","mode":"percent","percent_of_meat":0.20,"display_unit":"g","sort_order":1},
    {"name":"Sal fina","mode":"percent","percent_of_meat":0.02,"display_unit":"g","sort_order":2},
    {"name":"Pimienta negra molida","mode":"percent","percent_of_meat":0.005,"display_unit":"g","sort_order":3},
    {"name":"Pimentón dulce","mode":"percent","percent_of_meat":0.003,"display_unit":"g","sort_order":4},
    {"name":"Diente de ajo","mode":"absolute","amount_canonical":6,"display_unit":"piece","sort_order":5},
    {"name":"Tripa natural de cerdo","mode":"absolute","amount_canonical":300,"display_unit":"cm","sort_order":6}
  ]'::jsonb
);

-- D) Longaniza Catalana (vino tinto, secado corto)
select pg_temp.seed_recipe(
  'longaniza-catalana',
  'Longaniza catalana',
  'Longaniza fina perfumada con vino tinto, pimienta y ajo. Secado corto: 7–10 días a 14 °C.',
  1000, 'kg',
  'Picar a placa de 5 mm. Mezclar con sal, cura, pimienta y vino tinto. Reposar 24 h. Embutir en tripa fina de cerdo (calibre 28 mm). Atar en herradura. Secar 7–10 días a 14 °C y 70 % HR, hasta perder ~25 % del peso original.',
  '[
    {"name":"Carne de cerdo (magro)","mode":"percent","percent_of_meat":0.70,"display_unit":"g","sort_order":0},
    {"name":"Tocino / panceta","mode":"percent","percent_of_meat":0.30,"display_unit":"g","sort_order":1},
    {"name":"Sal fina","mode":"percent","percent_of_meat":0.024,"display_unit":"g","sort_order":2},
    {"name":"Sal de cura #1 (nitrito)","mode":"percent","percent_of_meat":0.0025,"display_unit":"g","sort_order":3},
    {"name":"Pimienta negra molida","mode":"percent","percent_of_meat":0.004,"display_unit":"g","sort_order":4},
    {"name":"Vino tinto","mode":"percent","percent_of_meat":0.08,"display_unit":"ml","sort_order":5},
    {"name":"Diente de ajo","mode":"absolute","amount_canonical":3,"display_unit":"piece","sort_order":6},
    {"name":"Tripa natural de cerdo","mode":"absolute","amount_canonical":280,"display_unit":"cm","sort_order":7}
  ]'::jsonb
);

-- E) Chorizo Mexicano (fresco, picante, vinagrado)
select pg_temp.seed_recipe(
  'chorizo-mexicano',
  'Chorizo mexicano',
  'Chorizo fresco, intensamente especiado y picante. Se cocina suelto en sartén o se embute corto para asar. Sin cura.',
  1000, 'kg',
  'Picar a placa de 6 mm. Mezclar especias con vinagre y dejar reposar 30 min para hidratar. Combinar con la carne, sal y ajo machacado. Amasar 3 min. Reposar 12 h en frío para que tomen sabor. Embutir o usar suelto.',
  '[
    {"name":"Carne de cerdo (magro)","mode":"percent","percent_of_meat":0.80,"display_unit":"g","sort_order":0},
    {"name":"Tocino / panceta","mode":"percent","percent_of_meat":0.20,"display_unit":"g","sort_order":1},
    {"name":"Sal fina","mode":"percent","percent_of_meat":0.02,"display_unit":"g","sort_order":2},
    {"name":"Pimentón dulce","mode":"percent","percent_of_meat":0.02,"display_unit":"g","sort_order":3},
    {"name":"Pimentón picante","mode":"percent","percent_of_meat":0.015,"display_unit":"g","sort_order":4},
    {"name":"Comino","mode":"percent","percent_of_meat":0.005,"display_unit":"g","sort_order":5},
    {"name":"Orégano seco","mode":"percent","percent_of_meat":0.005,"display_unit":"g","sort_order":6},
    {"name":"Pimienta negra molida","mode":"percent","percent_of_meat":0.003,"display_unit":"g","sort_order":7},
    {"name":"Vinagre de vino","mode":"percent","percent_of_meat":0.05,"display_unit":"ml","sort_order":8},
    {"name":"Diente de ajo","mode":"absolute","amount_canonical":6,"display_unit":"piece","sort_order":9}
  ]'::jsonb
);
