-- Backfill default densities (g/ml) on common mass-type ingredients so users
-- can measure them in volume units (tsp/tbsp/cup) and the system converts
-- correctly to grams internally.

update public.ingredients set default_density_g_per_ml = 1.20 where name = 'Sal fina' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 1.00 where name = 'Sal gruesa' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.95 where name = 'Sal de cura #1 (rosa)' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.95 where name = 'Sal de cura #2 (nitrato + nitrito)' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.45 where name = 'Pimentón dulce' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.45 where name = 'Pimentón picante' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.45 where name = 'Pimentón ahumado' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.50 where name = 'Pimienta negra molida' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.45 where name = 'Comino molido' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.15 where name = 'Orégano seco' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.15 where name = 'Tomillo seco' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.20 where name = 'Laurel molido' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.60 where name = 'Ajo en polvo' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.60 where name = 'Cebolla en polvo' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.85 where name = 'Azúcar' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.85 where name = 'Dextrosa' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.55 where name = 'Nuez moscada molida' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.45 where name = 'Anís molido' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.50 where name = 'Hinojo molido' and default_density_g_per_ml is null;
update public.ingredients set default_density_g_per_ml = 0.50 where name = 'Cilantro molido' and default_density_g_per_ml is null;
