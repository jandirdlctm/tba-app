import { useEffect, useState } from 'react';
import { getAssignments, assignWorker, unassignWorker } from '../lib/assignments';
import { listProfiles } from '../lib/auth';
import type { Profile, ProjectAssignment } from '../types';

interface AssignmentsManagerProps {
  projectId: string;
}

// Admin-only: manage which workers are assigned to this project.
export default function AssignmentsManager({ projectId }: AssignmentsManagerProps) {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [a, p] = await Promise.all([getAssignments(projectId), listProfiles()]);
      setAssignments(a);
      // Only workers are assignable (admins already see everything).
      setWorkers(p.filter((x) => x.role === 'worker'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load assignments.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const assignedIds = new Set(assignments.map((a) => a.user_id));
  const available = workers.filter((w) => !assignedIds.has(w.id));

  async function handleAssign() {
    if (!pick) return;
    setBusy(true);
    try {
      await assignWorker(projectId, pick);
      setPick('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign worker.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      await unassignWorker(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove worker.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h3 className="card__title">Assigned workers</h3>

      {error && <div className="banner banner--error">{error}</div>}

      {assignments.length === 0 ? (
        <p className="muted-note">No workers assigned yet.</p>
      ) : (
        <ul className="row-list">
          {assignments.map((a) => (
            <li key={a.id} className="row">
              <span className="row__main">{a.profile?.full_name || 'Worker'}</span>
              <button
                type="button"
                className="link-btn link-btn--danger"
                onClick={() => handleRemove(a.id)}
                disabled={busy}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="assign-add">
        <select
          className="field__input"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          disabled={busy || available.length === 0}
        >
          <option value="">
            {available.length === 0 ? 'No more workers to add' : 'Select a worker…'}
          </option>
          {available.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name || w.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleAssign}
          disabled={busy || !pick}
        >
          Assign
        </button>
      </div>
    </section>
  );
}
