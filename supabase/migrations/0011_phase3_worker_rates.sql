-- ===========================================================================
-- TBA Construction — Phase 3 (preview): per-worker labor cost rates
-- Run in the Supabase SQL editor AFTER 0010.
--
-- Gives each worker their own hourly COST rate (fully-loaded cost to the
-- company) so profit math uses each person's real rate instead of one flat
-- project rate. Rates live in their own ADMIN-ONLY table — a worker cannot read
-- any rate, not even their own. The project's labor_rate (0010) stays as a
-- fallback for hours logged by anyone without an individual rate set.
-- ===========================================================================

create table if not exists public.worker_rates (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  hourly_rate numeric not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.worker_rates enable row level security;

drop policy if exists worker_rates_all on public.worker_rates;

create policy worker_rates_all on public.worker_rates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Upgrade the profitability rollup: labor cost is now summed PER ENTRY as
-- (hours × that worker's rate), falling back to the project's labor_rate, then
-- 0. Replaces the 0010 version.
-- ---------------------------------------------------------------------------
create or replace function public.project_profitability()
returns table (
  project_id     uuid,
  project_name   text,
  status         text,
  contract_value numeric,
  materials_cost numeric,
  labor_hours    numeric,
  labor_rate     numeric,
  labor_cost     numeric,
  profit         numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.status,
    coalesce(f.contract_value, 0)                          as contract_value,
    coalesce(m.materials_cost, 0)                          as materials_cost,
    coalesce(t.labor_hours, 0)                             as labor_hours,
    coalesce(f.labor_rate, 0)                              as labor_rate,  -- project fallback rate (for display)
    coalesce(t.labor_cost, 0)                              as labor_cost,
    coalesce(f.contract_value, 0)
      - coalesce(m.materials_cost, 0)
      - coalesce(t.labor_cost, 0)                          as profit
  from public.projects p
  left join public.project_financials f on f.project_id = p.id
  left join (
    select project_id, sum(total_cost) as materials_cost
    from public.materials
    group by project_id
  ) m on m.project_id = p.id
  left join (
    -- Per-entry labor cost: each worker's rate, else the project's fallback.
    select
      te.project_id,
      sum(te.hours)                                                       as labor_hours,
      sum(te.hours * coalesce(wr.hourly_rate, pf.labor_rate, 0))          as labor_cost
    from public.time_entries te
    left join public.worker_rates wr      on wr.user_id = te.user_id
    left join public.project_financials pf on pf.project_id = te.project_id
    group by te.project_id
  ) t on t.project_id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;
