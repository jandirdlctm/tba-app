import L from 'leaflet';
import { STATUS_META, type ProjectStatus } from '../types';

// Teardrop markers rendered as inline-SVG divIcons, tinted by status color.
// Using divIcon (instead of image files) keeps the colors in one place and
// avoids shipping a PNG per status.

function teardropSvg(color: string): string {
  // A classic map pin: rounded head + pointed tail, with a white dot centered.
  return `
    <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.1 24.2 13.06 25.34a1.22 1.22 0 0 0 1.88 0C15.9 38.2 28 23.5 28 14 28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="5" fill="#ffffff"/>
    </svg>`;
}

const iconCache = new Map<ProjectStatus, L.DivIcon>();

/** Returns a (cached) Leaflet divIcon for the given project status. */
export function markerIconFor(status: ProjectStatus): L.DivIcon {
  const cached = iconCache.get(status);
  if (cached) return cached;

  const icon = L.divIcon({
    html: teardropSvg(STATUS_META[status].color),
    className: 'tba-marker', // styled (drop shadow reset) in index.css
    iconSize: [28, 40],
    iconAnchor: [14, 40], // tip of the teardrop sits on the coordinate
    popupAnchor: [0, -36],
  });

  iconCache.set(status, icon);
  return icon;
}
