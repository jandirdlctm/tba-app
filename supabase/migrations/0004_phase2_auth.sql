-- ===========================================================================
-- TBA Construction — Phase 2, Workstream 1: Auth & Roles
-- Run this in the Supabase SQL editor AFTER the Phase 1 migrations (0001–0003).
--
-- This file:
--   1. Adds the `profiles` and `project_assignments` tables.
--   2. Adds a job `stage` column to `projects` (Demo/Prep → Build → Finish).
--   3. Defines SECURITY DEFINER helper functions used by every RLS policy.
--   4. Replaces the Phase 1 anonymous projects policies with auth/role policies.
--   5. Adds a trigger that creates a profile row whenever an auth user is made.
--
-- RLS is the core deliverable of Phase 2. Workers must never be able to read
-- cost/material data or other workers' time entries — not even with a direct
-- query. The policies here (and in 0005–0008) enforce that at the database.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- profiles: one row per auth user, carrying their display name and role.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'worker' check (role in ('admin', 'worker')),
  created_at  timestamptz not null default now()
);

-- project_assignments: which workers can see/act on which projects.
create table if not exists public.project_assignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_assignments_user_idx on public.project_assignments (user_id);
create index if not exists project_assignments_project_idx on public.project_assignments (project_id);

-- Job stage on the existing projects table. Distinct from active/upcoming/
-- completed status — this tracks the physical workflow of the job.
alter table public.projects
  add column if not exists stage text not null default 'demo_prep'
    check (stage in ('demo_prep', 'build', 'finish'));

-- ---------------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER)
--
-- These run with the definer's privileges, so calling them inside a policy
-- does NOT re-trigger RLS on the tables they read. That is what lets us check
-- "is this user an admin?" from within the profiles policy without infinite
-- recursion. search_path is pinned to public for safety.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_assigned(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Admins implicitly pass for every project; workers must have an assignment.
  select public.is_admin() or exists (
    select 1 from public.project_assignments
    where project_id = p_project and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS — profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;

-- A user can read their own profile; admins can read everyone (needed to list
-- and assign workers, and to label time entries by name). Workers therefore
-- cannot see other workers' profiles.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- A user can edit their own profile; admins can edit anyone (e.g. promote).
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- NOTE: no INSERT policy. Profiles are created by the on_auth_user_created
-- trigger below, which runs as SECURITY DEFINER and bypasses RLS.

-- ---------------------------------------------------------------------------
-- 4. RLS — project_assignments
-- ---------------------------------------------------------------------------
alter table public.project_assignments enable row level security;

drop policy if exists assignments_select on public.project_assignments;
drop policy if exists assignments_write on public.project_assignments;

-- Workers may see their own assignments; admins see all.
create policy assignments_select on public.project_assignments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only admins create/remove assignments.
create policy assignments_write on public.project_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. RLS — projects (replace the Phase 1 anonymous policies)
-- ---------------------------------------------------------------------------

-- Remove the Phase 1 "anon can do anything" policies from 0003.
drop policy if exists phase1_anon_select on public.projects;
drop policy if exists phase1_anon_insert on public.projects;

drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

-- Admins see every project; workers see only the projects they're assigned to.
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_assigned(id));

-- Only admins create, edit, or delete projects.
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_admin());

create policy projects_update on public.projects
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Auto-create a profile when an auth user is created
--
-- The profile's role is ALWAYS 'worker' here, regardless of any client-supplied
-- metadata — this prevents a self-signup from escalating to admin. Promote the
-- first admin with the SQL at the bottom of this file; create additional
-- workers from the in-app admin screen.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'worker'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Backfill + first-admin promotion (RUN MANUALLY — see comments)
-- ---------------------------------------------------------------------------

-- If you created users in the Auth dashboard BEFORE this trigger existed, this
-- backfills missing profile rows (all as 'worker'):
insert into public.profiles (id, full_name, role)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), 'worker'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- PROMOTE YOUR FIRST ADMIN: replace the email, then run this one line.
-- (The Phase 1 data becomes visible again the moment an admin account exists,
-- because admins pass projects_select for every project.)
--
--   update public.profiles set role = 'admin', full_name = 'Owner'
--   where id = (select id from auth.users where email = 'you@example.com');
