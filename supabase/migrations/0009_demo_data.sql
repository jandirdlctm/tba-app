-- ===========================================================================
-- TBA Construction — DEMO data (optional, for showing the app to a client)
-- Run in the Supabase SQL editor AFTER 0001–0008.
--
-- Fills ONE project ("Sugar House Front Yard Landscaping" from the Phase 1
-- seed) with materials, a worker assignment, and a week of logged hours so the
-- Materials / Hours tabs aren't empty during a demo. Safe to re-run (guarded
-- against duplicates).
--
-- Photos can't be seeded from SQL (they're real uploaded files) — snap 1–2 on
-- your phone in the Photos tab during setup.
--
-- 👉 BEFORE RUNNING: set the worker email on the line marked CHANGE ME below to
--    the worker account you created in the app. Materials seed regardless; the
--    assignment + hours only seed if that worker exists.
-- ===========================================================================

-- The project name 'Sugar House Front Yard Landscaping' is used in two places
-- below (materials query + the DO block). If you renamed/removed that seed
-- project, change both occurrences to an existing project name.

-- ---------------------------------------------------------------------------
-- Materials (no user needed) — populates the Materials tab + cost total.
-- ---------------------------------------------------------------------------
insert into public.materials (project_id, item_name, quantity, unit_cost, status, note)
select p.id, m.item_name, m.quantity, m.unit_cost, m.status, m.note
from public.projects p
cross join (values
  ('Sod (pallet, 500 sq ft)',   3, 185.00, 'received', 'Kentucky bluegrass blend'),
  ('Drip irrigation kit',       1, 240.00, 'ordered',  '1/2 in tubing + emitters'),
  ('Planter mix (cu yd)',       4,  48.00, 'needed',   'For the three beds'),
  ('Steel landscape edging',    6,  22.50, 'received', '8 ft sections')
) as m(item_name, quantity, unit_cost, status, note)
where p.name = 'Sugar House Front Yard Landscaping'
  and not exists (
    select 1 from public.materials x
    where x.project_id = p.id and x.item_name = m.item_name
  );

-- ---------------------------------------------------------------------------
-- Assignment + logged hours (needs a real worker account).
-- ---------------------------------------------------------------------------
do $$
declare
  v_project uuid;
  v_user    uuid;
begin
  select id into v_project
  from public.projects
  where name = 'Sugar House Front Yard Landscaping'
  limit 1;

  -- CHANGE ME: the email of the worker you created in the app.
  select id into v_user
  from auth.users
  where email = 'worker@example.com'
  limit 1;

  if v_project is null then
    raise notice 'Demo project not found — edit the project name in this file.';
    return;
  end if;
  if v_user is null then
    raise notice 'Worker not found — set the worker email, then re-run. Materials still seeded.';
    return;
  end if;

  -- Assign the worker (unique constraint makes this safe to re-run).
  insert into public.project_assignments (project_id, user_id)
  values (v_project, v_user)
  on conflict (project_id, user_id) do nothing;

  -- A week of hours — only insert if this worker has none on this project yet.
  if not exists (
    select 1 from public.time_entries
    where project_id = v_project and user_id = v_user
  ) then
    insert into public.time_entries (project_id, user_id, work_date, hours, note) values
      (v_project, v_user, current_date - 4, 8,   'Tear-out and haul-off'),
      (v_project, v_user, current_date - 3, 7.5, 'Grading and prep'),
      (v_project, v_user, current_date - 2, 8,   'Irrigation trenching'),
      (v_project, v_user, current_date - 1, 6,   'Sod prep'),
      (v_project, v_user, current_date,     4,   'Planter beds');
  end if;
end $$;
