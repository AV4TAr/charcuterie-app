-- Common English-language charcuterie and sausage-making ingredients.
insert into public.ingredients (name, category, measurement_type, default_density_g_per_ml) values
  -- Meat & fat
  ('Pork shoulder', 'meat', 'mass', null),
  ('Pork belly', 'meat', 'mass', null),
  ('Pork fatback', 'meat', 'mass', null),
  ('Pork loin', 'meat', 'mass', null),
  ('Pork jowl', 'meat', 'mass', null),
  ('Beef chuck', 'meat', 'mass', null),
  ('Beef brisket', 'meat', 'mass', null),
  ('Lamb shoulder', 'meat', 'mass', null),
  ('Chicken thigh', 'meat', 'mass', null),
  ('Lard', 'meat', 'mass', null),

  -- Salts & cures
  ('Kosher salt', 'cure', 'mass', null),
  ('Sea salt', 'cure', 'mass', null),
  ('Pink curing salt #1', 'cure', 'mass', null),
  ('Pink curing salt #2', 'cure', 'mass', null),
  ('Dextrose', 'cure', 'mass', null),
  ('Sodium erythorbate', 'cure', 'mass', null),
  ('Glucono delta-lactone (GDL)', 'cure', 'mass', null),

  -- Spices
  ('Black pepper (ground)', 'spice', 'mass', null),
  ('White pepper (ground)', 'spice', 'mass', null),
  ('Red pepper flakes', 'spice', 'mass', null),
  ('Cayenne pepper', 'spice', 'mass', null),
  ('Smoked paprika', 'spice', 'mass', null),
  ('Sweet paprika', 'spice', 'mass', null),
  ('Hot paprika', 'spice', 'mass', null),
  ('Garlic powder', 'spice', 'mass', null),
  ('Onion powder', 'spice', 'mass', null),
  ('Fennel seeds', 'spice', 'mass', null),
  ('Coriander (ground)', 'spice', 'mass', null),
  ('Caraway seeds', 'spice', 'mass', null),
  ('Cumin (ground)', 'spice', 'mass', null),
  ('Mustard seeds', 'spice', 'mass', null),
  ('Anise seeds', 'spice', 'mass', null),
  ('Nutmeg', 'spice', 'mass', null),
  ('Allspice', 'spice', 'mass', null),
  ('Cloves', 'spice', 'mass', null),
  ('Chili flakes', 'spice', 'mass', null),
  ('Mace', 'spice', 'mass', null),
  ('Ginger (ground)', 'spice', 'mass', null),
  ('Cinnamon', 'spice', 'mass', null),

  -- Herbs & aromatics
  ('Fresh garlic', 'herb', 'count', null),
  ('Rosemary', 'herb', 'mass', null),
  ('Thyme', 'herb', 'mass', null),
  ('Sage', 'herb', 'mass', null),
  ('Marjoram', 'herb', 'mass', null),
  ('Bay leaves', 'herb', 'count', null),
  ('Parsley', 'herb', 'mass', null),
  ('Chives', 'herb', 'mass', null),

  -- Sugars
  ('White sugar', 'other', 'mass', null),
  ('Brown sugar', 'other', 'mass', null),
  ('Honey', 'liquid', 'volume', 1.42),
  ('Maple syrup', 'liquid', 'volume', 1.33),

  -- Liquids
  ('Red wine', 'liquid', 'volume', 0.99),
  ('White wine', 'liquid', 'volume', 0.99),
  ('Ice water', 'liquid', 'volume', 1.00),
  ('Brandy', 'liquid', 'volume', 0.93),
  ('Whiskey', 'liquid', 'volume', 0.93),
  ('Beer', 'liquid', 'volume', 1.01),
  ('Apple cider', 'liquid', 'volume', 1.04),
  ('Wine vinegar', 'liquid', 'volume', 1.01),
  ('Liquid smoke', 'liquid', 'volume', 1.00),

  -- Binders & fillers
  ('Non-fat dry milk', 'other', 'mass', null),
  ('Soy protein isolate', 'other', 'mass', null),
  ('Breadcrumbs', 'other', 'mass', null),
  ('Powdered milk', 'other', 'mass', null),

  -- Fermentation
  ('Starter culture', 'other', 'mass', null),

  -- Casings
  ('Natural hog casing', 'casing', 'length', null),
  ('Natural sheep casing', 'casing', 'length', null),
  ('Collagen casing', 'casing', 'length', null),
  ('Fibrous casing', 'casing', 'length', null),
  ('Cotton twine', 'casing', 'length', null)

on conflict (name) do nothing;
