import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import StatusChips from '../components/StatusChips';
import ProjectMap from '../components/ProjectMap';
import { getProjects } from '../lib/projects';
import { getChecklistProgress } from '../lib/checklist';
import { useAuth } from '../context/AuthProvider';
import type { ChecklistProgress, Project, StatusFilter } from '../types';

// Screen 1 — Project Overview Map (home route "/").
// Workers automatically see only their assigned projects (enforced by RLS on
// the projects table), so no client-side scoping is needed here.
export default function MapPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [progress, setProgress] = useState<Record<string, ChecklistProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Checklist progress is a nice-to-have for the popup — don't fail the
        // whole map if it errors.
        const [rows, prog] = await Promise.all([
          getProjects(),
          getChecklistProgress().catch(() => ({}) as Record<string, ChecklistProgress>),
        ]);
        if (!cancelled) {
          setProjects(rows);
          setProgress(prog);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtering is done client-side in React state (no refetch), per spec.
  const visible = useMemo(
    () => (filter === 'all' ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter],
  );

  return (
    <div className="page page--map">
      <TopBar title="Project overview" showAdd={isAdmin} />
      <StatusChips value={filter} onChange={setFilter} />

      <div className="map-body">
        {loading && (
          <div className="state state--loading">
            <div className="spinner" aria-hidden="true" />
            <p>Loading projects…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state state--error">
            <p className="state__title">Couldn’t load projects</p>
            <p className="state__msg">{error}</p>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="state state--empty">
            {isAdmin ? (
              <>
                <p>No projects yet. Tap + to add your first project.</p>
                <button type="button" className="btn btn--primary" onClick={() => navigate('/add')}>
                  + Add project
                </button>
              </>
            ) : (
              <p>No projects assigned to you yet. Your admin will add you to a job.</p>
            )}
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <ProjectMap projects={visible} progressByProject={progress} />
        )}
      </div>
    </div>
  );
}
