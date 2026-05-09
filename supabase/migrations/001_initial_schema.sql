-- ============================================
-- Planting Their Roots — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Families table (linked to auth.users)
create table public.families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  parent_name text not null,
  created_at timestamptz default now() not null
);

alter table public.families enable row level security;

create policy "Users can read own family"
  on public.families for select
  using (auth.uid() = user_id);

create policy "Users can insert own family"
  on public.families for insert
  with check (auth.uid() = user_id);

create policy "Users can update own family"
  on public.families for update
  using (auth.uid() = user_id);

-- 2. Children table
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  name text not null,
  birth_date date not null,
  current_band smallint not null default 2,
  created_at timestamptz default now() not null
);

alter table public.children enable row level security;

create policy "Users can read own children"
  on public.children for select
  using (
    family_id in (select id from public.families where user_id = auth.uid())
  );

create policy "Users can insert own children"
  on public.children for insert
  with check (
    family_id in (select id from public.families where user_id = auth.uid())
  );

create policy "Users can update own children"
  on public.children for update
  using (
    family_id in (select id from public.families where user_id = auth.uid())
  );

create policy "Users can delete own children"
  on public.children for delete
  using (
    family_id in (select id from public.families where user_id = auth.uid())
  );

-- 3. Milestone progress tracking
create table public.milestone_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  milestone_key text not null, -- format: "band-domain_code-description_hash"
  observed_date date,
  notes text,
  created_at timestamptz default now() not null,
  unique(child_id, milestone_key)
);

alter table public.milestone_progress enable row level security;

create policy "Users can read own milestone progress"
  on public.milestone_progress for select
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can insert own milestone progress"
  on public.milestone_progress for insert
  with check (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can update own milestone progress"
  on public.milestone_progress for update
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can delete own milestone progress"
  on public.milestone_progress for delete
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

-- 4. Completed guides tracking
create table public.completed_guides (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  guide_key text not null, -- format: "band-week_number"
  completed_at timestamptz default now() not null,
  unique(child_id, guide_key)
);

alter table public.completed_guides enable row level security;

create policy "Users can read own completed guides"
  on public.completed_guides for select
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can insert own completed guides"
  on public.completed_guides for insert
  with check (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can delete own completed guides"
  on public.completed_guides for delete
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

-- 5. Weekly reflections
create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  guide_key text not null,
  whats_new text,
  whats_strong text,
  whats_falling_apart text,
  what_you_enjoyed text,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  unique(child_id, guide_key)
);

alter table public.weekly_reflections enable row level security;

create policy "Users can read own reflections"
  on public.weekly_reflections for select
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can insert own reflections"
  on public.weekly_reflections for insert
  with check (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

create policy "Users can update own reflections"
  on public.weekly_reflections for update
  using (
    child_id in (
      select c.id from public.children c
      join public.families f on c.family_id = f.id
      where f.user_id = auth.uid()
    )
  );

-- 6. Index for performance
create index idx_children_family on public.children(family_id);
create index idx_milestone_progress_child on public.milestone_progress(child_id);
create index idx_completed_guides_child on public.completed_guides(child_id);
create index idx_weekly_reflections_child on public.weekly_reflections(child_id);

-- 7. Function to auto-create family row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.families (user_id, parent_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'parent_name', 'Parent'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
