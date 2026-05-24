-- Row Level Security policies for charcuterie-app.

alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_version_ingredients enable row level security;
alter table public.stores enable row level security;
alter table public.ingredient_stores enable row level security;
alter table public.favorites enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_comments enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ingredients (shared catalog) ---------------------------------------------
create policy "ingredients are readable by everyone"
  on public.ingredients for select using (true);
create policy "authenticated users can add ingredients"
  on public.ingredients for insert with check (auth.role() = 'authenticated');
create policy "creators can update their own ingredient"
  on public.ingredients for update using (auth.uid() = created_by);

-- recipes -------------------------------------------------------------------
create policy "recipes are readable when public or owned"
  on public.recipes for select using (
    visibility = 'public' or owner_id = auth.uid()
  );
create policy "owners insert their own recipes"
  on public.recipes for insert with check (auth.uid() = owner_id);
create policy "owners update their own recipes"
  on public.recipes for update using (auth.uid() = owner_id);
create policy "owners delete their own recipes"
  on public.recipes for delete using (auth.uid() = owner_id);

-- recipe_versions -----------------------------------------------------------
create policy "versions visible if parent recipe is visible"
  on public.recipe_versions for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_versions.recipe_id
        and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );
create policy "owners insert versions"
  on public.recipe_versions for insert with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_versions.recipe_id and r.owner_id = auth.uid()
    )
  );

-- recipe_version_ingredients -----------------------------------------------
create policy "ingredients visible if version is visible"
  on public.recipe_version_ingredients for select using (
    exists (
      select 1 from public.recipe_versions v
      join public.recipes r on r.id = v.recipe_id
      where v.id = recipe_version_ingredients.version_id
        and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );
create policy "owners manage version ingredients"
  on public.recipe_version_ingredients for all using (
    exists (
      select 1 from public.recipe_versions v
      join public.recipes r on r.id = v.recipe_id
      where v.id = recipe_version_ingredients.version_id and r.owner_id = auth.uid()
    )
  );

-- stores --------------------------------------------------------------------
create policy "stores readable by everyone"
  on public.stores for select using (true);
create policy "authenticated users create stores"
  on public.stores for insert with check (auth.role() = 'authenticated');
create policy "creators update stores"
  on public.stores for update using (auth.uid() = created_by);

-- ingredient_stores ---------------------------------------------------------
create policy "ingredient_stores readable by everyone"
  on public.ingredient_stores for select using (true);
create policy "authenticated users link ingredients to stores"
  on public.ingredient_stores for insert with check (auth.role() = 'authenticated');

-- favorites -----------------------------------------------------------------
create policy "users see their favorites"
  on public.favorites for select using (auth.uid() = user_id);
create policy "users add their favorites"
  on public.favorites for insert with check (auth.uid() = user_id);
create policy "users remove their favorites"
  on public.favorites for delete using (auth.uid() = user_id);

-- ratings -------------------------------------------------------------------
create policy "ratings visible when recipe visible"
  on public.ratings for select using (
    exists (
      select 1 from public.recipes r
      where r.id = ratings.recipe_id
        and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );
create policy "users upsert their own rating"
  on public.ratings for insert with check (auth.uid() = user_id);
create policy "users update their own rating"
  on public.ratings for update using (auth.uid() = user_id);

-- comments ------------------------------------------------------------------
create policy "comments visible when recipe visible"
  on public.comments for select using (
    exists (
      select 1 from public.recipes r
      where r.id = comments.recipe_id
        and (r.visibility = 'public' or r.owner_id = auth.uid())
    )
  );
create policy "authenticated users post comments"
  on public.comments for insert with check (auth.uid() = author_id);
create policy "authors update their comments"
  on public.comments for update using (auth.uid() = author_id);
create policy "authors delete their comments"
  on public.comments for delete using (auth.uid() = author_id);

-- proposals -----------------------------------------------------------------
create policy "proposals visible to involved parties"
  on public.proposals for select using (
    created_by = auth.uid()
    or exists (
      select 1 from public.recipes r
      where r.id = proposals.target_recipe_id and r.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.recipes a, public.recipes b
      where a.id = proposals.source_recipe_id and a.visibility = 'public'
        and b.id = proposals.target_recipe_id and b.visibility = 'public'
    )
  );
create policy "authenticated users open proposals"
  on public.proposals for insert with check (auth.uid() = created_by);
create policy "target owner updates proposal status"
  on public.proposals for update using (
    exists (
      select 1 from public.recipes r
      where r.id = proposals.target_recipe_id and r.owner_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "proposal comments follow proposal visibility"
  on public.proposal_comments for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_comments.proposal_id
        and (
          p.created_by = auth.uid()
          or exists (
            select 1 from public.recipes r
            where r.id = p.target_recipe_id and r.owner_id = auth.uid()
          )
        )
    )
  );
create policy "users post proposal comments"
  on public.proposal_comments for insert with check (auth.uid() = author_id);
