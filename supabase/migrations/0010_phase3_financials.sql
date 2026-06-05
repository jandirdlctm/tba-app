-- ===========================================================================
-- TBA Construction — Phase 3 (preview): Job Profitability
-- Run in the Supabase SQL editor AFTER 0004–0008.
--
-- Tracks revenue + labor rate per job so we can show profit = contract value
-- minus materials cost minus labor cost (logged hours × rate).
--
-- IMPORTANT: financial figures live in their OWN table (not on `projects`),
-- because assigned workers can read the projects row. Keeping contract value
-- and labor rate here, behind an admin-only policy, preserves the rule that
-- workers never see costs/margins — even via a direct query.
-- ===========================================================================

create table if not exists public.project_financials (
  project_id     uuid primary key references public.projects (id) on delete cascade,
  contract_value numeric not null default 0,  -- revenue / what the job is sold for
  labor_rate     numeric not null default 0,  -- company labor COST per hour
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — admin only (same wall as the materials table).
-- ---------------------------------------------------------------------------
alter table public.project_financials enable row level security;

drop policy if exists financials_all on public.project_financials;

create policy financials_all on public.project_financials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Profitability rollup (one row per project).
--
-- SECURITY DEFINER so it can aggregate materials/time_entries/financials in a
-- single call, but gated by `where public.is_admin()` so a non-admin who calls
-- it gets zero rows. Materials cost uses the generated total_cost column; labor
-- cost is total logged hours × the project's labor rate.
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
    coalesce(f.contract_value, 0)                                              as contract_value,
    coalesce(m.materials_cost, 0)                                              as materials_cost,
    coalesce(t.labor_hours, 0)                                                 as labor_hours,
    coalesce(f.labor_rate, 0)                                                  as labor_rate,
    coalesce(t.labor_hours, 0) * coalesce(f.labor_rate, 0)                     as labor_cost,
    coalesce(f.contract_value, 0)
      - coalesce(m.materials_cost, 0)
      - (coalesce(t.labor_hours, 0) * coalesce(f.labor_rate, 0))               as profit
  from public.projects p
  left join public.project_financials f on f.project_id = p.id
  left join (
    select project_id, sum(total_cost) as materials_cost
    from public.materials
    group by project_id
  ) m on m.project_id = p.id
  left join (
    select project_id, sum(hours) as labor_hours
    from public.time_entries
    group by project_id
  ) t on t.project_id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

grant execute on function public.project_profitability() to authenticated;
