# TBA Construction — App Guide

Welcome! This is your one place to see every job on a map, track what's going
on, manage your crew, and keep hours, materials, and photos together per
project. This guide walks you through everything — no technical background
needed.

**Your app:** https://tba-app.vercel.app
Open it in any phone or computer web browser. You can add it to your phone's
home screen for one-tap access (see [Put it on your phone](#put-it-on-your-phone)).

---

## The two kinds of accounts

| | **Admin** (you, the owner / manager) | **Worker** (your subs / crew) |
|---|---|---|
| Sees | Every project | Only the projects you assign them to |
| Map | All pins | Only their assigned pins |
| Can add/edit projects | ✅ | ❌ |
| Materials & costs | ✅ Sees and edits | 🚫 Never sees them at all |
| Hours | Sees everyone's totals | Logs only their own |
| Photos | ✅ | ✅ (on assigned jobs) |
| Manage workers | ✅ | ❌ |

The key idea: **workers see only what they need.** They can log their hours and
snap job photos, but they can't see your costs, materials, or each other's
hours. That's locked down at the data level, not just hidden on screen.

---

## Signing in

1. Go to https://tba-app.vercel.app
2. Enter your **email** and **password**.
3. Tap **Sign in**.

You'll stay signed in on that device until you log out, so you won't have to do
this every time.

**To log out:** tap the menu (☰, top-left) → **Log out**.

---

## The map (your home screen)

When you sign in you land on the **Project overview** map. Every job is a colored
pin:

- 🟢 **Green = Active** — work is happening now
- 🟠 **Amber = Upcoming** — on the schedule, not started
- ⚪ **Gray = Completed** — finished

**Things you can do here:**

- **Filter:** tap **All / Active / Upcoming / Completed** along the top to show
  just those pins.
- **Tap a pin** to open a quick card: project name, address, status, work type,
  and the "Needs" note.
- **View details →** on that card opens the full project page.
- **Locate me** (the ◎ button, bottom-right) recenters the map on where you are.
- **+ Add** (top-right, admin only) starts a new project.

---

## Adding a new project (admin)

1. On the map, tap **+ Add** (top-right).
2. Fill in the form:
   - **Project name** and **Address** are required.
   - **Work type** — Landscaping, Concrete/flatwork, Hardscape, etc.
   - **Status** — Active / Upcoming / Completed.
   - **Start date** and **Goal end date** (optional).
   - **Scope / needs note** — what the job involves.
3. Tap **Save & drop pin.**

The app looks up the address and drops a pin on the map automatically. If it
can't find the address, it'll warn you — you can fix the address and save again,
or save anyway and correct it later.

---

## The project detail page

Tap any pin → **View details →**. This is the full record for one job. At the
top you'll see tabs. **Admins** see four; **workers** see three (no Materials).

### Overview tab

- **Job stage tracker: Demo / Prep → Build → Finish.** This is *separate* from
  the green/amber/gray status — it tracks where the physical work is. As admin,
  tap a stage to move the job along.
- **Details** — status, address, work type, dates. Tap **Edit** to change any of
  it (admin only).
- **Scope / needs** — the working note for the job. Tap **Edit** to update it.
- **Assigned workers** (admin only) — see [Managing your crew](#managing-your-crew).

### Materials tab (admin only)

Track everything you're buying for the job and what it costs.

- Tap **+ Add material**, then enter the item, quantity, unit cost, and status
  (**Needed / Ordered / Received**).
- The app multiplies quantity × cost and keeps a **running total** at the top.
- **Attach a receipt photo** to any line — tap into the item, choose **Receipt
  photo**, and pick or snap a picture.
- Edit or delete any line anytime.

Workers never see this tab or any of these numbers.

### Hours tab

- **Workers** see **My hours**: tap **+ Add hours**, pick the date, enter hours
  worked, add an optional note. They can edit or delete their own entries.
- **You (admin)** see the rollup: **total hours per worker** and a full list of
  every entry, so you know who logged what.

### Photos tab

- Anyone assigned to the job (you or the worker) can add photos.
- Tap into **Photo**, choose or snap an image, add an optional caption, and it
  appears in the grid.
- Tap a photo to view it full-size. Delete your own (admins can delete any).

Great for progress shots, before/after, and documenting issues on site.

---

## Managing your crew

### Add a worker

1. Menu (☰, top-left) → **Manage workers.**
2. Under **Add a worker**, enter their **name**, an **email**, and a
   **temporary password** (at least 6 characters).
3. Tap **Create worker.**
4. Hand the worker that email + password. They sign in with it. (Tip: ask them
   to tell you once they're in; they can keep using the same password.)

> The email doesn't have to be a real inbox — it's just their username. Use
> something easy like `mike@tbacrew.com` if you like.

### Assign a worker to a job

A worker sees **nothing** until you assign them to a project.

1. Open the project → **Overview** tab → **Assigned workers.**
2. Pick the worker from the dropdown → **Assign.**
3. To remove them, tap **Remove** next to their name.

Assign the same worker to as many jobs as you need.

---

## A worker's day (what your crew does)

1. Sign in at https://tba-app.vercel.app with the email/password you gave them.
2. Their map shows only their assigned jobs.
3. Tap a job → **View details.**
4. **Hours tab → + Add hours** to log time for the day.
5. **Photos tab** to add job-site pictures.

That's it — simple on a phone, in the field.

---

## Put it on your phone

For one-tap access like a real app:

- **iPhone (Safari):** open the site → tap the **Share** button → **Add to Home
  Screen.**
- **Android (Chrome):** open the site → tap the **⋮** menu → **Add to Home
  screen.**

---

## Quick troubleshooting

- **"I can't see any projects."** If you're a worker, you haven't been assigned
  to a job yet — ask your admin. If you're the admin and the map is empty, you
  haven't added any projects yet.
- **"A new project's pin isn't on the map."** The address couldn't be located.
  Open the project, tap **Edit**, and correct the address.
- **"I forgot my password."** Ask your admin to reset it for you.
- **"A worker says they can see costs."** They can't — materials and costs are
  completely hidden from worker accounts. If something looks off, double-check
  they're logged into their own worker account and not an admin account.

---

## Need a hand?

If anything doesn't work the way this guide describes, take a screenshot and
send it over. The app is set up to grow — future phases will add things like
estimates, contracts, and more — but for now this covers seeing every job at a
glance and keeping each one organized.
