import { useEffect, useState } from 'react';
import { getProfitability, upsertProjectFinancials } from '../lib/financials';
import type { ProjectProfitability } from '../types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface FinancialsSectionProps {
  projectId: string;
}

// Admin-only "Financials" tab: enter the contract value + labor rate, and see
// this job's profit = revenue − materials − labor (logged hours × rate).
export default function FinancialsSection({ projectId }: FinancialsSectionProps) {
  const [row, setRow] = useState<ProjectProfitability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [contract, setContract] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const all = await getProfitability();
      setRow(all.find((r) => r.project_id === projectId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load financials.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function startEdit() {
    setContract(String(row?.contract_value ?? 0));
    setRate(String(row?.labor_rate ?? 0));
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await upsertProjectFinancials(projectId, {
        contract_value: Number(contract) || 0,
        labor_rate: Number(rate) || 0,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted-note">Loading financials…</p>;

  const profit = row?.profit ?? 0;
  const revenue = row?.contract_value ?? 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;
  const profitClass = profit > 0 ? 'profit-pos' : profit < 0 ? 'profit-neg' : '';

  return (
    <div className="detail-stack">
      {error && <div className="banner banner--error">{error}</div>}

      {/* Headline profit */}
      <section className="card">
        <div className="card__head">
          <h3 className="card__title">Profit</h3>
          {!editing && (
            <button type="button" className="link-btn" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="form form--inline">
            <div className="field-row">
              <label className="field">
                <span className="field__label">Contract value ($)</span>
                <input className="field__input" type="number" min="0" step="any" value={contract} onChange={(e) => setContract(e.target.value)} placeholder="What the job is sold for" />
              </label>
              <label className="field">
                <span className="field__label">Default labor rate ($/hr)</span>
                <input className="field__input" type="number" min="0" step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Fallback rate" />
              </label>
            </div>
            <span className="field__hint">
              Labor cost uses each worker's own rate (set in Manage workers). This default only
              applies to hours from workers without an individual rate.
            </span>
            <div className="form__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`profit-headline ${profitClass}`}>{usd.format(profit)}</div>
            {margin !== null && <div className="profit-margin">{margin.toFixed(1)}% margin</div>}
            {revenue === 0 && (
              <p className="muted-note">Set a contract value to start tracking profit.</p>
            )}
          </>
        )}
      </section>

      {/* Breakdown */}
      <section className="card">
        <h3 className="card__title">Breakdown</h3>
        <dl className="facts">
          <div className="facts__row">
            <dt>Revenue</dt>
            <dd>{usd.format(revenue)}</dd>
          </div>
          <div className="facts__row">
            <dt>Materials</dt>
            <dd>− {usd.format(row?.materials_cost ?? 0)}</dd>
          </div>
          <div className="facts__row">
            <dt>Labor</dt>
            <dd>
              − {usd.format(row?.labor_cost ?? 0)}{' '}
              <span className="muted-note">({row?.labor_hours ?? 0} h logged)</span>
            </dd>
          </div>
          <div className="facts__row facts__row--total">
            <dt>Profit</dt>
            <dd className={profitClass}>{usd.format(profit)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
