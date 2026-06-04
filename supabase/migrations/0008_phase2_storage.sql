-- ===========================================================================
-- TBA Construction — Phase 2: Storage buckets + policies
-- Run AFTER 0004 (needs is_admin / is_assigned).
--
-- Two PRIVATE buckets. Private (not public) is deliberate: it means even the
-- file bytes are gated by RLS, so a worker can't pull a receipt image by URL.
-- The app reads files through short-lived signed URLs, which Supabase only
-- issues if the requester passes the SELECT policy below.
--
-- Object path convention (set by the app): "<project_id>/<uuid>.<ext>".
-- For project-photos we parse the leading folder back into the project id to
-- check assignment.
--
-- NOTE: run this in the Supabase SQL editor (it executes as a privileged role).
-- If a CREATE POLICY line ever errors with "must be owner of table objects",
-- create the equivalent policy from the dashboard instead:
-- Storage → Policies → (bucket) → New policy, using the same USING/CHECK
-- expressions shown below.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- receipts — ADMIN ONLY (matches the admin-only materials table).
-- ---------------------------------------------------------------------------
drop policy if exists "receipts admin all" on storage.objects;

create policy "receipts admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and public.is_admin())
  with check (bucket_id = 'receipts' and public.is_admin());

-- ---------------------------------------------------------------------------
-- project-photos — any user ASSIGNED to the project (admins always).
-- (storage.foldername(name))[1] is the "<project_id>" leading folder.
-- ---------------------------------------------------------------------------
drop policy if exists "photos read assigned" on storage.objects;
drop policy if exists "photos insert assigned" on storage.objects;
drop policy if exists "photos delete own or admin" on storage.objects;

create policy "photos read assigned" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-photos'
    and public.is_assigned(((storage.foldername(name))[1])::uuid)
  );

create policy "photos insert assigned" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-photos'
    and public.is_assigned(((storage.foldername(name))[1])::uuid)
  );

create policy "photos delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-photos'
    and (owner = auth.uid() or public.is_admin())
  );
