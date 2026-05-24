-- Common ingredients for chorizo and sausage making.
insert into public.ingredients (name, category, measurement_type, default_density_g_per_ml) values
  ('Carne de cerdo (magro)', 'meat', 'mass', null),
  ('Tocino / panceta', 'meat', 'mass', null),
  ('Sal fina', 'cure', 'mass', null),
  ('Sal de cura #1 (nitrito)', 'cure', 'mass', null),
  ('Sal de cura #2 (nitrato + nitrito)', 'cure', 'mass', null),
  ('Pimentón dulce', 'spice', 'mass', null),
  ('Pimentón picante', 'spice', 'mass', null),
  ('Pimentón ahumado', 'spice', 'mass', null),
  ('Pimienta negra molida', 'spice', 'mass', null),
  ('Ajo en polvo', 'spice', 'mass', null),
  ('Diente de ajo', 'herb', 'count', null),
  ('Orégano seco', 'herb', 'mass', null),
  ('Comino', 'spice', 'mass', null),
  ('Vino blanco', 'liquid', 'volume', 0.99),
  ('Vino tinto', 'liquid', 'volume', 0.99),
  ('Vinagre de vino', 'liquid', 'volume', 1.01),
  ('Agua fría', 'liquid', 'volume', 1.00),
  ('Tripa natural de cerdo', 'casing', 'length', null),
  ('Tripa colágeno', 'casing', 'length', null),
  ('Hilo de algodón', 'casing', 'length', null),
  ('Azúcar / dextrosa', 'cure', 'mass', null)
on conflict (name) do nothing;
