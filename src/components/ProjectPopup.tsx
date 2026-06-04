import { useNavigate } from 'react-router-dom';
import { STATUS_META, type Project } from '../types';

interface ProjectPopupProps {
  project: Project;
}

// Quick-glance card shown inside a Leaflet popup when a pin is tapped.
// Intentionally high-level: name, address, status badge, work type, and the
// scope note as "Needs". Full detail is Phase 2.
export default function ProjectPopup({ project }: ProjectPopupProps) {
  const navigate = useNavigate();
  const meta = STATUS_META[project.status];

  return (
    <div className="popup">
      <div className="popup__head">
        <h2 className="popup__name">{project.name}</h2>
        <span className="badge" style={{ backgroundColor: meta.color }}>
          {meta.label}
        </span>
      </div>

      <p className="popup__address">
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="popup__pin">
          <path
            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
            fill="currentColor"
          />
        </svg>
        {project.address}
      </p>

      {project.work_type && (
        <div className="popup__field">
          <span className="popup__label">Work type</span>
          <span className="popup__value">{project.work_type}</span>
        </div>
      )}

      <div className="popup__field">
        <span className="popup__label">Needs</span>
        <span className="popup__value">
          {project.scope_note?.trim() || <em className="popup__muted">No scope note yet.</em>}
        </span>
      </div>

      {/* Phase 2: opens the full project detail page (role-scoped). */}
      <button
        type="button"
        className="popup__details-btn"
        onClick={() => navigate(`/project/${project.id}`)}
      >
        View details →
      </button>
    </div>
  );
}
