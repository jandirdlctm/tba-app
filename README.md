# TBA Construction — Project Overview (Phase 1)

A single-screen, mobile-friendly map of every project for a small construction
company. The owner's core problem is **visibility** — Phase 1 puts every job on
one map, color-coded by status, with a quick-glance popup and a form to add new
projects. Nothing more.

Built with React (Vite) + TypeScript, Supabase (Postgres), React Router, and
react-leaflet over free OpenStreetMap tiles.

> **Deployment:** hosted on Vercel and connected to this GitHub repo — every push
> to `main` auto-deploys to production (`tba-app.vercel.app`).

---

## What's in Phase 1

- **Project Overview Map** (`/`) — all projects as teardrop pins, color-coded:
  active = green, upcoming = amber, completed = gray. Fits to show all visible
  pins. Includes a legend and a "locate me" control.
- **Status filter chips** — All / Active / Upcoming / Completed (single-select,
  client-side filtering — no refetch).
- **Quick-glance popup** — name, address, status badge, work type, and the
  scope note ("Needs"), plus a stubbed "View details →".
- **Add Project form** (`/add`) — geocodes the address to a map pin on save.

---

## Prerequisites

- **Node 18+** (project developed on Node 23)
- A free **Supabase** project — <https://supabase.com>

---

## Run it

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

In the Supabase dashboard, open **SQL Editor** and run the two migration files
in order (copy/paste the contents):

1. `supabase/migrations/0001_init.sql` — creates the `projects` table.
2. `supabase/migrations/0002_seed.sql` — inserts 5 sample Salt Lake City–area
   projects so the map isn't empty.

> The app does **not** assume the table exists — you must run the SQL above.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` and paste your values from
**Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Start the dev server

```bash
npm run dev
```

Open the printed URL (default <http://localhost:5173>). You should see the map
populated with the seeded pins.

### Other commands

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run typecheck  # type-check only
```

---

## Project structure

```
src/
  components/
    ProjectMap.tsx     # ALL Leaflet code lives here (swap providers behind this)
    markerIcons.ts     # status-colored teardrop pins
    StatusChips.tsx    # filter chips
    ProjectPopup.tsx   # quick-glance card
    TopBar.tsx         # shared header
  lib/
    supabase.ts        # the one Supabase client
    projects.ts        # data access: getProjects / addProject
    geocode.ts         # geocodeAddress() — Nominatim, swappable
  pages/
    MapPage.tsx
    AddProjectPage.tsx
    ProjectDetailPage.tsx   # Phase 2 placeholder
  types.ts             # shared Project types + status/work-type constants
supabase/migrations/   # SQL you run in the Supabase SQL editor
```

---

## Swapping providers later

- **Map:** all Leaflet/OpenStreetMap usage is isolated in
  `src/components/ProjectMap.tsx`. To move to Mapbox/Google, reimplement just
  that file against the same `projects` prop.
- **Geocoding:** `src/lib/geocode.ts` exposes a single `geocodeAddress(address)`
  helper. Swap the Nominatim call for any provider there.
- **Data / auth:** all DB access goes through `src/lib/projects.ts` and the one
  client in `src/lib/supabase.ts`.

A note on Nominatim: it's free with no API key, but its usage policy asks for
≤1 request/second. We only geocode on form submit, so we stay well within that.

---

## What's stubbed for later phases

These are intentional Phase-1 seams (each is commented in the code):

- **Single admin user — no auth/RLS.** `0001_init.sql` leaves RLS off and notes
  where to enable it; `supabase.ts` notes where auth config goes.
- **Hamburger menu** (top-left) is a non-functional placeholder.
- **"View details →"** routes to `/project/:id`, a placeholder page that says
  "Project detail — coming in Phase 2."

## Explicitly out of scope for Phase 1

Worker logins/roles, project detail pages, to-do lists, materials/receipts, cost
tracking, time tracking/clock-in/calendars, photo uploads, and lead/bid/contract
management. Clean seams are left for them, but none are implemented.

---
---

# Phase 2 — Auth, Roles, Detail Page, Materials, Hours & Photos

Phase 2 builds on Phase 1. Auth comes first; everything else keys off who's
logged in. **Row Level Security (RLS) is the real access control** — the UI just
hides what a role shouldn't touch, but the database enforces it even against
direct queries.

## What's new

- **Login + roles.** Email/password auth gates the whole app. Two roles:
  `admin` (owner/PM — sees & edits everything) and `worker` (sub — sees only
  assigned projects; logs their own hours; adds photos; **never** sees
  materials, costs, or other workers' data).
- **Real project detail page** (replaces the Phase 1 stub) with tabs:
  Overview, Materials (admin), Hours, Photos. Includes inline-editable header
  (admin), a **Demo/Prep → Build → Finish** stage tracker (separate from
  active/upcoming/completed status), and per-project worker assignment.
- **Materials & receipts** (admin only): line items with quantity × unit cost,
  a running total, status (needed/ordered/received), and a receipt photo per
  line.
- **Time tracking** (manual entry only — no clock-in/out): workers add/edit/
  delete their own hours per day against an assigned project; admins see totals
  rolled up per project and per worker.
- **Photos:** any user assigned to a project can upload/view a photo grid.

## .env additions

**None.** Phase 2 reuses the same two variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`). Auth and Storage are part of the same Supabase
project.

## Database setup (run in order, in the Supabase SQL editor)

After the Phase 1 files (0001–0003), run:

1. `supabase/migrations/0004_phase2_auth.sql` — `profiles`, `project_assignments`,
   the `projects.stage` column, the **RLS helper functions**, the rewritten
   projects policies, and the new-user trigger. **Then edit & run the
   `PROMOTE YOUR FIRST ADMIN` line at the bottom of that file** (see below).
2. `supabase/migrations/0005_phase2_materials.sql` — materials (+ admin-only RLS).
3. `supabase/migrations/0006_phase2_time.sql` — time_entries (+ RLS).
4. `supabase/migrations/0007_phase2_photos.sql` — photos (+ RLS).
5. `supabase/migrations/0008_phase2_storage.sql` — the two private Storage
   buckets (`receipts`, `project-photos`) and their policies.

## One required Supabase setting

Turn **off** email confirmation so admin-created workers can log in immediately:
**Authentication → Providers → Email → uncheck "Confirm email" → Save.**
(The app sets each worker's password directly; there's no inbox to confirm from.)

## Creating the first admin account

1. **Authentication → Users → Add user** in the Supabase dashboard. Enter an
   email + password and tick "Auto Confirm User".
2. The trigger creates a matching profile as a `worker`. Promote it to admin —
   run this in the SQL editor (the same line is templated at the end of `0004`):

   ```sql
   update public.profiles set role = 'admin', full_name = 'Owner'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Log in at `/login`. As admin you'll see all Phase 1 projects again (admins
   pass the projects policy for every row), plus the **+ Add** button and the
   **Manage workers** menu item.

## Creating a test worker account

1. Log in as the admin → menu (top-left) → **Manage workers**.
2. Fill in name, email, and a temporary password → **Create worker**.
3. Open any project → **Overview → Assigned workers** → assign that worker.
4. Log out, then log in as the worker: they see only the assigned project, with
   the trimmed tabs (Overview / Hours / Photos — no Materials), and can log
   hours and add photos.

## Verifying RLS (do this — it's the core deliverable)

A script proves a worker can't reach protected data even with direct queries:

```bash
node scripts/verify-rls.mjs <worker-email> <worker-password>
```

It signs in as the worker and asserts: 0 materials readable, material insert
blocked, only their own time entries visible, only assigned projects visible,
and only their own profile visible. Exit code is non-zero if any check fails.

## New files (Phase 2)

```
src/
  context/AuthProvider.tsx     # session + profile + isAdmin
  components/
    RouteGuards.tsx            # RequireAuth / RequireAdmin
    StageTracker.tsx
    OverviewSection.tsx        # editable header + scope + stage + assignments
    AssignmentsManager.tsx
    MaterialsSection.tsx
    HoursSection.tsx
    PhotosSection.tsx
  lib/
    auth.ts                    # sign in/out, profile, createWorker
    assignments.ts
    materials.ts               # + receipt upload / signed URLs
    timeEntries.ts
    photos.ts                  # + photo upload / signed URLs
  pages/
    LoginPage.tsx
    AdminWorkersPage.tsx
    ProjectDetailPage.tsx      # rewritten from the stub
scripts/verify-rls.mjs
supabase/migrations/0004–0008  # tables, RLS policies, storage
```

## How the RLS holds together (the important part)

- Two `SECURITY DEFINER` helpers — `is_admin()` and `is_assigned(project_id)` —
  are called from every policy. Being SECURITY DEFINER, they read `profiles` /
  `project_assignments` without re-triggering RLS, which avoids the classic
  infinite-recursion trap.
- `materials` and the `receipts` bucket: **admins only**.
- `time_entries`: a worker reads/writes only rows where `user_id = auth.uid()`;
  admins read all (for rollups).
- `photos` and the `project-photos` bucket: anyone `is_assigned` to the project.
- Storage buckets are **private**; the app serves files via short-lived signed
  URLs, so even the image bytes are gated by the same policies.

## Phase 2 stubs / seams left for later

- `createWorker` uses client-side `signUp` on a throwaway client (no service-role
  key in the browser). For higher volume, move worker creation to an Edge
  Function using the Admin API. The seam is `lib/auth.ts`.
- The new-user trigger always assigns role `worker` (prevents self-signup
  privilege escalation); additional admins are promoted via SQL.

## Out of scope for Phase 2 (unchanged from the brief)

Clock-in/out & selfie verification, lead/bid/contract/payment, push
notifications, reporting/exports, and multi-company/white-label. Seams are left,
but none are built.
