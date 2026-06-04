-- ===========================================================================
-- TBA Construction — Phase 2, Workstream 5: Photos
-- Run AFTER 0004. Any user ASSIGNED to a project (worker or admin) can upload
-- and view that project's photos.
-- ===========================================================================

create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- Storage path in the private `project-photos` bucket
  -- (e.g. "<project_id>/<uuid>.jpg"). Rendered via a signed URL.
  photo_url   text not null,
  caption     text,
  created_at  timestamptz not null default now()
);

create index if not exists photos_project_idx on public.photos (project_id);

-- ---------------------------------------------------------------------------
-- RLS — read/write limited to users assigned to the project (admins always
-- pass via is_assigned). Deletes are limited to the uploader or an admin.
-- ---------------------------------------------------------------------------
alter table public.photos enable row level security;

drop policy if exists photos_select on public.photos;
drop policy if exists photos_insert on public.photos;
drop policy if exists photos_delete on public.photos;

create policy photos_select on public.photos
  for select to authenticated
  using (public.is_assigned(project_id));

create policy photos_insert on public.photos
  for insert to authenticated
  with check (public.is_assigned(project_id) and user_id = auth.uid());

create policy photos_delete on public.photos
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
