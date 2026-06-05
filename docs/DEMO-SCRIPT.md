# Client Demo Script — TBA Construction app

A tight ~5-minute walkthrough that leads with the owner's pain (visibility) and
lands the strongest differentiator (crew can log work but never see your costs).

**Live app:** https://tba-app.vercel.app

---

## Before the meeting (setup checklist)

- [ ] Run `supabase/migrations/0009_demo_data.sql` (set the worker email first) so
      Materials + Hours aren't empty.
- [ ] In the app, open the demo project → **Photos** → upload 1–2 job photos from
      your phone.
- [ ] Confirm you have **two accounts ready**: your **admin** login and one
      **worker** login (assigned to the "Sugar House" project by the seed).
- [ ] Open the app on **two devices** (or your laptop + your phone): admin on one,
      worker on the other. Log both in ahead of time.
- [ ] Confirm Supabase **"Confirm email" is OFF** (so creating a worker live works).
- [ ] Pick one project address you know geocodes cleanly if you'll add one live.

---

## The script

### 1. The hook (30 sec) — say this first
> "Right now every job lives in spreadsheets and your head. This puts all of them
> on one map, and gives your crew a simple way to log hours and photos — without
> ever seeing your costs."

Open the app to the **map**. Let the pins land.

### 2. Visibility — the map (1 min)
- Point out the **color-coded pins**: green = active, amber = upcoming, gray = done.
- Tap the **filter chips** (Active / Upcoming…) — "see just what's in progress."
- Tap a **pin** → the quick card (name, address, status, what's needed).
- Tap **View details →**.

### 3. One job, fully organized (1.5 min)
On the project detail page, walk the tabs:
- **Overview** — the facts, plus the **Demo/Prep → Build → Finish** stage tracker.
  Tap a stage to advance it: "this is where the job physically is."
- **Materials** — line items, statuses, and a **running cost total**. Tap one to
  show the **receipt photo**. "Everything you're buying for the job, in one place."
- **Hours** — "your crew logs time per day; you see totals per worker."
- **Photos** — the job-site gallery.

### 4. THE moment — role-based access (1.5 min)
This is the close. Have the **worker device** ready.
- "Here's what my crew sees when *they* log in."
- On the worker device, show their **map** — only the job(s) you assigned them.
- Open that job: **no Materials tab. No costs. No other workers' hours.**
- Back on admin: "I see everything; they see only their work. They literally
  can't pull up my numbers — it's locked at the database, not just hidden."

> This is the line that sells it. Pause here.

### 5. Add a worker live (optional, 30 sec)
- Menu → **Manage workers** → create one with a name + email + password.
- "That's how you onboard a sub in 10 seconds."

### 6. Close
> "Phase 1 was seeing every job on a map. Phase 2 added logins, hours, materials,
> and photos. Next phases can add estimates, contracts, and invoicing — whatever
> matters most to you."

---

## If something goes sideways
- **A pin is missing:** that project's address didn't geocode — don't add new
  projects live unless you've tested the address. Use the seeded ones.
- **Worker sees no jobs:** they aren't assigned — open the project (admin) →
  Overview → Assigned workers → add them.
- **Photo won't upload:** check phone photo permissions; try a smaller image.

## Talking points / objections
- **"Is my data safe?"** Yes — every table has row-level security; workers are
  blocked from cost/material data even if they tried to query it directly.
- **"Does it work on phones?"** Built mobile-first for the crew in the field.
- **"Can we change the workflow?"** The stages and fields are ours to adjust.
