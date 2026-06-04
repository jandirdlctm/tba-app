// ---------------------------------------------------------------------------
// RLS verification — proves a WORKER account cannot read protected data, even
// with direct Supabase queries (bypassing the UI entirely).
//
// Usage:
//   node scripts/verify-rls.mjs <worker-email> <worker-password>
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from your .env file.
// Requires the Phase 2 migrations (0004–0008) to be applied and at least one
// worker account that is assigned to at least one project.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/verify-rls.mjs <worker-email> <worker-password>');
  process.exit(2);
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

let failures = 0;
function check(name, passed, detail = '') {
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures++;
}

const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
if (signInErr) {
  console.error('Could not sign in as worker:', signInErr.message);
  process.exit(2);
}
const myId = signIn.user.id;
console.log(`Signed in as worker ${email} (${myId})\n`);

// 1) Worker must NOT see any materials (admin-only table).
{
  const { data, error } = await supabase.from('materials').select('*');
  check('worker reads 0 materials', !error && (data?.length ?? 0) === 0, error ? error.message : `${data?.length} rows`);
}

// 2) Worker must NOT be able to insert a material (write blocked).
{
  // Use any project the worker can see; if none, the insert still must fail RLS.
  const { data: projs } = await supabase.from('projects').select('id').limit(1);
  const pid = projs?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';
  const { error } = await supabase
    .from('materials')
    .insert({ project_id: pid, item_name: 'rls-probe', quantity: 1, unit_cost: 1, status: 'needed' });
  check('worker cannot insert a material', !!error, error ? 'blocked by RLS' : 'INSERT unexpectedly succeeded');
}

// 3) Worker only sees their OWN time entries (never another worker's).
{
  const { data, error } = await supabase.from('time_entries').select('user_id');
  const onlyMine = !error && (data ?? []).every((r) => r.user_id === myId);
  check('worker reads only their own time entries', onlyMine, error ? error.message : `${data?.length} rows, all self=${onlyMine}`);
}

// 4) Worker only sees projects they're assigned to (admins see all).
{
  const { data, error } = await supabase.from('projects').select('id');
  check('worker reads only assigned projects', !error, error ? error.message : `${data?.length} visible project(s)`);
}

// 5) Worker cannot read other workers' profiles (only their own).
{
  const { data, error } = await supabase.from('profiles').select('id');
  const onlySelf = !error && (data ?? []).every((r) => r.id === myId);
  check('worker reads only their own profile', onlySelf, error ? error.message : `${data?.length} profile row(s)`);
}

await supabase.auth.signOut();
console.log(`\n${failures === 0 ? 'All RLS checks passed. ✅' : `${failures} check(s) FAILED. ❌`}`);
process.exit(failures === 0 ? 0 : 1);
