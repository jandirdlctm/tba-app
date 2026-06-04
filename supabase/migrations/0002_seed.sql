-- TBA Construction — Phase 1 seed data
-- Run AFTER 0001_init.sql so the map isn't empty on first run.
-- 5 sample projects across the Salt Lake City area, mixed statuses.
-- Coordinates are real-ish lat/lng for each neighborhood so pins land sensibly.

insert into public.projects
  (name, address, latitude, longitude, work_type, status, scope_note, start_date, end_date)
values
  ('Holladay Backyard Hardscape',
   '4580 S Holladay Blvd, Holladay, UT 84117',
   40.6688, -111.8246,
   'Hardscape', 'active',
   'Paver patio + retaining wall along the east fence line. Crew on site Mon–Thu.',
   '2026-05-18', '2026-06-20'),

  ('Sugar House Front Yard Landscaping',
   '2100 S 1100 E, Salt Lake City, UT 84106',
   40.7250, -111.8580,
   'Landscaping', 'active',
   'Full front-yard tear-out, new sod, drip irrigation, three planter beds.',
   '2026-05-26', '2026-06-12'),

  ('Draper Driveway Flatwork',
   '12345 S 1300 E, Draper, UT 84020',
   40.5247, -111.8638,
   'Concrete / flatwork', 'upcoming',
   'Demo old driveway and pour new flatwork. Waiting on permit + concrete schedule.',
   '2026-06-15', '2026-07-01'),

  ('Sandy HOA Paperwork / Bid',
   '9000 S 700 E, Sandy, UT 84070',
   40.5897, -111.8702,
   'Paper job', 'upcoming',
   'Scope + estimate for HOA common-area walkway repairs. Site walk pending.',
   null, null),

  ('Millcreek Walkway Replacement',
   '3400 S 900 E, Millcreek, UT 84106',
   40.6900, -111.8650,
   'Concrete / flatwork', 'completed',
   'Replaced cracked front walkway and added an ADA-friendly approach. Closed out.',
   '2026-04-07', '2026-04-25');
