-- ===========================================================================
-- TBA Construction — Phase 2, Workstream 4: Time Tracking (manual entry only)
-- Run AFTER 0004. No clock-in/out, no camera — just manual hours.
-- ===========================================================================

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  work_date   date not null,
  hours       numeric not null check (hours > 0 and hours <= 24),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists time_entries_project_idx on public.time_entries (project_id);
create index if not exists time_entries_user_idx on public.time_entries (user_id);

-- ---------------------------------------------------------------------------
-- RLS — a worker reads/writes ONLY their own entries, and only on projects
-- they're assigned to. Admins can read everyone's (for per-project / per-worker
-- rollups) but don't edit others' hours. A worker cannot read another worker's
-- entries even with a direct query.
-- ---------------------------------------------------------------------------
alter table public.time_entries enable row level security;

drop policy if exists time_entries_select on public.time_entries;
drop policy if exists time_entries_insert on public.time_entries;
drop policy if exists time_entries_update on public.time_entries;
drop policy if exists time_entries_delete on public.time_entries;

create policy time_entries_select on public.time_entries
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

create policy time_entries_insert on public.time_entries
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_assigned(project_id));

create policy time_entries_update on public.time_entries
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy time_entries_delete on public.time_entries
  for delete to authenticated
  using (user_id = auth.uid());
