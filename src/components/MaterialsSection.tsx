import { useEffect, useState } from 'react';
import {
  getMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  uploadReceipt,
  getReceiptUrl,
} from '../lib/materials';
import { MATERIAL_STATUSES, type Material, type MaterialStatus, type NewMaterial } from '../types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface MaterialsSectionProps {
  projectId: string;
}

// Admin-only materials list with a running cost total and receipt photos.
export default function MaterialsSection({ projectId }: MaterialsSectionProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Material | 'new' | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setMaterials(await getMaterials(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load materials.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const total = materials.reduce((sum, m) => sum + Number(m.total_cost ?? 0), 0);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this material line?')) return;
    try {
      await deleteMaterial(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  if (loading) return <p className="muted-note">Loading materials…</p>;

  return (
    <div className="detail-stack">
      {error && <div className="banner banner--error">{error}</div>}

      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Materials</h3>
          <span className="total-pill">Total {usd.format(total)}</span>
        </div>

        {materials.length === 0 ? (
          <p className="muted-note">No materials yet.</p>
        ) : (
          <ul className="row-list">
            {materials.map((m) => (
              <li key={m.id} className="material">
                <div className="material__top">
                  <span className="material__name">{m.item_name}</span>
                  <span className={`chip-status chip-status--${m.status}`}>
                    {MATERIAL_STATUSES.find((s) => s.key === m.status)?.label}
                  </span>
                </div>
                <div className="material__meta">
                  {m.quantity} × {usd.format(Number(m.unit_cost))} ={' '}
                  <strong>{usd.format(Number(m.total_cost))}</strong>
                </div>
                {m.note && <div className="material__note">{m.note}</div>}
                <div className="material__actions">
                  {m.receipt_url && <ReceiptLink path={m.receipt_url} />}
                  <button type="button" className="link-btn" onClick={() => setEditing(m)}>
                    Edit
                  </button>
                  <button type="button" className="link-btn link-btn--danger" onClick={() => handleDelete(m.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {editing === null && (
          <button type="button" className="btn btn--primary full-btn" onClick={() => setEditing('new')}>
            + Add material
          </button>
        )}
      </section>

      {editing !== null && (
        <MaterialForm
          projectId={projectId}
          material={editing === 'new' ? null : editing}
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

// Renders a "View receipt" link by resolving the stored path to a signed URL.
function ReceiptLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getReceiptUrl(path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return <span className="link-btn link-btn--muted">Receipt…</span>;
  return (
    <a className="link-btn" href={url} target="_blank" rel="noreferrer">
      View receipt
    </a>
  );
}

// Add / edit form for a single material line.
function MaterialForm({
  projectId,
  material,
  onClose,
  onSaved,
}: {
  projectId: string;
  material: Material | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [itemName, setItemName] = useState(material?.item_name ?? '');
  const [quantity, setQuantity] = useState(String(material?.quantity ?? '1'));
  const [unitCost, setUnitCost] = useState(String(material?.unit_cost ?? '0'));
  const [status, setStatus] = useState<MaterialStatus>(material?.status ?? 'needed');
  const [note, setNote] = useState(material?.note ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Upload a new receipt first (if chosen); keep the existing one otherwise.
      let receiptPath = material?.receipt_url ?? null;
      if (file) receiptPath = await uploadReceipt(projectId, file);

      const fields: NewMaterial = {
        project_id: projectId,
        item_name: itemName.trim(),
        quantity: Number(quantity) || 0,
        unit_cost: Number(unitCost) || 0,
        status,
        note: note.trim() || null,
        receipt_url: receiptPath,
      };

      if (material) {
        await updateMaterial(material.id, fields);
      } else {
        await addMaterial(fields);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save material.');
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h3 className="card__title">{material ? 'Edit material' : 'Add material'}</h3>
      {error && <div className="banner banner--error">{error}</div>}

      <div className="form form--inline">
        <label className="field">
          <span className="field__label">Item</span>
          <input className="field__input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. 60lb concrete bags" />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Quantity</span>
            <input className="field__input" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Unit cost ($)</span>
            <input className="field__input" type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span className="field__label">Status</span>
          <div className="segmented" role="radiogroup" aria-label="Material status">
            {MATERIAL_STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={status === s.key}
                className={`segmented__btn${status === s.key ? ' segmented__btn--on' : ''}`}
                onClick={() => setStatus(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field__label">Note</span>
          <input className="field__input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span className="field__label">Receipt photo</span>
          <input className="field__input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {material?.receipt_url && !file && <span className="field__hint">A receipt is already attached. Choose a file to replace it.</span>}
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
