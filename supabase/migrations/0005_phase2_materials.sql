-- ===========================================================================
-- TBA Construction — Phase 2, Workstream 3: Materials & Receipts (admin only)
-- Run AFTER 0004. Depends on the is_admin() helper defined there.
-- ===========================================================================

create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  item_name   text not null,
  quantity    numeric not null default 1,
  unit_cost   numeric not null default 0,
  status      text not null default 'needed'
                check (status in ('needed', 'ordered', 'received')),
  note        text,
  -- Storage path of the receipt image in the private `receipts` bucket
  -- (e.g. "<project_id>/<uuid>.jpg"). The app turns this into a short-lived
  -- signed URL on render. Named *_url to match the Phase 2 spec.
  receipt_url text,
  -- Generated column: total line cost. Kept in the DB so it can't drift from
  -- quantity × unit_cost and is available to any future reporting.
  total_cost  numeric generated always as (quantity * unit_cost) stored,
  created_at  timestamptz not null default now()
);

create index if not exists materials_project_idx on public.materials (project_id);

-- ---------------------------------------------------------------------------
-- RLS — materials are ADMIN ONLY. Workers cannot read or write any of it,
-- including via a direct query. This is the cost/material wall from the spec.
-- ---------------------------------------------------------------------------
alter table public.materials enable row level security;

drop policy if exists materials_all on public.materials;

create policy materials_all on public.materials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
