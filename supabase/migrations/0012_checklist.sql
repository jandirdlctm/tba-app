-- ===========================================================================
-- TBA Construction — Scope checklist
-- Run in the Supabase SQL editor AFTER 0004 (needs is_assigned).
--
-- Turns the free-text scope/needs into an actionable checklist. The free-text
-- scope_note stays on projects as a description; this table holds the checkable
-- items. Any user ASSIGNED to the project (admin or worker) can add, check,
-- edit, reorder, and delete items.
-- ===========================================================================

create table if not exists public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  position    integer not null default 0,  -- manual sort order
  created_at  timestamptz not null default now()
);

create index if not exists checklist_items_project_idx on public.checklist_items (project_id);

-- ---------------------------------------------------------------------------
-- RLS — anyone assigned to the project (admins always pass via is_assigned)
-- can do everything. Unassigned workers can't see or touch it.
-- ---------------------------------------------------------------------------
alter table public.checklist_items enable row level security;

drop policy if exists checklist_all on public.checklist_items;

create policy checklist_all on public.checklist_items
  for all to authenticated
  using (public.is_assigned(project_id))
  with check (public.is_assigned(project_id));
