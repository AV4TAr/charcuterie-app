-- Add bulk densities (g/ml) for spices and herbs so they can be measured by volume (tsp/tbsp/cup)
-- Values are approximate bulk/apparent densities for dried ingredients

-- Ground spices
update public.ingredients set default_density_g_per_ml = 0.53
  where name_en ilike '%black pepper%' or name ilike '%pimienta negra%';

update public.ingredients set default_density_g_per_ml = 0.53
  where name_en ilike '%white pepper%' or name ilike '%pimienta blanca%';

update public.ingredients set default_density_g_per_ml = 0.55
  where name_en ilike '%cayenne%' or name ilike '%cayena%';

update public.ingredients set default_density_g_per_ml = 0.46
  where name_en ilike '%paprika%' or name ilike '%pimentón%';

update public.ingredients set default_density_g_per_ml = 0.61
  where name_en ilike '%garlic powder%' or name ilike '%ajo en polvo%';

update public.ingredients set default_density_g_per_ml = 0.56
  where name_en ilike '%onion powder%' or name ilike '%cebolla en polvo%';

update public.ingredients set default_density_g_per_ml = 0.51
  where name_en ilike '%coriander%' or name ilike '%cilantro molido%' or name ilike '%coriandro%';

update public.ingredients set default_density_g_per_ml = 0.53
  where name_en ilike '%cumin%' or name ilike '%comino%';

update public.ingredients set default_density_g_per_ml = 0.55
  where name_en ilike '%ginger%' or name ilike '%jengibre%';

update public.ingredients set default_density_g_per_ml = 0.55
  where name_en ilike '%cinnamon%' or name ilike '%canela%';

update public.ingredients set default_density_g_per_ml = 0.52
  where name_en ilike '%nutmeg%' or name ilike '%nuez moscada%';

update public.ingredients set default_density_g_per_ml = 0.50
  where name_en ilike '%allspice%' or name ilike '%pimienta de jamaica%';

update public.ingredients set default_density_g_per_ml = 0.58
  where name_en ilike '%clove%' or name ilike '%clavo%';

update public.ingredients set default_density_g_per_ml = 0.47
  where name_en ilike '%mace%' or name ilike '%macis%';

-- Whole seeds
update public.ingredients set default_density_g_per_ml = 0.43
  where name_en ilike '%fennel seed%' or name ilike '%semilla de hinojo%' or name ilike '%hinojo%';

update public.ingredients set default_density_g_per_ml = 0.59
  where name_en ilike '%caraway%' or name ilike '%alcaravea%';

update public.ingredients set default_density_g_per_ml = 0.72
  where name_en ilike '%mustard seed%' or name ilike '%semilla de mostaza%' or name ilike '%mostaza%';

update public.ingredients set default_density_g_per_ml = 0.47
  where name_en ilike '%anise seed%' or name ilike '%anís%' or name ilike '%aniseed%';

-- Flakes (very light)
update public.ingredients set default_density_g_per_ml = 0.19
  where name_en ilike '%red pepper flake%' or name ilike '%ají molido%';

update public.ingredients set default_density_g_per_ml = 0.19
  where name_en ilike '%chili flake%' or name ilike '%chile%';

-- Dried herbs (lightest)
update public.ingredients set default_density_g_per_ml = 0.22
  where name_en ilike '%oregano%' or name ilike '%orégano%';

update public.ingredients set default_density_g_per_ml = 0.21
  where name_en ilike '%rosemary%' or name ilike '%romero%';

update public.ingredients set default_density_g_per_ml = 0.26
  where name_en ilike '%thyme%' or name ilike '%tomillo%';

update public.ingredients set default_density_g_per_ml = 0.21
  where name_en ilike '%sage%' or name ilike '%salvia%';

update public.ingredients set default_density_g_per_ml = 0.21
  where name_en ilike '%marjoram%' or name ilike '%mejorana%';

update public.ingredients set default_density_g_per_ml = 0.26
  where name_en ilike '%parsley%' or name ilike '%perejil%';

update public.ingredients set default_density_g_per_ml = 0.26
  where name_en ilike '%chive%' or name ilike '%ciboulette%' or name ilike '%cebollín%';

update public.ingredients set default_density_g_per_ml = 0.24
  where name_en ilike '%basil%' or name ilike '%albahaca%';

update public.ingredients set default_density_g_per_ml = 0.24
  where name_en ilike '%dill%' or name ilike '%eneldo%';

update public.ingredients set default_density_g_per_ml = 0.26
  where name_en ilike '%tarragon%' or name ilike '%estragón%';

update public.ingredients set default_density_g_per_ml = 0.26
  where name_en ilike '%mint%' or name ilike '%menta%';

-- Sugar / other dry
update public.ingredients set default_density_g_per_ml = 0.85
  where name_en ilike '%brown sugar%' or name ilike '%azúcar negra%' or name ilike '%azúcar rubia%';

update public.ingredients set default_density_g_per_ml = 0.95
  where name_en ilike '%white sugar%' or (name ilike '%azúcar%' and name not ilike '%negra%' and name not ilike '%rubia%');
