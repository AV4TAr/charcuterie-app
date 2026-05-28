-- Add bilingual name columns to ingredients.
-- name_es: Spanish display name (falls back to name)
-- name_en: English display name (falls back to name)
alter table public.ingredients
  add column if not exists name_es text,
  add column if not exists name_en text;

-- ── Backfill Spanish-canonical ingredients with English translations ──────────

update public.ingredients set name_en = 'Lean pork'                          where name = 'Carne de cerdo (magro)';
update public.ingredients set name_en = 'Bacon / pork belly'                 where name = 'Tocino / panceta';
update public.ingredients set name_en = 'Fine salt'                          where name = 'Sal fina';
update public.ingredients set name_en = 'Coarse salt'                        where name = 'Sal gruesa';
update public.ingredients set name_en = 'Curing salt #1 (nitrite)'           where name = 'Sal de cura #1 (nitrito)';
update public.ingredients set name_en = 'Pink curing salt #1'                where name = 'Sal de cura #1 (rosa)';
update public.ingredients set name_en = 'Curing salt #2 (nitrate + nitrite)' where name = 'Sal de cura #2 (nitrato + nitrito)';
update public.ingredients set name_en = 'Sweet paprika'                      where name = 'Pimentón dulce';
update public.ingredients set name_en = 'Hot paprika'                        where name = 'Pimentón picante';
update public.ingredients set name_en = 'Smoked paprika'                     where name = 'Pimentón ahumado';
update public.ingredients set name_en = 'Black pepper (ground)'              where name = 'Pimienta negra molida';
update public.ingredients set name_en = 'White pepper (ground)'              where name = 'Pimienta blanca molida';
update public.ingredients set name_en = 'Garlic powder'                      where name = 'Ajo en polvo';
update public.ingredients set name_en = 'Onion powder'                       where name = 'Cebolla en polvo';
update public.ingredients set name_en = 'Garlic clove'                       where name = 'Diente de ajo';
update public.ingredients set name_en = 'Dried oregano'                      where name = 'Orégano seco';
update public.ingredients set name_en = 'Dried thyme'                        where name = 'Tomillo seco';
update public.ingredients set name_en = 'Ground bay leaf'                    where name = 'Laurel molido';
update public.ingredients set name_en = 'Cumin'                              where name = 'Comino';
update public.ingredients set name_en = 'Ground cumin'                       where name = 'Comino molido';
update public.ingredients set name_en = 'Ground fennel'                      where name = 'Hinojo molido';
update public.ingredients set name_en = 'Ground coriander'                   where name = 'Cilantro molido';
update public.ingredients set name_en = 'Ground nutmeg'                      where name = 'Nuez moscada molida';
update public.ingredients set name_en = 'Ground anise'                       where name = 'Anís molido';
update public.ingredients set name_en = 'White wine'                         where name = 'Vino blanco';
update public.ingredients set name_en = 'Red wine'                           where name = 'Vino tinto';
update public.ingredients set name_en = 'Wine vinegar'                       where name = 'Vinagre de vino';
update public.ingredients set name_en = 'Cold water'                         where name = 'Agua fría';
update public.ingredients set name_en = 'Sugar / dextrose'                   where name = 'Azúcar / dextrosa';
update public.ingredients set name_en = 'Sugar'                              where name = 'Azúcar';
update public.ingredients set name_en = 'Dextrose'                           where name = 'Dextrosa';
update public.ingredients set name_en = 'Natural pork casing'                where name = 'Tripa natural de cerdo';
update public.ingredients set name_en = 'Collagen casing'                    where name = 'Tripa colágeno';
update public.ingredients set name_en = 'Cotton twine'                       where name = 'Hilo de algodón';

-- ── Merge English-seed duplicates into Spanish rows ──────────────────────────
-- For each English row that maps to an existing Spanish ingredient:
-- 1. Update any recipe_version_ingredients that reference the English row
--    to point to the Spanish row instead.
-- 2. Delete the English row.

do $$
declare
  v_es uuid;
  v_en uuid;
begin
  -- Helper: migrate references and delete duplicate
  -- (pairings: Spanish name → English name that duplicates it)
  for v_es, v_en in
    select s.id, e.id
    from public.ingredients s
    join public.ingredients e on true
    where (s.name, e.name) in (
      ('Tocino / panceta',                   'Pork belly'),
      ('Sal de cura #1 (nitrito)',            'Pink curing salt #1'),
      ('Sal de cura #2 (nitrato + nitrito)',  'Pink curing salt #2'),
      ('Pimentón dulce',                     'Sweet paprika'),
      ('Pimentón picante',                   'Hot paprika'),
      ('Pimentón ahumado',                   'Smoked paprika'),
      ('Ajo en polvo',                       'Garlic powder'),
      ('Comino',                             'Cumin (ground)'),
      ('Diente de ajo',                      'Fresh garlic'),
      ('Pimienta negra molida',              'Black pepper (ground)'),
      ('Vino tinto',                         'Red wine'),
      ('Vino blanco',                        'White wine'),
      ('Agua fría',                          'Ice water'),
      ('Vinagre de vino',                    'Wine vinegar'),
      ('Tripa natural de cerdo',             'Natural hog casing'),
      ('Tripa colágeno',                     'Collagen casing'),
      ('Hilo de algodón',                    'Cotton twine')
    )
  loop
    update public.recipe_version_ingredients
      set ingredient_id = v_es
      where ingredient_id = v_en;
    delete from public.ingredients where id = v_en;
  end loop;
end $$;

-- ── Backfill English-only seeds with Spanish translations ────────────────────

update public.ingredients set name_es = 'Paleta de cerdo'              where name = 'Pork shoulder';
update public.ingredients set name_es = 'Grasa de cerdo (lardo)'       where name = 'Pork fatback';
update public.ingredients set name_es = 'Lomo de cerdo'                where name = 'Pork loin';
update public.ingredients set name_es = 'Papada de cerdo'              where name = 'Pork jowl';
update public.ingredients set name_es = 'Paleta de res'                where name = 'Beef chuck';
update public.ingredients set name_es = 'Pecho de res'                 where name = 'Beef brisket';
update public.ingredients set name_es = 'Paleta de cordero'            where name = 'Lamb shoulder';
update public.ingredients set name_es = 'Muslo de pollo'               where name = 'Chicken thigh';
update public.ingredients set name_es = 'Manteca de cerdo'             where name = 'Lard';
update public.ingredients set name_es = 'Sal kosher'                   where name = 'Kosher salt';
update public.ingredients set name_es = 'Sal marina'                   where name = 'Sea salt';
update public.ingredients set name_es = 'Eritorbato de sodio'          where name = 'Sodium erythorbate';
update public.ingredients set name_es = 'Glucono delta-lactona (GDL)'  where name = 'Glucono delta-lactone (GDL)';
update public.ingredients set name_es = 'Dextrosa'                     where name = 'Dextrose';
update public.ingredients set name_es = 'Pimienta blanca molida'       where name = 'White pepper (ground)';
update public.ingredients set name_es = 'Ají molido / hojuelas'        where name = 'Red pepper flakes';
update public.ingredients set name_es = 'Pimienta cayena'              where name = 'Cayenne pepper';
update public.ingredients set name_es = 'Semillas de hinojo'           where name = 'Fennel seeds';
update public.ingredients set name_es = 'Cilantro molido'              where name = 'Coriander (ground)';
update public.ingredients set name_es = 'Semillas de alcaravea'        where name = 'Caraway seeds';
update public.ingredients set name_es = 'Semillas de mostaza'          where name = 'Mustard seeds';
update public.ingredients set name_es = 'Semillas de anís'             where name = 'Anise seeds';
update public.ingredients set name_es = 'Nuez moscada'                 where name = 'Nutmeg';
update public.ingredients set name_es = 'Pimienta de Jamaica'          where name = 'Allspice';
update public.ingredients set name_es = 'Clavo de olor'                where name = 'Cloves';
update public.ingredients set name_es = 'Hojuelas de chile'            where name = 'Chili flakes';
update public.ingredients set name_es = 'Macis'                        where name = 'Mace';
update public.ingredients set name_es = 'Jengibre molido'              where name = 'Ginger (ground)';
update public.ingredients set name_es = 'Canela'                       where name = 'Cinnamon';
update public.ingredients set name_es = 'Romero'                       where name = 'Rosemary';
update public.ingredients set name_es = 'Tomillo'                      where name = 'Thyme';
update public.ingredients set name_es = 'Salvia'                       where name = 'Sage';
update public.ingredients set name_es = 'Mejorana'                     where name = 'Marjoram';
update public.ingredients set name_es = 'Hojas de laurel'              where name = 'Bay leaves';
update public.ingredients set name_es = 'Perejil'                      where name = 'Parsley';
update public.ingredients set name_es = 'Ciboulette'                   where name = 'Chives';
update public.ingredients set name_es = 'Azúcar blanca'                where name = 'White sugar';
update public.ingredients set name_es = 'Azúcar morena'                where name = 'Brown sugar';
update public.ingredients set name_es = 'Miel'                         where name = 'Honey';
update public.ingredients set name_es = 'Jarabe de arce'               where name = 'Maple syrup';
update public.ingredients set name_es = 'Brandy'                       where name = 'Brandy';
update public.ingredients set name_es = 'Whisky'                       where name = 'Whiskey';
update public.ingredients set name_es = 'Cerveza'                      where name = 'Beer';
update public.ingredients set name_es = 'Sidra de manzana'             where name = 'Apple cider';
update public.ingredients set name_es = 'Humo líquido'                 where name = 'Liquid smoke';
update public.ingredients set name_es = 'Leche en polvo descremada'    where name = 'Non-fat dry milk';
update public.ingredients set name_es = 'Proteína de soja aislada'     where name = 'Soy protein isolate';
update public.ingredients set name_es = 'Pan rallado'                  where name = 'Breadcrumbs';
update public.ingredients set name_es = 'Leche en polvo'               where name = 'Powdered milk';
update public.ingredients set name_es = 'Cultivo iniciador'            where name = 'Starter culture';
update public.ingredients set name_es = 'Tripa natural de cordero'     where name = 'Natural sheep casing';
update public.ingredients set name_es = 'Tripa fibrosa'                where name = 'Fibrous casing';
