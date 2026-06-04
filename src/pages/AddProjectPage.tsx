import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { addProject } from '../lib/projects';
import { geocodeAddress } from '../lib/geocode';
import { WORK_TYPES, type ProjectStatus } from '../types';

// Screen 3 — Add Project form (route "/add").
// Required: name, address, status. Everything else optional.
const STATUS_OPTIONS: { key: ProjectStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

export default function AddProjectPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [workType, setWorkType] = useState<string>(WORK_TYPES[0]);
  const [status, setStatus] = useState<ProjectStatus>('upcoming');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scopeNote, setScopeNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When geocoding fails we surface a warning but still allow saving without
  // coordinates (the pin just won't appear until the address is fixed).
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGeocodeFailed(false);

    if (!name.trim() || !address.trim()) {
      setError('Project name and address are required.');
      return;
    }

    setSaving(true);
    try {
      // 1) Geocode the address. A null result (no match) is non-fatal: we save
      //    without coordinates and let the user retry. A thrown error is the
      //    network/service being down — also non-fatal here.
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const geo = await geocodeAddress(address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        } else {
          setGeocodeFailed(true);
        }
      } catch {
        setGeocodeFailed(true);
      }

      // 2) Insert the row.
      await addProject({
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        work_type: workType,
        status,
        scope_note: scopeNote.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });

      // 3) Back to the map, where the new pin appears.
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the project.');
      setSaving(false);
    }
  }

  return (
    <div className="page page--form">
      <TopBar title="Add project" />

      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">
            Project name <span className="field__req">*</span>
          </span>
          <input
            className="field__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Holladay Backyard Hardscape"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">
            Address <span className="field__req">*</span>
          </span>
          <input
            className="field__input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, City, State"
            required
          />
          <span className="field__hint">We’ll drop the pin from this address.</span>
        </label>

        <label className="field">
          <span className="field__label">Work type</span>
          <select className="field__input" value={workType} onChange={(e) => setWorkType(e.target.value)}>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field__label">
            Status <span className="field__req">*</span>
          </span>
          <div className="segmented" role="radiogroup" aria-label="Status">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={status === opt.key}
                className={`segmented__btn${status === opt.key ? ' segmented__btn--on' : ''}`}
                onClick={() => setStatus(opt.key)}
              >
                {opt.label}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Goal end date</span>
            <input
              className="field__input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Scope / needs note</span>
          <textarea
            className="field__input field__textarea"
            value={scopeNote}
            onChange={(e) => setScopeNote(e.target.value)}
            rows={4}
            placeholder="What needs doing on this job?"
          />
        </label>

        {geocodeFailed && (
          <div className="banner banner--warn">
            We couldn’t find that address on the map. You can still save — the project will appear
            once the address is corrected. Double-check the address and try again, or save as-is.
          </div>
        )}

        {error && <div className="banner banner--error">{error}</div>}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/')} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save & drop pin'}
          </button>
        </div>
      </form>
    </div>
  );
}
