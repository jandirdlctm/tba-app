import { createClient } from '@supabase/supabase-js';

// Reads from .env (see .env.example). Vite exposes VITE_* vars on import.meta.env.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud and early — a missing env var otherwise shows up as a confusing
  // "Failed to fetch" deep inside the data layer.
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

// The one app-wide Supabase client. Phase 2 turns on auth: sessions persist in
// localStorage and tokens auto-refresh so a logged-in user stays logged in.
// (lib/auth.ts spins up a separate short-lived client for admin worker creation
// so it never disturbs this session.)
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Re-exported so lib/auth.ts can build its throwaway signup client without
// re-reading import.meta.env.
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
