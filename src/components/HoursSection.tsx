import { useEffect, useMemo, useState } from 'react';
import {
  getMyEntries,
  getProjectEntries,
  addTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from '../lib/timeEntries';
import type { TimeEntry } from '../types';

interface HoursSectionProps {
  projectId: string;
  /** Admin sees everyone's hours rolled up; worker sees + edits only their own. */
  isAdmin: boolean;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${m}/${day}/${y}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HoursSection({ projectId, isAdmin }: HoursSectionProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TimeEntry | 'new' | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setEntries(isAdmin ? await getProjectEntries(projectId) : await getMyEntries(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hours.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isAdmin]);

  const total = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  // Admin: per-worker totals.
  const perWorker = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, { name: string; hours: number }>();
    for (const e of entries) {
      const name = e.profile?.full_name || 'Worker';
      const cur = map.get(e.user_id) ?? { name, hours: 0 };
      cur.hours += Number(e.hours);
      map.set(e.user_id, cur);
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours);
  }, [entries, isAdmin]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      await deleteTimeEntry(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  if (loading) return <p className="muted-note">Loading hours…</p>;

  return (
    <div className="detail-stack">
      {error && <div className="banner banner--error">{error}</div>}

      <section className="card">
        <div className="card__head">
          <h3 className="card__title">{isAdmin ? 'Hours (all workers)' : 'My hours'}</h3>
          <span className="total-pill">{total} h total</span>
        </div>

        {/* Admin rollup by worker */}
        {isAdmin && perWorker.length > 0 && (
          <ul className="row-list">
            {perWorker.map((w) => (
              <li key={w.name} className="row">
                <span className="row__main">{w.name}</span>
                <span className="row__meta">{w.hours} h</span>
              </li>
            ))}
          </ul>
        )}

        {entries.length === 0 ? (
          <p className="muted-note">No hours logged yet.</p>
        ) : (
          <ul className="row-list row-list--bordered">
            {entries.map((e) => (
              <li key={e.id} className="row">
                <div className="row__main">
                  <span className="row__date">{fmtDate(e.work_date)}</span>
                  {isAdmin && <span className="row__sub">{e.profile?.full_name || 'Worker'}</span>}
                  {e.note && <span className="row__sub">{e.note}</span>}
                </div>
                <span className="row__meta">{e.hours} h</span>
                {!isAdmin && (
                  <span className="row__actions">
                    <button type="button" className="link-btn" onClick={() => setEditing(e)}>
                      Edit
                    </button>
                    <button type="button" className="link-btn link-btn--danger" onClick={() => handleDelete(e.id)}>
                      Delete
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Workers log their own hours; admins only view rollups. */}
        {!isAdmin && editing === null && (
          <button type="button" className="btn btn--primary full-btn" onClick={() => setEditing('new')}>
            + Add hours
          </button>
        )}
      </section>

      {!isAdmin && editing !== null && (
        <HoursForm
          projectId={projectId}
          entry={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function HoursForm({
  projectId,
  entry,
  onClose,
  onSaved,
}: {
  projectId: string;
  entry: TimeEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workDate, setWorkDate] = useState(entry?.work_date ?? todayISO());
  const [hours, setHours] = useState(String(entry?.hours ?? ''));
  const [note, setNote] = useState(entry?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const h = Number(hours);
    if (!workDate) {
      setError('Pick a date.');
      return;
    }
    if (!h || h <= 0 || h > 24) {
      setError('Enter hours between 0 and 24.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (entry) {
        await updateTimeEntry(entry.id, { work_date: workDate, hours: h, note: note.trim() || null });
      } else {
        await addTimeEntry({ project_id: projectId, work_date: workDate, hours: h, note: note.trim() || null });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save hours.');
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h3 className="card__title">{entry ? 'Edit hours' : 'Add hours'}</h3>
      {error && <div className="banner banner--error">{error}</div>}

      <div className="form form--inline">
        <div className="field-row">
          <label className="field">
            <span className="field__label">Date</span>
            <input className="field__input" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Hours</span>
            <input className="field__input" type="number" min="0" max="24" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 8" />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Note</span>
          <input className="field__input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional — what you worked on" />
        </label>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
}
