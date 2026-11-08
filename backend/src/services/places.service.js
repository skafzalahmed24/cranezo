/**
 * Address search for the booking location step. The phone's own geocoder often finds nothing for villages
 * and small towns, so the app asks the server, which asks Photon (OpenStreetMap data, free, made for
 * search-as-you-type). Results are cached for a while to stay within Photon's fair-use limits.
 * To use Google Places instead later, only this file changes.
 */
const PHOTON = process.env.PHOTON_URL || 'https://photon.komoot.io';
const OSRM = process.env.OSRM_URL || 'https://router.project-osrm.org';
const INDIA_BBOX = '68.1,6.7,97.4,35.7'; // west,south,east,north
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

class PlacesError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const remember = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, at: Date.now() });
};
const recall = (key) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  cache.delete(key);
  return null;
};

/** "Merakamudidam, Merakamudidam Mandal, Andhra Pradesh 535102" */
const labelOf = (p) => {
  const first = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.district || p.city || '';
  const parts = [first, p.street && p.name ? p.street : null, p.district, p.city, p.county, p.state]
    .filter((v, i, a) => v && a.indexOf(v) === i);
  const text = parts.join(', ');
  return p.postcode ? `${text} ${p.postcode}` : text;
};

const fetchJson = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Cranezo/1.0 (address search)' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`[Places] ${error.message}`);
    throw new PlacesError('Address search is not available right now.', 503);
  }
};

const rows = (json) => (json.features || [])
  .filter((f) => !f.properties.countrycode || f.properties.countrycode === 'IN')
  .map((f) => ({ label: labelOf(f.properties), latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }))
  .filter((r) => r.label);

class PlacesService {
  async search({ q, latitude, longitude }) {
    const query = String(q || '').trim();
    if (query.length < 3) return [];
    const near = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && latitude !== null && longitude !== null && latitude !== '' && longitude !== '';
    // bias the results to where the customer already is, rounded so the cache is shared
    const bias = near ? `&lat=${Number(latitude).toFixed(1)}&lon=${Number(longitude).toFixed(1)}` : '';
    const key = `s:${query.toLowerCase()}:${bias}`;
    const cached = recall(key);
    if (cached) return cached;
    const json = await fetchJson(`${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=${INDIA_BBOX}${bias}`);
    const found = rows(json).filter((r, i, a) => a.findIndex((x) => x.label === r.label) === i).slice(0, 6);
    remember(key, found);
    return found;
  }

  /** The address for a point on the map */
  async reverse({ latitude, longitude }) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new PlacesError('A valid latitude and longitude are required.');
    }
    const key = `r:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = recall(key);
    if (cached) return cached;
    const json = await fetchJson(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`);
    const first = rows(json)[0] || null;
    const out = { label: first ? first.label : null };
    remember(key, out);
    return out;
  }
}



/** A driving route along the roads between two points (for the yellow line on the map) */
PlacesService.prototype.route = async function route({ from_latitude: fLat, from_longitude: fLng, to_latitude: tLat, to_longitude: tLng }) {
  const nums = [fLat, fLng, tLat, tLng].map(Number);
  if (nums.some((n) => !Number.isFinite(n)) || [fLat, fLng, tLat, tLng].some((v) => v === null || v === undefined || v === '')) {
    throw new PlacesError('from_latitude, from_longitude, to_latitude and to_longitude are required.');
  }
  const [a, b, c, d] = nums;
  if (Math.abs(a) > 90 || Math.abs(c) > 90 || Math.abs(b) > 180 || Math.abs(d) > 180) throw new PlacesError('Invalid coordinates.');
  // about 100 m cells, so a moving crane shares answers instead of asking again every few seconds
  const key = `route:${a.toFixed(3)},${b.toFixed(3)};${c.toFixed(3)},${d.toFixed(3)}`;
  const cached = recall(key);
  if (cached) return cached;
  const json = await fetchJson(`${OSRM}/route/v1/driving/${b},${a};${d},${c}?overview=simplified&geometries=geojson`);
  const r = json.routes && json.routes[0];
  if (!r) return { points: [], distance_km: null, duration_minutes: null };
  const out = {
    points: r.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    distance_km: Math.round(r.distance / 100) / 10,
    duration_minutes: Math.max(1, Math.round(r.duration / 60))
  };
  remember(key, out);
  return out;
};

module.exports = { placesService: new PlacesService(), PlacesError };
