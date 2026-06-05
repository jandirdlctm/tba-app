import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { getProfitability } from '../lib/financials';
import { STATUS_META, type ProjectProfitability } from '../types';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// Admin-only portfolio dashboard: total revenue / cost / profit across all
// jobs, plus a per-project breakdown. Reached from the nav menu.
export default function DashboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProjectProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfitability();
        if (active) setRows(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.contract_value, 0);
    const cost = rows.reduce((s, r) => s + r.materials_cost + r.labor_cost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : null;
    return { revenue, cost, profit, margin };
  }, [rows]);

  const profitClass = (n: number) => (n > 0 ? 'profit-pos' : n < 0 ? 'profit-neg' : '');

  // Only show jobs that have a contract value set — others aren't being tracked yet.
  const tracked = rows.filter((r) => r.contract_value > 0);

  return (
    <div className="page page--form">
      <TopBar title="Profitability" onBack={() => navigate('/')} />

      <div className="form">
        {loading && <p className="muted-note">Loading…</p>}
        {!loading && error && <div className="banner banner--error">{error}</div>}

        {!loading && !error && (
          <>
            {/* KPI summary */}
            <div className="kpi-grid">
              <div className="kpi">
                <span className="kpi__label">Revenue</span>
                <span className="kpi__value">{usd.format(totals.revenue)}</span>
              </div>
              <div className="kpi">
                <span className="kpi__label">Cost</span>
                <span className="kpi__value">{usd.format(totals.cost)}</span>
              </div>
              <div className="kpi">
                <span className="kpi__label">Profit</span>
                <span className={`kpi__value ${profitClass(totals.profit)}`}>
                  {usd.format(totals.profit)}
                </span>
              </div>
              <div className="kpi">
                <span className="kpi__label">Margin</span>
                <span className={`kpi__value ${profitClass(totals.profit)}`}>
                  {totals.margin === null ? '—' : `${totals.margin.toFixed(0)}%`}
                </span>
              </div>
            </div>

            {/* Per-project breakdown */}
            <section className="card">
              <h3 className="card__title">By project</h3>
              {tracked.length === 0 ? (
                <p className="muted-note">
                  No jobs have a contract value yet. Open a project → Financials → set its
                  contract value and labor rate to see profit here.
                </p>
              ) : (
                <ul className="row-list">
                  {tracked.map((r) => {
                    const cost = r.materials_cost + r.labor_cost;
                    const margin = r.contract_value > 0 ? (r.profit / r.contract_value) * 100 : 0;
                    return (
                      <li
                        key={r.project_id}
                        className="dash-row"
                        onClick={() => navigate(`/project/${r.project_id}`)}
                      >
                        <div className="dash-row__head">
                          <span className="dash-row__name">{r.project_name}</span>
                          <span className={`dash-row__profit ${profitClass(r.profit)}`}>
                            {usd.format(r.profit)}
                          </span>
                        </div>
                        <div className="dash-row__meta">
                          <span
                            className="dot"
                            style={{ backgroundColor: STATUS_META[r.status].color }}
                          />
                          {usd.format(r.contract_value)} revenue · {usd.format(cost)} cost ·{' '}
                          {margin.toFixed(0)}% margin
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
