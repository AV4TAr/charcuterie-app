-- Charcuterie App: core schema
-- Run against an empty Supabase project.

create extension if not exists "pgcrypto";
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ingredients: shared catalog. Each row knows its physical measurement type
-- and (for liquids) a default density so % of meat → ml conversion works.
-- ---------------------------------------------------------------------------
create type measurement_type as enum ('mass', 'volume', 'length', 'count');
create type ingredient_category as enum ('meat', 'spice', 'cure', 'casing', 'liquid', 'herb', 'other');

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category ingredient_category not null default 'other',
  measurement_type measurement_type not null default 'mass',
  default_density_g_per_ml numeric(8, 4),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
create type recipe_visibility as enum ('public', 'private');

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  visibility recipe_visibility not null default 'private',
  cover_image_url text,
  forked_from_recipe_id uuid references public.recipes(id) on delete set null,
  forked_from_version_id uuid,
  current_version_id uuid,
  favorites_count integer not null default 0,
  ratings_count integer not null default 0,
  ratings_avg numeric(3, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

-- ---------------------------------------------------------------------------
-- recipe_versions (append-only) and their ingredients
-- ---------------------------------------------------------------------------
create type mass_unit as enum ('g', 'kg', 'oz', 'lb');
create type display_unit as enum (
  'g', 'kg', 'oz', 'lb',
  'ml', 'l', 'floz', 'tsp', 'tbsp', 'cup',
  'cm', 'm',
  'piece'
);
create type ingredient_mode as enum ('percent', 'absolute');

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version_number integer not null,
  change_note text,
  instructions text,
  cooking_tips text,
  meat_base_weight_grams numeric(12, 3) not null default 1000,
  meat_base_display_unit mass_unit not null default 'kg',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recipe_id, version_number)
);

alter table public.recipes
  add constraint recipes_current_version_fk
  foreign key (current_version_id) references public.recipe_versions(id) on delete set null;
alter table public.recipes
  add constraint recipes_forked_from_version_fk
  foreign key (forked_from_version_id) references public.recipe_versions(id) on delete set null;

create table public.recipe_version_ingredients (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.recipe_versions(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  mode ingredient_mode not null,
  percent_of_meat numeric(8, 4),
  amount_canonical numeric(12, 4),
  display_unit display_unit not null,
  notes text,
  sort_order integer not null default 0,
  check (
    (mode = 'percent' and percent_of_meat is not null and amount_canonical is null)
    or
    (mode = 'absolute' and amount_canonical is not null and percent_of_meat is null)
  )
);
create index on public.recipe_version_ingredients (version_id);

-- ---------------------------------------------------------------------------
-- stores (where to buy ingredients)
-- ---------------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat numeric(9, 6),
  lng numeric(9, 6),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.ingredient_stores (
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  note text,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (ingredient_id, store_id)
);

-- ---------------------------------------------------------------------------
-- favorites, ratings, comments
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version_id uuid references public.recipe_versions(id) on delete set null,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index on public.comments (recipe_id);

-- ---------------------------------------------------------------------------
-- proposals (PR-style cross-recipe change requests)
-- ---------------------------------------------------------------------------
create type proposal_status as enum ('open', 'accepted', 'rejected', 'closed');

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  source_recipe_id uuid not null references public.recipes(id) on delete cascade,
  source_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  target_recipe_id uuid not null references public.recipes(id) on delete cascade,
  title text not null,
  description text,
  status proposal_status not null default 'open',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.proposal_comments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
