import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { listProfiles, createWorker } from '../lib/auth';
import type { Profile } from '../types';

// Admin-only: list everyone and create new worker accounts.
// (Project assignment happens per-project on the detail page.)
export default function AdminWorkersPage() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setProfiles(await listProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Name, email, and a password of at least 6 characters are required.');
      return;
    }
    setCreating(true);
    try {
      await createWorker(email.trim(), password, fullName.trim());
      setNotice(`Worker "${fullName.trim()}" created. They can log in with the email and password you set.`);
      setFullName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create worker.');
    } finally {
      setCreating(false);
    }
  }

  const workers = profiles.filter((p) => p.role === 'worker');
  const admins = profiles.filter((p) => p.role === 'admin');

  return (
    <div className="page page--form">
      <TopBar title="Manage workers" onBack={() => navigate('/')} />

      <div className="form">
        <section className="card">
          <h3 className="card__title">Add a worker</h3>
          {error && <div className="banner banner--error">{error}</div>}
          {notice && <div className="banner banner--ok">{notice}</div>}

          <form className="form form--inline" onSubmit={handleCreate}>
            <label className="field">
              <span className="field__label">Full name</span>
              <input className="field__input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Email</span>
              <input className="field__input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Temporary password</span>
              <input className="field__input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <span className="field__hint">Share these with the worker; they sign in with them.</span>
            </label>
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create worker'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3 className="card__title">Team</h3>
          {loading ? (
            <p className="muted-note">Loading…</p>
          ) : (
            <>
              {admins.length > 0 && (
                <ul className="row-list">
                  {admins.map((a) => (
                    <li key={a.id} className="row">
                      <span className="row__main">{a.full_name || '(no name)'}</span>
                      <span className="role-badge role-badge--admin">admin</span>
                    </li>
                  ))}
                </ul>
              )}
              {workers.length === 0 ? (
                <p className="muted-note">No workers yet.</p>
              ) : (
                <ul className="row-list row-list--bordered">
                  {workers.map((w) => (
                    <li key={w.id} className="row">
                      <span className="row__main">{w.full_name || '(no name)'}</span>
                      <span className="role-badge role-badge--worker">worker</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
