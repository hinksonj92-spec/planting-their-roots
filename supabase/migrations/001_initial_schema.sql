-- ============================================
-- Planting Their Roots — Supabase Schema
-- Per-child access model with invite links
-- ============================================

-- 1. Profiles table (one per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Children table
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  birth_date date not null,
  current_band smallint not null default 2,
  current_week int default null,
  created_at timestamptz default now() not null
);

alter table public.children enable row level security;

create policy "Users can read children they have access to"
  on public.children for select
  using (
    created_by = auth.uid()
    or id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can insert children"
  on public.children for insert
  with check (auth.uid() = created_by);

create policy "Users can update children they have access to"
  on public.children for update
  using (
    id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can delete children they created"
  on public.children for delete
  using (
    id in (
      select child_id from public.child_access
      where user_id = auth.uid() and role = 'creator'
    )
  );

-- 3. Child access junction table
create table if not exists public.child_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete cascade not null,
  role text not null default 'parent' check (role in ('creator', 'parent', 'viewer')),
  joined_at timestamptz default now() not null,
  unique(user_id, child_id)
);

alter table public.child_access enable row level security;

create policy "Users can read own access rows"
  on public.child_access for select
  using (auth.uid() = user_id);

create policy "Creators can insert access rows"
  on public.child_access for insert
  with check (
    -- The user is the creator of the child
    exists (
      select 1 from public.child_access ca
      where ca.user_id = auth.uid()
        and ca.child_id = child_id
        and ca.role = 'creator'
    )
    -- OR the user is inserting their own creator row (for new children)
    or (auth.uid() = user_id and role = 'creator')
  );

create policy "Creators can delete access rows"
  on public.child_access for delete
  using (
    -- Creators can remove others' access
    exists (
      select 1 from public.child_access ca
      where ca.user_id = auth.uid()
        and ca.child_id = child_id
        and ca.role = 'creator'
    )
    -- Users can remove their own access
    or auth.uid() = user_id
  );

-- 4. Invite links table
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  token text unique not null default gen_random_uuid()::text,
  created_by uuid references auth.users(id) on delete cascade not null,
  expires_at timestamptz default (now() + interval '7 days') not null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.invite_links enable row level security;

create policy "Creators can create invite links"
  on public.invite_links for insert
  with check (
    exists (
      select 1 from public.child_access ca
      where ca.user_id = auth.uid()
        and ca.child_id = child_id
        and ca.role = 'creator'
    )
  );

create policy "Creators can read invite links for their children"
  on public.invite_links for select
  using (
    exists (
      select 1 from public.child_access ca
      where ca.user_id = auth.uid()
        and ca.child_id = child_id
        and ca.role = 'creator'
    )
  );

create policy "Anyone can read invite links by token"
  on public.invite_links for select
  using (true);
  -- App-level filtering by token; RLS allows read so users can look up their invite

create policy "Creators can update invite links (mark as used)"
  on public.invite_links for update
  using (
    -- Allow the invited user to mark it as used
    used_by is null
    or
    exists (
      select 1 from public.child_access ca
      where ca.user_id = auth.uid()
        and ca.child_id = child_id
        and ca.role = 'creator'
    )
  );

-- 5. Milestone progress tracking
create table if not exists public.milestone_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  milestone_key text not null,
  observed_date date,
  notes text,
  created_at timestamptz default now() not null,
  unique(child_id, milestone_key)
);

alter table public.milestone_progress enable row level security;

create policy "Users can read milestone progress for accessible children"
  on public.milestone_progress for select
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can insert milestone progress for accessible children"
  on public.milestone_progress for insert
  with check (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can update milestone progress for accessible children"
  on public.milestone_progress for update
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can delete milestone progress for accessible children"
  on public.milestone_progress for delete
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

-- 6. Completed guides tracking
create table if not exists public.completed_guides (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  guide_key text not null,
  completed_at timestamptz default now() not null,
  unique(child_id, guide_key)
);

alter table public.completed_guides enable row level security;

create policy "Users can read completed guides for accessible children"
  on public.completed_guides for select
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can insert completed guides for accessible children"
  on public.completed_guides for insert
  with check (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can delete completed guides for accessible children"
  on public.completed_guides for delete
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

-- 7. Weekly reflections
create table if not exists public.weekly_reflections (
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

create policy "Users can read reflections for accessible children"
  on public.weekly_reflections for select
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can insert reflections for accessible children"
  on public.weekly_reflections for insert
  with check (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

create policy "Users can update reflections for accessible children"
  on public.weekly_reflections for update
  using (
    child_id in (select child_id from public.child_access where user_id = auth.uid())
  );

-- 8. Indexes
create index idx_child_access_user on public.child_access(user_id);
create index idx_child_access_child on public.child_access(child_id);
create index idx_children_created_by on public.children(created_by);
create index idx_invite_links_token on public.invite_links(token);
create index idx_invite_links_child on public.invite_links(child_id);
create index idx_milestone_progress_child on public.milestone_progress(child_id);
create index idx_completed_guides_child on public.completed_guides(child_id);
create index idx_weekly_reflections_child on public.weekly_reflections(child_id);

-- 9. Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'parent_name', 'Parent'));
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if present, then create
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
