# Contributing to the TBA Construction app

Welcome aboard! This guide gets you from zero to running the app locally and
shipping changes safely. It assumes basic comfort with the terminal and git.

> **Tech stack:** React (Vite) + TypeScript, Supabase (Postgres + Auth +
> Storage), React Router, react-leaflet. Hosted on Vercel, auto-deployed from
> `main`. See [README.md](README.md) for the full architecture and the SQL
> migrations.

---

## 1. Get access (one-time)

You need access to two systems. Ask the project owner (Jandir) to invite you:

| System | Why | How the owner adds you |
|---|---|---|
| **GitHub** repo `jandirdlctm/tba-app` | The code | Repo → Settings → Collaborators → invite your GitHub username (**Write** role) |
| **Supabase** project | The database, logins, and storage | Supabase → Organization → Members → invite your email |

You'll also need the **two Supabase keys** for your local `.env` (the owner sends
these privately — they're not stored in the repo). The anon key is safe to use
in a browser; it's protected by the database's Row Level Security policies.

---

## 2. Run it locally

```bash
git clone https://github.com/jandirdlctm/tba-app.git
cd tba-app
npm install

cp .env.example .env
# then open .env and paste the two values the owner sent you:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

npm run dev
```

Open the printed URL (default http://localhost:5173). Log in with an account the
owner created for you (or your own admin account).

Useful scripts:

```bash
npm run dev        # local dev server with hot reload
npm run build      # type-check + production build (run before pushing big changes)
npm run typecheck  # type-check only
```

> **Heads-up: we share one database.** Both of us point at the same Supabase
> project, so you'll see each other's test data, and a schema change affects
> everyone. Coordinate before running destructive SQL. (A separate dev database
> is a future option, not set up yet.)

---

## 3. Database changes (migrations)

All schema lives in [`supabase/migrations/`](supabase/migrations/) as numbered
SQL files. **Never** change the schema by clicking around the Supabase dashboard
without capturing it as a migration — the next person won't have it.

To make a schema change:

1. Add a new file, incrementing the number: `00NN_short_description.sql`.
2. Write idempotent SQL where practical (`create table if not exists`,
   `drop policy if exists ... ` before `create policy`).
3. Run it in the **Supabase SQL editor** to apply it.
4. Commit the file so it's part of the PR.

**RLS is mandatory.** Every table must have Row Level Security policies that keep
workers from reading other people's data (costs, materials, other workers'
hours). Use the existing `is_admin()` / `is_assigned()` helpers. See `0004`–`0008`
for the pattern, and run `node scripts/verify-rls.mjs <worker-email> <pw>` after
RLS changes.

---

## 4. The workflow: branch → PR → preview → merge

**Don't push directly to `main`.** `main` is what auto-deploys to the live site.
Work on a branch and open a Pull Request.

```bash
git checkout main
git pull                       # start from the latest
git checkout -b feature/short-name

# ...make your changes...
git add -A
git commit -m "feat: describe what you did"
git push -u origin feature/short-name
```

Then on GitHub, **open a Pull Request** into `main`.

- Vercel automatically builds a **Preview deployment** for your branch and posts
  the URL on the PR — click it to test your change on a real URL (with the
  database connected) **without touching the live site**.
- The other person reviews the PR.
- When approved, **merge it**. Merging into `main` triggers the **production
  deploy** to `tba-app.vercel.app` automatically (~10–15s).

Keep PRs small and focused — easier to review, safer to ship.

---

## 5. Conventions

- **Commit messages:** short imperative summary, optionally prefixed
  `feat:` / `fix:` / `docs:` / `refactor:` / `chore:`.
- **Code style:** match the surrounding code. Data access goes in a thin
  `src/lib/*.ts` module (one per table/feature); components stay focused; shared
  types live in `src/types.ts`. The map stays isolated behind
  `src/components/ProjectMap.tsx`.
- **Never commit secrets.** `.env` is git-ignored — keep it that way. Anything
  that needs to reach production goes in Vercel's Environment Variables, scoped
  to Production **and** Preview.
- **Mobile-first.** Crew use this on phones in the field; test narrow widths.

---

## 6. Project map (where things live)

```
src/
  components/   # UI: ProjectMap, tabs, sections, forms, route guards
  context/      # AuthProvider (session + role)
  lib/          # data access: projects, auth, materials, timeEntries, photos, ...
  pages/        # routed screens: Map, Login, ProjectDetail, AddProject, AdminWorkers
  types.ts      # shared record types
supabase/migrations/  # SQL: tables + RLS policies + storage
scripts/verify-rls.mjs # RLS test
```

Questions about anything here? Ask in the repo (open an issue) or message the
owner. Thanks for contributing!
