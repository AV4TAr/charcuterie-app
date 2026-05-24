-- Triggers and helper functions for charcuterie-app.

-- ---------------------------------------------------------------------------
-- 1. create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'user'
  );
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate || '-' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data ->> 'display_name', candidate)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. recipes.favorites_count maintained from favorites table
-- ---------------------------------------------------------------------------
create or replace function public.bump_favorites_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.recipes set favorites_count = favorites_count + 1 where id = new.recipe_id;
  elsif tg_op = 'DELETE' then
    update public.recipes set favorites_count = greatest(favorites_count - 1, 0) where id = old.recipe_id;
  end if;
  return null;
end;
$$;

drop trigger if exists favorites_count_trigger on public.favorites;
create trigger favorites_count_trigger
  after insert or delete on public.favorites
  for each row execute function public.bump_favorites_count();

-- ---------------------------------------------------------------------------
-- 3. ratings_avg / ratings_count maintained from ratings table
-- ---------------------------------------------------------------------------
create or replace function public.recalc_rating()
returns trigger language plpgsql as $$
declare
  rid uuid;
begin
  rid := coalesce(new.recipe_id, old.recipe_id);
  update public.recipes
  set ratings_count = (select count(*) from public.ratings where recipe_id = rid),
      ratings_avg = coalesce((select avg(score)::numeric(3,2) from public.ratings where recipe_id = rid), 0)
  where id = rid;
  return null;
end;
$$;

drop trigger if exists ratings_recalc_trigger on public.ratings;
create trigger ratings_recalc_trigger
  after insert or update or delete on public.ratings
  for each row execute function public.recalc_rating();

-- ---------------------------------------------------------------------------
-- 4. when a new recipe_version is inserted, set it as the recipe's current
-- ---------------------------------------------------------------------------
create or replace function public.set_current_version()
returns trigger language plpgsql as $$
begin
  update public.recipes set current_version_id = new.id, updated_at = now()
  where id = new.recipe_id;
  return new;
end;
$$;

drop trigger if exists recipe_versions_set_current on public.recipe_versions;
create trigger recipe_versions_set_current
  after insert on public.recipe_versions
  for each row execute function public.set_current_version();
