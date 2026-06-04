import { createClient, type Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import type { Profile } from '../types';

// ---------------------------------------------------------------------------
// Auth + profile + worker-management data access.
// Mirrors the thin-module pattern of lib/projects.ts.
// ---------------------------------------------------------------------------

/** Current session (or null). */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to login/logout. Returns an unsubscribe function. */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Email/password sign-in. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** The signed-in user's profile (role, name). RLS lets you read your own. */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  return (data as Profile) ?? null;
}

/** All profiles (admin-only via RLS). Used to assign workers to projects. */
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw new Error(`Could not load workers: ${error.message}`);
  return (data ?? []) as Profile[];
}

/**
 * Admin creates a worker account.
 *
 * We can't use the service-role Admin API in the browser, so we sign the new
 * user up via Supabase Auth. signUp would normally replace the CURRENT session
 * with the new user's — so we do it on a SEPARATE, non-persisting client and
 * sign that throwaway client out immediately. The admin's own session, which
 * lives on the main `supabase` client, is never touched.
 *
 * The DB trigger (handle_new_user) creates the matching `profiles` row as a
 * 'worker'. Requires "Confirm email" to be OFF in Supabase Auth settings so the
 * worker can log in right away (see README).
 */
export async function createWorker(
  email: string,
  password: string,
  fullName: string,
): Promise<void> {
  const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await tmp.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  // Tidy up the throwaway session regardless of outcome.
  await tmp.auth.signOut();

  if (error) throw new Error(error.message);
}
