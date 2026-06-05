import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import OverviewSection from '../components/OverviewSection';
import MaterialsSection from '../components/MaterialsSection';
import FinancialsSection from '../components/FinancialsSection';
import HoursSection from '../components/HoursSection';
import PhotosSection from '../components/PhotosSection';
import { getProject } from '../lib/projects';
import { useAuth } from '../context/AuthProvider';
import type { Project } from '../types';

// Phase 2: the real project detail page (replaces the Phase 1 stub).
// Tabs are role-scoped: workers get Overview / Hours / Photos (no Materials),
// admins get all four. RLS enforces this server-side regardless of the UI.
type Tab = 'overview' | 'materials' | 'financials' | 'hours' | 'photos';

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const p = await getProject(id);
        if (active) {
          if (!p) setError('Project not found, or you don’t have access to it.');
          else setProject(p);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load project.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Tabs available to this role. Materials is admin-only.
  const tabs: { key: Tab; label: string }[] = isAdmin
    ? [
        { key: 'overview', label: 'Overview' },
        { key: 'materials', label: 'Materials' },
        { key: 'financials', label: 'Financials' },
        { key: 'hours', label: 'Hours' },
        { key: 'photos', label: 'Photos' },
      ]
    : [
        { key: 'overview', label: 'Overview' },
        { key: 'hours', label: 'Hours' },
        { key: 'photos', label: 'Photos' },
      ];

  return (
    <div className="page page--detail">
      <TopBar title={project?.name ?? 'Project'} onBack={() => navigate('/')} />

      {loading && (
        <div className="detail-state">
          <div className="spinner" aria-hidden="true" />
        </div>
      )}

      {!loading && error && (
        <div className="detail-state">
          <p className="state__title">Can’t open this project</p>
          <p className="state__msg">{error}</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
            ← Back to map
          </button>
        </div>
      )}

      {!loading && !error && project && (
        <>
          <nav className="tabs" role="tablist" aria-label="Project sections">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={tab === t.key}
                className={`tab${tab === t.key ? ' tab--on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="detail-body">
            {tab === 'overview' && (
              <OverviewSection project={project} isAdmin={isAdmin} onSaved={setProject} />
            )}
            {/* Defensive: even if a worker forced this tab, RLS blocks the data. */}
            {tab === 'materials' && isAdmin && <MaterialsSection projectId={project.id} />}
            {tab === 'financials' && isAdmin && <FinancialsSection projectId={project.id} />}
            {tab === 'hours' && <HoursSection projectId={project.id} isAdmin={isAdmin} />}
            {tab === 'photos' && <PhotosSection projectId={project.id} />}
          </div>
        </>
      )}
    </div>
  );
}
