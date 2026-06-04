import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

/** Full-screen spinner while we resolve the initial session. */
function AuthLoading() {
  return (
    <div className="page page--auth">
      <div className="spinner" aria-hidden="true" />
    </div>
  );
}

/** Gate: must be signed in. Redirects to /login, remembering the target. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Gate: must be an admin. Workers are bounced back to the map. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  // Wait for the profile to resolve before judging the role.
  if (!profile) return <AuthLoading />;
  if (profile.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
