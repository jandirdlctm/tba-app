-- TBA Construction — Phase 1 access policies
-- Run this in the Supabase SQL editor if your project enabled Row Level
-- Security on `projects` by default (symptom: rows show in the dashboard but
-- the app's anon key gets an empty list).
--
-- PHASE 1 STUB: single admin user, no auth. These policies let the anonymous
-- (public) key read and add projects — functionally the same exposure as the
-- single-admin assumption. When auth/roles arrive in a later phase, REPLACE
-- these with policies scoped to authenticated users / ownership.

alter table public.projects enable row level security;

-- Drop-then-create so this file is safe to re-run.
drop policy if exists "phase1_anon_select" on public.projects;
drop policy if exists "phase1_anon_insert" on public.projects;

create policy "phase1_anon_select"
  on public.projects
  for select
  to anon
  using (true);

create policy "phase1_anon_insert"
  on public.projects
  for insert
  to anon
  with check (true);
