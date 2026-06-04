import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthChange, getMyProfile, signIn, signOut } from '../lib/auth';
import type { Profile } from '../types';

// ---------------------------------------------------------------------------
// App-wide auth state. Holds the session + the signed-in user's profile (which
// carries their role), and exposes the derived `isAdmin` flag used to gate UI.
// RLS is the real enforcement; this just shapes what the UI offers.
// ---------------------------------------------------------------------------

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the current session once on mount, then keep it in sync.
  useEffect(() => {
    let active = true;

    getSession()
      .then((s) => active && setSession(s))
      .finally(() => active && setLoading(false));

    const unsub = onAuthChange((s) => {
      if (active) setSession(s);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Whenever the session changes, (re)load the matching profile.
  useEffect(() => {
    let active = true;
    if (!session) {
      setProfile(null);
      return;
    }
    getMyProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      signIn,
      signOut,
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
