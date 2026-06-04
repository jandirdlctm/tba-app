import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { STATUS_META, type Project, type ProjectStatus } from '../types';
import { markerIconFor } from './markerIcons';
import ProjectPopup from './ProjectPopup';

// ---------------------------------------------------------------------------
// <ProjectMap> — the ONLY component that imports Leaflet / react-leaflet.
//
// Everything map-related (tiles, markers, fit-to-bounds, locate-me) lives
// behind this wrapper. To swap to Mapbox/Google later, reimplement this one
// file against the same props — the rest of the app is provider-agnostic.
// ---------------------------------------------------------------------------

interface ProjectMapProps {
  /** Already-filtered projects to display as pins. */
  projects: Project[];
}

// Salt Lake City — fallback center when there are no geocoded pins to fit.
const DEFAULT_CENTER: [number, number] = [40.7608, -111.891];
const DEFAULT_ZOOM = 11;

/** Only projects that actually have coordinates can be mapped. */
function hasCoords(p: Project): p is Project & { latitude: number; longitude: number } {
  return typeof p.latitude === 'number' && typeof p.longitude === 'number';
}

/**
 * Imperatively fits the map to all visible pins whenever the set changes.
 * Lives inside MapContainer so it can grab the map instance via useMap().
 */
function FitToPins({ projects }: { projects: Project[] }) {
  const map = useMap();

  useEffect(() => {
    const points = projects.filter(hasCoords).map((p) => [p.latitude, p.longitude] as [number, number]);

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
  }, [map, projects]);

  return null;
}

/** "Locate me" control — recenters on the browser's geolocation. */
function LocateControl() {
  const map = useMap();

  function locate() {
    if (!('geolocation' in navigator)) {
      window.alert('Location is not available on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => window.alert('Could not get your location. Check location permissions.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button type="button" className="map-locate" onClick={locate} aria-label="Locate me">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6a1 1 0 0 1 1 1v1.06a8 8 0 0 1 6.94 6.94H21a1 1 0 1 1 0 2h-1.06A8 8 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06A8 8 0 0 1 4.06 13H3a1 1 0 1 1 0-2h1.06A8 8 0 0 1 11 4.06V3a1 1 0 0 1 1-1zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

/** Small status legend overlaid on the map. */
function Legend() {
  const statuses: ProjectStatus[] = ['active', 'upcoming', 'completed'];
  return (
    <div className="map-legend" aria-label="Legend">
      {statuses.map((s) => (
        <span key={s} className="map-legend__item">
          <span className="map-legend__dot" style={{ backgroundColor: STATUS_META[s].color }} />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}

export default function ProjectMap({ projects }: ProjectMapProps) {
  const pins = projects.filter(hasCoords);

  return (
    <div className="map-wrap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="map-container"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pins.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={markerIconFor(p.status)}>
            <Popup className="tba-popup" closeButton={false} minWidth={240} maxWidth={280}>
              <ProjectPopup project={p} />
            </Popup>
          </Marker>
        ))}

        <FitToPins projects={projects} />
        <LocateControl />
      </MapContainer>

      <Legend />
    </div>
  );
}
