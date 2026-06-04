import { useState } from 'react';
import { updateProject } from '../lib/projects';
import StageTracker from './StageTracker';
import AssignmentsManager from './AssignmentsManager';
import {
  STATUS_META,
  WORK_TYPES,
  type JobStage,
  type Project,
  type ProjectPatch,
  type ProjectStatus,
} from '../types';

interface OverviewSectionProps {
  project: Project;
  isAdmin: boolean;
  onSaved: (updated: Project) => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['active', 'upcoming', 'completed'];

function fmtDate(d: string | null): string {
  if (!d) return '—';
  // Render YYYY-MM-DD without timezone surprises.
  const [y, m, day] = d.split('-');
  return `${m}/${day}/${y}`;
}

// Overview tab: header facts + stage + scope note. Admin can edit inline and
// manage assignments; worker sees a read-only view.
export default function OverviewSection({ project, isAdmin, onSaved }: OverviewSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft state for edit mode.
  const [draft, setDraft] = useState<ProjectPatch>({});

  function startEdit() {
    setDraft({
      name: project.name,
      address: project.address,
      work_type: project.work_type ?? '',
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      scope_note: project.scope_note,
    });
    setError(null);
    setEditing(true);
  }

  async function persist(patch: ProjectPatch) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, patch);
      onSaved(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!draft.name?.trim() || !draft.address?.trim()) {
      setError('Name and address are required.');
      return;
    }
    const ok = await persist({
      ...draft,
      name: draft.name.trim(),
      address: draft.address.trim(),
      work_type: draft.work_type?.trim() || null,
      scope_note: draft.scope_note?.trim() || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
    });
    if (ok) setEditing(false);
  }

  async function handleStage(next: JobStage) {
    if (next === project.stage) return;
    await persist({ stage: next });
  }

  const meta = STATUS_META[project.status];

  return (
    <div className="detail-stack">
      {/* Stage tracker — always visible; admin can advance it directly. */}
      <section className="card">
        <h3 className="card__title">Job stage</h3>
        <StageTracker stage={project.stage} editable={isAdmin} onChange={handleStage} saving={saving} />
      </section>

      {/* Header facts / edit form */}
      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Details</h3>
          {isAdmin && !editing && (
            <button type="button" className="link-btn" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        {editing ? (
          <div className="form form--inline">
            <label className="field">
              <span className="field__label">Project name</span>
              <input
                className="field__input"
                value={draft.name ?? ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">Address</span>
              <input
                className="field__input"
                value={draft.address ?? ''}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">Work type</span>
              <select
                className="field__input"
                value={draft.work_type ?? ''}
                onChange={(e) => setDraft({ ...draft, work_type: e.target.value })}
              >
                <option value="">—</option>
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field__label">Status</span>
              <div className="segmented" role="radiogroup" aria-label="Status">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={draft.status === s}
                    className={`segmented__btn${draft.status === s ? ' segmented__btn--on' : ''}`}
                    onClick={() => setDraft({ ...draft, status: s })}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field__label">Start date</span>
                <input
                  className="field__input"
                  type="date"
                  value={draft.start_date ?? ''}
                  onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field__label">Goal end date</span>
                <input
                  className="field__input"
                  type="date"
                  value={draft.end_date ?? ''}
                  onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                />
              </label>
            </div>
            <div className="form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="facts">
            <div className="facts__row">
              <dt>Status</dt>
              <dd>
                <span className="badge" style={{ backgroundColor: meta.color }}>
                  {meta.label}
                </span>
              </dd>
            </div>
            <div className="facts__row">
              <dt>Address</dt>
              <dd>{project.address}</dd>
            </div>
            <div className="facts__row">
              <dt>Work type</dt>
              <dd>{project.work_type || '—'}</dd>
            </div>
            <div className="facts__row">
              <dt>Start</dt>
              <dd>{fmtDate(project.start_date)}</dd>
            </div>
            <div className="facts__row">
              <dt>Goal end</dt>
              <dd>{fmtDate(project.end_date)}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* Scope / needs note */}
      <ScopeNote project={project} isAdmin={isAdmin} onSaved={onSaved} />

      {/* Assignments — admin only */}
      {isAdmin && <AssignmentsManager projectId={project.id} />}
    </div>
  );
}

// Scope note gets its own small editor so it can be updated without touching
// the rest of the header.
function ScopeNote({
  project,
  isAdmin,
  onSaved,
}: {
  project: Project;
  isAdmin: boolean;
  onSaved: (p: Project) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(project.scope_note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, { scope_note: text.trim() || null });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="card__head">
        <h3 className="card__title">Scope / needs</h3>
        {isAdmin && !editing && (
          <button type="button" className="link-btn" onClick={() => { setText(project.scope_note ?? ''); setEditing(true); }}>
            Edit
          </button>
        )}
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {editing ? (
        <>
          <textarea
            className="field__input field__textarea"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs doing on this job?"
          />
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <p className="scope-text">
          {project.scope_note?.trim() || <span className="muted-note">No scope note yet.</span>}
        </p>
      )}
    </section>
  );
}
