-- TBA Construction — Phase 1 schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / idempotent guards where practical.

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase, but be explicit).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  latitude    double precision,
  longitude   double precision,
  work_type   text,
  status      text not null default 'upcoming'
                check (status in ('active', 'upcoming', 'completed')),
  scope_note  text,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now()
);

-- Helps the map sort/filter by status; harmless if it already exists.
create index if not exists projects_status_idx on public.projects (status);

-- ---------------------------------------------------------------------------
-- PHASE 1 STUB: single-admin app, no auth yet.
-- Row Level Security is intentionally NOT enabled so the anon key can read and
-- write directly. When auth/roles arrive in a later phase, enable RLS here and
-- add policies — the data-access layer (src/lib/projects.ts) is the only place
-- that touches this table, so the seam is small.
--
--   alter table public.projects enable row level security;
--   create policy "..." on public.projects for select using (...);
-- ---------------------------------------------------------------------------
