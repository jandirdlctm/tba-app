// ---------------------------------------------------------------------------
// Geocoding helper: address -> { lat, lng }.
//
// Uses the free Nominatim (OpenStreetMap) endpoint — no API key required.
// All geocoding goes through this single function so we can swap providers
// (Mapbox / Google) later by changing only this file.
//
// Nominatim usage policy asks for a descriptive User-Agent / Referer and a max
// of ~1 request/second. We only geocode on form submit (one address at a time),
// so we stay well within limits.
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** The full address Nominatim matched, handy for confirmation UIs. */
  displayName: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocode a free-text address. Returns `null` when no match is found so the
 * caller can let the user save anyway and retry. Throws only on network/HTTP
 * failure.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '1',
    addressdetails: '0',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      // Identify the app per Nominatim's usage policy.
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding service error (${res.status})`);
  }

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!results.length) return null;

  const { lat, lon, display_name } = results[0];
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name,
  };
}
