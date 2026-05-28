-- Fix: counter-maintaining triggers were blocked by RLS because they run as
-- the inserting user (not the recipe owner). Making them SECURITY DEFINER so
-- they execute with the function owner's privileges and bypass RLS.

create or replace function public.bump_favorites_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recipes set favorites_count = favorites_count + 1 where id = new.recipe_id;
  elsif tg_op = 'DELETE' then
    update public.recipes set favorites_count = greatest(favorites_count - 1, 0) where id = old.recipe_id;
  end if;
  return null;
end;
$$;

create or replace function public.recalc_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Backfill: recompute counters from current state so anything that was
-- favorited/rated while the triggers were broken gets corrected.

update public.recipes r
set favorites_count = coalesce(
  (select count(*)::integer from public.favorites f where f.recipe_id = r.id),
  0
);

update public.recipes r
set
  ratings_count = coalesce(
    (select count(*)::integer from public.ratings rt where rt.recipe_id = r.id),
    0
  ),
  ratings_avg = coalesce(
    (select avg(score)::numeric(3,2) from public.ratings rt where rt.recipe_id = r.id),
    0
  );
